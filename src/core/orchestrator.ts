import type {
  OrchestratorConfig,
  ExecutionResult,
  Message,
  Tool,
  OrchestratorEvent,
  EventHandler,
  CostTracking,
} from '../types';
import { AIProvider } from './ai-provider';
import { CostTracker } from './cost-tracker';
import { ToolRegistry } from './tool-registry';
import { OrchestratorError, BudgetExceededError, MaxIterationsError } from './errors';
import { SimpleEventEmitter } from '../utils/simple-event-emitter';

export class Orchestrator {
  private messages: Message[] = [];
  private iterations: number = 0;
  private eventEmitter = new SimpleEventEmitter<OrchestratorEvent>();

  constructor(
    private config: OrchestratorConfig,
    private aiProvider: AIProvider = new AIProvider(config.model),
    private costTracker: CostTracker = new CostTracker(config.budget),
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
        
        // Check budget constraints
        this.checkBudgetConstraints();

        // Get AI response
        const response = await this.aiProvider.complete(
          this.messages,
          this.toolRegistry.getDefinitions(), // Updated to match new method name
          this.config.streaming
        );

        // Update cost tracking
        this.costTracker.updateTokenUsage(
          response.usage?.prompt_tokens || 0,
          response.usage?.completion_tokens || 0
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
        costTracking: this.costTracker.getTracking(),
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
        costTracking: this.costTracker.getTracking(),
        iterations: this.iterations,
        toolCallsUsed: this.toolRegistry.getUsedTools(),
      };

      this.eventEmitter.emit({ type: 'error', data: { error: errorResult.error!, iteration: this.iterations } });
      return errorResult;
    }
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

      const result = await this.toolRegistry.execute( // Updated to match new method name
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments)
      );

      this.costTracker.incrementToolCalls();

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

  private checkBudgetConstraints(): void {
    const tracking = this.costTracker.getTracking();
    const budget = this.config.budget;

    if (!budget) return;

    if (budget.maxCost && tracking.estimatedCost >= budget.maxCost) {
      throw new BudgetExceededError('cost', tracking.estimatedCost, budget.maxCost);
    }

    if (budget.maxTokens && (tracking.inputTokens + tracking.outputTokens) >= budget.maxTokens) {
      throw new BudgetExceededError('tokens', tracking.inputTokens + tracking.outputTokens, budget.maxTokens);
    }

    if (budget.maxToolCalls && tracking.toolCalls >= budget.maxToolCalls) {
      throw new BudgetExceededError('tool_calls', tracking.toolCalls, budget.maxToolCalls);
    }
  }

  public getCostTracking(): CostTracking {
    return this.costTracker.getTracking();
  }

  public getMessages(): Message[] {
    return [...this.messages];
  }

  public reset(): void {
    this.messages = this.config.systemPrompt 
      ? [{ role: 'system', content: this.config.systemPrompt }]
      : [];
    this.iterations = 0;
    this.costTracker.reset();
    this.toolRegistry.reset();
    this.eventEmitter.clear(); // Clear event listeners on reset
  }

  public getEventListenerCount(): number {
    return this.eventEmitter.listenerCount();
  }
}