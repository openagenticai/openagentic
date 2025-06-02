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

vi.mock("@langchain/core/messages", () => ({
  HumanMessage: vi.fn().mockImplementation(content => ({ content })),
  AIMessage: vi.fn().mockImplementation(content => ({ content })),
}))

describe("aI Interface Integration Tests", () => {
  beforeEach(() => {
    cleanupMocks()
  })

  describe("createAIWithTools", () => {
    it("should create AI instance with tools", () => {
      const model = createMockModel()
      const tools = [getDynamicTool("openai")!] as ExecutableTool[]
      const toolCollection = createToolCollection(tools)

      const aiWithTools = createAIWithTools(model, toolCollection)

      expect(aiWithTools).toBeDefined()
      expect(aiWithTools.model).toBeDefined()
      expect(aiWithTools.tools).toBe(toolCollection)
      expect(aiWithTools.chat).toBeDefined()
      expect(typeof aiWithTools.chat).toBe("function")
    })

    it("should handle empty tool collection", () => {
      const model = createMockModel()
      const toolCollection = createToolCollection([])

      const aiWithTools = createAIWithTools(model, toolCollection)

      expect(aiWithTools).toBeDefined()
      expect(aiWithTools.model).toBeDefined()
      expect(aiWithTools.tools).toBe(toolCollection)
    })

    it("should handle multiple tools", () => {
      const model = createMockModel()
      const tools = [
        getDynamicTool("openai")! as ExecutableTool,
        getDynamicTool("anthropic")! as ExecutableTool,
      ].filter(Boolean)
      const toolCollection = createToolCollection(tools)

      const aiWithTools = createAIWithTools(model, toolCollection)

      expect(aiWithTools.tools).toBe(toolCollection)
      expect(aiWithTools.tools.toolsForChatCompletion).toHaveLength(tools.length)
    })
  })

  describe("aI chat interface", () => {
    it("should handle basic chat without cost tracking", async () => {
      const model = createMockModel()
      model.invoke = vi.fn().mockResolvedValue({
        content: "Hello! How can I help you?",
        response_metadata: {},
      })

      const toolCollection = createToolCollection([])
      const aiWithTools = createAIWithTools(model, toolCollection)

      const result = await aiWithTools.chat("Hello")

      expect(result.response).toBe("Hello! How can I help you?")
      expect(model.invoke).toHaveBeenCalled()
    })

    it("should handle cost-aware chat execution", async () => {
      const model = createMockModel()
      model.invoke = vi.fn().mockResolvedValue({
        content: "Cost-aware response",
        response_metadata: {
          tokenUsage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
          },
        },
      })

      const toolCollection = createToolCollection([])
      const aiWithTools = createAIWithTools(model, toolCollection)

      const result = await aiWithTools.chat("Test message", { maxCostCents: 500 })

      expect(result.response).toBe("Cost-aware response")
      expect(result.costTracker).toBeDefined()
      expect(result.costTracker?.totalQueries).toBeGreaterThan(0)
    })

    it("should handle conservative mode", async () => {
      const model = createMockModel()
      model.invoke = vi.fn().mockResolvedValue({
        content: "Conservative response",
        response_metadata: {},
      })

      const toolCollection = createToolCollection([])
      const aiWithTools = createAIWithTools(model, toolCollection)

      const result = await aiWithTools.chat("Test", {
        maxCostCents: 500,
        conservativeMode: true,
      })

      expect(result.response).toBe("Conservative response")
    })
  })

  describe("tool integration with AI", () => {
    it("should handle tool calls in AI responses", async () => {
      const model = createMockModel()
      const mockResponse = {
        content: "I'll use the OpenAI tool.",
        tool_calls: [
          {
            name: "openai",
            args: {
              message: "Test prompt",
              apiKey: "test-key",
              modelName: "gpt-4",
            },
          },
        ],
        response_metadata: {},
      }

      model.invoke = vi.fn().mockResolvedValue(mockResponse)

      const tools = [getDynamicTool("openai")! as ExecutableTool]
      const toolCollection = createToolCollection(tools)
      const aiWithTools = createAIWithTools(model, toolCollection)

      const result = await aiWithTools.chat("Use OpenAI to help me")

      expect(result.toolCalls).toBeDefined()
      expect(result.toolCalls).toHaveLength(1)
    })

    it("should propagate tool execution results", async () => {
      const model = createMockModel()
      const mockResponse = {
        content: "Using tool...",
        tool_calls: [
          {
            name: "openai",
            args: {
              message: "Test",
              apiKey: "test-key",
            },
          },
        ],
        response_metadata: {},
      }

      model.invoke = vi.fn().mockResolvedValue(mockResponse)

      const tools = [getDynamicTool("openai")!] as ExecutableTool[]
      const toolCollection = createToolCollection(tools)

      // Mock the tool collection execute method
      toolCollection.execute = vi.fn().mockResolvedValue({
        success: true,
        response: "Tool executed successfully",
      })

      const aiWithTools = createAIWithTools(model, toolCollection)

      const result = await aiWithTools.chat("Test with tool")

      expect(toolCollection.execute).toHaveBeenCalled()
      expect(result.toolCalls).toBeDefined()
    })
  })

  describe("error handling", () => {
    it("should handle AI model errors gracefully", async () => {
      const model = createMockModel()
      model.invoke = vi.fn().mockRejectedValue(new Error("Model connection failed"))

      const toolCollection = createToolCollection([])
      const aiWithTools = createAIWithTools(model, toolCollection)

      await expect(aiWithTools.chat("Test")).rejects.toThrow("AI chat failed")
    })

    it("should handle budget exhaustion", async () => {
      const model = createMockModel()
      const toolCollection = createToolCollection([])
      const aiWithTools = createAIWithTools(model, toolCollection)

      // Mock cost tracker to reject the query
      const mockCostTracker = createMockCostTracker(5, 100) // Very low budget
      mockCostTracker.canAffordQuery = vi.fn().mockReturnValue(false)

      await expect(
        aiWithTools.chat("Expensive query", { maxCostCents: 10 }),
      ).rejects.toThrow("Insufficient budget")
    })

    it("should handle tool execution failures", async () => {
      const model = createMockModel()
      const mockResponse = {
        content: "Using failing tool...",
        tool_calls: [
          {
            name: "openai",
            args: { message: "Test", apiKey: "invalid" },
          },
        ],
        response_metadata: {},
      }

      model.invoke = vi.fn().mockResolvedValue(mockResponse)

      const tools = [getDynamicTool("openai")! as ExecutableTool]
      const toolCollection = createToolCollection(tools)

      // Mock tool execution failure
      toolCollection.execute = vi.fn().mockRejectedValue(new Error("Tool failed"))

      const aiWithTools = createAIWithTools(model, toolCollection)

      const result = await aiWithTools.chat("Test")

      // Should handle tool failure gracefully
      expect(result.toolCalls).toBeDefined()
      expect(result.toolCalls?.[0]).toHaveProperty("error")
    })
  })
})
