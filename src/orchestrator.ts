import { generateText } from 'ai';
import type { AIModel, Message, CoreMessage, ExecutionResult, OpenAgenticTool, LoggingConfig, LogLevel, ExecutionStats, StepInfo, BaseOrchestrator, OrchestratorContext, OrchestratorOptions, PromptBasedOrchestrator, CustomLogicOrchestrator } from './types';
import { ProviderManager } from './providers/manager';
import { resolveOrchestrator } from './orchestrators/registry';

export class Orchestrator {
  private model: AIModel;
  private tools: Record<string, OpenAgenticTool> = {};
  private messages: Message[] = [];
  private iterations = 0;
  private maxIterations: number;
  private customLogic?: (input: string, context: any) => Promise<any>;
  
  // Orchestrator support
  private orchestrator?: BaseOrchestrator;
  private orchestratorOptions: OrchestratorOptions;
  
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
  } & OrchestratorOptions) {
    // Use ProviderManager for centralized model creation
    this.model = ProviderManager.createModel(options.model);
    this.maxIterations = options.maxIterations || 10;
    this.customLogic = options.customLogic;
    
    // Store orchestrator options
    this.orchestratorOptions = {
      orchestrator: options.orchestrator,
      orchestratorId: options.orchestratorId,
      orchestratorParams: options.orchestratorParams,
      allowOrchestratorPromptOverride: options.allowOrchestratorPromptOverride ?? true,
      allowOrchestratorToolControl: options.allowOrchestratorToolControl ?? true,
    };
    
    // Resolve orchestrator if provided
    this.orchestrator = resolveOrchestrator(
      options.orchestrator || options.orchestratorId
    );
    
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
    
    // Add system prompt if provided (orchestrator may override this)
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
      hasCustomLogic: !!this.customLogic,
      hasOrchestrator: !!this.orchestrator,
      orchestratorId: this.orchestrator?.id,
      orchestratorType: this.orchestrator?.type,
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
        hasCustomLogic: !!this.customLogic,
        hasOrchestrator: !!this.orchestrator,
        orchestratorType: this.orchestrator?.type,
      });

      // If custom logic is provided, use it (takes precedence over orchestrator)
      if (this.customLogic) {
        return await this.executeWithCustomLogic(input);
      }

      // If orchestrator is available, delegate to it
      if (this.orchestrator) {
        return await this.executeWithOrchestrator(input);
      }

      // Handle different input types with standard execution
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

  // Execute with orchestrator delegation
  private async executeWithOrchestrator(input: string | CoreMessage[]): Promise<ExecutionResult> {
    if (!this.orchestrator) {
      throw new Error('Orchestrator not available');
    }

    this.log('🎭', 'Delegating to orchestrator', {
      orchestratorId: this.orchestrator.id,
      orchestratorType: this.orchestrator.type,
      orchestratorName: this.orchestrator.name,
    });

    try {
      // For prompt-based orchestrators, we can handle them specially
      if (this.orchestrator.type === 'prompt-based') {
        return await this.executeWithPromptBasedOrchestrator(input, this.orchestrator as PromptBasedOrchestrator);
      }

      // For custom-logic orchestrators, delegate completely
      if (this.orchestrator.type === 'custom-logic') {
        return await this.executeWithCustomLogicOrchestrator(input, this.orchestrator as CustomLogicOrchestrator);
      }

      throw new Error(`Unknown orchestrator type: ${this.orchestrator.type}`);

    } catch (error) {
      this.log('❌', 'Orchestrator execution failed', {
        orchestratorId: this.orchestrator.id,
        error: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  // Execute with custom logic orchestrator
  private async executeWithCustomLogicOrchestrator(
    input: string | CoreMessage[],
    orchestrator: CustomLogicOrchestrator
  ): Promise<ExecutionResult> {
    this.log('🎭', 'Executing with custom logic orchestrator', {
      orchestratorId: orchestrator.id,
      orchestratorName: orchestrator.name,
    });

    try {
      // Build orchestrator context
      const context: OrchestratorContext = {
        model: this.model,
        tools: Object.values(this.tools),
        messages: this.messages,
        iterations: this.iterations,
        maxIterations: this.maxIterations,
        loggingConfig: this.loggingConfig,
        orchestratorParams: this.orchestratorOptions.orchestratorParams,
      };

      // Initialize orchestrator if it has an initialize method
      if (orchestrator.initialize) {
        await orchestrator.initialize(context);
      }

      // Validate input if orchestrator has a validate method
      if (orchestrator.validate) {
        const isValid = await orchestrator.validate(input, context);
        if (!isValid) {
          throw new Error('Orchestrator validation failed');
        }
      }

      // Execute with orchestrator
      const result = await orchestrator.execute(input, context);

      // Update our internal state based on orchestrator result
      this.iterations = result.iterations || 0;
      this.stepsExecuted = result.iterations || 0;

      // Cleanup orchestrator if it has a cleanup method
      if (orchestrator.cleanup) {
        await orchestrator.cleanup(context);
      }

      this.log('✅', 'Custom logic orchestrator execution completed', {
        orchestratorId: orchestrator.id,
        success: result.success,
        iterations: result.iterations,
        toolCallsUsed: result.toolCallsUsed?.length || 0,
      });

      return result;
    } catch (error) {
      this.log('❌', 'Custom logic orchestrator execution failed', {
        orchestratorId: orchestrator.id,
        error: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  // Execute with prompt-based orchestrator (optimized path)
  private async executeWithPromptBasedOrchestrator(
    input: string | CoreMessage[],
    orchestrator: PromptBasedOrchestrator
  ): Promise<ExecutionResult> {
    this.log('🎭', 'Executing with prompt-based orchestrator', {
      orchestratorId: orchestrator.id,
      orchestratorName: orchestrator.name,
      allowPromptOverride: this.orchestratorOptions.allowOrchestratorPromptOverride,
      allowToolControl: this.orchestratorOptions.allowOrchestratorToolControl,
    });

    // Build context for orchestrator
    const context: OrchestratorContext = {
      model: this.model,
      tools: Object.values(this.tools),
      messages: this.messages,
      iterations: this.iterations,
      maxIterations: this.maxIterations,
      loggingConfig: this.loggingConfig,
      orchestratorParams: this.orchestratorOptions.orchestratorParams,
    };

    // Use the orchestrator's execute method which handles tool filtering and prompt override
    return await orchestrator.execute(input, context);
  }

  // Execute with string input (original behavior)
  private async executeWithString(input: string): Promise<ExecutionResult> {
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
      usage: result.usage,
    });

    const executionResult: ExecutionResult = {
      success: true,
      result: result.text,
      messages: this.messages,
      iterations: this.iterations,
      usage: result.usage,
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
      usage: result.usage,
    });

    const executionResult: ExecutionResult = {
      success: true,
      result: result.text,
      messages: this.messages,
      iterations: this.iterations,
      usage: result.usage,
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

  // Orchestrator management methods
  public getOrchestrator(): BaseOrchestrator | undefined {
    return this.orchestrator;
  }

  public setOrchestrator(orchestrator: string | BaseOrchestrator | undefined): void {
    const resolvedOrchestrator = resolveOrchestrator(orchestrator);
    
    if (orchestrator && !resolvedOrchestrator) {
      throw new Error(`Failed to resolve orchestrator: ${typeof orchestrator === 'string' ? orchestrator : 'invalid orchestrator object'}`);
    }

    const oldId = this.orchestrator?.id;
    this.orchestrator = resolvedOrchestrator;
    
    this.log('🎭', 'Orchestrator changed', {
      from: oldId || 'none',
      to: this.orchestrator?.id || 'none',
      type: this.orchestrator?.type,
    });
  }

  public hasOrchestrator(): boolean {
    return !!this.orchestrator;
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
  private async executeWithCustomLogic(input: string | CoreMessage[]): Promise<ExecutionResult> {
    try {
      this.log('🔄', 'Executing custom logic', { 
        inputType: typeof input,
        inputLength: typeof input === 'string' ? input.length : input.length,
      });
      
      const context = {
        messages: this.messages,
        tools: this.getAllTools(),
        model: this.model,
        iterations: this.iterations,
      };

      // Convert input to string for custom logic (for now)
      const stringInput = typeof input === 'string' ? input : 
                         input.map(m => `${m.role}: ${m.content}`).join('\n');

      const result = await this.customLogic!(stringInput, context);
      
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