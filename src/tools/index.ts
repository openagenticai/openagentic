import type { Tool, ToolCollection } from "../types"
import { createToolCollection } from "../utils"
// Import dynamic tools system
import { dynamicTools } from "../utils/dynamic-tools"

// Re-export dynamic tools system for modern usage
export {
  addToolConfig,
  createDynamicTools,
  dynamicAnthropic,
  dynamicCohere,
  dynamicGemini,
  dynamicHuggingFace,
  dynamicOpenAI,
  dynamicTools,
  getAvailableToolNames,
  getDynamicTool,
} from "../utils/dynamic-tools"

// Re-export tool factory for custom tools
export {
  createExecutableTool,
  createToolsFromConfigs,
  type ToolConfig,
} from "../utils/tool-factory"

// Re-export utilities
export {
  createToolCollection,
}

// Extract OpenAI and Anthropic tools from dynamic system for backward compatibility
const openaiExecutableTool = dynamicTools.find(tool => tool.function.name === "openai")!
const anthropicExecutableTool = dynamicTools.find(tool => tool.function.name === "anthropic")!
const openaiTool = { ...openaiExecutableTool }
const anthropicTool = { ...anthropicExecutableTool }
delete (openaiTool as any).execute
delete (anthropicTool as any).execute

// Legacy exports for backward compatibility
export const openai = openaiTool
export const anthropic = anthropicTool
export const executeOpenAi = openaiExecutableTool.execute
export const executeAnthropic = anthropicExecutableTool.execute
export { anthropicExecutableTool, anthropicTool, openaiExecutableTool, openaiTool }

// Legacy tools array for backward compatibility (OpenAI and Anthropic only)
export const tools: Tool[] = [openaiTool, anthropicTool]

// Standard tool collection (backward compatibility - OpenAI and Anthropic only)
export const allTools: ToolCollection = createToolCollection([openaiExecutableTool, anthropicExecutableTool])

// Enhanced tool collection that includes all dynamic tools
export const allToolsEnhanced: ToolCollection = createToolCollection(dynamicTools)

// Utility to get all available tools (enhanced version)
export function getAllAvailableTools(): ToolCollection {
  return allToolsEnhanced
}

// Legacy execution function for backward compatibility
export const executeTool = async (toolCall: any, costTracker?: any): Promise<any> => {
  // For backward compatibility, only pass costTracker if it was explicitly provided
  if (costTracker !== undefined) {
    return allTools.execute(toolCall, costTracker)
  }
  return allTools.execute(toolCall)
}

// Enhanced tool execution that uses the full tool set
export function executeToolEnhanced(toolCall: any, costTracker?: any): Promise<any> {
  return allToolsEnhanced.execute(toolCall, costTracker)
}
