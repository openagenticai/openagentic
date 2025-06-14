// src/providers/index.ts
var providerConfigs = {
  openai: {
    baseURL: "https://api.openai.com/v1",
    models: {
      "gpt-4": {
        contextWindow: 8192,
        cost: { input: 0.03, output: 0.06 },
        description: "Most capable GPT-4 model"
      },
      "gpt-4-turbo": {
        contextWindow: 128e3,
        cost: { input: 0.01, output: 0.03 },
        description: "GPT-4 Turbo with larger context window"
      },
      "gpt-4o": {
        contextWindow: 128e3,
        cost: { input: 5e-3, output: 0.015 },
        description: "GPT-4 Omni - fastest and most cost-effective"
      },
      "gpt-4o-mini": {
        contextWindow: 128e3,
        cost: { input: 15e-5, output: 6e-4 },
        description: "Smaller, faster GPT-4o variant"
      },
      "o3": {
        contextWindow: 2e5,
        cost: { input: 0.06, output: 0.24 },
        description: "Latest reasoning model"
      },
      "o3-mini": {
        contextWindow: 2e5,
        cost: { input: 0.015, output: 0.06 },
        description: "Smaller o3 variant with faster inference"
      }
    }
  },
  anthropic: {
    baseURL: "https://api.anthropic.com",
    models: {
      "claude-4-opus-20250514": {
        contextWindow: 2e5,
        cost: { input: 0.015, output: 0.075 },
        description: "Most capable Claude 4 model"
      },
      "claude-4-sonnet-20250514": {
        contextWindow: 2e5,
        cost: { input: 3e-3, output: 0.015 },
        description: "Balanced Claude 4 model for most use cases"
      }
    }
  },
  google: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    models: {
      "gemini-2.5-pro-preview-06-05": {
        contextWindow: 2e6,
        cost: { input: 1e-3, output: 2e-3 },
        description: "Latest Gemini 2.5 Pro preview model"
      },
      "gemini-2.5-flash-preview-05-20": {
        contextWindow: 1e6,
        cost: { input: 5e-4, output: 1e-3 },
        description: "Fast Gemini 2.5 Flash preview model"
      },
      "gemini-1.5-pro": {
        contextWindow: 2e6,
        cost: { input: 125e-5, output: 5e-3 },
        description: "Gemini 1.5 Pro with large context window"
      },
      "gemini-1.5-flash": {
        contextWindow: 1e6,
        cost: { input: 75e-6, output: 3e-4 },
        description: "Fast and efficient Gemini 1.5 model"
      }
    }
  },
  "google-vertex": {
    baseURL: "https://us-central1-aiplatform.googleapis.com",
    models: {
      "gemini-2.5-pro-preview-06-05": {
        contextWindow: 2e6,
        cost: { input: 1e-3, output: 2e-3 },
        description: "Latest Gemini 2.5 Pro preview model via Vertex AI"
      },
      "gemini-2.5-flash-preview-05-20": {
        contextWindow: 1e6,
        cost: { input: 5e-4, output: 1e-3 },
        description: "Fast Gemini 2.5 Flash preview model via Vertex AI"
      },
      "gemini-1.5-pro": {
        contextWindow: 2e6,
        cost: { input: 125e-5, output: 5e-3 },
        description: "Gemini 1.5 Pro via Vertex AI"
      },
      "gemini-1.5-flash": {
        contextWindow: 1e6,
        cost: { input: 75e-6, output: 3e-4 },
        description: "Fast Gemini 1.5 model via Vertex AI"
      }
    }
  },
  perplexity: {
    baseURL: "https://api.perplexity.ai",
    models: {
      "llama-3.1-sonar-small-128k-online": {
        contextWindow: 127072,
        cost: { input: 2e-4, output: 2e-4 },
        description: "Small Llama 3.1 Sonar with online search"
      },
      "llama-3.1-sonar-large-128k-online": {
        contextWindow: 127072,
        cost: { input: 1e-3, output: 1e-3 },
        description: "Large Llama 3.1 Sonar with online search"
      },
      "llama-3.1-sonar-huge-128k-online": {
        contextWindow: 127072,
        cost: { input: 5e-3, output: 5e-3 },
        description: "Huge Llama 3.1 Sonar with online search"
      }
    }
  },
  xai: {
    baseURL: "https://api.x.ai/v1",
    models: {
      "grok-beta": {
        contextWindow: 131072,
        cost: { input: 5e-3, output: 0.015 },
        description: "Grok conversational AI model"
      }
    }
  }
};
function createOpenAIModel(options) {
  return {
    provider: "openai",
    model: options.model,
    apiKey: options.apiKey || process.env.OPENAI_API_KEY,
    baseURL: options.baseURL,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP
  };
}
function createAnthropicModel(options) {
  return {
    provider: "anthropic",
    model: options.model,
    apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 1024,
    topP: options.topP
  };
}
function createGoogleModel(options) {
  return {
    provider: "google",
    model: options.model,
    apiKey: options.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP
  };
}
function createGoogleVertexModel(options) {
  return {
    provider: "google-vertex",
    model: options.model,
    project: options.project,
    location: options.location || "us-central1",
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP
  };
}
function createPerplexityModel(options) {
  return {
    provider: "perplexity",
    model: options.model,
    apiKey: options.apiKey || process.env.PERPLEXITY_API_KEY,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP
  };
}
function createXAIModel(options) {
  return {
    provider: "xai",
    model: options.model,
    apiKey: options.apiKey || process.env.XAI_API_KEY,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP
  };
}
function createCustomModel(options) {
  return {
    provider: "custom",
    model: options.model,
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP
  };
}
var openAIModels = {
  gpt4: (apiKey) => createOpenAIModel({
    model: "gpt-4",
    ...apiKey !== void 0 && { apiKey }
  }),
  gpt4Turbo: (apiKey) => createOpenAIModel({
    model: "gpt-4-turbo",
    ...apiKey !== void 0 && { apiKey }
  }),
  gpt4o: (apiKey) => createOpenAIModel({
    model: "gpt-4o",
    ...apiKey !== void 0 && { apiKey }
  }),
  gpt4oMini: (apiKey) => createOpenAIModel({
    model: "gpt-4o-mini",
    ...apiKey !== void 0 && { apiKey }
  }),
  o3: (apiKey) => createOpenAIModel({
    model: "o3",
    ...apiKey !== void 0 && { apiKey }
  }),
  o3Mini: (apiKey) => createOpenAIModel({
    model: "o3-mini",
    ...apiKey !== void 0 && { apiKey }
  })
};
var anthropicModels = {
  claude4Opus: (apiKey) => createAnthropicModel({
    model: "claude-4-opus-20250514",
    ...apiKey !== void 0 && { apiKey }
  }),
  claude4Sonnet: (apiKey) => createAnthropicModel({
    model: "claude-4-sonnet-20250514",
    ...apiKey !== void 0 && { apiKey }
  })
};
var googleModels = {
  gemini25ProPreview: (apiKey) => createGoogleModel({
    model: "gemini-2.5-pro-preview-06-05",
    ...apiKey !== void 0 && { apiKey }
  }),
  gemini25FlashPreview: (apiKey) => createGoogleModel({
    model: "gemini-2.5-flash-preview-05-20",
    ...apiKey !== void 0 && { apiKey }
  }),
  gemini15Pro: (apiKey) => createGoogleModel({
    model: "gemini-1.5-pro",
    ...apiKey !== void 0 && { apiKey }
  }),
  gemini15Flash: (apiKey) => createGoogleModel({
    model: "gemini-1.5-flash",
    ...apiKey !== void 0 && { apiKey }
  })
};
var googleVertexModels = {
  gemini25ProPreview: (project, location) => createGoogleVertexModel({
    model: "gemini-2.5-pro-preview-06-05",
    project,
    ...location !== void 0 && { location }
  }),
  gemini25FlashPreview: (project, location) => createGoogleVertexModel({
    model: "gemini-2.5-flash-preview-05-20",
    project,
    ...location !== void 0 && { location }
  }),
  gemini15Pro: (project, location) => createGoogleVertexModel({
    model: "gemini-1.5-pro",
    project,
    ...location !== void 0 && { location }
  }),
  gemini15Flash: (project, location) => createGoogleVertexModel({
    model: "gemini-1.5-flash",
    project,
    ...location !== void 0 && { location }
  })
};
var perplexityModels = {
  sonar: (apiKey) => createPerplexityModel({
    model: "llama-3.1-sonar-small-128k-online",
    ...apiKey !== void 0 && { apiKey }
  }),
  sonarLarge: (apiKey) => createPerplexityModel({
    model: "llama-3.1-sonar-large-128k-online",
    ...apiKey !== void 0 && { apiKey }
  }),
  sonarHuge: (apiKey) => createPerplexityModel({
    model: "llama-3.1-sonar-huge-128k-online",
    ...apiKey !== void 0 && { apiKey }
  })
};
var xaiModels = {
  grok: (apiKey) => createXAIModel({
    model: "grok-beta",
    ...apiKey !== void 0 && { apiKey }
  })
};
function getModelInfo(provider, model) {
  const config = providerConfigs[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const modelInfo = config.models[model];
  if (!modelInfo) {
    throw new Error(`Unknown model: ${model} for provider: ${provider}`);
  }
  return modelInfo;
}
function calculateCost(provider, model, inputTokens, outputTokens) {
  const modelInfo = getModelInfo(provider, model);
  return inputTokens * modelInfo.cost.input / 1e3 + outputTokens * modelInfo.cost.output / 1e3;
}
function getAllModels() {
  const allModels = [];
  Object.entries(providerConfigs).forEach(([provider, config]) => {
    Object.entries(config.models).forEach(([model, info]) => {
      allModels.push({ provider, model, info });
    });
  });
  return allModels;
}
export {
  anthropicModels,
  calculateCost,
  createAnthropicModel,
  createCustomModel,
  createGoogleModel as createGeminiModel,
  createGoogleModel,
  createGoogleVertexModel,
  createOpenAIModel,
  createPerplexityModel,
  createXAIModel,
  googleModels as geminiModels,
  getAllModels,
  getModelInfo,
  googleModels,
  googleVertexModels,
  openAIModels,
  perplexityModels,
  providerConfigs,
  xaiModels
};
//# sourceMappingURL=index.mjs.map