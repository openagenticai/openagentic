"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/providers/index.ts
var providers_exports = {};
__export(providers_exports, {
  anthropicModels: () => anthropicModels,
  createAnthropicModel: () => createAnthropicModel,
  createCustomModel: () => createCustomModel,
  createGeminiModel: () => createGoogleModel,
  createGoogleModel: () => createGoogleModel,
  createGoogleVertexModel: () => createGoogleVertexModel,
  createOpenAIModel: () => createOpenAIModel,
  createPerplexityModel: () => createPerplexityModel,
  createXAIModel: () => createXAIModel,
  geminiModels: () => googleModels,
  googleModels: () => googleModels,
  googleVertexModels: () => googleVertexModels,
  openAIModels: () => openAIModels,
  perplexityModels: () => perplexityModels,
  xaiModels: () => xaiModels
});
module.exports = __toCommonJS(providers_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  anthropicModels,
  createAnthropicModel,
  createCustomModel,
  createGeminiModel,
  createGoogleModel,
  createGoogleVertexModel,
  createOpenAIModel,
  createPerplexityModel,
  createXAIModel,
  geminiModels,
  googleModels,
  googleVertexModels,
  openAIModels,
  perplexityModels,
  xaiModels
});
//# sourceMappingURL=index.js.map