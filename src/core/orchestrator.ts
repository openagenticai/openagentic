import type {
  OrchestratorConfig,
  ExecutionResult,
  Message,
  OrchestratorEvent,
  EventHandler,
} from '../types';
import { AIProvider } from './ai-provider';
import { ToolRegistry } from './tool-registry';
import { MaxIterationsError } from './errors';
import { SimpleEventEmitter } from '../utils/simple-event-emitter';

export class Orchestrator {
  private messages: Message[] = [];
  private iterations: number = 0;
  private eventEmitter = new SimpleEventEmitter<OrchestratorEvent>();

  constructor(
    private config: OrchestratorConfig,
    private aiProvider: AIProvider = new AIProvider(config.model),
    private toolRegistry: ToolRegistry = new ToolRegistry(config.tools)
  ) {
    if (config.systemPrompt) {
      this.messages.push({
        role: 'system',
        content: config.systemPrompt,
      });
    }
  }

  public async execute(userMessage: string): Promise<ExecutionResult> {
    this.eventEmitter.emit({ type: 'start', data: { config: this.config } });
    
    try {
      this.messages.push({
        role: 'user',
        content: userMessage,
      });

      while (this.iterations < this.config.maxIterations) {
        this.iterations++;

        // Get AI response - use streaming or generateText based on config
        const response = await this.aiProvider.complete(
          this.messages,
          this.toolRegistry.getDefinitions(),
          this.config.streaming
        );

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.content || '',
          toolCalls: response.tool_calls,
        };

        this.messages.push(assistantMessage);
        this.eventEmitter.emit({ type: 'iteration', data: { iteration: this.iterations, message: assistantMessage } });

        // Handle tool calls if any
        if (response.tool_calls && response.tool_calls.length > 0) {
          for (const toolCall of response.tool_calls) {
            await this.executeToolCall(toolCall);
          }
          continue; // Continue the conversation loop
        }

        // If no tool calls, we're done
        break;
      }

      if (this.iterations >= this.config.maxIterations) {
        throw new MaxIterationsError(this.config.maxIterations);
      }

      const result: ExecutionResult = {
        success: true,
        result: this.messages[this.messages.length - 1]?.content,
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: this.toolRegistry.getUsedTools(),
      };

      this.eventEmitter.emit({ type: 'complete', data: result });
      return result;

    } catch (error) {
      const errorResult: ExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messages: this.messages,
        iterations: this.iterations,
        toolCallsUsed: this.toolRegistry.getUsedTools(),
      };

      this.eventEmitter.emit({ type: 'error', data: { error: errorResult.error!, iteration: this.iterations } });
      return errorResult;
    }
  }

  // Custom orchestration support - allows chaining multiple models or custom logic
  public async executeWithCustomLogic(
    userMessage: string, 
    customLogic: (orchestrator: Orchestrator, messages: Message[]) => Promise<ExecutionResult>
  ): Promise<ExecutionResult> {
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    return await customLogic(this, this.messages);
  }

  public onEvent(handler: EventHandler): void {
    this.eventEmitter.on(handler);
  }

  public offEvent(handler: EventHandler): void {
    this.eventEmitter.off(handler);
  }

  private async executeToolCall(toolCall: any): Promise<void> {
    try {
      this.eventEmitter.emit({
        type: 'tool_call',
        data: {
          toolName: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
        }
      });

      const result = await this.toolRegistry.execute(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments)
      );

      this.eventEmitter.emit({
        type: 'tool_result',
        data: {
          toolName: toolCall.function.name,
          result,
          success: true,
        }
      });

      // Add tool result to messages
      this.messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        toolCallId: toolCall.id,
      });

    } catch (error) {
      this.eventEmitter.emit({
        type: 'tool_result',
        data: {
          toolName: toolCall.function.name,
          result: error,
          success: false,
        }
      });

      // Add error result to messages
      this.messages.push({
        role: 'tool',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        toolCallId: toolCall.id,
      });
    }
  }

  public getMessages(): Message[] {
    return [...this.messages];
  }

  public reset(): void {
    this.messages = this.config.systemPrompt 
      ? [{ role: 'system', content: this.config.systemPrompt }]
      : [];
    this.iterations = 0;
    this.toolRegistry.reset();
    this.eventEmitter.clear();
  }

  // Helper methods for custom orchestration
  public async callModel(messages: Message[]): Promise<any> {
    return await this.aiProvider.complete(messages, this.toolRegistry.getDefinitions(), this.config.streaming);
  }

  public addMessage(message: Message): void {
    this.messages.push(message);
  }

  public getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  public getAIProvider(): AIProvider {
    return this.aiProvider;
  }

  // Switch models mid-orchestration for custom logic
  public switchModel(newModel: any): void {
    this.aiProvider = new AIProvider(newModel);
  }
}