import { EventEmitter } from 'events';
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

export class Orchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private aiProvider: AIProvider;
  private costTracker: CostTracker;
  private toolRegistry: ToolRegistry;
  private messages: Message[] = [];
  private iterations: number = 0;

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
    this.aiProvider = new AIProvider(config.model);
    this.costTracker = new CostTracker(config.budget);
    this.toolRegistry = new ToolRegistry(config.tools);

    if (config.systemPrompt) {
      this.messages.push({
        role: 'system',
        content: config.systemPrompt,
      });
    }
  }

  public async execute(userMessage: string): Promise<ExecutionResult> {
    this.emit('start', { config: this.config });
    
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
          this.toolRegistry.getToolDefinitions(),
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
        this.emit('iteration', { iteration: this.iterations, message: assistantMessage });

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

      this.emit('complete', result);
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

      this.emit('error', { error: errorResult.error!, iteration: this.iterations });
      return errorResult;
    }
  }

  public onEvent(handler: EventHandler): void {
    this.on('start', (data) => handler({ type: 'start', data }));
    this.on('iteration', (data) => handler({ type: 'iteration', data }));
    this.on('tool_call', (data) => handler({ type: 'tool_call', data }));
    this.on('tool_result', (data) => handler({ type: 'tool_result', data }));
    this.on('cost_update', (data) => handler({ type: 'cost_update', data }));
    this.on('complete', (data) => handler({ type: 'complete', data }));
    this.on('error', (data) => handler({ type: 'error', data }));
  }

  private async executeToolCall(toolCall: any): Promise<void> {
    try {
      this.emit('tool_call', {
        toolName: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      });

      const result = await this.toolRegistry.executeTool(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments)
      );

      this.costTracker.incrementToolCalls();

      this.emit('tool_result', {
        toolName: toolCall.function.name,
        result,
        success: true,
      });

      // Add tool result to messages
      this.messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        toolCallId: toolCall.id,
      });

    } catch (error) {
      this.emit('tool_result', {
        toolName: toolCall.function.name,
        result: error,
        success: false,
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
  }
}