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
  costEstimate: z.number().optional(),
});

export type Tool = z.infer<typeof ToolSchema>;

export const CostTrackingSchema = z.object({
  inputTokens: z.number().default(0),
  outputTokens: z.number().default(0),
  toolCalls: z.number().default(0),
  estimatedCost: z.number().default(0),
  actualCost: z.number().optional(),
});

export type CostTracking = z.infer<typeof CostTrackingSchema>;

export const OrchestratorConfigSchema = z.object({
  model: AIModelSchema,
  tools: z.array(ToolSchema),
  systemPrompt: z.string().optional(),
  maxIterations: z.number().positive().default(10),
  budget: z.object({
    maxCost: z.number().positive().optional(),
    maxTokens: z.number().positive().optional(),
    maxToolCalls: z.number().positive().optional(),
  }).optional(),
  streaming: z.boolean().default(false),
  debug: z.boolean().default(false),
});

export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>;

export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  messages: z.array(MessageSchema),
  costTracking: CostTrackingSchema,
  iterations: z.number(),
  toolCallsUsed: z.array(z.string()),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// Event types for streaming and real-time updates
export type OrchestratorEvent = 
  | { type: 'start'; data: { config: OrchestratorConfig } }
  | { type: 'iteration'; data: { iteration: number; message: Message } }
  | { type: 'tool_call'; data: { toolName: string; arguments: Record<string, any> } }
  | { type: 'tool_result'; data: { toolName: string; result: any; success: boolean } }
  | { type: 'cost_update'; data: CostTracking }
  | { type: 'complete'; data: ExecutionResult }
  | { type: 'error'; data: { error: string; iteration?: number } };

export type EventHandler = (event: OrchestratorEvent) => void;