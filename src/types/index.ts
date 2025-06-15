import { z } from 'zod';

// Core types for the OpenAgentic framework

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
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

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

export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  messages: z.array(MessageSchema),
  iterations: z.number(),
  toolCallsUsed: z.array(z.string()),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// Event types for streaming and real-time updates
export type OrchestratorEvent = 
  | { type: 'start'; data: { model: AIModel } }
  | { type: 'iteration'; data: { iteration: number; message: Message } }
  | { type: 'tool_call'; data: { toolName: string; arguments: Record<string, any> } }
  | { type: 'tool_result'; data: { toolName: string; result: any; success: boolean } }
  | { type: 'stream'; data: { delta: string; content: string } }
  | { type: 'complete'; data: ExecutionResult }
  | { type: 'error'; data: { error: string } };

export type EventHandler = (event: OrchestratorEvent) => void;