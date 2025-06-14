// src/providers/openai.ts
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

// src/providers/anthropic.ts
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

// src/providers/google.ts
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

// src/providers/perplexity.ts
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

// src/providers/xai.ts
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
var xaiModels = {
  grok: (apiKey) => createXAIModel({
    model: "grok-beta",
    ...apiKey !== void 0 && { apiKey }
  })
};

// src/providers/custom.ts
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
export {
  anthropicModels,
  createAnthropicModel,
  createCustomModel,
  createGoogleModel as createGeminiModel,
  createGoogleModel,
  createGoogleVertexModel,
  createOpenAIModel,
  createPerplexityModel,
  createXAIModel,
  googleModels as geminiModels,
  googleModels,
  googleVertexModels,
  openAIModels,
  perplexityModels,
  xaiModels
};
//# sourceMappingURL=index.mjs.map