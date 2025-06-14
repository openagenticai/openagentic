import type { AIModel } from '../types';

export function createCustomModel(options: {
  model: string;
  apiKey?: string;
  baseURL: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}): AIModel {
  return {
    provider: 'custom',
    model: options.model,
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP,
  };
}