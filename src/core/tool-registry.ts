import type { Tool } from '../types';
import { ToolError } from './errors';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private usedTools: Set<string> = new Set();

  constructor(tools: Tool[] = []) {
    tools.forEach(tool => this.registerTool(tool));
  }

  public registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new ToolError(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  public unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  public async executeTool(name: string, parameters: Record<string, any>): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolError(`Tool '${name}' not found`);
    }

    try {
      // Validate parameters
      this.validateParameters(tool, parameters);
      
      // Mark tool as used
      this.usedTools.add(name);
      
      // Execute the tool
      const result = await tool.execute(parameters);
      return result;
    } catch (error) {
      throw new ToolError(
        `Failed to execute tool '${name}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  public getToolDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  public getUsedTools(): string[] {
    return Array.from(this.usedTools);
  }

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  public reset(): void {
    this.usedTools.clear();
  }

  private validateParameters(tool: Tool, parameters: Record<string, any>): void {
    const required = Object.entries(tool.parameters)
      .filter(([, param]) => param.required)
      .map(([name]) => name);

    for (const requiredParam of required) {
      if (!(requiredParam in parameters)) {
        throw new ToolError(
          `Missing required parameter '${requiredParam}' for tool '${tool.name}'`
        );
      }
    }

    // Basic type validation
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const paramSchema = tool.parameters[paramName];
      if (!paramSchema) continue;

      if (!this.validateParameterType(paramValue, paramSchema.type)) {
        throw new ToolError(
          `Invalid type for parameter '${paramName}' in tool '${tool.name}'. Expected ${paramSchema.type}, got ${typeof paramValue}`
        );
      }
    }
  }

  private validateParameterType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown type, allow it
    }
  }
}