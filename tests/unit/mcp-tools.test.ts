import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MCPToolConfig } from "../../src/types"
import {
  addMCPToolConfig,
  createDynamicMCPTools,
  getAvailableMCPToolNames,
  getDynamicMCPTool,
} from "../../src/utils/dynamic-tools"
import { createMCPToolsFromConfigs } from "../../src/utils/tool-factory"
import { cleanupMocks } from "../shared/test-utils"

// Mock the tool-definitions.json file
vi.mock("../../src/configs/tool-definitions.json", () => ({
  default: {
    tools: [], // Regular tools
    mcpTools: [
      {
        name: "github",
        description: "Access GitHub repositories, issues, PRs, and perform code analysis via MCP",
        provider: "mcp",
        server_url: "https://github.com/api/mcp",
        server_label: "github_mcp",
        allowed_tools: ["search_repositories", "get_file_content", "create_issue"],
        require_approval: "never",
        auth: {
          type: "bearer",
          header_name: "Authorization",
          env_var: "GITHUB_TOKEN",
        },
      },
      {
        name: "shopify",
        description: "Access Shopify store data, products, and inventory management via MCP",
        provider: "mcp",
        server_url: "https://shopify.mystore.com/api/mcp",
        server_label: "shopify_mcp",
        allowed_tools: ["get_products", "update_inventory", "create_order"],
        require_approval: "prompt",
        auth: {
          type: "api_key",
          header_name: "X-Shopify-Access-Token",
          env_var: "SHOPIFY_ACCESS_TOKEN",
        },
      },
      {
        name: "filesystem",
        description: "Local filesystem operations via MCP (stdio)",
        provider: "mcp",
        server_url: "stdio://mcp-filesystem",
        server_label: "filesystem_mcp",
        allowed_tools: ["read_file", "write_file", "list_directory"],
        require_approval: "always",
      },
    ],
  },
}))

describe("mCP Tools Unit Tests", () => {
  beforeEach(() => {
    cleanupMocks()
  })

  describe("mCP tool configuration loading", () => {
    it("should load MCP tool configurations from JSON", () => {
      const availableNames = getAvailableMCPToolNames()

      expect(availableNames).toContain("github")
      expect(availableNames).toContain("shopify")
      expect(availableNames).toContain("filesystem")
      expect(availableNames).toHaveLength(3)
    })

    it("should create dynamic MCP tools from configuration", () => {
      const mcpTools = createDynamicMCPTools()

      expect(mcpTools).toHaveLength(3)
      expect(mcpTools.map(t => t.server_label)).toContain("github_mcp")
      expect(mcpTools.map(t => t.server_label)).toContain("shopify_mcp")
      expect(mcpTools.map(t => t.server_label)).toContain("filesystem_mcp")
    })
  })

  describe("getDynamicMCPTool", () => {
    it("should retrieve GitHub MCP tool by name", () => {
      const githubTool = getDynamicMCPTool("github")

      expect(githubTool).toBeDefined()
      expect(githubTool?.type).toBe("mcp")
      expect(githubTool?.server_url).toBe("https://github.com/api/mcp")
      expect(githubTool?.server_label).toBe("github_mcp")
      expect(githubTool?.allowed_tools).toEqual(["search_repositories", "get_file_content", "create_issue"])
      expect(githubTool?.require_approval).toBe("never")
    })

    it("should retrieve Shopify MCP tool by name", () => {
      const shopifyTool = getDynamicMCPTool("shopify")

      expect(shopifyTool).toBeDefined()
      expect(shopifyTool?.type).toBe("mcp")
      expect(shopifyTool?.server_url).toBe("https://shopify.mystore.com/api/mcp")
      expect(shopifyTool?.server_label).toBe("shopify_mcp")
      expect(shopifyTool?.allowed_tools).toEqual(["get_products", "update_inventory", "create_order"])
      expect(shopifyTool?.require_approval).toBe("prompt")
    })

    it("should retrieve filesystem MCP tool by name", () => {
      const filesystemTool = getDynamicMCPTool("filesystem")

      expect(filesystemTool).toBeDefined()
      expect(filesystemTool?.type).toBe("mcp")
      expect(filesystemTool?.server_url).toBe("stdio://mcp-filesystem")
      expect(filesystemTool?.server_label).toBe("filesystem_mcp")
      expect(filesystemTool?.allowed_tools).toEqual(["read_file", "write_file", "list_directory"])
      expect(filesystemTool?.require_approval).toBe("always")
    })

    it("should return undefined for non-existent tool", () => {
      const nonExistentTool = getDynamicMCPTool("non-existent")

      expect(nonExistentTool).toBeUndefined()
    })

    it("should handle empty tool name", () => {
      const emptyTool = getDynamicMCPTool("")

      expect(emptyTool).toBeUndefined()
    })
  })

  describe("mCP tool creation from configs", () => {
    it("should create executable MCP tools from configurations", () => {
      const configs: MCPToolConfig[] = [
        {
          name: "test-mcp",
          description: "Test MCP tool",
          provider: "mcp",
          server_url: "https://test.com/mcp",
          server_label: "test_mcp",
          allowed_tools: ["test_action"],
          require_approval: "never",
        },
      ]

      const tools = createMCPToolsFromConfigs(configs)

      expect(tools).toHaveLength(1)

      const tool = tools[0]
      expect(tool.type).toBe("mcp")
      expect(tool.server_url).toBe("https://test.com/mcp")
      expect(tool.server_label).toBe("test_mcp")
      expect(tool.allowed_tools).toEqual(["test_action"])
      expect(tool.require_approval).toBe("never")
      expect(tool.execute).toBeDefined()
      expect(typeof tool.execute).toBe("function")
    })

    it("should handle MCP tool with authentication configuration", () => {
      const githubTool = getDynamicMCPTool("github")!

      // Set authentication headers
      githubTool.headers = {
        Authorization: "Bearer test-token",
      }

      expect(githubTool.headers).toEqual({
        Authorization: "Bearer test-token",
      })
    })

    it("should handle different server URL formats", () => {
      const tools = [
        getDynamicMCPTool("github"), // HTTPS
        getDynamicMCPTool("shopify"), // HTTPS with subdomain
        getDynamicMCPTool("filesystem"), // stdio protocol
      ]

      tools.forEach((tool) => {
        expect(tool).toBeDefined()
        expect(tool?.server_url).toBeTruthy()
      })

      expect(tools[0]?.server_url).toMatch(/^https:\/\//)
      expect(tools[1]?.server_url).toMatch(/^https:\/\//)
      expect(tools[2]?.server_url).toMatch(/^stdio:\/\//)
    })
  })

  describe("mCP tool execute function", () => {
    it("should create tools with execute functions", () => {
      const githubTool = getDynamicMCPTool("github")

      expect(githubTool?.execute).toBeDefined()
      expect(typeof githubTool?.execute).toBe("function")
    })

    it("should execute MCP tool and return result", async () => {
      const githubTool = getDynamicMCPTool("github")!

      // Mock execution - MCP tools return an error when executed directly
      // because they need to be used through OpenAI's Responses API
      const mockParams = {
        tool_name: "search_repositories",
        query: "typescript",
      }

      const result = await githubTool.execute(mockParams)

      expect(result).toBeDefined()
      expect(result.success).toBe(false) // MCP tools can't be executed directly
      expect(result.error).toContain("MCP tools must be used with OpenAI Responses API")
      expect(result.response).toContain("Please use this tool through createAIWithTools()")
    })

    it("should handle execute function with cost tracker", async () => {
      const githubTool = getDynamicMCPTool("github")!

      // Create a mock cost tracker
      const mockCostTracker = {
        getRemainingBudgetCents: vi.fn().mockReturnValue(100),
        canAfford: vi.fn().mockReturnValue(true),
        addUsage: vi.fn(),
        estimateCost: vi.fn().mockReturnValue(5),
        getSummary: vi.fn().mockReturnValue({
          totalCostCents: 0,
          maxCostCents: 100,
          remainingBudgetCents: 100,
          budgetUsedPercentage: 0,
          totalQueries: 0,
          orchestratorQueries: 0,
          toolQueries: 0,
        }),
      } as any

      const result = await githubTool.execute(
        { tool_name: "get_file_content", path: "README.md" },
        mockCostTracker,
      )

      expect(result).toBeDefined()
      expect(result.success).toBe(false) // MCP tools can't be executed directly
      expect(result.costTracker).toBeDefined()
    })
  })

  describe("addMCPToolConfig", () => {
    it("should add new MCP tool configuration at runtime", () => {
      const newConfig: MCPToolConfig = {
        name: "custom-mcp",
        description: "Custom MCP tool for testing",
        provider: "mcp",
        server_url: "https://custom.com/mcp",
        server_label: "custom_mcp",
        allowed_tools: ["custom_action"],
        require_approval: "never",
      }

      const tool = addMCPToolConfig(newConfig)

      expect(tool).toBeDefined()
      expect(tool.type).toBe("mcp")
      expect(tool.server_url).toBe("https://custom.com/mcp")
      expect(tool.server_label).toBe("custom_mcp")
    })
  })

  describe("mCP tool validation", () => {
    it("should validate required MCP tool properties", () => {
      const tools = createDynamicMCPTools()

      tools.forEach((tool) => {
        expect(tool.type).toBe("mcp")
        expect(tool.server_url).toBeTruthy()
        expect(tool.server_label).toBeTruthy()
        expect(tool.execute).toBeDefined()

        // Optional properties should be handled gracefully
        if (tool.allowed_tools) {
          expect(Array.isArray(tool.allowed_tools)).toBe(true)
        }

        if (tool.require_approval) {
          expect(["never", "always", "prompt"]).toContain(tool.require_approval)
        }
      })
    })

    it("should handle MCP tools with minimal configuration", () => {
      const minimalConfig: MCPToolConfig = {
        name: "minimal-mcp",
        description: "Minimal MCP tool",
        provider: "mcp",
        server_url: "https://minimal.com/mcp",
        server_label: "minimal_mcp",
      }

      const tool = createMCPToolsFromConfigs([minimalConfig])[0]

      expect(tool).toBeDefined()
      expect(tool.type).toBe("mcp")
      expect(tool.server_url).toBe("https://minimal.com/mcp")
      expect(tool.server_label).toBe("minimal_mcp")
      expect(tool.require_approval).toBe("prompt") // Default value
      expect(tool.allowed_tools).toBeUndefined() // Optional
      expect(tool.headers).toBeUndefined() // Optional
    })
  })
})
