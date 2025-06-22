import { Orchestrator } from './orchestrator';
import { StreamingOrchestrator } from './streaming-orchestrator';
import { ProviderManager } from './providers/manager';
import type { AIModel, ApiKeyMap, OrchestratorOptions } from './types';

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

// Orchestrator registry and utilities
export * from './orchestrators/registry';
export * from './orchestrators';

// Types
export * from './types';
export type { ApiKeyMap } from './types'; // Explicit export for better IDE support

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
  enableDebugLogging?: boolean;
  logLevel?: 'none' | 'basic' | 'detailed';
  enableStepLogging?: boolean;
  enableToolLogging?: boolean;
  enableTimingLogging?: boolean;
  enableStatisticsLogging?: boolean;
  enableStreamingLogging?: boolean;
  /** 
   * API keys for various providers. Can include:
   * - Provider keys: openai, anthropic, google, etc.
   * - AWS credentials: awsAccessKeyId, awsSecretAccessKey, awsRegion, awsS3Bucket
   * - Bedrock credentials: bedrockAccessKeyId, bedrockSecretAccessKey, bedrockRegion
   */
  apiKeys?: ApiKeyMap;
} & OrchestratorOptions): Orchestrator {
  // Set user API keys before creating orchestrator
  if (options.apiKeys !== undefined) {
    ProviderManager.setUserApiKeys(options.apiKeys);
  }
  
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
  enableDebugLogging?: boolean;
  logLevel?: 'none' | 'basic' | 'detailed';
  enableStepLogging?: boolean;
  enableToolLogging?: boolean;
  enableTimingLogging?: boolean;
  enableStatisticsLogging?: boolean;
  enableStreamingLogging?: boolean;
  onFinish?: (result: any) => void | Promise<void>;
  /** 
   * API keys for various providers. Can include:
   * - Provider keys: openai, anthropic, google, etc.
   * - AWS credentials: awsAccessKeyId, awsSecretAccessKey, awsRegion, awsS3Bucket
   * - Bedrock credentials: bedrockAccessKeyId, bedrockSecretAccessKey, bedrockRegion
   */
  apiKeys?: ApiKeyMap;
} & OrchestratorOptions) {
  // Set user API keys before creating orchestrator
  if (options.apiKeys !== undefined) {
    ProviderManager.setUserApiKeys(options.apiKeys);
  }
  
  return new StreamingOrchestrator(options);
}

// Load built-in orchestrators on import
import { loadBuiltInOrchestrators } from './orchestrators';
loadBuiltInOrchestrators();