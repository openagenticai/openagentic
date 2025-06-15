import { generateText, streamText } from 'ai';
import type { 
  AIModel, 
  Tool, 
  Message, 
  ExecutionResult,
  OrchestratorEvent 
} from '../types';
import { SimpleEventEmitter } from '../utils/simple-event-emitter';

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
    // Auto-detect provider and create AIModel if string provided
    this.model = typeof options.model === 'string' 
      ? this.autoDetectModel(options.model)
      : options.model;
    
    this.maxIterations = options.maxIterations || 10;
    this.customLogic = options.customLogic;
    
    // Register tools
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

  // Streaming execution method
  public async *stream(input: string): AsyncGenerator<StreamChunk> {
    this.eventEmitter.emit({ type: 'start', data: { model: this.model } });
    
    try {
      this.messages.push({
        role: 'user',
        content: input,
      });

      const provider = await this.createProvider();
      const toolDefinitions = this.getToolDefinitions();

      const result = await streamText({
        model: provider(this.model.model),
        messages: this.transformMessages(this.messages),
        tools: toolDefinitions.length > 0 ? this.convertToAISDKTools(toolDefinitions) : undefined,
        ...(this.model.temperature !== undefined && { temperature: this.model.temperature }),
        ...(this.model.maxTokens !== undefined && { maxTokens: this.model.maxTokens }),
        ...(this.model.topP !== undefined && { topP: this.model.topP }),
      });

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
      this.messages.push({
        role: 'assistant',
        content,
        toolCalls: result.toolCalls,
      });

    } catch (error) {
      this.eventEmitter.emit({ type: 'error', data: { error: error instanceof Error ? error.message : String(error) } });
      throw error;
    }
  }

  // Tool management methods
  public addTool(tool: Tool): void {
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

  // Model switching
  public switchModel(model: string | AIModel): void {
    this.model = typeof model === 'string' 
      ? this.autoDetectModel(model)
      : model;
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
  private autoDetectModel(modelString: string): AIModel {
    // Auto-detect provider based on model name
    let provider: AIModel['provider'];
    let apiKey: string | undefined;

    if (modelString.includes('gpt') || modelString.includes('o1') || modelString.includes('o3')) {
      provider = 'openai';
      apiKey = process.env.OPENAI_API_KEY;
    } else if (modelString.includes('claude')) {
      provider = 'anthropic';
      apiKey = process.env.ANTHROPIC_API_KEY;
    } else if (modelString.includes('gemini')) {
      provider = 'google';
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    } else if (modelString.includes('grok')) {
      provider = 'xai';
      apiKey = process.env.XAI_API_KEY;
    } else if (modelString.includes('llama') && modelString.includes('sonar')) {
      provider = 'perplexity';
      apiKey = process.env.PERPLEXITY_API_KEY;
    } else {
      // Default to OpenAI
      provider = 'openai';
      apiKey = process.env.OPENAI_API_KEY;
    }

    return {
      provider,
      model: modelString,
      apiKey,
      temperature: 0.7,
    };
  }

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
    const provider = await this.createProvider();
    const toolDefinitions = this.getToolDefinitions();

    const result = await generateText({
      model: provider(this.model.model),
      messages: this.transformMessages(messages),
      tools: toolDefinitions.length > 0 ? this.convertToAISDKTools(toolDefinitions) : undefined,
      ...(this.model.temperature !== undefined && { temperature: this.model.temperature }),
      ...(this.model.maxTokens !== undefined && { maxTokens: this.model.maxTokens }),
      ...(this.model.topP !== undefined && { topP: this.model.topP }),
    });

    return {
      content: result.text,
      toolCalls: result.toolCalls,
    };
  }

  private async createProvider(): Promise<any> {
    const apiKey = this.model.apiKey || '';
    
    switch (this.model.provider) {
      case 'openai': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const config: any = {};
        if (apiKey) config.apiKey = apiKey;
        if (this.model.baseURL) config.baseURL = this.model.baseURL;
        return createOpenAI(config);
      }
      case 'anthropic': {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const config: any = {};
        if (apiKey) config.apiKey = apiKey;
        return createAnthropic(config);
      }
      case 'google': {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const config: any = {};
        if (apiKey) config.apiKey = apiKey;
        return createGoogleGenerativeAI(config);
      }
      case 'google-vertex': {
        const { createVertex } = await import('@ai-sdk/google-vertex');
        const config: any = {};
        if (this.model.project) config.project = this.model.project;
        if (this.model.location) config.location = this.model.location;
        return createVertex(config);
      }
      case 'perplexity': {
        const { createPerplexity } = await import('@ai-sdk/perplexity');
        const config: any = {};
        if (apiKey) config.apiKey = apiKey;
        return createPerplexity(config);
      }
      case 'xai': {
        const { createXai } = await import('@ai-sdk/xai');
        const config: any = {};
        if (apiKey) config.apiKey = apiKey;
        return createXai(config);
      }
      default:
        throw new Error(`Unsupported provider: ${this.model.provider}`);
    }
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

      const tool = this.tools.get(toolCall.toolName);
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
}