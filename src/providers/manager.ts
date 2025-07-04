import { getAnthropicModelInstance } from '../tools/utils';
import type { AIModel, ApiKeyMap } from '../types';

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
      'claude-opus-4-20250514': { 
        contextWindow: 200000, 
        cost: { input: 0.015, output: 0.075 },
        description: 'Most capable Claude 4 model'
      },
      'claude-sonnet-4-20250514': { 
        contextWindow: 200000, 
        cost: { input: 0.003, output: 0.015 },
        description: 'Balanced Claude 4 model for most use cases'
      },
      'claude-3-7-sonnet-latest': { 
        contextWindow: 200000, 
        cost: { input: 0.003, output: 0.015 },
        description: 'Latest Claude 3.7 Sonnet model'
      },
      'claude-3-5-sonnet-latest': { 
        contextWindow: 200000, 
        cost: { input: 0.003, output: 0.015 },
        description: 'Latest Claude 3.5 Sonnet model'
      },
    }
  },
  google: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: {
      'gemini-2.5-pro': { 
        contextWindow: 2000000, 
        cost: { input: 0.001, output: 0.002 },
        description: 'Latest Gemini 2.5 Pro preview model'
      },
      'gemini-2.5-flash': { 
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
      'gemini-2.5-flash-lite-preview-06-17': { 
        contextWindow: 1000000, 
        cost: { input: 0.000075, output: 0.0003 },
        description: 'Fast and efficient Gemini 2.5 Flash Lite preview model'
      },
    }
  },
  'google-vertex': {
    baseURL: 'https://us-central1-aiplatform.googleapis.com',
    models: {
      'gemini-2.5-pro': { 
        contextWindow: 2000000, 
        cost: { input: 0.001, output: 0.002 },
        description: 'Latest Gemini 2.5 Pro preview model via Vertex AI'
      },
      'gemini-2.5-flash': { 
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

// =============================================================================
// CENTRALIZED PROVIDER MANAGER
// =============================================================================

export class ProviderManager {
  private static userApiKeys: ApiKeyMap | undefined;

  /**
   * Set user-provided API keys that take precedence over environment variables
   */
  static setUserApiKeys(apiKeys: ApiKeyMap | undefined): void {
    this.userApiKeys = apiKeys;
    
    if (apiKeys && Object.keys(apiKeys).length > 0) {
      console.log('🔑 User API keys configured for providers:', Object.keys(apiKeys).length);
    }
  }

  /**
   * Get AWS credentials from user API keys or environment variables
   */
  static getAwsCredentials(): {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    bucketName?: string;
  } {
    const userKeys = this.userApiKeys;
    
    return {
      accessKeyId: userKeys?.awsAccessKeyId || process.env.MY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: userKeys?.awsSecretAccessKey || process.env.MY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      region: userKeys?.awsRegion || process.env.MY_AWS_REGION || process.env.AWS_REGION,
      bucketName: userKeys?.awsS3Bucket || process.env.MY_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME,
    };
  }

  /**
   * Get AWS Bedrock credentials from user API keys or environment variables
   */
  static getBedrockCredentials(): {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  } {
    const userKeys = this.userApiKeys;
    
    return {
      accessKeyId: userKeys?.bedrockAccessKeyId || process.env.BEDROCK_ACCESS_KEY_ID,
      secretAccessKey: userKeys?.bedrockSecretAccessKey || process.env.BEDROCK_SECRET_ACCESS_KEY,
      region: userKeys?.bedrockRegion || process.env.BEDROCK_REGION,
    };
  }

  /**
   * Create a model configuration from a string or AIModel object
   * Automatically detects provider from model name if string is provided
   */
  static createModel(input: string | AIModel): AIModel {
    if (typeof input === 'string') {
      return this.autoDetectProvider(input);
    }
    return this.validateAndNormalizeModel(input);
  }

  /**
   * Create an AI SDK provider instance for the given model
   */
  static async createProvider(model: AIModel): Promise<any> {
    const apiKey = model.apiKey ?? this.getDefaultApiKey(model.provider); // Fix: Use nullish coalescing
    
    switch (model.provider) {
      case 'openai': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const config: any = {};
        if (apiKey !== undefined) config.apiKey = apiKey; // Fix: Explicit undefined check
        if (model.baseURL !== undefined) config.baseURL = model.baseURL;
        return createOpenAI(config);
      }
      case 'anthropic': {
        const { provider } = getAnthropicModelInstance(model.model);
        return provider;
        // const { createAnthropic } = await import('@ai-sdk/anthropic');
        // const config: any = {};
        // if (apiKey !== undefined) config.apiKey = apiKey;
        // return createAnthropic(config);
      }
      case 'google': {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const config: any = {};
        if (apiKey !== undefined) config.apiKey = apiKey;
        return createGoogleGenerativeAI(config);
      }
      case 'google-vertex': {
        const { createVertex } = await import('@ai-sdk/google-vertex');
        const config: any = {};
        if (model.project !== undefined) config.project = model.project;
        if (model.location !== undefined) config.location = model.location;
        return createVertex(config);
      }
      case 'perplexity': {
        const { createPerplexity } = await import('@ai-sdk/perplexity');
        const config: any = {};
        if (apiKey !== undefined) config.apiKey = apiKey;
        return createPerplexity(config);
      }
      case 'xai': {
        const { createXai } = await import('@ai-sdk/xai');
        const config: any = {};
        if (apiKey !== undefined) config.apiKey = apiKey;
        return createXai(config);
      }
      case 'custom': {
        if (!model.baseURL) {
          throw new Error('Custom provider requires baseURL');
        }
        const { createOpenAI } = await import('@ai-sdk/openai');
        const config: any = {
          baseURL: model.baseURL,
        };
        if (apiKey !== undefined) config.apiKey = apiKey;
        return createOpenAI(config);
      }
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  /**
   * Create a provider for a specific provider name (for tool context)
   */
  static async createProviderByName(providerName: string, apiKey?: string): Promise<any> {
    const key = apiKey ?? this.getDefaultApiKey(providerName as AIModel['provider']); // Fix: Use nullish coalescing
    
    switch (providerName) {
      case 'openai': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        if (!key) throw new Error('OpenAI API key not found');
        return createOpenAI({ apiKey: key });
      }
      case 'anthropic': {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        if (!key) throw new Error('Anthropic API key not found');
        return createAnthropic({ apiKey: key });
      }
      case 'google': {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        if (!key) throw new Error('Google API key not found');
        return createGoogleGenerativeAI({ apiKey: key });
      }
      case 'perplexity': {
        const { createPerplexity } = await import('@ai-sdk/perplexity');
        if (!key) throw new Error('Perplexity API key not found');
        return createPerplexity({ apiKey: key });
      }
      case 'xai': {
        const { createXai } = await import('@ai-sdk/xai');
        if (!key) throw new Error('xAI API key not found');
        return createXai({ apiKey: key });
      }
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  /**
   * Get all available providers and their models
   */
  static getAllProviders(): Array<{ provider: string; models: string[] }> {
    return Object.entries(providerConfigs).map(([provider, config]) => ({
      provider,
      models: Object.keys(config.models),
    }));
  }

  /**
   * Get supported models for a provider
   */
  static getProviderModels(provider: string): string[] {
    const config = providerConfigs[provider as keyof typeof providerConfigs];
    return config ? Object.keys(config.models) : [];
  }

  /**
   * Check if a model is supported by a provider
   */
  static isModelSupported(provider: string, model: string): boolean {
    const models = this.getProviderModels(provider);
    return models.includes(model);
  }

  /**
   * Get model information (context window, cost, description)
   */
  static getModelInfo(provider: string, model: string) {
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

  // Private methods
  private static autoDetectProvider(modelName: string): AIModel {
    let provider: AIModel['provider'];
    let apiKey: string | undefined;

    // OpenAI models
    if (modelName.includes('gpt') || modelName.includes('o3')) {
      provider = 'openai';
      apiKey = this.getDefaultApiKey('openai');
    }
    // Anthropic models
    else if (modelName.includes('claude')) {
      provider = 'anthropic';
      apiKey = this.getDefaultApiKey('anthropic');
    }
    // Google models
    else if (modelName.includes('gemini')) {
      provider = 'google';
      apiKey = this.getDefaultApiKey('google');
    }
    // xAI models
    else if (modelName.includes('grok')) {
      provider = 'xai';
      apiKey = this.getDefaultApiKey('xai');
    }
    // Perplexity models
    else if (modelName.includes('llama') && modelName.includes('sonar')) {
      provider = 'perplexity';
      apiKey = this.getDefaultApiKey('perplexity');
    }
    // Default to OpenAI for unknown models
    else {
      provider = 'openai';
      apiKey = this.getDefaultApiKey('openai');
      console.warn(`Unknown model "${modelName}", defaulting to OpenAI provider`);
    }

    // Validate model is supported by detected provider
    if (!this.isModelSupported(provider, modelName)) {
      throw new Error(`Model "${modelName}" not found in ${provider} configuration`);
    }

    return {
      provider,
      model: modelName,
      apiKey,
      temperature: 0.7,
    };
  }

  private static validateAndNormalizeModel(model: AIModel): AIModel {
    // Ensure required fields are present
    if (!model.provider || !model.model) {
      throw new Error('AIModel must have provider and model fields');
    }

    // Create a normalized copy to avoid mutating the original
    const normalizedModel: AIModel = { ...model };

    // Add default API key if not provided
    if (normalizedModel.apiKey === undefined) {
      normalizedModel.apiKey = this.getDefaultApiKey(normalizedModel.provider);
    }

    // Add default temperature if not provided
    if (normalizedModel.temperature === undefined) {
      normalizedModel.temperature = 0.7;
    }

    return normalizedModel;
  }

  private static getDefaultApiKey(provider: AIModel['provider']): string | undefined {
    // First check user-provided API keys
    if (this.userApiKeys && provider in this.userApiKeys) {
      return this.userApiKeys[provider];
    }
    
    // Then fall back to environment variables
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY;
      case 'google':
        return process.env.GOOGLE_API_KEY;
      case 'google-vertex':
        return undefined; // Vertex uses service account auth
      case 'perplexity':
        return process.env.PERPLEXITY_API_KEY;
      case 'xai':
        return process.env.XAI_API_KEY;
      case 'custom':
        return undefined; // Custom providers handle their own auth
      default:
        return undefined;
    }
  }
}