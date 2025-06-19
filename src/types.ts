import { z } from 'zod';
import { type Tool } from 'ai';

// =============================================================================
// CORE TYPES FOR OPENAGENTIC FRAMEWORK
// =============================================================================

export const AIModelSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'google-vertex', 'perplexity', 'xai', 'custom']),
  model: z.string(),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  project: z.string().optional(),
  location: z.string().optional(),
});

export type AIModel = z.infer<typeof AIModelSchema>;

export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  toolCallId: z.string().optional(),
  toolCalls: z.array(z.object({
    toolCallId: z.string(),
    toolName: z.string(),
    args: z.record(z.any()),
  })).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// =============================================================================
// API KEY MAP TYPE
// =============================================================================

export type ApiKeyMap = Record<string, string>;

// =============================================================================
// CORE MESSAGE TYPES (AI SDK COMPATIBLE)
// =============================================================================

export interface CoreMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<any>;
  toolCallId?: string;
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, any>;
  }>;
}

// =============================================================================
// LOGGING AND DEBUG TYPES
// =============================================================================

export type LogLevel = 'none' | 'basic' | 'detailed';

export interface LoggingConfig {
  enableDebugLogging?: boolean;
  logLevel?: LogLevel;
  enableStepLogging?: boolean;
  enableToolLogging?: boolean;
  enableTimingLogging?: boolean;
  enableStatisticsLogging?: boolean;
}

export interface ExecutionStats {
  totalDuration: number;
  stepsExecuted: number;
  toolCallsExecuted: number;
  tokensUsed?: number;
  averageStepDuration: number;
  averageToolCallDuration: number;
}

export interface StepInfo {
  stepIndex: number;
  stepType: string;
  duration: number;
  toolCalls: string[];
  errors: string[];
  startTime: number;
  endTime: number;
}

// =============================================================================
// OPENAGENTIC TOOL TYPES
// =============================================================================

export type ToolDetails = {
  toolId: string;
  name: string;
  useCases: string[];
  logo: string;
  internal?: boolean;
}

export type OpenAgenticTool = Tool & ToolDetails;

// =============================================================================
// EXECUTION RESULT TYPES
// =============================================================================

export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  messages: z.array(MessageSchema),
  iterations: z.number(),
  toolCallsUsed: z.array(z.string()),
  executionStats: z.object({
    totalDuration: z.number(),
    stepsExecuted: z.number(),
    toolCallsExecuted: z.number(),
    tokensUsed: z.number().optional(),
    averageStepDuration: z.number(),
    averageToolCallDuration: z.number(),
  }).optional(),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// =============================================================================
// ORCHESTRATOR TYPES
// =============================================================================

/**
 * Supported orchestrator types
 */
export type OrchestratorType = 'prompt-based' | 'custom-logic';

/**
 * Context object passed to orchestrator execute methods
 */
export interface OrchestratorContext {
  model: AIModel;
  tools: OpenAgenticTool[];
  messages: Message[];
  iterations: number;
  maxIterations: number;
  loggingConfig: LoggingConfig;
  orchestratorParams?: Record<string, any>;
}

/**
 * Base interface for all orchestrators
 */
export interface BaseOrchestrator {
  /** Unique identifier for the orchestrator */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this orchestrator does */
  description: string;
  
  /** Type of orchestrator */
  type: OrchestratorType;
  
  /** Execute the orchestration logic */
  execute(input: string | CoreMessage[], context: OrchestratorContext): Promise<ExecutionResult>;
  
  /** Get the orchestrator name */
  getName(): string;
  
  /** Get the orchestrator description */
  getDescription(): string;
  
  /** Get the orchestrator type */
  getType(): OrchestratorType;
  
  /** Optional validation method for inputs */
  validate?(input: string | CoreMessage[], context: OrchestratorContext): Promise<boolean>;
  
  /** Optional initialization method */
  initialize?(context: OrchestratorContext): Promise<void>;
  
  /** Optional cleanup method */
  cleanup?(context: OrchestratorContext): Promise<void>;
}

/**
 * Orchestrator that uses system prompts and standard LLM interaction
 */
export interface PromptBasedOrchestrator extends BaseOrchestrator {
  type: 'prompt-based';
  
  /** System prompt used for orchestration */
  systemPrompt: string;
  
  /** Get the system prompt */
  getSystemPrompt(): string;
  
  /** Optional method to modify system prompt based on context */
  buildSystemPrompt?(context: OrchestratorContext): string;
}

/**
 * Orchestrator that uses custom logic instead of standard LLM flow
 */
export interface CustomLogicOrchestrator extends BaseOrchestrator {
  type: 'custom-logic';
  
  /** Custom logic function for orchestration */
  customLogic(input: string | CoreMessage[], context: OrchestratorContext): Promise<any>;
  
  /** Optional method to determine if custom logic should be used */
  shouldUseCustomLogic?(input: string | CoreMessage[], context: OrchestratorContext): boolean;
}

/**
 * Options for creating orchestrator-enabled agents
 */
export interface OrchestratorOptions {
  /** Orchestrator instance or ID to use */
  orchestrator?: string | BaseOrchestrator;
  
  /** Alternative parameter name for orchestrator ID */
  orchestratorId?: string;
  
  /** Parameters to pass to the orchestrator */
  orchestratorParams?: Record<string, any>;
  
  /** Whether to allow orchestrator to override system prompt */
  allowOrchestratorPromptOverride?: boolean;
  
  /** Whether to allow orchestrator to modify tool execution */
  allowOrchestratorToolControl?: boolean;
}