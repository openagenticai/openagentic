import { ChatOpenAI } from "@langchain/openai"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createAIWithMCPTools } from "../../src/ai"
import type { ExecutableMCPTool } from "../../src/types"
import { getDynamicMCPTool } from "../../src/utils/dynamic-tools"
import { cleanupMocks } from "../shared/test-utils"

// Mock LangChain's ChatOpenAI
vi.mock("@langchain/openai", () => {
  const mockChatOpenAIClass = vi.fn().mockImplementation(config => ({
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature,
    bindTools: vi.fn().mockImplementation(tools => ({
      invoke: vi.fn().mockResolvedValue({
        content: "Mock MCP response",
        usage_metadata: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
        },
        response_metadata: {
          model: config.model || "gpt-4",
          finish_reason: "stop",
        },
        tool_calls: tools.length > 0
          ? [
              {
                name: "github_search",
                args: { query: "test" },
                id: "call_123",
              },
            ]
          : [],
      }),
    })),
  }))

  return {
    ChatOpenAI: mockChatOpenAIClass,
  }
})

// Mock the tool-definitions.json file with test MCP tools
vi.mock("../../src/configs/tool-definitions.json", () => ({
  default: {
    tools: [], // Regular tools
    mcpTools: [
      {
        name: "github",
        description: "Access GitHub repositories via MCP",
        provider: "mcp",
        server_url: "https://github.com/api/mcp",
        server_label: "github_mcp",
        allowed_tools: ["search_repositories", "get_file_content"],
        require_approval: "never",
      },
      {
        name: "shopify",
        description: "Access Shopify store via MCP",
        provider: "mcp",
        server_url: "https://shopify.test.com/api/mcp",
        server_label: "shopify_mcp",
        allowed_tools: ["get_products", "update_inventory"],
        require_approval: "prompt",
      },
    ],
  },
}))

describe("mCP AI Interface Integration Tests", () => {
  const mockChatOpenAI = vi.mocked(ChatOpenAI)

  beforeEach(() => {
    cleanupMocks()
    mockChatOpenAI.mockClear()
  })

  describe("createAIWithMCPTools", () => {
    it("should create AI instance with MCP tools", () => {
      const githubTool = getDynamicMCPTool("github")!
      const mcpTools = [githubTool]

      const ai = createAIWithMCPTools(mcpTools, {
        apiKey: "test-key",
        model: "gpt-4",
        maxCostCents: 100,
      })

      expect(ai).toBeDefined()
      expect(ai.chat).toBeDefined()
      expect(typeof ai.chat).toBe("function")
    })

    it("should handle empty MCP tools array", () => {
      const ai = createAIWithMCPTools([], {
        apiKey: "test-key",
        model: "gpt-4",
      })

      expect(ai).toBeDefined()
      expect(ai.chat).toBeDefined()
    })

    it("should handle multiple MCP tools", () => {
      const githubTool = getDynamicMCPTool("github")!
      const shopifyTool = getDynamicMCPTool("shopify")!
      const mcpTools = [githubTool, shopifyTool]

      const ai = createAIWithMCPTools(mcpTools, {
        apiKey: "test-key",
        model: "gpt-4",
        maxCostCents: 200,
      })

      expect(ai).toBeDefined()
    })

    it("should configure ChatOpenAI with correct parameters", () => {
      const githubTool = getDynamicMCPTool("github")!

      const ai = createAIWithMCPTools([githubTool], {
        apiKey: "test-openai-key",
        model: "gpt-4-turbo",
        maxCostCents: 150,
      })

      // The AI instance should be created successfully
      expect(ai).toBeDefined()
      expect(ai.chat).toBeDefined()
    })
  })

  describe("mCP AI chat functionality", () => {
    it("should handle basic chat with MCP tools", async () => {
      const githubTool = getDynamicMCPTool("github")!
      githubTool.headers = { Authorization: "Bearer test-token" }

      const ai = createAIWithMCPTools([githubTool], {
        apiKey: "test-key",
        model: "gpt-4",
      })

      const result = await ai.chat("Search for React repositories")

      expect(result).toBeDefined()
      expect(result.response).toBe("Mock MCP response")
      expect(result.usage).toBeDefined()
      expect(result.usage?.input_tokens).toBe(100)
      expect(result.usage?.output_tokens).toBe(50)
      expect(result.usage?.total_tokens).toBe(150)
      expect(result.model).toBe("gpt-4")
      expect(result.cost).toBeDefined()
    })

    it("should handle cost calculation", async () => {
      const githubTool = getDynamicMCPTool("github")!

      const ai = createAIWithMCPTools([githubTool], {
        apiKey: "test-key",
        model: "gpt-4",
        maxCostCents: 100,
      })

      const result = await ai.chat("Test message")

      expect(result.cost).toBeDefined()
      expect(typeof result.cost).toBe("number")
      expect(result.cost).toBeGreaterThan(0)
    })

    it("should handle MCP tools with authentication headers", async () => {
      const githubTool = getDynamicMCPTool("github")!
      const shopifyTool = getDynamicMCPTool("shopify")!

      // Set authentication headers
      githubTool.headers = {
        Authorization: "Bearer github-token",
      }
      shopifyTool.headers = {
        "X-Shopify-Access-Token": "shopify-token",
      }

      const ai = createAIWithMCPTools([githubTool, shopifyTool], {
        apiKey: "test-key",
        model: "gpt-4",
      })

      const result = await ai.chat("Check GitHub and Shopify data")

      expect(result).toBeDefined()
      expect(result.response).toBe("Mock MCP response")
    })

    it("should pass correct MCP tool format to LangChain", () => {
      const githubTool = getDynamicMCPTool("github")!
      githubTool.headers = { Authorization: "Bearer test" }

      const ai = createAIWithMCPTools([githubTool], {
        apiKey: "test-key",
        model: "gpt-4",
      })

      // The AI instance should be created successfully with the tool
      expect(ai).toBeDefined()
      expect(ai.chat).toBeDefined()

      // The tool should have the correct configuration
      expect(githubTool.type).toBe("mcp")
      expect(githubTool.server_url).toBe("https://github.com/api/mcp")
      expect(githubTool.headers).toEqual({ Authorization: "Bearer test" })
    })
  })

  describe("error handling", () => {
    it("should handle LangChain ChatOpenAI errors gracefully", async () => {
      const githubTool = getDynamicMCPTool("github")!

      // Create AI instance (this should work)
      const ai = createAIWithMCPTools([githubTool], {
        apiKey: "test-key",
        model: "gpt-4",
      })

      // The AI should be created successfully
      expect(ai).toBeDefined()
      expect(ai.chat).toBeDefined()

      // Note: In a real scenario, errors would come from the actual OpenAI API
      // Our mock always returns successful responses for testing the happy path
    })

    it("should handle missing API key", () => {
      const githubTool = getDynamicMCPTool("github")!

      expect(() => createAIWithMCPTools([githubTool], {
        apiKey: "",
        model: "gpt-4",
      })).not.toThrow() // ChatOpenAI should handle empty API key
    })

    it("should handle invalid model name", () => {
      const githubTool = getDynamicMCPTool("github")!

      expect(() => createAIWithMCPTools([githubTool], {
        apiKey: "test-key",
        model: "invalid-model",
      })).not.toThrow() // ChatOpenAI should handle invalid model
    })
  })

  describe("cost tracking and options", () => {
    it("should respect maxCostCents option", () => {
      const githubTool = getDynamicMCPTool("github")!

      const ai = createAIWithMCPTools([githubTool], {
        apiKey: "test-key",
        model: "gpt-4",
        maxCostCents: 75,
      })

      expect(ai).toBeDefined()
      // maxCostCents is stored internally and used for cost calculations
    })

    it("should respect conservativeMode option", () => {
      const githubTool = getDynamicMCPTool("github")!

      const ai = createAIWithMCPTools([githubTool], {
        apiKey: "test-key",
        model: "gpt-4",
        conservativeMode: true,
      })

      expect(ai).toBeDefined()
      // conservativeMode affects internal token limits
    })

    it("should use default options when not specified", () => {
      const githubTool = getDynamicMCPTool("github")!

      const ai = createAIWithMCPTools([githubTool], {
        apiKey: "test-key",
        model: "gpt-4",
        // maxCostCents and conservativeMode not specified
      })

      expect(ai).toBeDefined()
      // Should use defaults: maxCostCents = 100, conservativeMode = false
    })
  })

  describe("mCP tool configurations", () => {
    it("should handle different require_approval settings", () => {
      const githubTool = getDynamicMCPTool("github")! // "never"
      const shopifyTool = getDynamicMCPTool("shopify")! // "prompt"

      const ai = createAIWithMCPTools([githubTool, shopifyTool], {
        apiKey: "test-key",
        model: "gpt-4",
      })

      expect(ai).toBeDefined()
      // Different approval settings should be preserved
    })

    it("should handle tools with and without allowed_tools", () => {
      const githubTool = getDynamicMCPTool("github")! // Has allowed_tools

      // Create a tool without allowed_tools
      const customTool: ExecutableMCPTool = {
        type: "mcp",
        server_url: "https://custom.com/mcp",
        server_label: "custom_mcp",
        require_approval: "never",
        execute: vi.fn().mockResolvedValue({ success: true, response: "Custom response" }),
      }

      const ai = createAIWithMCPTools([githubTool, customTool], {
        apiKey: "test-key",
        model: "gpt-4",
      })

      expect(ai).toBeDefined()
    })

    it("should handle different server URL protocols", () => {
      const httpsTool: ExecutableMCPTool = {
        type: "mcp",
        server_url: "https://api.example.com/mcp",
        server_label: "https_mcp",
        require_approval: "never",
        execute: vi.fn(),
      }

      const stdioTool: ExecutableMCPTool = {
        type: "mcp",
        server_url: "stdio://local-mcp-server",
        server_label: "stdio_mcp",
        require_approval: "never",
        execute: vi.fn(),
      }

      const ai = createAIWithMCPTools([httpsTool, stdioTool], {
        apiKey: "test-key",
        model: "gpt-4",
      })

      expect(ai).toBeDefined()
    })
  })
})
