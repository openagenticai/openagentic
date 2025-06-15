// Core exports
export { Orchestrator } from './core/orchestrator';
export { AIProvider } from './core/ai-provider';
export { ToolRegistry } from './core/tool-registry';

// Orchestrator variants
export { 
  SimpleOrchestrator, 
  MultiModelOrchestrator, 
  PipelineOrchestrator 
} from './orchestrators';

// Tools
export * from './tools';

// Providers
export * from './providers';

// Types
export * from './types';

// Utils
export * from './utils';

// Errors
export * from './core/errors';

// Simple factory functions
export function createOrchestrator(config: any): Orchestrator {
  return new Orchestrator(config);
}

export function createSimpleAgent(options: {
  provider: 'openai' | 'anthropic' | 'google' | 'google-vertex' | 'perplexity' | 'xai';
  model: string;
  apiKey?: string;
  tools?: any[];
  systemPrompt?: string;
  streaming?: boolean;
  maxIterations?: number;
}): SimpleOrchestrator {
  return SimpleOrchestrator.create(options);
}