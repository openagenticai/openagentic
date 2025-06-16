import { streamText } from 'ai';
import type { AIModel, OpenAgenticTool, Message } from './types';
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

  // Streaming method - returns AI SDK's streamText result directly
  public async stream(input: string): Promise<ReturnType<typeof streamText>> {
    this.messages.push({ role: 'user', content: input });
    
    const provider = await ProviderManager.createProvider(this.model);

    const streamConfig: any = {
      model: provider(this.model.model),
      messages: this.transformMessages(this.messages),
      maxSteps: this.maxIterations,
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

  // Helper methods
  private convertToAISDKTools(): Record<string, any> {
    const tools: Record<string, any> = {};
    
      this.tools.forEach((tool) => {
        tools[tool.toolId] = {
            description: tool.description,
            parameters: tool.parameters,
            execute: tool.execute,
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