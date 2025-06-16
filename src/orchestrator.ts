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

  private async callModel(messages: Message[]): Promise<any> {
    const provider = await ProviderManager.createProvider(this.model);
    const toolDefinitions = this.getToolDefinitions();

    const generateConfig: any = {
      model: provider(this.model.model),
      messages: this.transformMessages(messages),
    };

    // Add tools if available
    if (toolDefinitions.length > 0) {
      generateConfig.tools = this.convertToAISDKTools(toolDefinitions);
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

    // Handle toolCalls properly
    const toolCalls = await Promise.resolve(result.toolCalls);
    
    return {
      content: result.text,
      toolCalls: toolCalls && Array.isArray(toolCalls) ? toolCalls.map((tc: any) => ({
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        args: tc.args,
      })) : undefined,
    };
  }

  private createToolContext(): ToolContext {
    return {
      getModel: async (providerName?: string) => {
        if (providerName && providerName !== this.model.provider) {
          return await ProviderManager.createProviderByName(providerName);
        }
        return await ProviderManager.createProvider(this.model);
      },
      apiKeys: {
        openai: process.env.OPENAI_API_KEY || '',
        anthropic: process.env.ANTHROPIC_API_KEY || '',
        google: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
        perplexity: process.env.PERPLEXITY_API_KEY || '',
        xai: process.env.XAI_API_KEY || '',
      }
    };
  }

  private getToolDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }
    }));
  }

  private convertToAISDKTools(definitions: any[]): Record<string, any> {
    const tools: Record<string, any> = {};
    
    definitions.forEach(def => {
      const tool = this.tools.get(def.function.name);
      if (tool) {
        tools[def.function.name] = {
          description: def.function.description,
          parameters: def.function.parameters,
          execute: async (params: any) => {
            const context = this.createToolContext();
            return await tool.execute(params, context);
          },
        };
      }
    });
    
    return tools;
  }

  private async executeToolCall(toolCall: any): Promise<void> {
    try {
      const tool = this.tools.get(toolCall.toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.toolName}`);
      }

      // Create tool context for AI-powered tools
      const context = this.createToolContext();
      const result = await tool.execute(toolCall.args, context);

      const toolMessage: Message = {
        role: 'tool',
        content: JSON.stringify(result),
        toolCallId: toolCall.toolCallId,
      };
      this.messages.push(toolMessage);

    } catch (error) {
      const errorMessage: Message = {
        role: 'tool',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        toolCallId: toolCall.toolCallId,
      };
      this.messages.push(errorMessage);
    }
  }

  private transformMessages(messages: Message[]): any[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => {
        if (m.role === 'user') {
          return { role: 'user' as const, content: m.content };
        } else if (m.role === 'assistant') {
          const assistantMsg: any = { role: 'assistant' as const, content: m.content };
          if (m.toolCalls && Array.isArray(m.toolCalls)) {
            assistantMsg.toolCalls = m.toolCalls;
          }
          return assistantMsg;
        } else if (m.role === 'tool') {
          return { 
            role: 'tool' as const, 
            toolCallId: m.toolCallId || '',
            content: m.content
          };
        }
        return { role: 'user' as const, content: m.content };
      });
  }

  private getUsedTools(): string[] {
    return this.messages
      .filter((m): m is Message & { role: 'tool'; toolCallId: string } => 
        m.role === 'tool' && typeof m.toolCallId === 'string'
      )
      .map(m => m.toolCallId)
      .filter((value, index, self) => self.indexOf(value) === index);
  }
}