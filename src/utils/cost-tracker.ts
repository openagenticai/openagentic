import type { CostSummary, CostTracker, ModelCostConfig, UsageRecord } from "../types"

import modelPricingData from "./model_prices_and_context_window.json"

// Constants for fallback estimation
const DEFAULT_CHAR_TO_TOKEN_RATIO = 4
const FALLBACK_MAX_TOKENS = 4096

/**
 * Implementation of CostTracker that manages budget and tracks usage
 */
export class CostTrackerImpl implements CostTracker {
  public totalCostCents: number = 0
  public maxCostCents: number
  public usageHistory: UsageRecord[] = []
  private modelConfigs: Record<string, ModelCostConfig>

  constructor(maxCostCents: number) {
    this.maxCostCents = maxCostCents
    // Filter out non-model entries and ensure proper typing
    this.modelConfigs = this.parseModelConfigs(modelPricingData as any)
  }

  private parseModelConfigs(rawData: any): Record<string, ModelCostConfig> {
    const configs: Record<string, ModelCostConfig> = {}

    for (const [key, value] of Object.entries(rawData)) {
      // Skip sample_spec and other non-model entries
      if (key === "sample_spec" || !value || typeof value !== "object") {
        continue
      }

      const config = value as any

      // Only include entries that have the required numeric fields
      if (
        typeof config.max_tokens === "number"
        && typeof config.max_input_tokens === "number"
        && typeof config.max_output_tokens === "number"
        && typeof config.input_cost_per_token === "number"
        && typeof config.output_cost_per_token === "number"
        && typeof config.litellm_provider === "string"
        && typeof config.mode === "string"
      ) {
        configs[key] = config as ModelCostConfig
      }
    }

    return configs
  }

  private getFallbackConfig(): ModelCostConfig | null {
    // Try to find GPT-4 as a fallback
    return this.modelConfigs["gpt-4"] || this.modelConfigs["gpt-3.5-turbo"] || null
  }

  getRemainingBudgetCents(): number {
    return Math.max(0, this.maxCostCents - this.totalCostCents)
  }

  canAfford(estimatedCostCents: number): boolean {
    return this.getRemainingBudgetCents() >= estimatedCostCents
  }

  addUsage(record: UsageRecord): void {
    this.usageHistory.push(record)
    this.totalCostCents += record.costCents
  }

  getDefaultMaxTokens(model: string): number {
    const config = this.modelConfigs[model]
    if (!config) {
      // Fallback for unknown models
      return FALLBACK_MAX_TOKENS
    }

    const remainingBudgetCents = this.getRemainingBudgetCents()
    const remainingBudgetPercentage = remainingBudgetCents / this.maxCostCents

    // Conservative approach: reduce max tokens as budget gets low
    if (remainingBudgetPercentage <= 0.1) {
      // Less than 10% budget remaining - use minimal tokens
      return Math.min(config.max_output_tokens, 512)
    } else if (remainingBudgetPercentage <= 0.3) {
      // Less than 30% budget remaining - use moderate tokens
      return Math.min(config.max_output_tokens, 2048)
    } else {
      // Plenty of budget - use full capacity
      return config.max_output_tokens
    }
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number = 0): number {
    const config = this.modelConfigs[model]
    if (!config) {
      // Fallback estimation for unknown models - use best available pricing as conservative estimate
      const fallbackConfig = this.getFallbackConfig()
      if (!fallbackConfig) {
        return 0 // If we can't find any pricing, return 0 to avoid blocking execution
      }
      const costCents = (inputTokens * fallbackConfig.input_cost_per_token + outputTokens * fallbackConfig.output_cost_per_token) * 100
      return costCents
    }

    const costCents = (inputTokens * config.input_cost_per_token + outputTokens * config.output_cost_per_token) * 100
    return costCents
  }

  /**
   * Estimate cost for a typical query given current model and expected response size
   */
  estimateQueryCost(model: string, promptLength: number, expectedOutputTokens?: number): number {
    // Rough estimation: 4 characters per token (OpenAI's rough estimate)
    const estimatedInputTokens = Math.ceil(promptLength / DEFAULT_CHAR_TO_TOKEN_RATIO)
    const estimatedOutputTokens = expectedOutputTokens || this.getDefaultMaxTokens(model)

    return this.estimateCost(model, estimatedInputTokens, estimatedOutputTokens)
  }

  /**
   * Check if we have enough budget for a typical query
   * Enhanced with better error handling from original implementation
   */
  canAffordQuery(model: string, promptLength: number, expectedOutputTokens?: number): boolean {
    try {
      const estimatedCost = this.estimateQueryCost(model, promptLength, expectedOutputTokens)
      return this.canAfford(estimatedCost)
    } catch (error) {
      console.error("Error estimating cost:", error)
      // If we can't estimate cost (e.g., completely unknown model), assume we can afford it
      // This preserves the graceful degradation behavior from the original implementation
      return true
    }
  }

  /**
   * Get a summary of current cost tracking status
   */
  getSummary(): CostSummary {
    return {
      totalCostCents: this.totalCostCents,
      maxCostCents: this.maxCostCents,
      remainingBudgetCents: this.getRemainingBudgetCents(),
      budgetUsedPercentage: (this.totalCostCents / this.maxCostCents) * 100,
      totalQueries: this.usageHistory.length,
      orchestratorQueries: this.usageHistory.filter(r => r.source === "orchestrator").length,
      toolQueries: this.usageHistory.filter(r => r.source === "tool").length,
    }
  }
}

/**
 * Create a new cost tracker instance
 */
export function createCostTracker(maxCostCents: number): CostTracker {
  return new CostTrackerImpl(maxCostCents)
}
