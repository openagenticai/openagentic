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
// MAIN API - TWO SIMPLIFIED FACTORY FUNCTIONS
// =============================================================================

import { Orchestrator } from './orchestrator';
import { StreamingOrchestrator } from './streaming-orchestrator';
import type { Tool, AIModel } from './types';

/**
 * Create a standard agent for non-streaming execution
 * This is the main agent type for most use cases
 */
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

/**
 * Create a streaming agent for real-time response streaming
 * Uses AI SDK's streamText for optimal streaming performance
 */
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