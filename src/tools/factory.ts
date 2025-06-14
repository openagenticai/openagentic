import type { Tool } from '../types';

export interface ToolFactory {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any> | any;
  costEstimate?: number;
}

export function createTool(factory: ToolFactory): Tool {
  return {
    name: factory.name,
    description: factory.description,
    parameters: factory.parameters,
    execute: factory.execute,
    costEstimate: factory.costEstimate || 0,
  };
}

export function createAsyncTool(
  name: string,
  description: string,
  parameters: Record<string, any>,
  execute: (params: any) => Promise<any>,
  costEstimate = 0
): Tool {
  return createTool({
    name,
    description,
    parameters,
    execute,
    costEstimate,
  });
}

export function createSyncTool(
  name: string,
  description: string,
  parameters: Record<string, any>,
  execute: (params: any) => any,
  costEstimate = 0
): Tool {
  return createTool({
    name,
    description,
    parameters,
    execute: async (params) => execute(params),
    costEstimate,
  });
}