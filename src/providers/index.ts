import type { AIModel } from '../types';

// Provider configuration with model metadata
export const providerConfigs = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    models: {
      'gpt-4': { 
        contextWindow: 8192, 
        cost: { input: 0.03, output: 0.06 },
        description: 'Most capable GPT-4 model'
      },
      'gpt-4-turbo': { 
        contextWindow: 128000, 
        cost: { input: 0.01, output: 0.03 },
        description: 'GPT-4 Turbo with larger context window'
      },
      'gpt-4o': { 
        contextWindow: 128000, 
        cost: { input: 0.005, output: 0.015 },
        description: 'GPT-4 Omni - fastest and most cost-effective'
      },
      'gpt-4o-mini': { 
        contextWindow: 128000, 
        cost: { input: 0.00015, output: 0.0006 },
        description: 'Smaller, faster GPT-4o variant'
      },
      'o3': { 
        contextWindow: 200000, 
        cost: { input: 0.06, output: 0.24 },
        description: 'Latest reasoning model'
      },
      'o3-mini': { 
        contextWindow: 200000, 
        cost: { input: 0.015, output: 0.06 },
        description: 'Smaller o3 variant with faster inference'
      },
    }
  },
  anthropic: {
    baseURL: 'https://api.anthropic.com',
    models: {
      'claude-4-opus-20250514': { 
        contextWindow: 200000, 
        cost: { input: 0.015, output: 0.075 },
        description: 'Most capable Claude 4 model'
      },
      'claude-4-sonnet-20250514': { 
        contextWindow: 200000, 
        cost: { input: 0.003, output: 0.015 },
        description: 'Balanced Claude 4 model for most use cases'
      },
    }
  },
  google: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: {
      'gemini-2.5-pro-preview-06-05': { 
        contextWindow: 2000000, 
        cost: { input: 0.001, output: 0.002 },
        description: 'Latest Gemini 2.5 Pro preview model'
      },
      'gemini-2.5-flash-preview-05-20': { 
        contextWindow: 1000000, 
        cost: { input: 0.0005, output: 0.001 },
        description: 'Fast Gemini 2.5 Flash preview model'
      },
      'gemini-1.5-pro': { 
        contextWindow: 2000000, 
        cost: { input: 0.00125, output: 0.005 },
        description: 'Gemini 1.5 Pro with large context window'
      },
      'gemini-1.5-flash': { 
        contextWindow: 1000000, 
        cost: { input: 0.000075, output: 0.0003 },
        description: 'Fast and efficient Gemini 1.5 model'
      },
    }
  },
  'google-vertex': {
    baseURL: 'https://us-central1-aiplatform.googleapis.com',
    models: {
      'gemini-2.5-pro-preview-06-05': { 
        contextWindow: 2000000, 
        cost: { input: 0.001, output: 0.002 },
        description: 'Latest Gemini 2.5 Pro preview model via Vertex AI'
      },
      'gemini-2.5-flash-preview-05-20': { 
        contextWindow: 1000000, 
        cost: { input: 0.0005, output: 0.001 },
        description: 'Fast Gemini 2.5 Flash preview model via Vertex AI'
      },
      'gemini-1.5-pro': { 
        contextWindow: 2000000, 
        cost: { input: 0.00125, output: 0.005 },
        description: 'Gemini 1.5 Pro via Vertex AI'
      },
      'gemini-1.5-flash': { 
        contextWindow: 1000000, 
        cost: { input: 0.000075, output: 0.0003 },
        description: 'Fast Gemini 1.5 model via Vertex AI'
      },
    }
  },
  perplexity: {
    baseURL: 'https://api.perplexity.ai',
    models: {
      'llama-3.1-sonar-small-128k-online': { 
        contextWindow: 127072, 
        cost: { input: 0.0002, output: 0.0002 },
        description: 'Small Llama 3.1 Sonar with online search'
      },
      'llama-3.1-sonar-large-128k-online': { 
        contextWindow: 127072, 
        cost: { input: 0.001, output: 0.001 },
        description: 'Large Llama 3.1 Sonar with online search'
      },
      'llama-3.1-sonar-huge-128k-online': { 
        contextWindow: 127072, 
        cost: { input: 0.005, output: 0.005 },
        description: 'Huge Llama 3.1 Sonar with online search'
      },
    }
  },
  xai: {
    baseURL: 'https://api.x.ai/v1',
    models: {
      'grok-beta': { 
        contextWindow: 131072, 
        cost: { input: 0.005, output: 0.015 },
        description: 'Grok conversational AI model'
      },
    }
  },
};

// Factory functions for creating AI models
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

export function createGoogleModel(options: {
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}): AIModel {
  return {
    provider: 'google',
    model: options.model,
    apiKey: options.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP,
  };
}

export function createGoogleVertexModel(options: {
  model: string;
  project: string;
  location?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}): AIModel {
  return {
    provider: 'google-vertex',
    model: options.model,
    project: options.project,
    location: options.location || 'us-central1',
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP,
  };
}

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

// Pre-configured model instances
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

export const googleModels = {
  gemini25ProPreview: (apiKey?: string) => createGoogleModel({
    model: 'gemini-2.5-pro-preview-06-05',
    ...(apiKey !== undefined && { apiKey }),
  }),
  gemini25FlashPreview: (apiKey?: string) => createGoogleModel({
    model: 'gemini-2.5-flash-preview-05-20',
    ...(apiKey !== undefined && { apiKey }),
  }),
  gemini15Pro: (apiKey?: string) => createGoogleModel({
    model: 'gemini-1.5-pro',
    ...(apiKey !== undefined && { apiKey }),
  }),
  gemini15Flash: (apiKey?: string) => createGoogleModel({
    model: 'gemini-1.5-flash',
    ...(apiKey !== undefined && { apiKey }),
  }),
};

export const googleVertexModels = {
  gemini25ProPreview: (project: string, location?: string) => createGoogleVertexModel({
    model: 'gemini-2.5-pro-preview-06-05',
    project,
    ...(location !== undefined && { location }),
  }),
  gemini25FlashPreview: (project: string, location?: string) => createGoogleVertexModel({
    model: 'gemini-2.5-flash-preview-05-20',
    project,
    ...(location !== undefined && { location }),
  }),
  gemini15Pro: (project: string, location?: string) => createGoogleVertexModel({
    model: 'gemini-1.5-pro',
    project,
    ...(location !== undefined && { location }),
  }),
  gemini15Flash: (project: string, location?: string) => createGoogleVertexModel({
    model: 'gemini-1.5-flash',
    project,
    ...(location !== undefined && { location }),
  }),
};

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

export const xaiModels = {
  grok: (apiKey?: string) => createXAIModel({
    model: 'grok-beta',
    ...(apiKey !== undefined && { apiKey }),
  }),
};

// Legacy exports for backward compatibility
export const geminiModels = googleModels;
export const createGeminiModel = createGoogleModel;

// Utility functions
export function getModelInfo(provider: string, model: string) {
  const config = providerConfigs[provider as keyof typeof providerConfigs];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  const modelInfo = config.models[model as keyof typeof config.models];
  if (!modelInfo) {
    throw new Error(`Unknown model: ${model} for provider: ${provider}`);
  }
  
  return modelInfo;
}

export function calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
  const modelInfo = getModelInfo(provider, model);
  return (inputTokens * modelInfo.cost.input / 1000) + (outputTokens * modelInfo.cost.output / 1000);
}

export function getAllModels() {
  const allModels: Array<{ provider: string; model: string; info: any }> = [];
  
  Object.entries(providerConfigs).forEach(([provider, config]) => {
    Object.entries(config.models).forEach(([model, info]) => {
      allModels.push({ provider, model, info });
    });
  });
  
  return allModels;
}