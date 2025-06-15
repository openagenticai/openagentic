import { generateText, streamText } from 'ai';
import type { 
  AIModel, 
  Tool, 
  Message, 
  ExecutionResult,
  OrchestratorEvent 
} from '../types';
import { SimpleEventEmitter } from '../utils/simple-event-emitter';

export class Orchestrator {
  private messages: Message[] = [];
  private iterations = 0;
  private eventEmitter = new SimpleEventEmitter<OrchestratorEvent>();
  private toolRegistry = new Map<string, Tool>();

  constructor(
    private model: AIModel,
    tools: Tool[] = [],
    systemPrompt?: string,
    private streaming = false
  ) {
    // Register tools
    tools.forEach(tool => this.toolRegistry.set(tool.name, tool));
    
    // Add system prompt if provided
    if (systemPrompt) {
      this.messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
  }

  public async execute(userMessage: string): Promise<ExecutionResult> {
    this.eventEmitter.emit({ type: 'start', data: { model: this.model } });
    
    try {
      this.messages.push({
        role: 'user',
        content: userMessage,
      });

      const response = await this.callModel(this.messages);
      this.iterations++;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content || '',
        toolCalls: response.toolCalls,
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
      const errorResult: ExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: this.getUsedTools(),
      };

      this.eventEmitter.emit({ type: 'error', data: { error: errorResult.error! } });
      return errorResult;
    }
  }

  public async callModel(messages: Message[]): Promise<any> {
    const provider = await this.createProvider();
    const toolDefinitions = this.getToolDefinitions();

    if (this.streaming) {
      const result = await streamText({
        model: provider(this.model.model),
        messages: this.transformMessages(messages),
        tools: toolDefinitions.length > 0 ? this.convertToAISDKTools(toolDefinitions) : undefined,
        temperature: this.model.temperature,
        maxTokens: this.model.maxTokens,
        topP: this.model.topP,
      });

      let content = '';
      for await (const delta of result.textStream) {
        content += delta;
        this.eventEmitter.emit({ type: 'stream', data: { delta, content } });
      }

      return {
        content,
        toolCalls: result.toolCalls,
      };
    } else {
      const result = await generateText({
        model: provider(this.model.model),
        messages: this.transformMessages(messages),
        tools: toolDefinitions.length > 0 ? this.convertToAISDKTools(toolDefinitions) : undefined,
        temperature: this.model.temperature,
        maxTokens: this.model.maxTokens,
        topP: this.model.topP,
      });

      return {
        content: result.text,
        toolCalls: result.toolCalls,
      };
    }
  }

  private async createProvider(): Promise<any> {
    const apiKey = this.model.apiKey || '';
    
    switch (this.model.provider) {
      case 'openai': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        return createOpenAI({
          baseURL: this.model.baseURL,
          apiKey,
        });
      }
      case 'anthropic': {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        return createAnthropic({ apiKey });
      }
      case 'google': {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        return createGoogleGenerativeAI({ apiKey });
      }
      case 'google-vertex': {
        const { createVertex } = await import('@ai-sdk/google-vertex');
        return createVertex({
          project: this.model.project || '',
          location: this.model.location || '',
        });
      }
      case 'perplexity': {
        const { createPerplexity } = await import('@ai-sdk/perplexity');
        return createPerplexity({ apiKey });
      }
      case 'xai': {
        const { createXai } = await import('@ai-sdk/xai');
        return createXai({ apiKey });
      }
      default:
        throw new Error(`Unsupported provider: ${this.model.provider}`);
    }
  }

  private getToolDefinitions(): any[] {
    return Array.from(this.toolRegistry.values()).map(tool => ({
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
      const tool = this.toolRegistry.get(def.function.name);
      if (tool) {
        tools[def.function.name] = {
          description: def.function.description,
          parameters: def.function.parameters,
          execute: tool.execute,
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

      const tool = this.toolRegistry.get(toolCall.toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.toolName}`);
      }

      const result = await tool.execute(toolCall.args);

      this.eventEmitter.emit({
        type: 'tool_result',
        data: {
          toolName: toolCall.toolName,
          result,
          success: true,
        },
      });

      this.messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        toolCallId: toolCall.toolCallId,
      });

    } catch (error) {
      this.eventEmitter.emit({
        type: 'tool_result',
        data: {
          toolName: toolCall.toolName,
          result: error,
          success: false,
        },
      });

      this.messages.push({
        role: 'tool',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        toolCallId: toolCall.toolCallId,
      });
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
              toolCallId: m.toolCallId || '', 
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
      .map(m => m.toolCallId || 'unknown')
      .filter((value, index, self) => self.indexOf(value) === index);
  }

  public onEvent(handler: (event: OrchestratorEvent) => void): void {
    this.eventEmitter.on(handler);
  }

  public getMessages(): Message[] {
    return [...this.messages];
  }

  public addMessage(message: Message): void {
    this.messages.push(message);
  }

  public switchModel(newModel: AIModel): void {
    this.model = newModel;
  }

  public reset(): void {
    this.messages = this.messages.filter(m => m.role === 'system');
    this.iterations = 0;
  }

  // Custom orchestration support
  public async executeWithCustomLogic(
    userMessage: string,
    customLogic: (orchestrator: Orchestrator, messages: Message[]) => Promise<any>
  ): Promise<ExecutionResult> {
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const result = await customLogic(this, this.messages);
      
      return {
        success: true,
        result: result.content || result,
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
}