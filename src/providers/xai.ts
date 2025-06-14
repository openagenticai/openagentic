import type { AIModel } from '../types';

export function createXAIModel(options: {
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}): AIModel {
  return {
    provider: 'xai',
    model: options.model,
    apiKey: options.apiKey || process.env.XAI_API_KEY,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP,
  };
}

export const xaiModels = {
  grok: (apiKey?: string) => createXAIModel({
    model: 'grok-beta',
    ...(apiKey !== undefined && { apiKey }),
  }),
};