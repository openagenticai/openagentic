import { type Tool } from 'ai';
import { type OpenAgenticTool, type ToolDetails } from '../types';

/**
 * Helper function to add a custom toolId to an AI SDK tool
 * This provides better identification and debugging capabilities
 * 
 * @param tool - AI SDK tool created with tool() function, see ai's ToolParameters type for more details
 * @param toolId - Unique identifier for the tool
 * @returns Tool with toolId property for better identification
 */
export function toOpenAgenticTool(tool: Tool, details: ToolDetails): OpenAgenticTool {
 return {
  ...tool,
  ...details,
 }
}
