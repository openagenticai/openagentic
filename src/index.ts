import { Orchestrator } from './orchestrator';
import { StreamingOrchestrator } from './streaming-orchestrator';

import type { AIModel } from './types';

// =============================================================================
// CORE EXPORTS - SIMPLIFIED
// =============================================================================

// Core orchestrator classes
export { Orchestrator } from './orchestrator';
export { StreamingOrchestrator } from './streaming-orchestrator';

// Tools
export * from './tools';

// Provider management
export { ProviderManager } from './providers/manager';

// Types
export * from './types';

// =============================================================================
// AGENT CREATION FUNCTIONS
// =============================================================================



/**
 * Create a standard agent for non-streaming execution
 */
export function createAgent(options: {
  model: string | AIModel;
  tools?: any[];
  systemPrompt?: string;
  maxIterations?: number;
  customLogic?: (input: string, context: any) => Promise<any>;
}): Orchestrator {
  return new Orchestrator(options);
}

/**
 * Create a streaming agent for real-time response streaming
 */
export function createStreamingAgent(options: {
  model: string | AIModel;
  tools?: any[];
  systemPrompt?: string;
  maxIterations?: number;
}) {
  return new StreamingOrchestrator(options);
}