import { beforeEach, describe, expect, it, vi } from "vitest"

import { createAIWithTools } from "../src/ai"
import {
  allTools,
  createToolCollection,
  executeTool,
  tools,
} from "../src/tools"
import type { CostTracker, ExecutableTool } from "../src/types"
import { getDynamicTool } from "../src/utils/dynamic-tools"

// Get dynamic tools for testing
const openaiExecutableTool = getDynamicTool("openai")! as ExecutableTool
const anthropicExecutableTool = getDynamicTool("anthropic")! as ExecutableTool
const openaiTool = { ...openaiExecutableTool }
const anthropicTool = { ...anthropicExecutableTool }
delete (openaiTool as any).execute
delete (anthropicTool as any).execute

// Mock LangChain modules for testing the actual tool functions
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: "Mock OpenAI response",
      response_metadata: { tokenUsage: { promptTokens: 10, completionTokens: 20 } },
    }),
  })),
}))

vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: "Mock Anthropic response",
      response_metadata: { tokenUsage: { promptTokens: 15, completionTokens: 25 } },
    }),
  })),
}))

vi.mock("@langchain/core/messages", () => ({
  HumanMessage: vi.fn().mockImplementation(content => ({ content })),
}))

// Mock LangChain models for AI interface testing
const mockModel = {
  invoke: vi.fn(),
  bindTools: vi.fn().mockImplementation(() => mockModel),
  modelName: "gpt-4",
}

// Mock cost tracker for testing
const createMockCostTracker = (remainingBudget = 100, maxBudget = 500): CostTracker => ({
  totalCostCents: 0,
  maxCostCents: maxBudget,
  usageHistory: [],
  getRemainingBudgetCents: vi.fn().mockReturnValue(remainingBudget),
  canAfford: vi.fn().mockReturnValue(remainingBudget > 0),
  addUsage: vi.fn(),
  getDefaultMaxTokens: vi.fn().mockReturnValue(2048),
  estimateCost: vi.fn().mockReturnValue(10),
  estimateQueryCost: vi.fn().mockReturnValue(15),
  canAffordQuery: vi.fn().mockReturnValue(remainingBudget > 15) as any,
  getSummary: vi.fn().mockReturnValue({
    totalCostCents: 25,
    maxCostCents: maxBudget,
    remainingBudgetCents: remainingBudget,
    budgetUsedPercentage: 5,
    totalQueries: 2,
    orchestratorQueries: 1,
    toolQueries: 1,
  }),
})

describe("tools System", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("legacy tools array", () => {
    it("should export an array containing openai and anthropic tools", () => {
      expect(tools).toBeDefined()
      expect(Array.isArray(tools)).toBe(true)
      expect(tools).toHaveLength(2)
    })

    it("should contain tools with correct structure", () => {
      tools.forEach((tool) => {
        expect(tool).toHaveProperty("type", "function")
        expect(tool).toHaveProperty("function")
        expect(tool.function).toHaveProperty("name")
        expect(tool.function).toHaveProperty("description")
        expect(tool.function).toHaveProperty("parameters")
        expect(tool.function.parameters).toHaveProperty("type", "object")
        expect(tool.function.parameters).toHaveProperty("properties")
        expect(tool.function.parameters).toHaveProperty("required")
        expect(tool.function.parameters).toHaveProperty("additionalProperties", false)
        expect(tool.function).toHaveProperty("strict", true)
      })
    })

    it("should contain the correct tool names", () => {
      const toolNames = tools.map(tool => tool.function.name)
      expect(toolNames).toContain("openai")
      expect(toolNames).toContain("anthropic")
    })

    it("should include maxTokens parameter in tool schemas", () => {
      tools.forEach((tool) => {
        expect(tool.function.parameters.properties).toHaveProperty("maxTokens")
        expect(tool.function.parameters.properties.maxTokens.type).toBe("number")
      })
    })
  })

  describe("allTools ToolCollection", () => {
    it("should have all required properties", () => {
      expect(allTools).toHaveProperty("tools")
      expect(allTools).toHaveProperty("toolsForChatCompletion")
      expect(allTools).toHaveProperty("toolsForResponsesAPI")
      expect(allTools).toHaveProperty("registry")
      expect(allTools).toHaveProperty("execute")
    })

    it("should have tools array with correct length", () => {
      expect(Array.isArray(allTools.tools)).toBe(true)
      expect(allTools.tools).toHaveLength(2)
    })

    it("should have toolsForChatCompletion in correct format", () => {
      expect(Array.isArray(allTools.toolsForChatCompletion)).toBe(true)
      expect(allTools.toolsForChatCompletion).toHaveLength(2)

      allTools.toolsForChatCompletion.forEach((tool) => {
        expect(tool).toHaveProperty("type", "function")
        expect(tool).toHaveProperty("function")
      })
    })

    it("should have toolsForResponsesAPI in correct format", () => {
      expect(Array.isArray(allTools.toolsForResponsesAPI)).toBe(true)
      expect(allTools.toolsForResponsesAPI).toHaveLength(2)

      allTools.toolsForResponsesAPI.forEach((tool) => {
        expect(tool).toHaveProperty("type", "function")
        expect(tool).toHaveProperty("function")
      })
    })

    it("should have registry with correct tool names", () => {
      expect(typeof allTools.registry).toBe("object")
      expect(allTools.registry).toHaveProperty("openai")
      expect(allTools.registry).toHaveProperty("anthropic")

      // Registry should contain executable tools
      expect(allTools.registry.openai).toHaveProperty("execute")
      expect(allTools.registry.anthropic).toHaveProperty("execute")
    })

    it("should have execute function", () => {
      expect(typeof allTools.execute).toBe("function")
    })
  })

  describe("createToolCollection", () => {
    it("should create a tool collection from executable tools", () => {
      const customCollection = createToolCollection([openaiExecutableTool])

      expect(customCollection).toHaveProperty("tools")
      expect(customCollection).toHaveProperty("toolsForChatCompletion")
      expect(customCollection).toHaveProperty("toolsForResponsesAPI")
      expect(customCollection).toHaveProperty("registry")
      expect(customCollection).toHaveProperty("execute")

      expect(customCollection.tools).toHaveLength(1)
      expect(customCollection.tools[0].function.name).toBe("openai")
    })

    it("should create registry with correct mappings", () => {
      const customCollection = createToolCollection([anthropicExecutableTool])

      expect(customCollection.registry).toHaveProperty("anthropic")
      expect(customCollection.registry.anthropic).toHaveProperty("execute")
    })
  })

  describe("tool execution", () => {
    const createMockToolCall = (name: string, args: Record<string, any>) => ({
      function: {
        name,
        arguments: JSON.stringify(args),
      },
    })

    describe("allTools.execute", () => {
      it("should execute openai tool without cost tracker", async () => {
        const toolCall = createMockToolCall("openai", {
          message: "Hello OpenAI",
          apiKey: "test-key",
        })

        const result = await allTools.execute(toolCall)

        expect(result).toHaveProperty("success", true)
        expect(result).toHaveProperty("response", "Mock OpenAI response")
        expect(result).toHaveProperty("model", "gpt-4-1106-preview")
      })

      it("should execute openai tool with cost tracker", async () => {
        const mockCostTracker = createMockCostTracker(100)
        const toolCall = createMockToolCall("openai", {
          message: "Hello OpenAI",
          apiKey: "test-key",
        })

        const result = await allTools.execute(toolCall, mockCostTracker)

        expect(result).toHaveProperty("success", true)
        expect(result).toHaveProperty("response", "Mock OpenAI response")
        expect(result).toHaveProperty("costTracker")
      })

      it("should execute anthropic tool without cost tracker", async () => {
        const toolCall = createMockToolCall("anthropic", {
          message: "Hello Claude",
          apiKey: "test-key",
        })

        const result = await allTools.execute(toolCall)

        expect(result).toHaveProperty("success", true)
        expect(result).toHaveProperty("response", "Mock Anthropic response")
        expect(result).toHaveProperty("model", "claude-3-5-sonnet-20240620")
      })

      it("should execute anthropic tool with cost tracker", async () => {
        const mockCostTracker = createMockCostTracker(100)
        const toolCall = createMockToolCall("anthropic", {
          message: "Hello Claude",
          apiKey: "test-key",
        })

        const result = await allTools.execute(toolCall, mockCostTracker)

        expect(result).toHaveProperty("success", true)
        expect(result).toHaveProperty("response", "Mock Anthropic response")
        expect(result).toHaveProperty("costTracker")
      })

      it("should handle unknown tool names", async () => {
        const toolCall = createMockToolCall("unknown", {})

        await expect(allTools.execute(toolCall)).rejects.toThrow("Tool 'unknown' not found in registry")
      })

      it("should handle invalid JSON arguments", async () => {
        const toolCall = {
          function: {
            name: "openai",
            arguments: "invalid json {",
          },
        }

        await expect(allTools.execute(toolCall)).rejects.toThrow("Tool execution failed:")
      })
    })

    describe("legacy executeTool", () => {
      it("should delegate to allTools.execute", async () => {
        const mockResponse = {
          success: true,
          response: "Test response",
          model: "gpt-4",
          usage: null,
        }

        // Mock allTools.execute
        const originalExecute = allTools.execute
        allTools.execute = vi.fn().mockResolvedValue(mockResponse)

        const toolCall = createMockToolCall("openai", { message: "Hello", apiKey: "test-key" })
        const result = await executeTool(toolCall)

        expect(allTools.execute).toHaveBeenCalledWith(toolCall)
        expect(result).toBe(mockResponse)

        // Restore original
        allTools.execute = originalExecute
      })
    })
  })

  describe("individual tool exports", () => {
    it("should export openaiTool", () => {
      expect(openaiTool).toHaveProperty("type", "function")
      expect(openaiTool.function).toHaveProperty("name", "openai")
    })

    it("should export anthropicTool", () => {
      expect(anthropicTool).toHaveProperty("type", "function")
      expect(anthropicTool.function).toHaveProperty("name", "anthropic")
    })

    it("should export executable tools", () => {
      expect(openaiExecutableTool).toHaveProperty("execute")
      expect(anthropicExecutableTool).toHaveProperty("execute")
    })
  })

  describe("aI interface with cost tracking", () => {
    beforeEach(() => {
      mockModel.invoke.mockClear()
      mockModel.bindTools.mockClear()
    })

    it("should create AI interface with tools", () => {
      const ai = createAIWithTools(mockModel as any, allTools)

      expect(ai).toHaveProperty("chat")
      expect(ai).toHaveProperty("model")
      expect(ai).toHaveProperty("tools")
      expect(typeof ai.chat).toBe("function")
    })

    it("should chat without cost tracking", async () => {
      const ai = createAIWithTools(mockModel as any, allTools)

      mockModel.invoke.mockResolvedValue({
        content: "Hello response",
        response_metadata: { tokenUsage: { promptTokens: 10, completionTokens: 15 } },
      })

      const result = await ai.chat("Hello world")

      expect(mockModel.invoke).toHaveBeenCalledWith([{ role: "user", content: "Hello world" }], undefined)
      expect(result).toEqual({
        response: "Hello response",
        metadata: { tokenUsage: { promptTokens: 10, completionTokens: 15 } },
      })
      expect(result).not.toHaveProperty("costTracker")
    })

    it("should chat with cost tracking", async () => {
      const ai = createAIWithTools(mockModel as any, allTools)

      mockModel.invoke.mockResolvedValue({
        content: "Hello response",
        response_metadata: { tokenUsage: { promptTokens: 10, completionTokens: 15 } },
      })

      const result = await ai.chat("Hello world", { maxCostCents: 100 })

      expect(mockModel.invoke).toHaveBeenCalledWith([{ role: "user", content: "Hello world" }], { maxTokens: 4096 })
      expect(result).toHaveProperty("costTracker")
      expect(result.costTracker).toBeDefined()
    })

    it("should handle budget exhaustion in orchestrator", async () => {
      const ai = createAIWithTools(mockModel as any, allTools)

      await expect(
        ai.chat("This should fail due to budget", { maxCostCents: 1 }), // Very small budget
      ).rejects.toThrow("Insufficient budget")
    })

    it("should use conservative mode", async () => {
      const ai = createAIWithTools(mockModel as any, allTools)

      mockModel.invoke.mockResolvedValue({
        content: "Conservative response",
        response_metadata: { tokenUsage: { promptTokens: 10, completionTokens: 15 } },
      })

      const result = await ai.chat("Hello", { maxCostCents: 100, conservativeMode: true })

      expect(mockModel.invoke).toHaveBeenCalledWith([{ role: "user", content: "Hello" }], { maxTokens: 1024 })
      expect(result).toHaveProperty("costTracker")
    })

    it("should handle models without bindTools method", () => {
      const modelWithoutBindTools = { invoke: vi.fn() }
      const ai = createAIWithTools(modelWithoutBindTools as any, allTools)

      expect(ai).toHaveProperty("chat")
      expect(ai.model).toBe(modelWithoutBindTools)
    })

    it("should handle response as string when content is missing", async () => {
      const ai = createAIWithTools(mockModel as any, allTools)

      const responseObject = {
        toString: () => "String response",
        response_metadata: {},
      }
      mockModel.invoke.mockResolvedValue(responseObject)

      const result = await ai.chat("Hello")

      expect(result.response).toBe("String response")
    })
  })
})
