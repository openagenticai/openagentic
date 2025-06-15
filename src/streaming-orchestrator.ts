import { streamText } from 'ai';
import type { AIModel, Tool, Message, ToolContext } from './types';
import { ProviderManager } from './providers/manager';

export class StreamingOrchestrator {
  private model: AIModel;
  private tools = new Map<string, Tool>();
  private messages: Message[] = [];
  private maxIterations: number;

  constructor(options: {
    model: string | AIModel;
    tools?: Tool[];
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
    const toolDefinitions = this.getToolDefinitions();

    const streamConfig: any = {
      model: provider(this.model.model),
      messages: this.transformMessages(this.messages),
    };

    // Add tools if available
    if (toolDefinitions.length > 0) {
      streamConfig.tools = this.convertToAISDKTools(toolDefinitions);
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