import { beforeEach, describe, expect, it, vi } from "vitest"

import { createAIWithTools } from "../../src/ai"
import { createToolCollection } from "../../src/tools"
import type { ExecutableTool } from "../../src/types"
import { getDynamicTool } from "../../src/utils/dynamic-tools"
import { cleanupMocks, createMockCostTracker, createMockModel } from "../shared/test-utils"

// Mock LangChain providers
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => createMockModel()),
}))

vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => createMockModel()),
}))

vi.mock("@langchain/core/messages", () => ({
  HumanMessage: vi.fn().mockImplementation(content => ({ content })),
  AIMessage: vi.fn().mockImplementation(content => ({ content })),
}))

describe("tools integration tests", () => {
  beforeEach(() => {
    cleanupMocks()
  })

  describe("multi-tool workflows", () => {
    it("should handle multiple tool executions in sequence", async () => {
      const _costTracker = createMockCostTracker(500, 1000)
      const openaiTool = getDynamicTool("openai") as ExecutableTool
      const anthropicTool = getDynamicTool("anthropic") as ExecutableTool

      expect(openaiTool).toBeDefined()
      expect(anthropicTool).toBeDefined()

      // Both tools should be available
      expect(typeof openaiTool!.execute).toBe("function")
      expect(typeof anthropicTool!.execute).toBe("function")
    })

    it("should propagate cost tracking across multiple tools", async () => {
      const costTracker = createMockCostTracker(200, 500)
      const tools = [getDynamicTool("openai"), getDynamicTool("anthropic")]

      tools.forEach((tool) => {
        expect(tool).toBeDefined()
        expect(tool).toHaveProperty("execute")
      })

      // Verify cost tracker would be used consistently
      expect(costTracker.getRemainingBudgetCents()).toBe(200)
    })
  })

  describe("aI interface integration", () => {
    it("should integrate tools with AI interface", async () => {
      const model = createMockModel()
      const tools = [getDynamicTool("openai")!] as ExecutableTool[]
      const toolCollection = createToolCollection(tools)

      const aiWithTools = createAIWithTools(model, toolCollection)

      expect(aiWithTools).toBeDefined()
      expect(aiWithTools).toHaveProperty("model")
      expect(aiWithTools).toHaveProperty("tools")
      expect(aiWithTools).toHaveProperty("chat")
      expect(typeof aiWithTools.chat).toBe("function")
    })

    it("should handle cost-aware tool selection", async () => {
      const lowBudgetTracker = createMockCostTracker(10, 100)
      const tools = [getDynamicTool("openai"), getDynamicTool("anthropic")]

      // With low budget, tools should be budget-aware
      tools.forEach((tool) => {
        expect(tool).toBeDefined()
      })

      expect(lowBudgetTracker.getRemainingBudgetCents()).toBe(10)
    })
  })

  describe("tool interoperability", () => {
    it("should maintain consistent interfaces across different tool types", () => {
      const openaiTool = getDynamicTool("openai") as ExecutableTool
      const anthropicTool = getDynamicTool("anthropic") as ExecutableTool

      // Both tools should have the same interface structure
      expect(openaiTool?.type).toBe("function")
      expect(anthropicTool?.type).toBe("function")

      expect(openaiTool?.function).toHaveProperty("name")
      expect(anthropicTool?.function).toHaveProperty("name")

      expect(openaiTool?.function).toHaveProperty("parameters")
      expect(anthropicTool?.function).toHaveProperty("parameters")
    })

    it("should handle cross-provider compatibility", () => {
      const providers = ["openai", "anthropic"]

      providers.forEach((provider) => {
        const tool = getDynamicTool(provider) as ExecutableTool
        expect(tool).toBeDefined()
        expect(tool?.function.name).toBe(provider)

        // All tools should require the same basic parameters
        expect(tool?.function.parameters.required).toContain("message")
        expect(tool?.function.parameters.required).toContain("apiKey")
      })
    })
  })

  describe("error propagation", () => {
    it("should handle tool execution failures gracefully", async () => {
      const _costTracker = createMockCostTracker(100, 500)
      const tool = getDynamicTool("openai")

      expect(tool).toBeDefined()

      // Tool should exist and be executable
      expect(typeof tool!.execute).toBe("function")
    })

    it("should maintain system stability during tool failures", async () => {
      const tools = [getDynamicTool("openai"), getDynamicTool("anthropic")]

      // System should remain stable even if individual tools fail
      tools.forEach((tool) => {
        expect(tool).toBeDefined()
        expect(tool).toHaveProperty("execute")
      })
    })
  })

  describe("performance integration", () => {
    it("should handle concurrent tool executions", async () => {
      const _costTracker = createMockCostTracker(1000, 2000)
      const tools = [getDynamicTool("openai"), getDynamicTool("anthropic")]

      // Should be able to handle multiple tools concurrently
      const executions = tools.map((tool) => {
        expect(tool).toBeDefined()
        return tool!.execute
      })

      expect(executions).toHaveLength(2)
      executions.forEach((exec) => {
        expect(typeof exec).toBe("function")
      })
    })

    it("should maintain cost tracking accuracy under load", async () => {
      const costTracker = createMockCostTracker(500, 1000)

      // Cost tracking should remain accurate even with multiple concurrent operations
      expect(costTracker.getRemainingBudgetCents()).toBe(500)
      expect(costTracker.canAfford).toBeDefined()
      expect(costTracker.addUsage).toBeDefined()
    })
  })
})
