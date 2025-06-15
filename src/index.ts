// Core exports
export { Orchestrator as BaseOrchestrator } from './core/orchestrator';

// Import orchestrator classes with aliases
import { Orchestrator as OrchestratorClass } from './core/orchestrator';
import { SimpleOrchestrator as SimpleOrchestratorClass } from './orchestrators/simple';
import { ConversationalOrchestrator as ConversationalOrchestratorClass } from './orchestrators/conversational';
import { TaskOrchestrator as TaskOrchestratorClass } from './orchestrators/task';

// Re-export orchestrator variants under their public names
export { SimpleOrchestratorClass as SimpleOrchestrator };
export { ConversationalOrchestratorClass as ConversationalOrchestrator };
export { TaskOrchestratorClass as TaskOrchestrator };
export { OrchestratorClass as Orchestrator };

// Templates
export * from './orchestrators/templates';

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

// Main factory functions for easy usage
export function createOrchestrator(
  model: any,
  tools: any[] = [],
  systemPrompt?: string,
  streaming = false
): OrchestratorClass {
  return new OrchestratorClass(model, tools, systemPrompt, streaming);
}

export function createSimpleAgent(options: {
  provider: 'openai' | 'anthropic' | 'google' | 'google-vertex' | 'perplexity' | 'xai';
  model: string;
  apiKey?: string;
  baseURL?: string;
  project?: string;
  location?: string;
  tools?: any[];
  systemPrompt?: string;
  streaming?: boolean;
}): SimpleOrchestratorClass {
  return SimpleOrchestratorClass.create(options);
}

export function createConversationalAgent(options: {
  provider: 'openai' | 'anthropic' | 'google' | 'google-vertex' | 'perplexity' | 'xai';
  model: string;
  apiKey?: string;
  baseURL?: string;
  project?: string;
  location?: string;
  tools?: any[];
  systemPrompt?: string;
  streaming?: boolean;
}): ConversationalOrchestratorClass {
  return ConversationalOrchestratorClass.create(options);
}

export function createTaskAgent(options: {
  provider: 'openai' | 'anthropic' | 'google' | 'google-vertex' | 'perplexity' | 'xai';
  model: string;
  apiKey?: string;
  baseURL?: string;
  project?: string;
  location?: string;
  tools?: any[];
  steps?: any[];
  systemPrompt?: string;
  streaming?: boolean;
}): TaskOrchestratorClass {
  return TaskOrchestratorClass.create(options);
}