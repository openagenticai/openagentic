import { streamText } from 'ai';
import type { AIModel, CoreMessage, OpenAgenticTool, Message, LoggingConfig, LogLevel, ExecutionStats } from './types';
import { ProviderManager } from './providers/manager';

export class StreamingOrchestrator {
  private model: AIModel;
  private tools = new Map<string, OpenAgenticTool>();
  private messages: Message[] = [];
  private maxIterations: number;
  
  // Logging configuration
  private loggingConfig: LoggingConfig;
  private executionStartTime = 0;
  private stepTimings: number[] = [];
  private toolCallTimings: number[] = [];
  private stepsExecuted = 0;
  private toolCallsExecuted = 0;
  private chunksProcessed = 0;
  private totalTextLength = 0;

  // User-provided callback
  private onFinishCallback?: (result: any) => void | Promise<void>;

  constructor(options: {
    model: string | AIModel;
    tools?: OpenAgenticTool[];
    systemPrompt?: string;
    maxIterations?: number;
    enableDebugLogging?: boolean;
    logLevel?: LogLevel;
    enableStepLogging?: boolean;
    enableToolLogging?: boolean;
    enableTimingLogging?: boolean;
    enableStatisticsLogging?: boolean;
    enableStreamingLogging?: boolean;
    onFinish?: (result: any) => void | Promise<void>;
  }) {
    // Use ProviderManager for centralized model creation
    this.model = ProviderManager.createModel(options.model);
    this.maxIterations = options.maxIterations || 10;
    
    // Configure logging
    this.loggingConfig = {
      enableDebugLogging: options.enableDebugLogging ?? false,
      logLevel: options.logLevel ?? 'basic',
      enableStepLogging: options.enableStepLogging ?? false,
      enableToolLogging: options.enableToolLogging ?? false,
      enableTimingLogging: options.enableTimingLogging ?? false,
      enableStatisticsLogging: options.enableStatisticsLogging ?? false,
    };

    // Store user-provided onFinish callback
    this.onFinishCallback = options.onFinish;
    
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

    this.log('🔧', 'StreamingOrchestrator initialized', {
      model: `${this.model.provider}/${this.model.model}`,
      toolsCount: this.tools.size,
      maxIterations: this.maxIterations,
      loggingLevel: this.loggingConfig.logLevel,
      hasOnFinishCallback: !!this.onFinishCallback,
    });
  }

  // Streaming method - supports both string and message array inputs
  public async stream(input: string): Promise<ReturnType<typeof streamText>>;
  public async stream(messages: CoreMessage[]): Promise<ReturnType<typeof streamText>>;
  public async stream(input: string | CoreMessage[]): Promise<ReturnType<typeof streamText>> {
    this.executionStartTime = Date.now();
    this.resetExecutionStats();
    
    try {
      const inputType = typeof input === 'string' ? 'string' : 
                       Array.isArray(input) ? 'message_array' : 
                       'invalid';
      const inputLength = typeof input === 'string' ? input.length : 
                         Array.isArray(input) ? input.length : 
                         'unknown';
      
      this.log('🚀', 'Streaming execution starting', {
        inputType,
        inputLength,
        modelInfo: `${this.model.provider}/${this.model.model}`,
        toolsAvailable: this.tools.size,
        maxSteps: this.maxIterations,
      });

      // Handle different input types
      if (typeof input === 'string') {
        return await this.streamWithString(input);
      } else if (Array.isArray(input)) {
        return await this.streamWithMessages(input);
      } else {
        throw new Error('Input must be either a string or an array of messages');
      }
    } catch (error) {
      const executionStats = this.calculateExecutionStats();
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      
      this.log('❌', 'Streaming execution failed', {
        error: errorMessage,
        totalDuration: executionStats.totalDuration,
        stepsExecuted: executionStats.stepsExecuted,
        toolCallsExecuted: executionStats.toolCallsExecuted,
        chunksProcessed: this.chunksProcessed,
        stackTrace: error instanceof Error ? error.stack : undefined,
      });
      
      throw error;
    }
  }

  // Stream with string input (original behavior) - enhanced error handling
  private async streamWithString(input: string): Promise<ReturnType<typeof streamText>> {
    this.messages.push({ role: 'user', content: input });
    
    const provider = await ProviderManager.createProvider(this.model);

    const streamConfig: any = {
      model: provider(this.model.model),
      messages: this.transformMessages(this.messages),
      maxSteps: this.maxIterations,
      onStepFinish: this.createStepFinishCallback(),
      onChunk: this.createChunkCallback(),
      onFinish: this.createFinishCallback(),
      onError: this.createErrorCallback(),
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

    this.log('📝', 'Starting text streaming', {
      prompt: this.sanitizeForLogging(input),
      systemMessage: systemMessage ? 'present' : 'none',
      toolsEnabled: this.tools.size > 0,
    });

    try {
      return streamText(streamConfig);
    } catch (error) {
      this.log('❌', 'StreamText execution failed', {
        error: error instanceof Error ? error.message : JSON.stringify(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        config: {
          model: this.model.model,
          provider: this.model.provider,
          toolsCount: this.tools.size,
        },
      });
      throw error;
    }
  }

  // Stream with message array (new behavior) - enhanced error handling
  private async streamWithMessages(inputMessages: CoreMessage[]): Promise<ReturnType<typeof streamText>> {
    const provider = await ProviderManager.createProvider(this.model);

    // Convert CoreMessage[] to AI SDK compatible format
    const convertedMessages = this.convertCoresToAISDK(inputMessages);

    this.log('📝', 'Processing message array for streaming', {
      messageCount: inputMessages.length,
      messageTypes: inputMessages.map(m => m.role),
      hasSystemMessage: inputMessages.some(m => m.role === 'system'),
      lastMessageRole: inputMessages[inputMessages.length - 1]?.role,
    });

    const streamConfig: any = {
      model: provider(this.model.model),
      messages: convertedMessages,
      maxSteps: this.maxIterations,
      onStepFinish: this.createStepFinishCallback(),
      onChunk: this.createChunkCallback(),
      onFinish: this.createFinishCallback(),
      onError: this.createErrorCallback(),
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

    try {
      return streamText(streamConfig);
    } catch (error) {
      this.log('❌', 'StreamText execution failed', {
        error: error instanceof Error ? error.message : JSON.stringify(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        config: {
          model: this.model.model,
          provider: this.model.provider,
          messageCount: inputMessages.length,
          toolsCount: this.tools.size,
        },
      });
      throw error;
    }
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
    this.log('🔧', 'Tool added', { toolId: tool.toolId, toolName: tool.name });
  }

  public removeTool(toolName: string): void {
    if (this.tools.has(toolName)) {
      this.tools.delete(toolName);
      this.log('🗑️', 'Tool removed', { toolId: toolName });
    }
  }

  public getTool(toolName: string): OpenAgenticTool | undefined {
    return this.tools.get(toolName);
  }

  public getAllTools(): OpenAgenticTool[] {
    return Array.from(this.tools.values());
  }

  // Model switching using ProviderManager
  public switchModel(model: string | AIModel): void {
    const oldModel = `${this.model.provider}/${this.model.model}`;
    this.model = ProviderManager.createModel(model);
    const newModel = `${this.model.provider}/${this.model.model}`;
    
    this.log('🔄', 'Model switched', { 
      from: oldModel, 
      to: newModel,
      temperature: this.model.temperature,
      maxTokens: this.model.maxTokens,
    });
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
    this.log('💬', 'Message added', { role: message.role, contentLength: message.content.length });
  }

  public reset(): void {
    this.messages = this.messages.filter(m => m.role === 'system');
    this.resetExecutionStats();
    this.log('🔄', 'StreamingOrchestrator reset', { systemMessagesRetained: this.messages.filter(m => m.role === 'system').length });
  }

  public clear(): void {
    this.messages = [];
    this.resetExecutionStats();
    this.log('🧹', 'StreamingOrchestrator cleared', { allMessagesRemoved: true });
  }

  // Create streaming-specific callbacks
  private createStepFinishCallback() {
    return (result: any) => {
      const stepDuration = Date.now() - this.executionStartTime;
      this.stepTimings.push(stepDuration);

      // Increment step count
      this.stepsExecuted++;
      
      const toolCallsInStep = result.toolCalls?.map((tc: any) => tc.toolName || tc.toolCallId || 'unknown') || [];
      
      this.log('📝', `Step ${this.stepsExecuted} completed`, {
        stepType: result.stepType || 'unknown',
        finishReason: result.finishReason || 'unknown',
        duration: `${stepDuration}ms`,
        toolCalls: toolCallsInStep,
        text: result.text ? `${result.text.length} chars` : 'no_text',
        reasoning: result.reasoning ? 'has_reasoning' : 'no_reasoning',
        tokensUsed: result.usage?.totalTokens || 'unknown',
      });
    };
  }

  private createChunkCallback() {
    return (chunk: any) => {
      this.chunksProcessed++;
      const chunkText = chunk.delta?.content || '';
      this.totalTextLength += chunkText.length;
      
      // Only log chunk details in detailed mode to avoid overwhelming output
      if (this.loggingConfig.logLevel === 'detailed' && this.chunksProcessed % 10 === 0) {
        this.log('💬', `Chunk processed`, {
          chunkNumber: this.chunksProcessed,
          chunkSize: chunkText.length,
          totalTextLength: this.totalTextLength,
          chunkType: chunk.type || 'unknown',
        });
      }
    };
  }

  private createFinishCallback() {
    return async (result: any) => {
      // First, call the user-provided onFinish callback if it exists
      if (this.onFinishCallback) {
        try {
          this.log('🎯', 'Calling user onFinish callback', {
            hasResult: !!result,
            resultKeys: result ? Object.keys(result) : [],
          });

          // Handle both sync and async callbacks
          const callbackResult = this.onFinishCallback(result);
          if (callbackResult && typeof callbackResult.then === 'function') {
            await callbackResult;
          }

          this.log('✅', 'User onFinish callback completed successfully');
        } catch (error) {
          // Log callback error but don't break the internal flow
          this.log('❌', 'User onFinish callback failed', {
            error: error instanceof Error ? error.message : JSON.stringify(error),
            stackTrace: error instanceof Error ? error.stack : undefined,
          });
        }
      }

      // Then execute the existing internal logging logic
      const executionStats = this.calculateExecutionStats();
      
      this.log('🏁', 'Streaming completed', {
        totalDuration: executionStats.totalDuration,
        stepsExecuted: executionStats.stepsExecuted,
        toolCallsExecuted: executionStats.toolCallsExecuted,
        chunksProcessed: this.chunksProcessed,
        totalTextLength: this.totalTextLength,
        averageChunkSize: this.chunksProcessed > 0 ? Math.round(this.totalTextLength / this.chunksProcessed) : 0,
        finishReason: result.finishReason,
        tokensUsed: result.usage?.totalTokens,
      });
    };
  }

  private createErrorCallback() {
    return (error: any) => {
      const executionStats = this.calculateExecutionStats();
      
      this.log('❌', 'Streaming error occurred', {
        error: error.message || JSON.stringify(error),
        totalDuration: executionStats.totalDuration,
        stepsExecuted: executionStats.stepsExecuted,
        toolCallsExecuted: executionStats.toolCallsExecuted,
        chunksProcessed: this.chunksProcessed,
        stackTrace: error.stack,
        errorType: error.constructor?.name || 'Unknown',
        modelInfo: `${this.model.provider}/${this.model.model}`,
        toolsAvailable: this.tools.size,
      });
    };
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
          const toolCallStartTime = Date.now();
          
          this.log('🔧', `Tool execution starting: ${tool.toolId}`, {
            toolName: tool.name,
            parameters: this.sanitizeForLogging(args),
            context: context ? 'present' : 'none',
          });
          
          try {
            if (!tool.execute) {
              throw new Error(`Tool ${tool.toolId} has no execute function`);
            }
            
            const result = await tool.execute(args, context);
            const toolCallDuration = Date.now() - toolCallStartTime;
            this.toolCallTimings.push(toolCallDuration);
            this.toolCallsExecuted++;
            
            this.log('✅', `Tool execution completed: ${tool.toolId}`, {
              duration: `${toolCallDuration}ms`,
              resultType: typeof result,
              resultSize: typeof result === 'string' ? result.length : JSON.stringify(result).length,
              success: true,
            });
            
            return result;
          } catch (error) {
            const toolCallDuration = Date.now() - toolCallStartTime;
            this.toolCallTimings.push(toolCallDuration);
            
            this.log('❌', `Tool execution failed: ${tool.toolId}`, {
              duration: `${toolCallDuration}ms`,
              error: error instanceof Error ? error.message : JSON.stringify(error),
              stackTrace: error instanceof Error ? error.stack : undefined,
              parameters: this.sanitizeForLogging(args),
            });
            
            throw error;
          }
        },
      };
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

  // Logging and statistics methods
  private log(emoji: string, message: string, data?: any): void {
    if (!this.loggingConfig.enableDebugLogging || this.loggingConfig.logLevel === 'none') {
      return;
    }

    const timestamp = new Date().toISOString();
    const logLevel = this.loggingConfig.logLevel;
    
    if (logLevel === 'basic') {
      console.log(`${emoji} [${timestamp}] ${message}`);
    } else if (logLevel === 'detailed' && data) {
      console.log(`${emoji} [${timestamp}] ${message}`, data);
    }
  }

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

  private resetExecutionStats(): void {
    this.stepTimings = [];
    this.toolCallTimings = [];
    this.stepsExecuted = 0;
    this.toolCallsExecuted = 0;
    this.chunksProcessed = 0;
    this.totalTextLength = 0;
  }

  private calculateExecutionStats(): ExecutionStats {
    const totalDuration = Date.now() - this.executionStartTime;
    const averageStepDuration = this.stepTimings.length > 0 
      ? this.stepTimings.reduce((a, b) => a + b, 0) / this.stepTimings.length 
      : 0;
    const averageToolCallDuration = this.toolCallTimings.length > 0 
      ? this.toolCallTimings.reduce((a, b) => a + b, 0) / this.toolCallTimings.length 
      : 0;

    return {
      totalDuration,
      stepsExecuted: this.stepsExecuted,
      toolCallsExecuted: this.toolCallsExecuted,
      averageStepDuration: Math.round(averageStepDuration),
      averageToolCallDuration: Math.round(averageToolCallDuration),
    };
  }
}