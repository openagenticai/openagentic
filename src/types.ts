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
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;