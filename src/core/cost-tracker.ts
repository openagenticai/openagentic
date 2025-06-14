import type { CostTracking } from '../types';
import { AIProvider } from './ai-provider';

export class CostTracker {
  private tracking: CostTracking = {
    inputTokens: 0,
    outputTokens: 0,
    toolCalls: 0,
    estimatedCost: 0,
  };

  private budget: {
    maxCost?: number;
    maxTokens?: number;
    maxToolCalls?: number;
  } | undefined;

  // Optional AIProvider for more accurate cost calculations
  private aiProvider?: AIProvider;

  constructor(
    budget?: { maxCost?: number; maxTokens?: number; maxToolCalls?: number },
    aiProvider?: AIProvider
  ) {
    this.budget = budget;
    this.aiProvider = aiProvider;
  }

  public updateTokenUsage(inputTokens: number, outputTokens: number): void {
    this.tracking.inputTokens += inputTokens;
    this.tracking.outputTokens += outputTokens;
    this.updateEstimatedCost();
  }

  public incrementToolCalls(cost = 0): void {
    this.tracking.toolCalls += 1;
    this.tracking.estimatedCost += cost;
  }

  public getTracking(): CostTracking {
    return { ...this.tracking };
  }

  public checkBudget(): {
    withinBudget: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (this.budget?.maxCost && this.tracking.estimatedCost >= this.budget.maxCost) {
      violations.push(`Cost limit exceeded: $${this.tracking.estimatedCost.toFixed(4)} >= $${this.budget.maxCost}`);
    }

    if (this.budget?.maxTokens && (this.tracking.inputTokens + this.tracking.outputTokens) >= this.budget.maxTokens) {
      violations.push(`Token limit exceeded: ${this.tracking.inputTokens + this.tracking.outputTokens} >= ${this.budget.maxTokens}`);
    }

    if (this.budget?.maxToolCalls && this.tracking.toolCalls >= this.budget.maxToolCalls) {
      violations.push(`Tool call limit exceeded: ${this.tracking.toolCalls} >= ${this.budget.maxToolCalls}`);
    }

    return {
      withinBudget: violations.length === 0,
      violations,
    };
  }

  public reset(): void {
    this.tracking = {
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: 0,
      estimatedCost: 0,
    };
  }

  private updateEstimatedCost(): void {
    if (this.aiProvider) {
      // Use the AIProvider to calculate costs if available
      this.tracking.estimatedCost = this.aiProvider.calculateCost(
        this.tracking.inputTokens,
        this.tracking.outputTokens
      );
    } else {
      // Fallback to simplified calculation
      const avgInputCost = 0.01 / 1000; // Average input cost per token
      const avgOutputCost = 0.02 / 1000; // Average output cost per token

      this.tracking.estimatedCost = 
        (this.tracking.inputTokens * avgInputCost) +
        (this.tracking.outputTokens * avgOutputCost);
    }
  }

  // Allow updating the AIProvider
  public setAIProvider(provider: AIProvider): void {
    this.aiProvider = provider;
  }
}