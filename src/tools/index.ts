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
import type { Tool, ToolContext, JSONSchema } from '../types';

// Categorized tool collections
export const utilityTools = [httpTool, calculatorTool, timestampTool];
export const allTools = [...utilityTools];

// Legacy exports for backward compatibility
export { httpTool as httpRequestTool };
export { calculatorTool as mathTool };
export { timestampTool as timeTool };

// =============================================================================
// TOOL REGISTRY
// =============================================================================

export class ToolRegistry {
  private tools = new Map<string, any>();
  
  register(name: string, tool: any): void {
    if (this.tools.has(name)) {
      throw new Error(`Tool already registered: ${name}`);
    }
    
    this.tools.set(name, tool);
  }
  
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }
  
  get(name: string): any {
    return this.tools.get(name);
  }
  
  getAll(): any[] {
    return Array.from(this.tools.values());
  }
  
  getAllAsObject(): Record<string, any> {
    return Object.fromEntries(this.tools.entries());
  }
  
  clear(): void {
    this.tools.clear();
  }
  
  has(name: string): boolean {
    return this.tools.has(name);
  }

  getNames(): string[] {
    return Array.from(this.tools.keys());
  }
}