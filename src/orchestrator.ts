import { generateText } from 'ai';
import type { AIModel, Message, ExecutionResult, ToolContext } from './types';
import { ProviderManager } from './providers/manager';

export class Orchestrator {
  private model: AIModel;
  private tools: Record<string, any>() = {};
  private messages: Message[] = [];
  private iterations = 0;
  private maxIterations: number;
  private customLogic?: (input: string, context: any) => Promise<any>;

  constructor(options: {
    model: string | AIModel;
    tools?: any[];
    systemPrompt?: string;
    maxIterations?: number;
    customLogic?: (input: string, context: any) => Promise<any>;
  }) {
    // Use ProviderManager for centralized model creation
    this.model = ProviderManager.createModel(options.model);
    this.maxIterations = options.maxIterations || 10;
    this.customLogic = options.customLogic;
    
    // Register tools with validation
    if (options.tools) {
      options.tools.forEach((tool, index) => {
        const toolName = `tool_${index}`;
        this.tools[toolName] = tool;
      });
    }
    
    // Add system prompt if provided
    if (options.systemPrompt) {
      this.messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }
  }

  // Core execution method - non-streaming only
  public async execute(input: string): Promise<ExecutionResult> {
    try {
      // If custom logic is provided, use it
      if (this.customLogic) {
        return await this.executeWithCustomLogic(input);
      }

      const provider = await ProviderManager.createProvider(this.model);

      const generateConfig: any = {
        model: provider(this.model.model),
        prompt: input,
        maxSteps: this.maxIterations,
      };

      // Add system message if it exists
      const systemMessage = this.messages.find(m => m.role === 'system');
      if (systemMessage) {
        generateConfig.system = systemMessage.content;
      }

      // Add tools if available
      if (Object.keys(this.tools).length > 0) {
        generateConfig.tools = this.tools;
      }

      // Add model parameters conditionally
      if (this.model.temperature !== undefined) {
        generateConfig.temperature = this.model.temperature;
      }

      if (this.model.maxTokens !== undefined) {
        generateConfig.maxTokens = this.model.maxTokens;
      }

      if (this.model.topP !== undefined) {
        generateConfig.topP = this.model.topP;
      }
      
      const result = await generateText(generateConfig);

      // Update our internal state
      this.iterations = result.steps?.length || 1;
      
      // Store the conversation in our messages for future reference
      this.messages = [
        ...this.messages.filter(m => m.role === 'system'),
        { role: 'user', content: input },
        { role: 'assistant', content: result.text || '' }
      ];

      const executionResult: ExecutionResult = {
        success: true,
        result: result.text,
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: result.toolCalls?.map(tc => tc.toolCallId) || [],
      };

      return executionResult;

    } catch (error) {
      console.error('Error in Orchestrator.execute:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResult: ExecutionResult = {
        success: false,
        error: errorMessage,
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
      };

      return errorResult;
    }
  }

  // Tool management methods
  public addTool(tool: any): void {
    const toolName = `tool_${Object.keys(this.tools).length}`;
    this.tools[toolName] = tool;
  }

  public removeTool(toolName: string): void {
    delete this.tools[toolName];
  }

  public getTool(toolName: string): any {
    return this.tools[toolName];
  }

  public getAllTools(): any[] {
    return Object.values(this.tools);
  }

  public getToolsByCategory(category: string): any[] {
    return this.getAllTools();
  }

  // Model switching using ProviderManager
  public switchModel(model: string | AIModel): void {
    this.model = ProviderManager.createModel(model);
  }

  // Get model information
  public getModelInfo(): any {
    try {
      return ProviderManager.getModelInfo(this.model.provider, this.model.model);
    } catch (error) {
      return {
        provider: this.model.provider,
        model: this.model.model,
        error: 'Model info not available',
      };
    }
  }

  // Utility methods
  public getMessages(): Message[] {
    return [...this.messages];
  }

  public addMessage(message: Message): void {
    this.messages.push(message);
  }

  public reset(): void {
    this.messages = this.messages.filter(m => m.role === 'system');
    this.iterations = 0;
  }

  public clear(): void {
    this.messages = [];
    this.iterations = 0;
  }

  // Private methods
  private async executeWithCustomLogic(input: string): Promise<ExecutionResult> {
    try {
      const context = {
        messages: this.messages,
        tools: this.getAllTools(),
        model: this.model,
        iterations: this.iterations,
      };

      const result = await this.customLogic!(input, context);
      
      return {
        success: true,
        result: result.content || result,
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
      };
    }
  }

  