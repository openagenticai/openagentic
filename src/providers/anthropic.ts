import type { AIModel } from '../types';

export function createAnthropicModel(options: {
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}): AIModel {
  return {
    provider: 'anthropic',
    model: options.model,
    apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 1024,
    topP: options.topP,
  };
}

export const anthropicModels = {
  claude4Opus: (apiKey?: string) => createAnthropicModel({
    model: 'claude-4-opus-20250514',
    ...(apiKey !== undefined && { apiKey }),
  }),
  claude4Sonnet: (apiKey?: string) => createAnthropicModel({
    model: 'claude-4-sonnet-20250514',
    ...(apiKey !== undefined && { apiKey }),
  }),
};