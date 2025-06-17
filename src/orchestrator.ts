import { generateText } from 'ai';
import type { AIModel, Message, CoreMessage, ExecutionResult, OpenAgenticTool, LoggingConfig, LogLevel, ExecutionStats, StepInfo } from './types';
import { ProviderManager } from './providers/manager';

export class Orchestrator {
  private model: AIModel;
  private tools: Record<string, OpenAgenticTool> = {};
  private messages: Message[] = [];
  private iterations = 0;
  private maxIterations: number;
  private customLogic?: (input: string, context: any) => Promise<any>;
  
  // Logging configuration
  private loggingConfig: LoggingConfig;
  private executionStartTime = 0;
  private stepTimings: number[] = [];
  private toolCallTimings: number[] = [];
  private stepsExecuted = 0;
  private toolCallsExecuted = 0;

  constructor(options: {
    model: string | AIModel;
    tools?: any[];
    systemPrompt?: string;
    maxIterations?: number;
    customLogic?: (input: string, context: any) => Promise<any>;
    enableDebugLogging?: boolean;
    logLevel?: LogLevel;
    enableStepLogging?: boolean;
    enableToolLogging?: boolean;
    enableTimingLogging?: boolean;
    enableStatisticsLogging?: boolean;
  }) {
    // Use ProviderManager for centralized model creation
    this.model = ProviderManager.createModel(options.model);
    this.maxIterations = options.maxIterations || 10;
    this.customLogic = options.customLogic;
    
    // Configure logging
    this.loggingConfig = {
      enableDebugLogging: options.enableDebugLogging ?? false,
      logLevel: options.logLevel ?? 'basic',
      enableStepLogging: options.enableStepLogging ?? false,
      enableToolLogging: options.enableToolLogging ?? false,
      enableTimingLogging: options.enableTimingLogging ?? false,
      enableStatisticsLogging: options.enableStatisticsLogging ?? false,
    };
    
    // Register tools with validation
    if (options.tools) {
      options.tools.forEach((tool, index) => {
        const toolName = tool.toolId;
      
        // Ensure toolId uniqueness
        if (this.tools[toolName]) {
          throw new Error(`Tool with name ${toolName} already exists`);
        }
        
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

    this.log('🔧', 'Orchestrator initialized', {
      model: `${this.model.provider}/${this.model.model}`,
      toolsCount: Object.keys(this.tools).length,
      maxIterations: this.maxIterations,
      loggingLevel: this.loggingConfig.logLevel,
    });
  }

  // Core execution method - supports both string and message array inputs
  public async execute(input: string): Promise<ExecutionResult>;
  public async execute(messages: CoreMessage[]): Promise<ExecutionResult>;
  public async execute(input: string | CoreMessage[]): Promise<ExecutionResult> {
    this.executionStartTime = Date.now();
    this.resetExecutionStats();
    
    try {
      // Validate input before logging to prevent errors
      const inputType = typeof input === 'string' ? 'string' : 
                       Array.isArray(input) ? 'message_array' : 
                       'invalid';
      const inputLength = typeof input === 'string' ? input.length : 
                         Array.isArray(input) ? input.length : 
                         'unknown';
      
      this.log('🚀', 'Execution starting', {
        inputType,
        inputLength,
        modelInfo: `${this.model.provider}/${this.model.model}`,
        toolsAvailable: Object.keys(this.tools).length,
        maxSteps: this.maxIterations,
      });

      // Handle different input types
      let result: ExecutionResult;
      if (typeof input === 'string') {
        result = await this.executeWithString(input);
      } else if (Array.isArray(input)) {
        result = await this.executeWithMessages(input);
      } else {
        throw new Error('Input must be either a string or an array of messages');
      }

      // Add execution statistics to result
      const executionStats = this.calculateExecutionStats();
      result.executionStats = executionStats;

      this.log('✅', 'Execution completed successfully', {
        totalDuration: executionStats.totalDuration,
        stepsExecuted: executionStats.stepsExecuted,
        toolCallsExecuted: executionStats.toolCallsExecuted,
        averageStepDuration: executionStats.averageStepDuration,
        resultLength: result.result?.length || 0,
      });

      return result;
    } catch (error) {
      const executionStats = this.calculateExecutionStats();
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      
      this.log('❌', 'Execution failed', {
        error: errorMessage,
        totalDuration: executionStats.totalDuration,
        stepsExecuted: executionStats.stepsExecuted,
        toolCallsExecuted: executionStats.toolCallsExecuted,
        stackTrace: error instanceof Error ? error.stack : undefined,
      });
      
      const errorResult: ExecutionResult = {
        success: false,
        error: errorMessage,
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
        executionStats,
      };

      return errorResult;
    }
  }

  // Execute with string input (original behavior)
  private async executeWithString(input: string): Promise<ExecutionResult> {
    // If custom logic is provided, use it
    if (this.customLogic) {
      return await this.executeWithCustomLogic(input);
    }

    const provider = await ProviderManager.createProvider(this.model);

    const generateConfig: any = {
      model: provider(this.model.model),
      prompt: input,
      maxSteps: this.maxIterations,
      onStepFinish: this.createStepFinishCallback(),
    };

    // Add system message if it exists
    const systemMessage = this.messages.find(m => m.role === 'system');
    if (systemMessage) {
      generateConfig.system = systemMessage.content;
    }

    // Add tools if available
    if (Object.keys(this.tools).length > 0) {
      generateConfig.tools = this.convertToAISDKTools();
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
    
    this.log('📝', 'Starting text generation', {
      prompt: this.sanitizeForLogging(input),
      systemMessage: systemMessage ? 'present' : 'none',
      toolsEnabled: Object.keys(this.tools).length > 0,
    });

    const result = await generateText(generateConfig);

    // Update our internal state
    this.iterations = result.steps?.length || 1;
    this.stepsExecuted = this.iterations;
    
    // Store the conversation in our messages for future reference
    this.messages = [
      ...this.messages.filter(m => m.role === 'system'),
      { role: 'user', content: input },
      { role: 'assistant', content: result.text || '' }
    ];

    // Extract tool calls from steps if available
    const toolCallsUsed: string[] = [];
    if (result.steps) {
      result.steps.forEach(step => {
        if (step.toolCalls) {
          step.toolCalls.forEach(toolCall => {
            toolCallsUsed.push(toolCall.toolName || toolCall.toolCallId || 'unknown');
          });
        }
      });
    }

    this.log('📊', 'Text generation completed', {
      resultLength: result.text?.length || 0,
      stepsExecuted: this.iterations,
      toolCallsUsed: toolCallsUsed.length,
      tokensUsed: result.usage?.totalTokens,
      finishReason: result.finishReason,
    });

    const executionResult: ExecutionResult = {
      success: true,
      result: result.text,
      messages: this.messages,
      iterations: this.iterations,
      toolCallsUsed,
    };

    return executionResult;
  }

  // Execute with message array (new behavior)
  private async executeWithMessages(inputMessages: CoreMessage[]): Promise<ExecutionResult> {
    // Handle empty message arrays
    if (inputMessages.length === 0) {
      const errorResult: ExecutionResult = {
        success: false,
        error: 'Empty message array provided. At least one message is required.',
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
      };
      return errorResult;
    }
    
    const provider = await ProviderManager.createProvider(this.model);

    // Convert CoreMessage[] to AI SDK compatible format
    const convertedMessages = this.convertCoresToAISDK(inputMessages);

    this.log('📝', 'Processing message array', {
      messageCount: inputMessages.length,
      messageTypes: inputMessages.map(m => m.role),
      hasSystemMessage: inputMessages.some(m => m.role === 'system'),
      lastMessageRole: inputMessages[inputMessages.length - 1]?.role,
    });

    const generateConfig: any = {
      model: provider(this.model.model),
      messages: convertedMessages,
      maxSteps: this.maxIterations,
      onStepFinish: this.createStepFinishCallback(),
    };

    // Extract system message from input if present, otherwise use existing one
    const systemMessage = inputMessages.find(m => m.role === 'system');
    if (systemMessage) {
      generateConfig.system = typeof systemMessage.content === 'string' 
        ? systemMessage.content 
        : JSON.stringify(systemMessage.content);
    } else {
      const existingSystemMessage = this.messages.find(m => m.role === 'system');
      if (existingSystemMessage) {
        generateConfig.system = existingSystemMessage.content;
      }
    }

    // Add tools if available
    if (Object.keys(this.tools).length > 0) {
      generateConfig.tools = this.convertToAISDKTools();
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
    this.stepsExecuted = this.iterations;
    
    // Update internal messages with the full conversation context
    this.messages = [
      ...this.messages.filter(m => m.role === 'system'),
      ...this.convertCoreToInternal(inputMessages.filter(m => m.role !== 'system')),
      { role: 'assistant', content: result.text || '' }
    ];

    // Extract tool calls from steps if available
    const toolCallsUsed: string[] = [];
    if (result.steps) {
      result.steps.forEach(step => {
        if (step.toolCalls) {
          step.toolCalls.forEach(toolCall => {
            toolCallsUsed.push(toolCall.toolName || toolCall.toolCallId || 'unknown');
          });
        }
      });
    }

    this.log('📊', 'Message array processing completed', {
      resultLength: result.text?.length || 0,
      stepsExecuted: this.iterations,
      toolCallsUsed: toolCallsUsed.length,
      messagesInHistory: this.messages.length,
      tokensUsed: result.usage?.totalTokens,
      finishReason: result.finishReason,
    });

    const executionResult: ExecutionResult = {
      success: true,
      result: result.text,
      messages: this.messages,
      iterations: this.iterations,
      toolCallsUsed,
    };

    return executionResult;
  }

  // Tool management methods
  public addTool(tool: OpenAgenticTool): void {
    const toolName = tool.toolId;
    
    // Ensure uniqueness
    if (this.tools[toolName]) {
      throw new Error(`Tool with name ${toolName} already exists`);
    }
    
    this.tools[toolName] = tool;
    this.log('🔧', 'Tool added', { toolId: tool.toolId, toolName: tool.name });
  }

  public removeTool(toolName: string): void {
    if (this.tools[toolName]) {
      delete this.tools[toolName];
      this.log('🗑️', 'Tool removed', { toolId: toolName });
    }
  }

  public getTool(toolName: string): any {
    return this.tools[toolName];
  }

  public getAllTools(): OpenAgenticTool[] {
    return Object.values(this.tools);
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
    this.iterations = 0;
    this.resetExecutionStats();
    this.log('🔄', 'Orchestrator reset', { systemMessagesRetained: this.messages.length });
  }

  public clear(): void {
    this.messages = [];
    this.iterations = 0;
    this.resetExecutionStats();
    this.log('🧹', 'Orchestrator cleared', { allMessagesRemoved: true });
  }

  // Create step finish callback for AI SDK
  private createStepFinishCallback() {
    return (result: any) => {
      const stepDuration = Date.now() - this.executionStartTime;
      this.stepTimings.push(stepDuration);
      
      this.stepsExecuted++;
      
      const toolCallsInStep = result.toolCalls?.map((tc: any) => tc.toolName || tc.toolCallId || 'unknown') || [];
      
      this.log('📝', `Step ${this.stepsExecuted} completed`, {
        stepType: result.stepType || 'unknown',
        finishReason: result.finishReason || 'unknown',
        duration: `${stepDuration}ms`,
        toolCalls: toolCallsInStep,
        text: result.text ? `${result.text.length} chars` : 'no_result',
        reasoning: result.reasoning ? 'has_reasoning' : 'no_reasoning',
        tokensUsed: result.usage?.totalTokens || 'unknown',
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
    
    Object.entries(this.tools).forEach(([key, tool]) => {
      tools[key] = {
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

  // Private methods
  private async executeWithCustomLogic(input: string): Promise<ExecutionResult> {
    try {
      this.log('🔄', 'Executing custom logic', { inputLength: input.length });
      
      const context = {
        messages: this.messages,
        tools: this.getAllTools(),
        model: this.model,
        iterations: this.iterations,
      };

      const result = await this.customLogic!(input, context);
      
      this.log('✅', 'Custom logic completed', { 
        resultType: typeof result,
        hasContent: !!(result?.content || result),
      });
      
      return {
        success: true,
        result: result.content || result,
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
      };
    } catch (error) {
      this.log('❌', 'Custom logic failed', {
        error: error instanceof Error ? error.message : JSON.stringify(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : JSON.stringify(error),
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
      };
    }
  }
}