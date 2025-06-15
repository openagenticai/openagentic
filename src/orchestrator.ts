import { generateText, streamText } from 'ai';
import type { 
  AIModel, 
  Tool, 
  Message, 
  ExecutionResult,
  OrchestratorEvent,
  ToolContext 
} from './types';
import { SimpleEventEmitter } from './utils/event-emitter';
import { ProviderManager } from './providers/manager';

export interface StreamChunk {
  delta: string;
  content: string;
  done: boolean;
}

export class Orchestrator {
  private model: AIModel;
  private tools = new Map<string, Tool>();
  private messages: Message[] = [];
  private iterations = 0;
  private eventEmitter = new SimpleEventEmitter<OrchestratorEvent>();
  private maxIterations: number;
  private customLogic?: (input: string, context: any) => Promise<any>;

  constructor(options: {
    model: string | AIModel;
    tools?: Tool[];
    systemPrompt?: string;
    streaming?: boolean;
    maxIterations?: number;
    customLogic?: (input: string, context: any) => Promise<any>;
  }) {
    // Use ProviderManager for centralized model creation
    this.model = ProviderManager.createModel(options.model);
    
    this.maxIterations = options.maxIterations ?? 10; // Fix: Use nullish coalescing
    this.customLogic = options.customLogic;
    
    // Register tools with validation - Fix: Handle undefined tools properly
    const toolsToRegister = options.tools ?? []; // Fix: Use nullish coalescing
    toolsToRegister.forEach(tool => this.addTool(tool));
    
    // Add system prompt if provided - Fix: Handle undefined systemPrompt
    if (options.systemPrompt !== undefined) { // Fix: Explicit undefined check
      this.messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }
  }

  // Core execution method
  public async execute(input: string): Promise<ExecutionResult> {
    this.eventEmitter.emit({ type: 'start', data: { model: this.model } });
    
    try {
      // If custom logic is provided, use it
      if (this.customLogic) {
        return await this.executeWithCustomLogic(input);
      }

      this.messages.push({
        role: 'user',
        content: input,
      });

      // Main orchestration loop
      while (this.iterations < this.maxIterations) {
        this.iterations++;

        const response = await this.callModel(this.messages);

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.content ?? '', // Fix: Use nullish coalescing
          // Fix: Conditional spreading for toolCalls
          ...(response.toolCalls !== undefined && { toolCalls: response.toolCalls }),
        };

        this.messages.push(assistantMessage);
        this.eventEmitter.emit({ 
          type: 'iteration', 
          data: { iteration: this.iterations, message: assistantMessage } 
        });

        // Handle tool calls if any
        if (response.toolCalls && response.toolCalls.length > 0) {
          for (const toolCall of response.toolCalls) {
            await this.executeToolCall(toolCall);
          }
          continue; // Continue the loop for more iterations
        }

        // No tool calls, we're done
        break;
      }

      const result: ExecutionResult = {
        success: true,
        result: this.messages[this.messages.length - 1]?.content,
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: this.getUsedTools(),
      };

      this.eventEmitter.emit({ type: 'complete', data: result });
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResult: ExecutionResult = {
        success: false,
        error: errorMessage, // Fix: Ensure string type
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: this.getUsedTools(),
      };

      this.eventEmitter.emit({ type: 'error', data: { error: errorMessage } });
      return errorResult;
    }
  }

  // Streaming execution method
  public async *stream(input: string): AsyncGenerator<StreamChunk> {
    this.eventEmitter.emit({ type: 'start', data: { model: this.model } });
    
    try {
      this.messages.push({
        role: 'user',
        content: input,
      });

      const provider = await ProviderManager.createProvider(this.model);
      const toolDefinitions = this.getToolDefinitions();

      const streamConfig: any = {
        model: provider(this.model.model),
        messages: this.transformMessages(this.messages),
      };

      // Add tools if available
      if (toolDefinitions.length > 0) {
        streamConfig.tools = this.convertToAISDKTools(toolDefinitions);
      }

      // Add model parameters conditionally - Fix: Proper undefined checks
      if (this.model.temperature !== undefined) {
        streamConfig.temperature = this.model.temperature;
      }
      if (this.model.maxTokens !== undefined) {
        streamConfig.maxTokens = this.model.maxTokens;
      }
      if (this.model.topP !== undefined) {
        streamConfig.topP = this.model.topP;
      }

      const result = await streamText(streamConfig);

      let content = '';
      for await (const delta of result.textStream) {
        content += delta;
        const chunk: StreamChunk = { delta, content, done: false };
        this.eventEmitter.emit({ type: 'stream', data: chunk });
        yield chunk;
      }

      // Final chunk
      const finalChunk: StreamChunk = { delta: '', content, done: true };
      yield finalChunk;

      // Add final message
      const finalMessage: Message = {
        role: 'assistant',
        content,
        // Fix: Conditional spreading for toolCalls
        ...(result.toolCalls !== undefined && { toolCalls: result.toolCalls }),
      };
      this.messages.push(finalMessage);

    } catch (error) {
      this.eventEmitter.emit({ type: 'error', data: { error: error instanceof Error ? error.message : String(error) } });
      throw error;
    }
  }

  // Tool management methods with validation
  public addTool(tool: Tool): void {
    // Validate tool structure
    if (!tool.name || !tool.description || !tool.execute) {
      throw new Error(`Invalid tool: missing required properties`);
    }
    
    if (!tool.parameters || tool.parameters.type !== 'object') {
      throw new Error(`Invalid tool parameters for ${tool.name}`);
    }
    
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already exists: ${tool.name}`);
    }
    
    this.tools.set(tool.name, tool);
  }

  public removeTool(toolName: string): void {
    this.tools.delete(toolName);
  }

  public getTool(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  public getToolsByCategory(category: Tool['category']): Tool[] {
    return this.getAllTools().filter(tool => tool.category === category);
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

  // Event handling
  public onEvent(handler: (event: OrchestratorEvent) => void): void {
    this.eventEmitter.on(handler);
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
        result: result.content ?? result, // Fix: Use nullish coalescing
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: this.getUsedTools(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: this.getUsedTools(),
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

    // Add model parameters conditionally to avoid undefined values
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

    return {
      content: result.text,
      toolCalls: result.toolCalls,
    };
  }

  private createToolContext(): ToolContext {
    return {
      getModel: async (providerName?: string) => {
        if (providerName && providerName !== this.model.provider) {
          // Create a provider for a different service using ProviderManager
          return await ProviderManager.createProviderByName(providerName);
        }
        return await ProviderManager.createProvider(this.model);
      },
      apiKeys: {
        openai: process.env.OPENAI_API_KEY ?? '', // Fix: Use nullish coalescing
        anthropic: process.env.ANTHROPIC_API_KEY ?? '',
        google: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '',
        perplexity: process.env.PERPLEXITY_API_KEY ?? '',
        xai: process.env.XAI_API_KEY ?? '',
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
      this.eventEmitter.emit({
        type: 'tool_call',
        data: {
          toolName: toolCall.toolName,
          arguments: toolCall.args,
        },
      });

      const tool = this.tools.get(toolCall.toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.toolName}`);
      }

      // Create tool context for AI-powered tools
      const context = this.createToolContext();
      const result = await tool.execute(toolCall.args, context);

      this.eventEmitter.emit({
        type: 'tool_result',
        data: {
          toolName: toolCall.toolName,
          result,
          success: true,
        },
      });

      const toolMessage: Message = {
        role: 'tool',
        content: JSON.stringify(result),
        // Fix: Conditional spreading for toolCallId
        ...(toolCall.toolCallId !== undefined && { toolCallId: toolCall.toolCallId }),
      };
      this.messages.push(toolMessage);

    } catch (error) {
      this.eventEmitter.emit({
        type: 'tool_result',
        data: {
          toolName: toolCall.toolName,
          result: error,
          success: false,
        },
      });

      const errorMessage: Message = {
        role: 'tool',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        // Fix: Conditional spreading for toolCallId
        ...(toolCall.toolCallId !== undefined && { toolCallId: toolCall.toolCallId }),
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
          return { role: 'assistant' as const, content: m.content };
        } else if (m.role === 'tool') {
          return { 
            role: 'tool' as const, 
            content: [{ 
              type: 'tool-result' as const, 
              toolCallId: m.toolCallId ?? '', // Fix: Use nullish coalescing
              toolName: 'unknown',
              result: m.content 
            }] 
          };
        }
        return { role: 'user' as const, content: m.content };
      });
  }

  private getUsedTools(): string[] {
    return this.messages
      .filter(m => m.role === 'tool')
      .map(m => m.toolCallId ?? 'unknown') // Fix: Use nullish coalescing
      .filter((value, index, self) => self.indexOf(value) === index);
  }
}