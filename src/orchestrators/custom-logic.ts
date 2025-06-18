import type { CustomLogicOrchestrator, OrchestratorContext, ExecutionResult, CoreMessage, OpenAgenticTool, ApiKeyMap } from '../types';
import { ProviderManager } from '../providers/manager';
import { generateText } from 'ai';

/**
 * Abstract base class for custom logic orchestrators
 * Provides common functionality and helper methods for implementing custom orchestration logic
 */
export abstract class CustomLogicOrchestratorClass implements CustomLogicOrchestrator {
  public readonly type = 'custom-logic' as const;
  
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string
  ) {
    if (!id || !name || !description) {
      throw new Error('CustomLogicOrchestrator requires id, name, and description');
    }
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getType(): 'custom-logic' {
    return this.type;
  }

  /**
   * Abstract method that subclasses must implement
   * This is where the custom orchestration logic goes
   */
  abstract customLogic(input: string | CoreMessage[], context: OrchestratorContext): Promise<any>;

  /**
   * Main execute method that calls customLogic and formats the result
   * Can be overridden by subclasses for more control
   */
  async execute(input: string | CoreMessage[], context: OrchestratorContext): Promise<ExecutionResult> {
    console.log(`🎭 ${this.name} - Starting custom logic orchestration`, {
      inputType: typeof input,
      inputLength: typeof input === 'string' ? input.length : input.length,
      toolsAvailable: context.tools.length,
      maxIterations: context.maxIterations,
    });

    try {
      // Call the custom logic implementation
      const result = await this.customLogic(input, context);

      console.log(`🎭 ${this.name} - Custom logic completed`, {
        resultType: typeof result,
        hasResult: !!result,
      });

      // Format the result into ExecutionResult format
      const formattedResult: ExecutionResult = {
        success: true,
        result: typeof result === 'string' ? result : result?.content || JSON.stringify(result),
        messages: context.messages,
        iterations: context.iterations + 1,
        toolCallsUsed: [], // Custom logic orchestrators track their own tool usage
        executionStats: {
          totalDuration: 0, // Will be calculated by the parent orchestrator
          stepsExecuted: 1,
          toolCallsExecuted: 0,
          averageStepDuration: 0,
          averageToolCallDuration: 0,
        },
      };

      return formattedResult;

    } catch (error) {
      console.error(`🎭 ${this.name} - Custom logic failed:`, {
        error: error instanceof Error ? error.message : String(error),
        inputType: typeof input,
      });

      // Return error result in expected format
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messages: context.messages,
        iterations: context.iterations,
        toolCallsUsed: [],
        executionStats: {
          totalDuration: 0,
          stepsExecuted: 0,
          toolCallsExecuted: 0,
          averageStepDuration: 0,
          averageToolCallDuration: 0,
        },
      };
    }
  }

  /**
   * Optional validation method
   */
  async validate(input: string | CoreMessage[], context: OrchestratorContext): Promise<boolean> {
    // Basic validation - can be overridden by subclasses
    if (typeof input === 'string') {
      return input.trim().length > 0;
    }
    
    if (Array.isArray(input)) {
      return input.length > 0 && input.some(msg => msg.content && msg.content.toString().trim().length > 0);
    }
    
    return false;
  }

  /**
   * Optional initialization method
   */
  async initialize(context: OrchestratorContext): Promise<void> {
    console.log(`🎭 Initializing ${this.name} custom logic orchestrator`, {
      toolsAvailable: context.tools.length,
      maxIterations: context.maxIterations,
    });
  }

  /**
   * Optional cleanup method
   */
  async cleanup(context: OrchestratorContext): Promise<void> {
    console.log(`🎭 Cleaning up ${this.name} custom logic orchestrator`);
  }

  /**
   * Optional method to determine if custom logic should be used
   * Default implementation always returns true
   */
  shouldUseCustomLogic(input: string | CoreMessage[], context: OrchestratorContext): boolean {
    return true;
  }

  // =============================================================================
  // HELPER METHODS FOR COMMON PATTERNS
  // =============================================================================

  /**
   * Helper to get available tools filtered by ID
   */
  protected getToolsByIds(context: OrchestratorContext, toolIds: string[]): OpenAgenticTool[] {
    return context.tools.filter(tool => toolIds.includes(tool.toolId));
  }

  /**
   * Helper to execute a single tool
   */
  protected async executeTool(
    tool: OpenAgenticTool,
    parameters: any,
    context?: any
  ): Promise<any> {
    try {
      console.log(`🔧 Executing tool: ${tool.toolId}`, {
        toolName: tool.name,
        parameters: this.sanitizeForLogging(parameters),
      });

      const result = await tool.execute(parameters, context);

      console.log(`✅ Tool execution completed: ${tool.toolId}`, {
        resultType: typeof result,
        success: true,
      });

      return result;
    } catch (error) {
      console.error(`❌ Tool execution failed: ${tool.toolId}`, {
        error: error instanceof Error ? error.message : String(error),
        parameters: this.sanitizeForLogging(parameters),
      });
      throw error;
    }
  }

  /**
   * Helper to execute multiple tools in parallel
   */
  protected async executeToolsInParallel(
    toolExecutions: Array<{
      tool: OpenAgenticTool;
      parameters: any;
      context?: any;
    }>
  ): Promise<any[]> {
    console.log(`🚀 Executing ${toolExecutions.length} tools in parallel`);

    const promises = toolExecutions.map(({ tool, parameters, context }) =>
      this.executeTool(tool, parameters, context)
    );

    try {
      const results = await Promise.all(promises);
      console.log(`✅ Parallel tool execution completed: ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`❌ Parallel tool execution failed:`, {
        error: error instanceof Error ? error.message : String(error),
        toolCount: toolExecutions.length,
      });
      throw error;
    }
  }

  /**
   * Helper to execute tools sequentially
   */
  protected async executeToolsInSequence(
    toolExecutions: Array<{
      tool: OpenAgenticTool;
      parameters: any;
      context?: any;
    }>
  ): Promise<any[]> {
    console.log(`🔄 Executing ${toolExecutions.length} tools in sequence`);

    const results: any[] = [];

    for (const { tool, parameters, context } of toolExecutions) {
      try {
        const result = await this.executeTool(tool, parameters, context);
        results.push(result);
      } catch (error) {
        console.error(`❌ Sequential tool execution failed at tool: ${tool.toolId}`);
        throw error;
      }
    }

    console.log(`✅ Sequential tool execution completed: ${results.length} results`);
    return results;
  }

  /**
   * Helper to call AI models directly (bypassing the orchestrator)
   */
  protected async callAIModel(
    prompt: string,
    modelOverride?: string,
    context?: OrchestratorContext
  ): Promise<string> {
    try {
      const model = modelOverride ? 
        ProviderManager.createModel(modelOverride) : 
        context?.model;

      if (!model) {
        throw new Error('No model available for AI call');
      }

      console.log(`🤖 Calling AI model directly: ${model.provider}/${model.model}`);

      const provider = await ProviderManager.createProvider(model);
      
      const result = await generateText({
        model: provider(model.model),
        prompt: prompt.trim(),
        temperature: model.temperature,
        maxTokens: model.maxTokens,
        topP: model.topP,
      });

      console.log(`✅ AI model call completed`, {
        responseLength: result.text?.length || 0,
        tokensUsed: result.usage?.totalTokens || 0,
      });

      return result.text || '';
    } catch (error) {
      console.error(`❌ AI model call failed:`, {
        error: error instanceof Error ? error.message : String(error),
        model: modelOverride || context?.model?.model,
      });
      throw error;
    }
  }

  /**
   * Helper to consolidate multiple results into a single response
   */
  protected consolidateResults(
    results: any[],
    consolidationPrompt?: string
  ): string {
    console.log(`📊 Consolidating ${results.length} results`);

    if (results.length === 0) {
      return 'No results to consolidate.';
    }

    if (results.length === 1) {
      return typeof results[0] === 'string' ? results[0] : JSON.stringify(results[0]);
    }

    // Default consolidation logic
    const formattedResults = results.map((result, index) => {
      const content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return `**Result ${index + 1}:**\n${content}`;
    });

    let consolidatedText = formattedResults.join('\n\n');

    if (consolidationPrompt) {
      consolidatedText = `${consolidationPrompt}\n\n${consolidatedText}`;
    }

    return consolidatedText;
  }

  /**
   * Helper to get API keys for external services
   */
  protected getApiKey(provider: string): string | undefined {
    const envMap: Record<string, string> = {
      'openai': 'OPENAI_API_KEY',
      'anthropic': 'ANTHROPIC_API_KEY',
      'google': 'GOOGLE_API_KEY',
      'perplexity': 'PERPLEXITY_API_KEY',
      'xai': 'XAI_API_KEY',
      'elevenlabs': 'ELEVENLABS_API_KEY',
      'github': 'GITHUB_TOKEN',
      'newsdata': 'NEWSDATA_API_KEY',
    };

    const envVar = envMap[provider.toLowerCase()];
    return envVar ? process.env[envVar] : undefined;
  }

  /**
   * Helper to create structured output
   */
  protected createStructuredOutput(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  }

  /**
   * Helper to sanitize data for logging
   */
  private sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      // Limit string length and remove potential sensitive data patterns
      const sanitized = data.length > 200 ? `${data.substring(0, 200)}...` : data;
      return sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
                    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
                    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      // Sanitize common sensitive field names
      const sensitiveFields = ['password', 'apiKey', 'token', 'secret', 'key', 'auth'];
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      });
      return sanitized;
    }
    
    return data;
  }
}

/**
 * Helper function to create custom logic orchestrators
 */
export function createCustomLogicOrchestrator(
  id: string,
  name: string,
  description: string,
  customLogicImplementation: (input: string | CoreMessage[], context: OrchestratorContext) => Promise<any>
): CustomLogicOrchestratorClass {
  
  return new (class extends CustomLogicOrchestratorClass {
    async customLogic(input: string | CoreMessage[], context: OrchestratorContext): Promise<any> {
      return await customLogicImplementation(input, context);
    }
  })(id, name, description);
}