// =============================================================================
// MAIN TOOL EXPORTS
// =============================================================================

// Import all individual tools
export { httpTool } from './http';
export { calculatorTool } from './calculator';
export { timestampTool } from './timestamp';

// Custom tool examples
export { weatherTool } from './custom/weather-tool';
export { fileReaderTool } from './custom/file-reader';

// =============================================================================
// TOOL COLLECTIONS
// =============================================================================

import { httpTool } from './http';
import { calculatorTool } from './calculator';
import { timestampTool } from './timestamp';
import { textGenerationTool } from './ai/text-generation';
import { imageGenerationTool } from './ai/image-generation';
import { codeGenerationTool } from './ai/code-generation';
import type { Tool, ToolContext, JSONSchema } from '../types';

// Categorized tool collections
export const utilityTools: Tool[] = [httpTool, calculatorTool, timestampTool];
export const allTools: Tool[] = [...utilityTools];

// Legacy exports for backward compatibility
export { httpTool as httpRequestTool };
export { calculatorTool as mathTool };
export { timestampTool as timeTool };
export { textGenerationTool as aiTextTool };
export { imageGenerationTool as aiImageTool };
export { codeGenerationTool as aiCodeTool };

// =============================================================================
// TOOL CREATION UTILITIES
// =============================================================================

export function createTool(config: {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any, context?: ToolContext) => Promise<any>;
  category?: 'utility' | 'ai' | 'custom';
  version?: string;
  requiresAuth?: boolean;
}): Tool {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: config.execute,
    category: config.category || 'custom',
    version: config.version || '1.0.0',
    requiresAuth: config.requiresAuth || false,
  };
}

export function validateTool(tool: Tool): boolean {
  try {
    if (!tool.name || !tool.description || !tool.execute) {
      return false;
    }
    
    if (!tool.parameters || tool.parameters.type !== 'object') {
      return false;
    }
    
    if (tool.parameters.required) {
      for (const required of tool.parameters.required) {
        if (!tool.parameters.properties[required]) {
          return false;
        }
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// TOOL REGISTRY
// =============================================================================

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void {
    if (!validateTool(tool)) {
      throw new Error(`Invalid tool: ${tool.name}`);
    }
    
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    
    this.tools.set(tool.name, tool);
  }
  
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  getByCategory(category: Tool['category']): Tool[] {
    return this.getAll().filter(tool => tool.category === category);
  }
  
  clear(): void {
    this.tools.clear();
  }
  
  has(name: string): boolean {
    return this.tools.has(name);
  }
}