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
export interface ToolDetails {
  toolId: string;
  name: string;
  useCases: string[];
  parameters: Record<string, string>;
  internal: boolean;
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
