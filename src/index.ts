// =============================================================================
// MAIN EXPORTS
// =============================================================================

// Core exports - two distinct orchestrator classes
export { Orchestrator } from './orchestrator';
export { StreamingOrchestrator } from './streaming-orchestrator';

// Tools
export * from './tools';

// Provider management
export { ProviderManager } from './providers/manager';

// Types
export * from './types';

// =============================================================================
// SIMPLIFIED FACTORY FUNCTIONS - ONLY 2 MAIN AGENT TYPES
// =============================================================================

import { Orchestrator } from './orchestrator';
import { StreamingOrchestrator } from './streaming-orchestrator';
import type { Tool, AIModel } from './types';

export function createAgent(options: {
  model: string | AIModel;
  tools?: Tool[];
  systemPrompt?: string;
  maxIterations?: number;
  customLogic?: (input: string, context: any) => Promise<any>;
}) {
  return new Orchestrator({
    model: options.model,
    tools: options.tools || [],
    systemPrompt: options.systemPrompt,
    maxIterations: options.maxIterations || 10,
    customLogic: options.customLogic,
  });
}

export function createStreamingAgent(options: {
  model: string | AIModel;
  tools?: Tool[];
  systemPrompt?: string;
  maxIterations?: number;
}) {
  return new StreamingOrchestrator({
    model: options.model,
    tools: options.tools || [],
    systemPrompt: options.systemPrompt,
    maxIterations: options.maxIterations || 10,
  });
}