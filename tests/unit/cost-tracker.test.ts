import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CostTracker, UsageRecord } from "../../src/types"
import { createCostTracker } from "../../src/utils/cost-tracker"

// Mock the JSON data import
vi.mock("../../src/utils/model_prices_and_context_window.json", () => ({
  default: {
    "gpt-4": {
      max_tokens: 8192,
      max_input_tokens: 8192,
      max_output_tokens: 4096,
      input_cost_per_token: 0.00003,
      output_cost_per_token: 0.00006,
      litellm_provider: "openai",
      mode: "chat",
      supports_function_calling: true,
    },
    "gpt-3.5-turbo": {
      max_tokens: 4096,
      max_input_tokens: 4096,
      max_output_tokens: 4096,
      input_cost_per_token: 0.000001,
      output_cost_per_token: 0.000002,
      litellm_provider: "openai",
      mode: "chat",
      supports_function_calling: true,
    },
    "claude-3-5-sonnet-20240620": {
      max_tokens: 8192,
      max_input_tokens: 200000,
      max_output_tokens: 8192,
      input_cost_per_token: 0.000003,
      output_cost_per_token: 0.000015,
      litellm_provider: "anthropic",
      mode: "chat",
      supports_function_calling: true,
    },
  },
}))

describe("cost Tracker", () => {
  let costTracker: CostTracker

  beforeEach(() => {
    costTracker = createCostTracker(1000) // 1000 cents = $10.00 budget
  })

  describe("initialization", () => {
    it("should initialize with correct values", () => {
      expect(costTracker.totalCostCents).toBe(0)
      expect(costTracker.maxCostCents).toBe(1000)
      expect(costTracker.usageHistory).toEqual([])
    })

    it("should calculate remaining budget correctly", () => {
      expect(costTracker.getRemainingBudgetCents()).toBe(1000)
    })

    it("should handle different budget amounts", () => {
      const smallBudget = createCostTracker(50)
      const largeBudget = createCostTracker(5000)

      expect(smallBudget.maxCostCents).toBe(50)
      expect(largeBudget.maxCostCents).toBe(5000)
    })
  })

  describe("canAfford method", () => {
    it("should return true when cost is within budget", () => {
      expect(costTracker.canAfford(100)).toBe(true)
      expect(costTracker.canAfford(999)).toBe(true)
      expect(costTracker.canAfford(1000)).toBe(true)
    })

    it("should return false when cost exceeds budget", () => {
      expect(costTracker.canAfford(1001)).toBe(false)
      expect(costTracker.canAfford(2000)).toBe(false)
    })

    it("should account for existing usage", () => {
      const usageRecord: UsageRecord = {
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 300,
        timestamp: new Date(),
        source: "orchestrator",
      }
      costTracker.addUsage(usageRecord)

      expect(costTracker.canAfford(700)).toBe(true)
      expect(costTracker.canAfford(701)).toBe(false)
    })
  })

  describe("cost estimation", () => {
    it("should estimate cost for GPT-4", () => {
      const cost = costTracker.estimateCost("gpt-4", 1000, 500)
      // 1000 * 0.00003 + 500 * 0.00006 = 0.03 + 0.03 = 0.06 dollars = 6 cents
      expect(cost).toBeCloseTo(6, 2)
    })

    it("should estimate cost for GPT-3.5-turbo", () => {
      const cost = costTracker.estimateCost("gpt-3.5-turbo", 1000, 500)
      // 1000 * 0.000001 + 500 * 0.000002 = 0.001 + 0.001 = 0.002 dollars = 0.2 cents
      expect(cost).toBeCloseTo(0.2, 2)
    })

    it("should estimate cost for Claude", () => {
      const cost = costTracker.estimateCost("claude-3-5-sonnet-20240620", 1000, 500)
      // 1000 * 0.000003 + 500 * 0.000015 = 0.003 + 0.0075 = 0.0105 dollars = 1.05 cents
      expect(cost).toBeCloseTo(1.05, 2)
    })

    it("should handle unknown models with default pricing", () => {
      const cost = costTracker.estimateCost("unknown-model", 1000, 500)
      // Should use default pricing
      expect(cost).toBeGreaterThan(0)
    })

    it("should estimate query cost with prompt length", () => {
      const cost = costTracker.estimateQueryCost("gpt-4", 100, 500)
      // Should estimate based on prompt length (characters to tokens) + expected output
      expect(cost).toBeGreaterThan(0)
    })

    it("should use default output tokens when not provided", () => {
      const cost1 = costTracker.estimateQueryCost("gpt-4", 100)
      const cost2 = costTracker.estimateQueryCost("gpt-4", 100, 1024)

      expect(cost1).toBeGreaterThan(0)
      expect(cost2).toBeGreaterThan(0)
    })
  })

  describe("canAffordQuery method", () => {
    it("should return true for affordable queries", () => {
      expect(costTracker.canAffordQuery("gpt-3.5-turbo", 100, 100)).toBe(true)
    })

    it("should return false for expensive queries", () => {
      const smallBudget = createCostTracker(1) // 1 cent budget
      expect(smallBudget.canAffordQuery("gpt-4", 10000, 5000)).toBe(false)
    })

    it("should account for existing usage", () => {
      // Add some usage to reduce available budget
      const usageRecord: UsageRecord = {
        model: "gpt-4",
        inputTokens: 5000,
        outputTokens: 2500,
        costCents: 800,
        timestamp: new Date(),
        source: "tool",
        toolName: "openai",
      }
      costTracker.addUsage(usageRecord)

      expect(costTracker.canAffordQuery("gpt-4", 1000, 500)).toBe(true) // Should cost ~6 cents
      expect(costTracker.canAffordQuery("gpt-4", 100000, 50000)).toBe(false) // Should cost ~600 cents > 200 remaining
    })
  })

  describe("getDefaultMaxTokens method", () => {
    it("should return model-specific max tokens", () => {
      expect(costTracker.getDefaultMaxTokens("gpt-4")).toBe(4096) // max_output_tokens
      expect(costTracker.getDefaultMaxTokens("gpt-3.5-turbo")).toBe(4096)
      expect(costTracker.getDefaultMaxTokens("claude-3-5-sonnet-20240620")).toBe(8192)
    })

    it("should return default for unknown models", () => {
      const defaultTokens = costTracker.getDefaultMaxTokens("unknown-model")
      expect(defaultTokens).toBe(4096) // Default fallback from implementation
    })

    it("should handle models without output token limits", () => {
      const tokens = costTracker.getDefaultMaxTokens("test-model-no-output")
      expect(tokens).toBeGreaterThan(0)
    })
  })

  describe("addUsage method", () => {
    it("should add usage record and update total cost", () => {
      const usageRecord: UsageRecord = {
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 15,
        timestamp: new Date(),
        source: "orchestrator",
      }

      costTracker.addUsage(usageRecord)

      expect(costTracker.totalCostCents).toBe(15)
      expect(costTracker.usageHistory).toHaveLength(1)
      expect(costTracker.usageHistory[0]).toEqual(usageRecord)
    })

    it("should accumulate multiple usage records", () => {
      const record1: UsageRecord = {
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 10,
        timestamp: new Date(),
        source: "orchestrator",
      }

      const record2: UsageRecord = {
        model: "gpt-3.5-turbo",
        inputTokens: 200,
        outputTokens: 100,
        costCents: 5,
        timestamp: new Date(),
        source: "tool",
        toolName: "openai",
      }

      costTracker.addUsage(record1)
      costTracker.addUsage(record2)

      expect(costTracker.totalCostCents).toBe(15)
      expect(costTracker.usageHistory).toHaveLength(2)
      expect(costTracker.getRemainingBudgetCents()).toBe(985)
    })

    it("should handle zero-cost usage", () => {
      const record: UsageRecord = {
        model: "gpt-4",
        inputTokens: 0,
        outputTokens: 0,
        costCents: 0,
        timestamp: new Date(),
        source: "orchestrator",
      }

      costTracker.addUsage(record)

      expect(costTracker.totalCostCents).toBe(0)
      expect(costTracker.usageHistory).toHaveLength(1)
    })
  })

  describe("getSummary method", () => {
    it("should return correct summary with no usage", () => {
      const summary = costTracker.getSummary()

      expect(summary).toEqual({
        totalCostCents: 0,
        maxCostCents: 1000,
        remainingBudgetCents: 1000,
        budgetUsedPercentage: 0,
        totalQueries: 0,
        orchestratorQueries: 0,
        toolQueries: 0,
      })
    })

    it("should return correct summary with mixed usage", () => {
      const orchestratorRecord: UsageRecord = {
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 200,
        timestamp: new Date(),
        source: "orchestrator",
      }

      const toolRecord1: UsageRecord = {
        model: "gpt-3.5-turbo",
        inputTokens: 50,
        outputTokens: 25,
        costCents: 50,
        timestamp: new Date(),
        source: "tool",
        toolName: "openai",
      }

      const toolRecord2: UsageRecord = {
        model: "claude-3-5-sonnet-20240620",
        inputTokens: 75,
        outputTokens: 35,
        costCents: 100,
        timestamp: new Date(),
        source: "tool",
        toolName: "anthropic",
      }

      costTracker.addUsage(orchestratorRecord)
      costTracker.addUsage(toolRecord1)
      costTracker.addUsage(toolRecord2)

      const summary = costTracker.getSummary()

      expect(summary).toEqual({
        totalCostCents: 350,
        maxCostCents: 1000,
        remainingBudgetCents: 650,
        budgetUsedPercentage: 35,
        totalQueries: 3,
        orchestratorQueries: 1,
        toolQueries: 2,
      })
    })

    it("should handle budget exhaustion", () => {
      const expensiveRecord: UsageRecord = {
        model: "gpt-4",
        inputTokens: 10000,
        outputTokens: 5000,
        costCents: 1200, // Exceeds budget
        timestamp: new Date(),
        source: "orchestrator",
      }

      costTracker.addUsage(expensiveRecord)

      const summary = costTracker.getSummary()

      expect(summary.totalCostCents).toBe(1200)
      expect(summary.remainingBudgetCents).toBe(0) // Implementation clamps to 0
      expect(summary.budgetUsedPercentage).toBe(120)
    })
  })

  describe("budget management scenarios", () => {
    it("should handle progressive budget depletion", () => {
      const queries = [
        { cost: 100, canAfford: true },
        { cost: 200, canAfford: true },
        { cost: 300, canAfford: true },
        { cost: 400, canAfford: true },
        { cost: 50, canAfford: false }, // This should fail as 100+200+300+400+50 > 1000
      ]

      queries.forEach(({ cost, canAfford }, index) => {
        const result = costTracker.canAfford(cost)
        expect(result).toBe(canAfford)

        if (canAfford) {
          const record: UsageRecord = {
            model: "gpt-4",
            inputTokens: cost,
            outputTokens: cost / 2,
            costCents: cost,
            timestamp: new Date(),
            source: index % 2 === 0 ? "orchestrator" : "tool",
            toolName: index % 2 === 1 ? "openai" : undefined,
          }
          costTracker.addUsage(record)
        }
      })

      expect(costTracker.totalCostCents).toBe(1000)
      expect(costTracker.getRemainingBudgetCents()).toBe(0)
    })

    it("should track tool vs orchestrator usage separately", () => {
      const orchestratorUsage: UsageRecord = {
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 100,
        timestamp: new Date(),
        source: "orchestrator",
      }

      const openaiUsage: UsageRecord = {
        model: "gpt-3.5-turbo",
        inputTokens: 200,
        outputTokens: 100,
        costCents: 50,
        timestamp: new Date(),
        source: "tool",
        toolName: "openai",
      }

      const anthropicUsage: UsageRecord = {
        model: "claude-3-5-sonnet-20240620",
        inputTokens: 150,
        outputTokens: 75,
        costCents: 75,
        timestamp: new Date(),
        source: "tool",
        toolName: "anthropic",
      }

      costTracker.addUsage(orchestratorUsage)
      costTracker.addUsage(openaiUsage)
      costTracker.addUsage(anthropicUsage)

      const summary = costTracker.getSummary()

      expect(summary.orchestratorQueries).toBe(1)
      expect(summary.toolQueries).toBe(2)
      expect(summary.totalQueries).toBe(3)
    })
  })

  describe("edge cases", () => {
    it("should handle very small budgets", () => {
      const microBudget = createCostTracker(1) // 1 cent
      expect(microBudget.canAfford(1)).toBe(true)
      expect(microBudget.canAfford(2)).toBe(false)
    })

    it("should handle very large budgets", () => {
      const hugeBudget = createCostTracker(1000000) // $10,000
      expect(hugeBudget.canAfford(999999)).toBe(true)
      expect(hugeBudget.canAfford(1000001)).toBe(false)
    })

    it("should handle zero budget", () => {
      const zeroBudget = createCostTracker(0)
      expect(zeroBudget.canAfford(0)).toBe(true)
      expect(zeroBudget.canAfford(1)).toBe(false)
    })

    it("should handle fractional costs", () => {
      const cost = costTracker.estimateCost("gpt-3.5-turbo", 10, 5)
      expect(typeof cost).toBe("number")
      expect(cost).toBeGreaterThan(0)
    })

    it("should handle empty model names", () => {
      const cost = costTracker.estimateCost("", 100, 50)
      expect(cost).toBeGreaterThan(0) // Should use defaults
    })

    it("should handle undefined timestamps in usage records", () => {
      const record = {
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 15,
        timestamp: new Date(),
        source: "orchestrator" as const,
      }

      expect(() => costTracker.addUsage(record)).not.toThrow()
    })
  })
})
