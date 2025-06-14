import type { AIModel } from '../types';

export function createPerplexityModel(options: {
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}): AIModel {
  return {
    provider: 'perplexity',
    model: options.model,
    apiKey: options.apiKey || process.env.PERPLEXITY_API_KEY,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP,
  };
}

export const perplexityModels = {
  sonar: (apiKey?: string) => createPerplexityModel({
    model: 'llama-3.1-sonar-small-128k-online',
    ...(apiKey !== undefined && { apiKey }),
  }),
  sonarLarge: (apiKey?: string) => createPerplexityModel({
    model: 'llama-3.1-sonar-large-128k-online',
    ...(apiKey !== undefined && { apiKey }),
  }),
  sonarHuge: (apiKey?: string) => createPerplexityModel({
    model: 'llama-3.1-sonar-huge-128k-online',
    ...(apiKey !== undefined && { apiKey }),
  }),
};