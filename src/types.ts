import { z } from 'zod';

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
// ORCHESTRATOR CONFIGURATION
// =============================================================================

export interface OrchestratorConfig {
  model: string | AIModel;
  tools?: Tool[];
  systemPrompt?: string;
  streaming?: boolean;
  maxIterations?: number;
  debug?: boolean;
  customLogic?: (input: string, context: any) => Promise<any>;
}

// =============================================================================
// TOOL TYPES
// =============================================================================

// JSONSchema definition for tool parameters
export interface JSONSchema {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
    enum?: string[];
    properties?: Record<string, any>;
    items?: any;
  }>;
  required?: string[];
}

// Tool context for AI-powered tools
export interface ToolContext {
  getModel: (provider?: string) => Promise<any>;
  apiKeys: Record<string, string>;
}

// Self-contained tool interface
export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any, context?: ToolContext) => Promise<any>;
  
  // Optional metadata
  category?: 'utility' | 'ai' | 'custom';
  version?: string;
  requiresAuth?: boolean;
}

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
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// =============================================================================
// STREAMING TYPES
// =============================================================================

export interface StreamChunk {
  delta: string;
  content: string;
  done: boolean;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

// Event types for streaming and real-time updates
export type OrchestratorEvent = 
  | { type: 'start'; data: { model: AIModel } }
  | { type: 'iteration'; data: { iteration: number; message: Message } }
  | { type: 'tool_call'; data: { toolName: string; arguments: Record<string, any> } }
  | { type: 'tool_result'; data: { toolName: string; result: any; success: boolean } }
  | { type: 'stream'; data: StreamChunk }
  | { type: 'complete'; data: ExecutionResult }
  | { type: 'error'; data: { error: string } };

export type EventHandler = (event: OrchestratorEvent) => void;

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export interface ProviderConfig {
  baseURL: string;
  models: Record<string, {
    contextWindow: number;
    cost: { input: number; output: number };
    description: string;
  }>;
}

export interface ModelInfo {
  contextWindow: number;
  cost: { input: number; output: number };
  description: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class OpenAgenticError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAgenticError';
  }
}

export class OrchestratorError extends OpenAgenticError {
  constructor(message: string) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

export class ProviderError extends OpenAgenticError {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ToolError extends OpenAgenticError {
  constructor(message: string) {
    super(message);
    this.name = 'ToolError';
  }
}

export class BudgetExceededError extends OpenAgenticError {
  constructor(
    public resourceType: 'cost' | 'tokens' | 'tool_calls',
    public currentValue: number,
    public limit: number
  ) {
    super(`Budget exceeded: ${resourceType} limit of ${limit} exceeded (current: ${currentValue})`);
    this.name = 'BudgetExceededError';
  }
}

export class MaxIterationsError extends OpenAgenticError {
  constructor(maxIterations: number) {
    super(`Maximum iterations reached: ${maxIterations}`);
    this.name = 'MaxIterationsError';
  }
}

export class ValidationError extends OpenAgenticError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface Logger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// =============================================================================
// LEGACY COMPATIBILITY TYPES
// =============================================================================

// For backward compatibility with existing code
export const ToolParameterSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string(),
  required: z.boolean().default(false),
  enum: z.array(z.string()).optional(),
  properties: z.record(z.any()).optional(),
  items: z.any().optional(),
});

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(ToolParameterSchema),
  execute: z.function(),
  category: z.enum(['utility', 'ai', 'custom']).optional(),
  version: z.string().optional(),
  requiresAuth: z.boolean().optional(),
});

export const CostTrackingSchema = z.object({
  inputTokens: z.number().default(0),
  outputTokens: z.number().default(0),
  toolCalls: z.number().default(0),
  estimatedCost: z.number().default(0),
  actualCost: z.number().optional(),
});

export type CostTracking = z.infer<typeof CostTrackingSchema>;

export const OrchestratorConfigSchema = z.object({
  model: z.union([z.string(), AIModelSchema]),
  tools: z.array(ToolSchema).optional(),
  systemPrompt: z.string().optional(),
  maxIterations: z.number().positive().default(10),
  streaming: z.boolean().default(false),
  debug: z.boolean().default(false),
  customLogic: z.function().optional(),
});