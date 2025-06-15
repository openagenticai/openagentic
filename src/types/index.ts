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
});

export type Tool = z.infer<typeof ToolSchema>;

// Add missing OrchestratorConfig interface
export interface OrchestratorConfig {
  model: AIModel;
  tools?: Tool[];
  systemPrompt?: string;
  maxIterations?: number;
  streaming?: boolean;
  debug?: boolean;
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