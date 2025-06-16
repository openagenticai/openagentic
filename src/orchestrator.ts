import { generateText } from 'ai';
import type { AIModel, Message, CoreMessage, ExecutionResult, OpenAgenticTool } from './types';
import { ProviderManager } from './providers/manager';

export class Orchestrator {
  private model: AIModel;
  private tools: Record<string, OpenAgenticTool> = {};
  private messages: Message[] = [];
  private iterations = 0;
  private maxIterations: number;
  private customLogic?: (input: string, context: any) => Promise<any>;

  constructor(options: {
    model: string | AIModel;
    tools?: any[];
    systemPrompt?: string;
    maxIterations?: number;
    customLogic?: (input: string, context: any) => Promise<any>;
  }) {
    // Use ProviderManager for centralized model creation
    this.model = ProviderManager.createModel(options.model);
    this.maxIterations = options.maxIterations || 10;
    this.customLogic = options.customLogic;
    
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
  }

  // Core execution method - supports both string and message array inputs
  public async execute(input: string): Promise<ExecutionResult>;
  public async execute(messages: CoreMessage[]): Promise<ExecutionResult>;
  public async execute(input: string | CoreMessage[]): Promise<ExecutionResult> {
    try {
      // Handle different input types
      if (typeof input === 'string') {
        return await this.executeWithString(input);
      } else if (Array.isArray(input)) {
        return await this.executeWithMessages(input);
      } else {
        throw new Error('Input must be either a string or an array of messages');
      }
    } catch (error) {
      console.error('Error in Orchestrator.execute:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResult: ExecutionResult = {
        success: false,
        error: errorMessage,
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
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
    
    const result = await generateText(generateConfig);

    // Update our internal state
    this.iterations = result.steps?.length || 1;
    
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

    const generateConfig: any = {
      model: provider(this.model.model),
      messages: convertedMessages,
      maxSteps: this.maxIterations,
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
  }

  public removeTool(toolName: string): void {
    delete this.tools[toolName];
  }

  public getTool(toolName: string): any {
    return this.tools[toolName];
  }

  public getAllTools(): OpenAgenticTool[] {
    return Object.values(this.tools);
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
    this.iterations = 0;
  }

  public clear(): void {
    this.messages = [];
    this.iterations = 0;
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
      console.log(`🔍 Converting tool ${key}:`, {
        toolId: tool.toolId,
        description: tool.description,
        hasParameters: !!tool.parameters,
        parameterType: typeof tool.parameters,
        parameterKeys: tool.parameters ? Object.keys(tool.parameters) : [],
        parameterProto: tool.parameters ? Object.getPrototypeOf(tool.parameters) : null,
        parameterConstructor: tool.parameters ? tool.parameters.constructor?.name : 'none',
        hasExecute: !!tool.execute,
        allKeys: Object.keys(tool)
      });
      
      // Try to inspect the Zod schema
      if (tool.parameters && typeof tool.parameters === 'object') {
        console.log(`🔍 Parameter object details for ${key}:`, {
          _def: tool.parameters._def ? 'has _def' : 'no _def',
          _defKeys: tool.parameters._def ? Object.keys(tool.parameters._def) : [],
          typeName: tool.parameters._def?.typeName,
          shape: tool.parameters._def?.shape ? 'has shape' : 'no shape',
        });
      }
      
      tools[key] = {
        description: tool.description,
        parameters: tool.parameters,
        execute: async (args: any, context?: any) => {
          console.log(`🔧 Orchestrator executing tool: ${tool.toolId}`, args);
          try {
            if (!tool.execute) {
              throw new Error(`Tool ${tool.toolId} has no execute function`);
            }
            const result = await tool.execute(args, context);
            console.log(`✅ Orchestrator tool success: ${tool.toolId}`, { 
              resultType: typeof result,
              resultPreview: typeof result === 'string' ? result.substring(0, 100) + '...' : JSON.stringify(result).substring(0, 100) + '...'
            });
            return result;
          } catch (error) {
            console.error(`❌ Orchestrator tool error: ${tool.toolId}`, error);
            throw error;
          }
        },
      };
    });
    
    console.log(`🔍 Final tools object:`, Object.keys(tools));
    return tools;
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
        result: result.content || result,
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: [],
      };
    }
  }
}