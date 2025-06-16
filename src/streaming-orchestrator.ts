import { streamText } from 'ai';
import type { AIModel, CoreMessage, OpenAgenticTool, Message } from './types';
import { ProviderManager } from './providers/manager';

export class StreamingOrchestrator {
  private model: AIModel;
  private tools = new Map<string, OpenAgenticTool>();
  private messages: Message[] = [];
  private maxIterations: number;

  constructor(options: {
    model: string | AIModel;
    tools?: OpenAgenticTool[];
    systemPrompt?: string;
    maxIterations?: number;
  }) {
    // Use ProviderManager for centralized model creation
    this.model = ProviderManager.createModel(options.model);
    this.maxIterations = options.maxIterations || 10;
    
    // Register tools with validation
    if (options.tools) {
      options.tools.forEach(tool => this.addTool(tool));
    }
    
    // Add system prompt if provided
    if (options.systemPrompt) {
      this.messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }
  }

  // Streaming method - supports both string and message array inputs
  public async stream(input: string): Promise<ReturnType<typeof streamText>>;
  public async stream(messages: CoreMessage[]): Promise<ReturnType<typeof streamText>>;
  public async stream(input: string | CoreMessage[]): Promise<ReturnType<typeof streamText>> {
    // Handle different input types
    if (typeof input === 'string') {
      return await this.streamWithString(input);
    } else if (Array.isArray(input)) {
      return await this.streamWithMessages(input);
    } else {
      throw new Error('Input must be either a string or an array of messages');
    }
  }

  // Stream with string input (original behavior)
  private async streamWithString(input: string): Promise<ReturnType<typeof streamText>> {
    this.messages.push({ role: 'user', content: input });
    
    const provider = await ProviderManager.createProvider(this.model);

    const streamConfig: any = {
      model: provider(this.model.model),
      messages: this.transformMessages(this.messages),
      maxSteps: this.maxIterations,
      toolCallStreaming: true, // Enable streaming of tool call deltas
    };

    // Add system message if it exists
    const systemMessage = this.messages.find(m => m.role === 'system');
    if (systemMessage) {
      streamConfig.system = systemMessage.content;
    }

    // Add tools if available - convert to AI SDK format
    if (this.tools.size > 0) {
      streamConfig.tools = this.convertToAISDKTools();
    }

    // Add model parameters conditionally
    if (this.model.temperature !== undefined) {
      streamConfig.temperature = this.model.temperature;
    }
    if (this.model.maxTokens !== undefined) {
      streamConfig.maxTokens = this.model.maxTokens;
    }
    if (this.model.topP !== undefined) {
      streamConfig.topP = this.model.topP;
    }

    return streamText(streamConfig);
  }

  // Stream with message array (new behavior)
  private async streamWithMessages(inputMessages: CoreMessage[]): Promise<ReturnType<typeof streamText>> {
    const provider = await ProviderManager.createProvider(this.model);

    // Convert CoreMessage[] to AI SDK compatible format
    const convertedMessages = this.convertCoresToAISDK(inputMessages);

    const streamConfig: any = {
      model: provider(this.model.model),
      messages: convertedMessages,
      maxSteps: this.maxIterations,
    };

    // Extract system message from input if present, otherwise use existing one
    const systemMessage = inputMessages.find(m => m.role === 'system');
    if (systemMessage) {
      streamConfig.system = typeof systemMessage.content === 'string' 
        ? systemMessage.content 
        : JSON.stringify(systemMessage.content);
    } else {
      const existingSystemMessage = this.messages.find(m => m.role === 'system');
      if (existingSystemMessage) {
        streamConfig.system = existingSystemMessage.content;
      }
    }

    // Add tools if available - convert to AI SDK format
    if (this.tools.size > 0) {
      streamConfig.tools = this.convertToAISDKTools();
    }

    // Add model parameters conditionally
    if (this.model.temperature !== undefined) {
      streamConfig.temperature = this.model.temperature;
    }
    if (this.model.maxTokens !== undefined) {
      streamConfig.maxTokens = this.model.maxTokens;
    }
    if (this.model.topP !== undefined) {
      streamConfig.topP = this.model.topP;
    }

    // Update internal messages with the full conversation context
    this.messages = [
      ...this.messages.filter(m => m.role === 'system'),
      ...this.convertCoreToInternal(inputMessages.filter(m => m.role !== 'system'))
    ];

    return streamText(streamConfig);
  }

  // Tool management methods
  public addTool(tool: OpenAgenticTool): void {
    // Validate tool structure
    if (!tool.toolId || !tool.description || !tool.execute) {
      throw new Error(`Invalid tool: missing required properties`);
    }
    
    if (this.tools.has(tool.toolId)) {
      throw new Error(`Tool already exists: ${tool.toolId}`);
    }
    
    this.tools.set(tool.toolId, tool);
  }

  public removeTool(toolName: string): void {
    this.tools.delete(toolName);
  }

  public getTool(toolName: string): OpenAgenticTool | undefined {
    return this.tools.get(toolName);
  }

  public getAllTools(): OpenAgenticTool[] {
    return Array.from(this.tools.values());
  }

  // Model switching using ProviderManager
  public switchModel(model: string | AIModel): void {
    this.model = ProviderManager.createModel(model);
  }

  // Get model information
  public getModelInfo(): any {
    try {
      const modelInfo = ProviderManager.getModelInfo(this.model.provider, this.model.model) as any;
      return {
        provider: this.model.provider,
        model: this.model.model,
        contextWindow: modelInfo?.contextWindow,
        cost: modelInfo?.cost,
        description: modelInfo?.description,
      };
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
  }

  public clear(): void {
    this.messages = [];
  }

  // Helper methods for message conversion
  private convertCoresToAISDK(coreMessages: CoreMessage[]): any[] {
    return coreMessages
      .filter(m => m.role !== 'system') // System messages handled separately
      .map(m => {
        if (m.role === 'user') {
          return { 
            role: 'user' as const, 
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          };
        } else if (m.role === 'assistant') {
          return { 
            role: 'assistant' as const, 
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          };
        } else if (m.role === 'tool') {
          return { 
            role: 'tool' as const, 
            content: [{ 
              type: 'tool-result' as const, 
              toolCallId: m.toolCallId || '',
              toolName: 'unknown',
              result: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            }] 
          };
        }
        return { 
          role: 'user' as const, 
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        };
      });
  }

  private convertCoreToInternal(coreMessages: CoreMessage[]): Message[] {
    return coreMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      toolCallId: m.toolCallId,
      toolCalls: m.toolCalls,
    }));
  }

  private convertToAISDKTools(): Record<string, any> {
    const tools: Record<string, any> = {};
    
      this.tools.forEach((tool) => {
        tools[tool.toolId] = {
            description: tool.description,
            parameters: tool.parameters,
            execute: async (args: any, context?: any) => {
              console.log(`🔧 StreamingOrchestrator executing tool: ${tool.toolId}`, args);
              try {
                if (!tool.execute) {
                  throw new Error(`Tool ${tool.toolId} has no execute function`);
                }
                const result = await tool.execute(args, context);
                console.log(`✅ StreamingOrchestrator tool success: ${tool.toolId}`, { 
                  resultType: typeof result,
                  resultPreview: typeof result === 'string' ? result.substring(0, 100) + '...' : JSON.stringify(result).substring(0, 100) + '...'
                });
                return result;
              } catch (error) {
                console.error(`❌ StreamingOrchestrator tool error: ${tool.toolId}`, error);
                throw error;
              }
            },
          }
        });
    
    return tools;
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
              toolCallId: m.toolCallId || '',
              toolName: 'unknown',
              result: m.content 
            }] 
          };
        }
        return { role: 'user' as const, content: m.content };
      });
  }
}