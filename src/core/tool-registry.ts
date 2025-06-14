import type { Tool } from '../types';
import { ToolError } from './errors';

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private usedTools = new Set<string>();

  constructor(tools: Tool[] = []) {
    tools.forEach(tool => this.register(tool));
  }

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new ToolError(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  async execute(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolError(`Tool '${name}' not found`);
    }

    try {
      // Mark tool as used for tracking
      this.usedTools.add(name);
      
      // Execute the tool
      return await tool.execute(args);
    } catch (error) {
      throw new ToolError(
        `Failed to execute tool '${name}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  getDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  getUsedTools(): string[] {
    return Array.from(this.usedTools);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  reset(): void {
    this.usedTools.clear();
  }
}