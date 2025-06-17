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
  enableDebugLogging?: boolean;
  logLevel?: 'none' | 'basic' | 'detailed';
  enableStepLogging?: boolean;
  enableToolLogging?: boolean;
  enableTimingLogging?: boolean;
  enableStatisticsLogging?: boolean;
  enableStreamingLogging?: boolean;
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
  enableDebugLogging?: boolean;
  logLevel?: 'none' | 'basic' | 'detailed';
  enableStepLogging?: boolean;
  enableToolLogging?: boolean;
  enableTimingLogging?: boolean;
  enableStatisticsLogging?: boolean;
  enableStreamingLogging?: boolean;
  onFinish?: (result: any) => void | Promise<void>;
}) {
  return new StreamingOrchestrator(options);
}

/**
 * Create a streaming agent optimized for useChat compatibility
 * Returns an agent with streamResponse() method as primary interface
 */
export function createStreamingResponseAgent(options: {
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
}) {
  const streamingAgent = new StreamingOrchestrator(options);
  
  return {
    // Primary interface for useChat compatibility
    streamResponse: streamingAgent.streamResponse.bind(streamingAgent),
    
    // Access to original streaming methods
    streamText: streamingAgent.stream.bind(streamingAgent),
    
    // Tool management
    addTool: streamingAgent.addTool.bind(streamingAgent),
    removeTool: streamingAgent.removeTool.bind(streamingAgent),
    getTool: streamingAgent.getTool.bind(streamingAgent),
    getAllTools: streamingAgent.getAllTools.bind(streamingAgent),
    
    // Configuration and state management
    switchModel: streamingAgent.switchModel.bind(streamingAgent),
    getModelInfo: streamingAgent.getModelInfo.bind(streamingAgent),
    getMessages: streamingAgent.getMessages.bind(streamingAgent),
    addMessage: streamingAgent.addMessage.bind(streamingAgent),
    reset: streamingAgent.reset.bind(streamingAgent),
    clear: streamingAgent.clear.bind(streamingAgent),
  };
}