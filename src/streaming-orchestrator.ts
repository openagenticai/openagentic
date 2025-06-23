import { streamText } from 'ai';
import type { AIModel, CoreMessage, OpenAgenticTool, Message, LoggingConfig, LogLevel, ExecutionStats, BaseOrchestrator, OrchestratorContext, OrchestratorOptions, PromptBasedOrchestrator, CustomLogicOrchestrator } from './types';
import { ProviderManager } from './providers/manager';
import { resolveOrchestrator } from './orchestrators/registry';

export class StreamingOrchestrator {
  private model: AIModel;
  private tools = new Map<string, OpenAgenticTool>();
  private messages: Message[] = [];
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
  private chunksProcessed = 0;
  private totalTextLength = 0;

  // User-provided callback
  private onFinishCallback?: (result: any) => void | Promise<void>;

  constructor(options: {
    model: string | AIModel;
    tools?: OpenAgenticTool[];
    systemPrompt?: string;
    maxIterations?: number;
    customLogic?: (input: string, context: any) => Promise<any>;
    enableDebugLogging?: boolean;
    logLevel?: LogLevel;
    enableStepLogging?: boolean;
    enableToolLogging?: boolean;
    enableTimingLogging?: boolean;
    enableStatisticsLogging?: boolean;
    enableStreamingLogging?: boolean;
    onFinish?: (result: any) => void | Promise<void>;
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

    // Store user-provided onFinish callback
    this.onFinishCallback = options.onFinish;
    
    // Register tools with validation
    if (options.tools) {
      options.tools.forEach(tool => this.addTool(tool));
    }
    
    // Add system prompt if provided (orchestrator may override this)
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
      hasCustomLogic: !!this.customLogic,
      hasOrchestrator: !!this.orchestrator,
      orchestratorId: this.orchestrator?.id,
      orchestratorType: this.orchestrator?.type,
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
        hasCustomLogic: !!this.customLogic,
        hasOrchestrator: !!this.orchestrator,
        orchestratorType: this.orchestrator?.type,
      });

      // If custom logic is provided, use it (takes precedence over orchestrator)
      if (this.customLogic) {
        return await this.streamWithCustomLogic(input);
      }

      // If orchestrator is available, delegate to it
      if (this.orchestrator) {
        return await this.streamWithOrchestrator(input);
      }

      // Handle different input types with standard execution
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

  // Stream with custom logic
  private async streamWithCustomLogic(input: string | CoreMessage[]): Promise<ReturnType<typeof streamText>> {
    this.log('🔄', 'Executing streaming custom logic', { 
      inputType: typeof input,
      inputLength: typeof input === 'string' ? input.length : input.length,
    });

    try {
      const context = {
        messages: this.messages,
        tools: this.getAllTools(),
        model: this.model,
        iterations: this.stepsExecuted,
      };

      // Convert input to string for custom logic (for now)
      const stringInput = typeof input === 'string' ? input : 
                         input.map(m => `${m.role}: ${m.content}`).join('\n');

      const result = await this.customLogic!(stringInput, context);
      
      this.log('✅', 'Streaming custom logic completed', { 
        resultType: typeof result,
        hasContent: !!(result?.content || result),
      });

      // For streaming, we need to return a streamText-like object
      // We'll create a mock stream that yields the custom logic result
      const content = result.content || result || '';
      
      // Create a simple text stream from the custom logic result
      const textStream = (async function* () {
        // Simulate streaming by yielding the content in chunks
        const chunkSize = 50;
        for (let i = 0; i < content.length; i += chunkSize) {
          yield content.slice(i, i + chunkSize);
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      })();

      // Return a streamText-compatible object
      return {
        textStream,
        text: Promise.resolve(content),
        finishReason: Promise.resolve('stop' as const),
        usage: Promise.resolve({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        }),
        object: Promise.resolve('chat.completion.chunk' as const),
        experimental_providerMetadata: Promise.resolve(undefined),
      } as unknown as ReturnType<typeof streamText>;

    } catch (error) {
      this.log('❌', 'Streaming custom logic failed', {
        error: error instanceof Error ? error.message : JSON.stringify(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
      });
      
      throw error;
    }
  }

  // Stream with orchestrator delegation
  private async streamWithOrchestrator(input: string | CoreMessage[]): Promise<ReturnType<typeof streamText>> {
    if (!this.orchestrator) {
      throw new Error('Orchestrator not available');
    }

    this.log('🎭', 'Delegating streaming to orchestrator', {
      orchestratorId: this.orchestrator.id,
      orchestratorType: this.orchestrator.type,
      orchestratorName: this.orchestrator.name,
    });

    try {
      // For prompt-based orchestrators, we can handle them specially for streaming
      if (this.orchestrator.type === 'prompt-based') {
        return await this.streamWithPromptBasedOrchestrator(input, this.orchestrator as PromptBasedOrchestrator);
      }

      // For custom-logic orchestrators, handle streaming delegation
      if (this.orchestrator.type === 'custom-logic') {
        return await this.streamWithCustomLogicOrchestrator(input, this.orchestrator as CustomLogicOrchestrator);
      }

      throw new Error(`Unknown orchestrator type: ${this.orchestrator.type}`);

    } catch (error) {
      this.log('❌', 'Orchestrator streaming failed', {
        orchestratorId: this.orchestrator.id,
        error: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  // Stream with custom logic orchestrator
  private async streamWithCustomLogicOrchestrator(
    input: string | CoreMessage[],
    orchestrator: CustomLogicOrchestrator
  ): Promise<ReturnType<typeof streamText>> {
    this.log('🎭', 'Streaming with custom logic orchestrator', {
      orchestratorId: orchestrator.id,
      orchestratorName: orchestrator.name,
    });

    try {
      // Build context for orchestrator
      const context: OrchestratorContext = {
        model: this.model,
        tools: Array.from(this.tools.values()),
        messages: this.messages,
        iterations: this.stepsExecuted,
        maxIterations: this.maxIterations,
        loggingConfig: this.loggingConfig,
        orchestratorParams: this.orchestratorOptions.orchestratorParams,
      };

      // Execute custom logic (this returns an ExecutionResult, not a stream)
      const result = await orchestrator.execute(input, context);

      // Convert the result to a streaming format
      const content = result.result || '';
      
      // Create a text stream from the execution result
      const textStream = (async function* () {
        // Simulate streaming by yielding the content in chunks
        const chunkSize = 50;
        for (let i = 0; i < content.length; i += chunkSize) {
          yield content.slice(i, i + chunkSize);
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      })();

      this.log('✅', 'Custom logic orchestrator streaming completed', {
        orchestratorId: orchestrator.id,
        success: result.success,
        contentLength: content.length,
      });

      // Return a streamText-compatible object
      return {
        textStream,
        text: Promise.resolve(content),
        finishReason: Promise.resolve('stop' as const),
        usage: Promise.resolve({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        }),
        object: Promise.resolve('chat.completion.chunk' as const),
        experimental_providerMetadata: Promise.resolve(undefined),
      } as unknown as ReturnType<typeof streamText>;

    } catch (error) {
      this.log('❌', 'Custom logic orchestrator streaming failed', {
        orchestratorId: orchestrator.id,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  // Stream with prompt-based orchestrator (optimized path)
  private async streamWithPromptBasedOrchestrator(
    input: string | CoreMessage[],
    orchestrator: PromptBasedOrchestrator
  ): Promise<ReturnType<typeof streamText>> {
    this.log('🎭', 'Streaming with prompt-based orchestrator', {
      orchestratorId: orchestrator.id,
      orchestratorName: orchestrator.name,
      allowPromptOverride: this.orchestratorOptions.allowOrchestratorPromptOverride,
      allowToolControl: this.orchestratorOptions.allowOrchestratorToolControl,
    });

    // Build context for orchestrator
    const context: OrchestratorContext = {
      model: this.model,
      tools: Array.from(this.tools.values()),
      messages: this.messages,
      iterations: this.stepsExecuted,
      maxIterations: this.maxIterations,
      loggingConfig: this.loggingConfig,
      orchestratorParams: this.orchestratorOptions.orchestratorParams,
    };

    // Filter tools if orchestrator specifies allowed tools
    const promptOrchestrator = orchestrator as any;
    let filteredTools = Array.from(this.tools.values());
    
    if (promptOrchestrator.allowedTools && Array.isArray(promptOrchestrator.allowedTools) && promptOrchestrator.allowedTools.length > 0) {
      filteredTools = filteredTools.filter(tool => 
        promptOrchestrator.allowedTools.includes(tool.toolId)
      );

      this.log('🎭', 'Filtered tools for orchestrator', {
        available: Array.from(this.tools.values()).map(t => t.toolId),
        allowed: promptOrchestrator.allowedTools,
        using: filteredTools.map(t => t.toolId),
        filtered: promptOrchestrator.allowedTools.filter((id: string) => !filteredTools.some(t => t.toolId === id)),
      });

      if (filteredTools.length === 0) {
        throw new Error(`No allowed tools found for orchestrator ${orchestrator.id}. Required tools: ${promptOrchestrator.allowedTools.join(', ')}`);
      }
    }

    // Get the system prompt from orchestrator
    const finalSystemPrompt = orchestrator.buildSystemPrompt ? 
      orchestrator.buildSystemPrompt(context) : 
      orchestrator.getSystemPrompt();

    // Create a new specialized streaming orchestrator with orchestrator's settings
    const specializedOrchestrator = new StreamingOrchestrator({
      model: this.model,
      tools: filteredTools,
      systemPrompt: finalSystemPrompt,
      maxIterations: this.maxIterations,
      enableDebugLogging: this.loggingConfig.enableDebugLogging,
      logLevel: this.loggingConfig.logLevel,
      enableStepLogging: this.loggingConfig.enableStepLogging,
      enableToolLogging: this.loggingConfig.enableToolLogging,
      enableTimingLogging: this.loggingConfig.enableTimingLogging,
      enableStatisticsLogging: this.loggingConfig.enableStatisticsLogging,
      onFinish: this.onFinishCallback,
    });

    this.log('🎭', 'Executing with specialized streaming orchestrator', {
      filteredToolsCount: filteredTools.length,
      filteredToolIds: filteredTools.map(t => t.toolId),
      systemPromptPreview: finalSystemPrompt.substring(0, 100) + '...',
    });

    // Stream using the specialized orchestrator (without orchestrator to avoid infinite recursion)
    if (typeof input === 'string') {
      return await specializedOrchestrator.streamWithString(input);
    } else {
      return await specializedOrchestrator.streamWithMessages(input);
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
      onFinish: this.onFinishCallback,
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
      hasUserOnFinish: !!this.onFinishCallback,
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
      hasUserOnFinish: !!this.onFinishCallback,
    });

    const streamConfig: any = {
      model: provider(this.model.model),
      messages: convertedMessages,
      maxSteps: this.maxIterations,
      onStepFinish: this.createStepFinishCallback(),
      onChunk: this.createChunkCallback(),
      onFinish: this.onFinishCallback,
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

  private handleStreamCompletion(): void {
    const executionStats = this.calculateExecutionStats();
    
    this.log('🏁', 'Streaming completed', {
      totalDuration: executionStats.totalDuration,
      stepsExecuted: executionStats.stepsExecuted,
      toolCallsExecuted: executionStats.toolCallsExecuted,
      chunksProcessed: this.chunksProcessed,
      totalTextLength: this.totalTextLength,
      averageChunkSize: this.chunksProcessed > 0 ? Math.round(this.totalTextLength / this.chunksProcessed) : 0,
      finishReason: this.onFinishCallback ? 'user_callback' : 'internal_logging',
      tokensUsed: this.onFinishCallback ? undefined : executionStats.totalDuration,
    });
  }
}