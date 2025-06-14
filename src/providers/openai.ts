import type { AIModel } from '../types';

export function createOpenAIModel(options: {
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}): AIModel {
  return {
    provider: 'openai',
    model: options.model,
    apiKey: options.apiKey || process.env.OPENAI_API_KEY,
    baseURL: options.baseURL,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP,
  };
}

export const openAIModels = {
  gpt4: (apiKey?: string) => createOpenAIModel({
    model: 'gpt-4',
    ...(apiKey !== undefined && { apiKey }),
  }),
  gpt4Turbo: (apiKey?: string) => createOpenAIModel({
    model: 'gpt-4-turbo',
    ...(apiKey !== undefined && { apiKey }),
  }),
  gpt4o: (apiKey?: string) => createOpenAIModel({
    model: 'gpt-4o',
    ...(apiKey !== undefined && { apiKey }),
  }),
  gpt4oMini: (apiKey?: string) => createOpenAIModel({
    model: 'gpt-4o-mini',
    ...(apiKey !== undefined && { apiKey }),
  }),
  o3: (apiKey?: string) => createOpenAIModel({
    model: 'o3',
    ...(apiKey !== undefined && { apiKey }),
  }),
  o3Mini: (apiKey?: string) => createOpenAIModel({
    model: 'o3-mini',
    ...(apiKey !== undefined && { apiKey }),
  }),
};