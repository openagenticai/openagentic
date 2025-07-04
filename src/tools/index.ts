// =============================================================================
// MAIN TOOL EXPORTS
// =============================================================================

// Import all individual tools
export { openaiTool } from './openai';
export { openaiImageTool } from './openai-image';
export { openaiVectorStoreTool } from './openai-vector-store';
export { geminiImageTool } from './gemini-image';
export { anthropicTool } from './anthropic';
export { cohereTool } from './cohere';
export { geminiTool } from './gemini';
export { githubTool } from './github';
export { grokTool } from './grok';
export { llamaTool } from './llama';
export { mistralTool } from './mistral';
export { newsdataTool } from './newsdata';
export { perplexityTool } from './perplexity';
export { qrcodeTool } from './qrcode';
export { websearchTool } from './websearch';
export { elevenlabsTool } from './elevenlabs';
export { videoGenerationTool } from './video-generation';
export { geminiTtsTool } from './gemini-tts';
export { inceptionLabsTool } from './inception-labs';
export { htmlComposerTool } from './html-composer';
export { unsplashTool } from './unsplash';
export { slackPosterTool } from './slack-poster';
export { groqTool } from './groq';
export { lumaImageTool } from './luma-image';

// Tool utilities
export { toOpenAgenticTool } from './utils';

// =============================================================================
// TOOL COLLECTIONS
// =============================================================================

import { openaiTool } from './openai';
import { openaiImageTool } from './openai-image';
import { openaiVectorStoreTool } from './openai-vector-store';
import { geminiImageTool } from './gemini-image';
import { anthropicTool } from './anthropic';
import { cohereTool } from './cohere';
import { geminiTool } from './gemini';
import { githubTool } from './github';
import { grokTool } from './grok';
import { llamaTool } from './llama';
import { mistralTool } from './mistral';
import { newsdataTool } from './newsdata';
import { perplexityTool } from './perplexity';
import { qrcodeTool } from './qrcode';
import { websearchTool } from './websearch';
import { elevenlabsTool } from './elevenlabs';
import { videoGenerationTool } from './video-generation';
import { geminiTtsTool } from './gemini-tts';
import { inceptionLabsTool } from './inception-labs';
import { htmlComposerTool } from './html-composer';
import { unsplashTool } from './unsplash';
import { slackPosterTool } from './slack-poster';
import { groqTool } from './groq';
import { lumaImageTool } from './luma-image';

import { type ToolDetails } from '../types'

// Categorized tool collections
export const aiTools = [openaiTool, anthropicTool, cohereTool, geminiTool, grokTool, llamaTool, mistralTool, perplexityTool, websearchTool, inceptionLabsTool, groqTool];
export const utilityTools = [githubTool, newsdataTool, qrcodeTool, openaiImageTool, geminiImageTool, elevenlabsTool, videoGenerationTool, geminiTtsTool, htmlComposerTool, unsplashTool, openaiVectorStoreTool, slackPosterTool, lumaImageTool];
export const allTools = [...utilityTools, ...aiTools];

// =============================================================================
// LIGHTWEIGHT TOOL DESCRIPTIONS (FOR METADATA-ONLY IMPORTS)
// =============================================================================

/**
 * Lightweight tool description interface for metadata-only use cases
 */
export interface ToolDescription extends ToolDetails {
  description: string;
  category: 'utility' | 'ai' | 'custom';
  parametersCount: number;
  parameterNames: string[];
  internal?: boolean;
}

/**
 * Extract lightweight metadata from a tool, excluding heavy execute functions and schemas
 */
function extractToolDescription(tool: any, category: 'utility' | 'ai' | 'custom'): ToolDescription {
  // Extract parameter names from the schema if available
  let parameterNames: string[] = [];
  let parametersCount = 0;
  
  if (tool.parameters && typeof tool.parameters === 'object') {
    try {
      if (tool.parameters.shape) {
        // Zod object schema
        parameterNames = Object.keys(tool.parameters.shape);
        parametersCount = parameterNames.length;
      } else if (tool.parameters.properties) {
        // JSON Schema format
        parameterNames = Object.keys(tool.parameters.properties);
        parametersCount = parameterNames.length;
      } else if (typeof tool.parameters === 'object') {
        // Generic object
        parameterNames = Object.keys(tool.parameters);
        parametersCount = parameterNames.length;
      }
    } catch (error) {
      // Fallback for complex schemas
      parametersCount = 0;
      parameterNames = [];
    }
  }

  return {
    toolId: tool.toolId,
    name: tool.name,
    description: tool.description,
    useCases: tool.useCases || [],
    logo: tool.logo || '',
    category,
    parametersCount,
    parameterNames,
    internal: tool.internal,
  };
}

// Generate tool descriptions for each category
const utilityToolDescriptions = utilityTools.map(tool => extractToolDescription(tool, 'utility'));
const aiToolDescriptions = aiTools.map(tool => extractToolDescription(tool, 'ai'));

/**
 * Lightweight descriptions of all tools for metadata-only imports.
 * This export excludes heavy execute functions and parameter schemas,
 * making it perfect for UI components, documentation, or tool selection interfaces.
 * 
 * @example
 * ```typescript
 * import { allToolDescriptions } from 'openagentic/tools';
 * 
 * // Display available tools in a UI
 * allToolDescriptions.forEach(tool => {
 *   console.log(`${tool.name}: ${tool.description}`);
 *   console.log(`Parameters: ${tool.parameterNames.join(', ')}`);
 *   console.log(`Use cases: ${tool.useCases.join(', ')}`);
 * });
 * 
 * // Filter tools by category
 * const utilityTools = allToolDescriptions.filter(t => t.category === 'utility');
 * const aiTools = allToolDescriptions.filter(t => t.category === 'ai');
 * ```
 */
export const allToolDescriptions: ToolDescription[] = [
  ...utilityToolDescriptions,
  ...aiToolDescriptions,
];

/**
 * Categorized tool descriptions for easier filtering
 */
export const toolDescriptionsByCategory = {
  utility: utilityToolDescriptions,
  ai: aiToolDescriptions,
  all: allToolDescriptions,
} as const;

/**
 * Get tool description by tool ID
 */
export function getToolDescription(toolId: string): ToolDescription | undefined {
  return allToolDescriptions.find(tool => tool.toolId === toolId);
}

/**
 * Get tool descriptions by category
 */
export function getToolDescriptionsByCategory(category: 'utility' | 'ai' | 'custom'): ToolDescription[] {
  return allToolDescriptions.filter(tool => tool.category === category);
}

/**
 * Search tool descriptions by name or description
 */
export function searchToolDescriptions(query: string): ToolDescription[] {
  const lowerQuery = query.toLowerCase();
  return allToolDescriptions.filter(tool => 
    tool.name.toLowerCase().includes(lowerQuery) ||
    tool.description.toLowerCase().includes(lowerQuery) ||
    tool.useCases.some(useCase => useCase.toLowerCase().includes(lowerQuery))
  );
}