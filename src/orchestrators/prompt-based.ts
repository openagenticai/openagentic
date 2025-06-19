import type { PromptBasedOrchestrator, OrchestratorContext, ExecutionResult, CoreMessage, OpenAgenticTool } from '../types';
import { Orchestrator } from '../orchestrator';
import { ProviderManager } from '../providers/manager';

/**
 * Base class for prompt-based orchestrators
 * Overrides system prompts and filters tools to create specialized agents
 */
export class PromptBasedOrchestratorClass implements PromptBasedOrchestrator {
  public readonly type = 'prompt-based' as const;
  
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly systemPrompt: string,
    public readonly allowedTools: string[] = []
  ) {
    if (!id || !name || !description || !systemPrompt) {
      throw new Error('PromptBasedOrchestrator requires id, name, description, and systemPrompt');
    }
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getType(): 'prompt-based' {
    return this.type;
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  /**
   * Override system prompt based on context (can be customized by subclasses)
   */
  buildSystemPrompt(context: OrchestratorContext): string {
    return this.systemPrompt;
  }

  /**
   * Filter tools based on allowed tools list
   */
  private filterTools(availableTools: OpenAgenticTool[]): OpenAgenticTool[] {
    if (this.allowedTools.length === 0) {
      return availableTools; // No filtering if no specific tools specified
    }

    const filteredTools = availableTools.filter(tool => 
      this.allowedTools.includes(tool.toolId)
    );

    // Log which tools are being used
    console.log(`🎭 ${this.name} - Filtered tools:`, {
      available: availableTools.map(t => t.toolId),
      allowed: this.allowedTools,
      using: filteredTools.map(t => t.toolId),
      filtered: this.allowedTools.filter(id => !filteredTools.some(t => t.toolId === id)),
    });

    return filteredTools;
  }

  /**
   * Validate input before execution
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
   * Optional initialization
   */
  async initialize(context: OrchestratorContext): Promise<void> {
    console.log(`🎭 Initializing ${this.name} orchestrator`, {
      toolsAvailable: context.tools.length,
      toolsAllowed: this.allowedTools.length,
      maxIterations: context.maxIterations,
    });
  }

  /**
   * Optional cleanup
   */
  async cleanup(context: OrchestratorContext): Promise<void> {
    console.log(`🎭 Cleaning up ${this.name} orchestrator`);
  }

  /**
   * Execute the orchestration by creating a specialized orchestrator instance
   */
  async execute(input: string | CoreMessage[], context: OrchestratorContext): Promise<ExecutionResult> {
    console.log(`🎭 ${this.name} - Starting orchestration`, {
      inputType: typeof input,
      inputLength: typeof input === 'string' ? input.length : input.length,
      systemPromptLength: this.systemPrompt.length,
      toolsToFilter: this.allowedTools.length,
    });

    try {
      // Filter tools based on allowed tools
      const filteredTools = this.filterTools(context.tools);
      
      if (this.allowedTools.length > 0 && filteredTools.length === 0) {
        throw new Error(`No allowed tools found. Required tools: ${this.allowedTools.join(', ')}`);
      }

      // Build system prompt (can be customized by context)
      const finalSystemPrompt = this.buildSystemPrompt(context);

      // Create a new orchestrator instance with overridden settings
      const specializedOrchestrator = new Orchestrator({
        model: context.model,
        tools: filteredTools,
        systemPrompt: finalSystemPrompt,
        maxIterations: context.maxIterations,
        enableDebugLogging: context.loggingConfig.enableDebugLogging,
        logLevel: context.loggingConfig.logLevel,
        enableStepLogging: context.loggingConfig.enableStepLogging,
        enableToolLogging: context.loggingConfig.enableToolLogging,
        enableTimingLogging: context.loggingConfig.enableTimingLogging,
        enableStatisticsLogging: context.loggingConfig.enableStatisticsLogging,
      });

      console.log(`🎭 ${this.name} - Executing with specialized orchestrator`, {
        filteredToolsCount: filteredTools.length,
        filteredToolIds: filteredTools.map(t => t.toolId),
        systemPromptPreview: finalSystemPrompt.substring(0, 100) + '...',
      });

      // Execute using the specialized orchestrator
      const result = typeof input === 'string' 
        ? await specializedOrchestrator.execute(input)
        : await specializedOrchestrator.execute(input as CoreMessage[]);

      console.log(`🎭 ${this.name} - Orchestration completed`, {
        success: result.success,
        iterations: result.iterations,
        toolCallsUsed: result.toolCallsUsed?.length || 0,
        resultLength: result.result?.length || 0,
      });

      return result;

    } catch (error) {
      console.error(`🎭 ${this.name} - Orchestration failed:`, {
        error: error instanceof Error ? error.message : String(error),
        inputType: typeof input,
        allowedTools: this.allowedTools,
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
}

/**
 * Helper function to create prompt-based orchestrators
 */
export function createPromptBasedOrchestrator(
  id: string,
  name: string,
  description: string,
  systemPrompt: string,
  allowedTools: string[] = []
): PromptBasedOrchestratorClass {
  return new PromptBasedOrchestratorClass(id, name, description, systemPrompt, allowedTools);
}