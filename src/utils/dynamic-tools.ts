import toolDefinitions from "../configs/tool-definitions.json"
import type { ExecutableMCPTool, ExecutableTool, MCPToolConfig } from "../types"

import { createMCPToolsFromConfigs, createToolsFromConfigs } from "./tool-factory"
import type { ToolConfig } from "./tool-factory"

/**
 * Load tool configurations from JSON
 */
function loadToolConfigs(): ToolConfig[] {
  return toolDefinitions.tools as ToolConfig[]
}

/**
 * Load MCP tool configurations from JSON
 */
function loadMCPToolConfigs(): MCPToolConfig[] {
  return (toolDefinitions as any).mcpTools || [] as MCPToolConfig[]
}

/**
 * Create all tools dynamically from JSON configuration
 */
export function createDynamicTools(): ExecutableTool[] {
  const configs = loadToolConfigs()
  return createToolsFromConfigs(configs)
}

/**
 * Create all MCP tools dynamically from JSON configuration
 */
export function createDynamicMCPTools(): ExecutableMCPTool[] {
  const configs = loadMCPToolConfigs()
  return createMCPToolsFromConfigs(configs)
}

/**
 * Get all tools (both regular and MCP) as a unified collection
 */
export function getAllDynamicTools(): (ExecutableTool | ExecutableMCPTool)[] {
  return [
    ...createDynamicTools(),
    ...createDynamicMCPTools(),
  ]
}

/**
 * Get a specific tool by name (searches both regular and MCP tools)
 */
export function getDynamicTool(name: string): ExecutableTool | ExecutableMCPTool | undefined {
  // Check regular tools first
  const configs = loadToolConfigs()
  const config = configs.find(c => c.name === name)

  if (config) {
    return createToolsFromConfigs([config])[0]
  }

  // Check MCP tools
  const mcpConfigs = loadMCPToolConfigs()
  const mcpConfig = mcpConfigs.find(c => c.name === name)

  if (mcpConfig) {
    return createMCPToolsFromConfigs([mcpConfig])[0]
  }

  return undefined
}

/**
 * Get a specific MCP tool by name
 */
export function getDynamicMCPTool(name: string): ExecutableMCPTool | undefined {
  const configs = loadMCPToolConfigs()
  const config = configs.find(c => c.name === name)

  if (!config) {
    return undefined
  }

  return createMCPToolsFromConfigs([config])[0]
}

/**
 * Get all available tool names from configuration (both regular and MCP)
 */
export function getAvailableToolNames(): string[] {
  const regularTools = loadToolConfigs().map(c => c.name)
  const mcpTools = loadMCPToolConfigs().map(c => c.name)
  return [...regularTools, ...mcpTools]
}

/**
 * Get available MCP tool names only
 */
export function getAvailableMCPToolNames(): string[] {
  const configs = loadMCPToolConfigs()
  return configs.map(c => c.name)
}

/**
 * Add a new tool configuration at runtime
 */
export function addToolConfig(config: ToolConfig): ExecutableTool {
  // In a real implementation, you might want to persist this back to storage
  // For now, just create the tool dynamically
  return createToolsFromConfigs([config])[0]
}

/**
 * Add a new MCP tool configuration at runtime
 */
export function addMCPToolConfig(config: MCPToolConfig): ExecutableMCPTool {
  // In a real implementation, you might want to persist this back to storage
  // For now, just create the tool dynamically
  return createMCPToolsFromConfigs([config])[0]
}

// Export pre-built tools for immediate use
export const dynamicTools = createDynamicTools()
export const dynamicMCPTools = createDynamicMCPTools()
export const allDynamicTools = getAllDynamicTools()

// Export individual regular tools for backward compatibility
export const dynamicOpenAI = getDynamicTool("openai")
export const dynamicAnthropic = getDynamicTool("anthropic")
export const dynamicGemini = getDynamicTool("gemini")
export const dynamicCohere = getDynamicTool("cohere")
export const dynamicHuggingFace = getDynamicTool("huggingface")

// Export individual MCP tools
export const dynamicGithub = getDynamicMCPTool("github")
export const dynamicShopify = getDynamicMCPTool("shopify")
export const dynamicFilesystem = getDynamicMCPTool("filesystem")
