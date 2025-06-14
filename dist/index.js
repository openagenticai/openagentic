"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/providers/index.ts
var providers_exports = {};
__export(providers_exports, {
  anthropicModels: () => anthropicModels,
  calculateCost: () => calculateCost,
  createAnthropicModel: () => createAnthropicModel,
  createCustomModel: () => createCustomModel,
  createGeminiModel: () => createGeminiModel,
  createGoogleModel: () => createGoogleModel,
  createGoogleVertexModel: () => createGoogleVertexModel,
  createOpenAIModel: () => createOpenAIModel,
  createPerplexityModel: () => createPerplexityModel,
  createXAIModel: () => createXAIModel,
  geminiModels: () => geminiModels,
  getAllModels: () => getAllModels,
  getModelInfo: () => getModelInfo,
  googleModels: () => googleModels,
  googleVertexModels: () => googleVertexModels,
  openAIModels: () => openAIModels,
  perplexityModels: () => perplexityModels,
  providerConfigs: () => providerConfigs,
  xaiModels: () => xaiModels
});
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
var providerConfigs, openAIModels, anthropicModels, googleModels, googleVertexModels, perplexityModels, xaiModels, geminiModels, createGeminiModel;
var init_providers = __esm({
  "src/providers/index.ts"() {
    "use strict";
    providerConfigs = {
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
    openAIModels = {
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
    anthropicModels = {
      claude4Opus: (apiKey) => createAnthropicModel({
        model: "claude-4-opus-20250514",
        ...apiKey !== void 0 && { apiKey }
      }),
      claude4Sonnet: (apiKey) => createAnthropicModel({
        model: "claude-4-sonnet-20250514",
        ...apiKey !== void 0 && { apiKey }
      })
    };
    googleModels = {
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
    googleVertexModels = {
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
    perplexityModels = {
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
    xaiModels = {
      grok: (apiKey) => createXAIModel({
        model: "grok-beta",
        ...apiKey !== void 0 && { apiKey }
      })
    };
    geminiModels = googleModels;
    createGeminiModel = createGoogleModel;
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AIModelSchema: () => AIModelSchema,
  AIProvider: () => AIProvider,
  BaseOrchestrator: () => Orchestrator,
  BudgetExceededError: () => BudgetExceededError,
  ConsoleLogger: () => ConsoleLogger,
  ConversationalOrchestrator: () => ConversationalOrchestrator,
  CostTracker: () => CostTracker,
  CostTrackingSchema: () => CostTrackingSchema,
  ExecutionResultSchema: () => ExecutionResultSchema,
  LogLevel: () => LogLevel,
  MaxIterationsError: () => MaxIterationsError,
  MessageSchema: () => MessageSchema,
  NoOpLogger: () => NoOpLogger,
  OpenAgenticError: () => OpenAgenticError,
  Orchestrator: () => Orchestrator,
  OrchestratorConfigSchema: () => OrchestratorConfigSchema,
  OrchestratorError: () => OrchestratorError,
  ProviderError: () => ProviderError,
  SimpleEventEmitter: () => SimpleEventEmitter,
  SimpleOrchestrator: () => SimpleOrchestrator,
  TaskOrchestrator: () => TaskOrchestrator,
  ToolError: () => ToolError,
  ToolParameterSchema: () => ToolParameterSchema,
  ToolRegistry: () => ToolRegistry,
  ToolSchema: () => ToolSchema,
  ValidationError: () => ValidationError,
  anthropicModels: () => anthropicModels,
  builtInTools: () => builtInTools,
  calculateCost: () => calculateCost,
  calculatorTool: () => calculatorTool,
  createAPIIntegrator: () => createAPIIntegrator,
  createAnthropicModel: () => createAnthropicModel,
  createAsyncTool: () => createAsyncTool,
  createContentCreator: () => createContentCreator,
  createConversationalAgent: () => createConversationalAgent,
  createCustomModel: () => createCustomModel,
  createCustomerService: () => createCustomerService,
  createDataAnalyst: () => createDataAnalyst,
  createGeminiModel: () => createGeminiModel,
  createGoogleModel: () => createGoogleModel,
  createGoogleVertexModel: () => createGoogleVertexModel,
  createOpenAIModel: () => createOpenAIModel,
  createOrchestrator: () => createOrchestrator,
  createOrchestratorEventEmitter: () => createOrchestratorEventEmitter,
  createPerplexityModel: () => createPerplexityModel,
  createProjectManager: () => createProjectManager,
  createResearchAssistant: () => createResearchAssistant,
  createSimpleAgent: () => createSimpleAgent,
  createSyncTool: () => createSyncTool,
  createTaskAgent: () => createTaskAgent,
  createTool: () => createTool,
  createXAIModel: () => createXAIModel,
  deepClone: () => deepClone,
  defaultLogger: () => defaultLogger,
  delay: () => delay,
  formatCost: () => formatCost,
  formatTokens: () => formatTokens,
  geminiModels: () => geminiModels,
  generateId: () => generateId,
  getAllModels: () => getAllModels,
  getModelInfo: () => getModelInfo,
  googleModels: () => googleModels,
  googleVertexModels: () => googleVertexModels,
  httpRequestTool: () => httpRequestTool,
  isValidJson: () => isValidJson,
  isValidUrl: () => isValidUrl,
  openAIModels: () => openAIModels,
  perplexityModels: () => perplexityModels,
  providerConfigs: () => providerConfigs,
  retry: () => retry,
  sanitizeToolName: () => sanitizeToolName,
  timestampTool: () => timestampTool,
  truncateText: () => truncateText,
  validateApiKey: () => validateApiKey,
  validateSchema: () => validateSchema,
  xaiModels: () => xaiModels
});
module.exports = __toCommonJS(index_exports);

// src/core/errors.ts
var OpenAgenticError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "OpenAgenticError";
  }
};
var OrchestratorError = class extends OpenAgenticError {
  constructor(message) {
    super(message);
    this.name = "OrchestratorError";
  }
};
var ProviderError = class extends OpenAgenticError {
  constructor(message) {
    super(message);
    this.name = "ProviderError";
  }
};
var ToolError = class extends OpenAgenticError {
  constructor(message) {
    super(message);
    this.name = "ToolError";
  }
};
var BudgetExceededError = class extends OpenAgenticError {
  constructor(resourceType, currentValue, limit) {
    super(`Budget exceeded: ${resourceType} limit of ${limit} exceeded (current: ${currentValue})`);
    this.resourceType = resourceType;
    this.currentValue = currentValue;
    this.limit = limit;
    this.name = "BudgetExceededError";
  }
};
var MaxIterationsError = class extends OpenAgenticError {
  constructor(maxIterations) {
    super(`Maximum iterations reached: ${maxIterations}`);
    this.name = "MaxIterationsError";
  }
};
var ValidationError = class extends OpenAgenticError {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
};

// src/core/ai-provider.ts
init_providers();
var AIProvider = class {
  constructor(model) {
    this.model = model;
  }
  async complete(messages, tools, streaming = false) {
    try {
      return await this.completeRequest(messages, tools, streaming);
    } catch (error) {
      throw new ProviderError(
        `Failed to complete request with ${this.model.provider}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  async completeRequest(messages, tools, streaming = false) {
    if (typeof globalThis !== "undefined" && "window" in globalThis) {
      throw new ProviderError("AI providers not available in browser environment");
    }
    try {
      const { generateText } = await import("ai");
      const provider = await this.createProvider();
      return await this.executeWithProvider(provider, messages, tools, streaming, generateText);
    } catch (error) {
      throw new ProviderError(`AI SDK error: ${error}`);
    }
  }
  async createProvider() {
    const apiKey = this.model.apiKey || "";
    switch (this.model.provider) {
      case "openai": {
        const { createOpenAI } = await import("@ai-sdk/openai");
        return createOpenAI({
          baseURL: this.model.baseURL,
          apiKey
        });
      }
      case "anthropic": {
        const { createAnthropic } = await import("@ai-sdk/anthropic");
        return createAnthropic({ apiKey });
      }
      case "google": {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        return createGoogleGenerativeAI({ apiKey });
      }
      case "google-vertex": {
        const { createVertex } = await import("@ai-sdk/google-vertex");
        return createVertex({
          project: this.model.project || "",
          location: this.model.location || ""
        });
      }
      case "perplexity": {
        const { createPerplexity } = await import("@ai-sdk/perplexity");
        return createPerplexity({ apiKey });
      }
      case "xai": {
        const { createXai } = await import("@ai-sdk/xai");
        return createXai({ apiKey });
      }
      case "custom":
        throw new ProviderError("Custom provider not yet implemented");
      default:
        throw new ProviderError(`Unsupported provider: ${this.model.provider}`);
    }
  }
  async executeWithProvider(provider, messages, tools, streaming, generateText) {
    const coreMessages = this.transformMessages(messages);
    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const result = await generateText({
      model: provider(this.model.model),
      messages: coreMessages,
      system: systemMessage,
      temperature: this.model.temperature,
      maxTokens: this.model.maxTokens,
      topP: this.model.topP
    });
    return {
      content: result.text,
      usage: result.usage ? {
        prompt_tokens: result.usage.promptTokens,
        completion_tokens: result.usage.completionTokens,
        total_tokens: result.usage.totalTokens
      } : {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }
  transformMessages(messages) {
    return messages.filter((m) => m.role !== "system").map((m) => {
      if (m.role === "user") {
        return { role: "user", content: m.content };
      } else if (m.role === "assistant") {
        return { role: "assistant", content: m.content };
      } else if (m.role === "tool") {
        return {
          role: "tool",
          content: [{
            type: "tool-result",
            toolCallId: m.toolCallId || "",
            toolName: "unknown",
            result: m.content
          }]
        };
      }
      return { role: "user", content: m.content };
    });
  }
  // Calculate cost based on token usage
  calculateCost(inputTokens, outputTokens) {
    try {
      const { calculateCost: calculateCost2 } = (init_providers(), __toCommonJS(providers_exports));
      return calculateCost2(
        this.model.provider,
        this.model.model,
        inputTokens,
        outputTokens
      );
    } catch (error) {
      const avgInputCost = 0.01 / 1e3;
      const avgOutputCost = 0.02 / 1e3;
      return inputTokens * avgInputCost + outputTokens * avgOutputCost;
    }
  }
  // Get model metadata if available
  getModelInfo() {
    try {
      const { getModelInfo: getModelInfo2 } = (init_providers(), __toCommonJS(providers_exports));
      return getModelInfo2(this.model.provider, this.model.model);
    } catch (error) {
      return null;
    }
  }
};

// src/core/cost-tracker.ts
var CostTracker = class {
  tracking = {
    inputTokens: 0,
    outputTokens: 0,
    toolCalls: 0,
    estimatedCost: 0
  };
  budget;
  // Optional AIProvider for more accurate cost calculations
  aiProvider;
  constructor(budget, aiProvider) {
    this.budget = budget;
    this.aiProvider = aiProvider;
  }
  updateTokenUsage(inputTokens, outputTokens) {
    this.tracking.inputTokens += inputTokens;
    this.tracking.outputTokens += outputTokens;
    this.updateEstimatedCost();
  }
  incrementToolCalls(cost = 0) {
    this.tracking.toolCalls += 1;
    this.tracking.estimatedCost += cost;
  }
  getTracking() {
    return { ...this.tracking };
  }
  checkBudget() {
    const violations = [];
    if (this.budget?.maxCost && this.tracking.estimatedCost >= this.budget.maxCost) {
      violations.push(`Cost limit exceeded: $${this.tracking.estimatedCost.toFixed(4)} >= $${this.budget.maxCost}`);
    }
    if (this.budget?.maxTokens && this.tracking.inputTokens + this.tracking.outputTokens >= this.budget.maxTokens) {
      violations.push(`Token limit exceeded: ${this.tracking.inputTokens + this.tracking.outputTokens} >= ${this.budget.maxTokens}`);
    }
    if (this.budget?.maxToolCalls && this.tracking.toolCalls >= this.budget.maxToolCalls) {
      violations.push(`Tool call limit exceeded: ${this.tracking.toolCalls} >= ${this.budget.maxToolCalls}`);
    }
    return {
      withinBudget: violations.length === 0,
      violations
    };
  }
  reset() {
    this.tracking = {
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: 0,
      estimatedCost: 0
    };
  }
  updateEstimatedCost() {
    if (this.aiProvider) {
      this.tracking.estimatedCost = this.aiProvider.calculateCost(
        this.tracking.inputTokens,
        this.tracking.outputTokens
      );
    } else {
      const avgInputCost = 0.01 / 1e3;
      const avgOutputCost = 0.02 / 1e3;
      this.tracking.estimatedCost = this.tracking.inputTokens * avgInputCost + this.tracking.outputTokens * avgOutputCost;
    }
  }
  // Allow updating the AIProvider
  setAIProvider(provider) {
    this.aiProvider = provider;
  }
};

// src/core/tool-registry.ts
var ToolRegistry = class {
  tools = /* @__PURE__ */ new Map();
  usedTools = /* @__PURE__ */ new Set();
  constructor(tools = []) {
    tools.forEach((tool) => this.register(tool));
  }
  register(tool) {
    if (this.tools.has(tool.name)) {
      throw new ToolError(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }
  unregister(name) {
    return this.tools.delete(name);
  }
  async execute(name, args) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolError(`Tool '${name}' not found`);
    }
    try {
      this.usedTools.add(name);
      return await tool.execute(args);
    } catch (error) {
      throw new ToolError(
        `Failed to execute tool '${name}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  getDefinitions() {
    return Array.from(this.tools.values()).map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }
  getUsedTools() {
    return Array.from(this.usedTools);
  }
  getTool(name) {
    return this.tools.get(name);
  }
  getAllTools() {
    return Array.from(this.tools.values());
  }
  reset() {
    this.usedTools.clear();
  }
};

// src/utils/simple-event-emitter.ts
var SimpleEventEmitter = class {
  listeners = [];
  /**
   * Add an event listener
   */
  on(listener) {
    this.listeners.push(listener);
  }
  /**
   * Remove an event listener
   */
  off(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  /**
   * Emit an event to all listeners
   */
  emit(event) {
    const currentListeners = [...this.listeners];
    currentListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.warn("Event listener error:", error);
      }
    });
  }
  /**
   * Remove all listeners
   */
  clear() {
    this.listeners = [];
  }
  /**
   * Get the number of active listeners
   */
  listenerCount() {
    return this.listeners.length;
  }
};
function createOrchestratorEventEmitter() {
  return new SimpleEventEmitter();
}

// src/core/orchestrator.ts
var Orchestrator = class {
  constructor(config, aiProvider = new AIProvider(config.model), costTracker = new CostTracker(config.budget), toolRegistry = new ToolRegistry(config.tools)) {
    this.config = config;
    this.aiProvider = aiProvider;
    this.costTracker = costTracker;
    this.toolRegistry = toolRegistry;
    if (config.systemPrompt) {
      this.messages.push({
        role: "system",
        content: config.systemPrompt
      });
    }
  }
  messages = [];
  iterations = 0;
  eventEmitter = new SimpleEventEmitter();
  async execute(userMessage) {
    this.eventEmitter.emit({ type: "start", data: { config: this.config } });
    try {
      this.messages.push({
        role: "user",
        content: userMessage
      });
      while (this.iterations < this.config.maxIterations) {
        this.iterations++;
        this.checkBudgetConstraints();
        const response = await this.aiProvider.complete(
          this.messages,
          this.toolRegistry.getDefinitions(),
          // Updated to match new method name
          this.config.streaming
        );
        this.costTracker.updateTokenUsage(
          response.usage?.prompt_tokens || 0,
          response.usage?.completion_tokens || 0
        );
        const assistantMessage = {
          role: "assistant",
          content: response.content || "",
          toolCalls: response.tool_calls
        };
        this.messages.push(assistantMessage);
        this.eventEmitter.emit({ type: "iteration", data: { iteration: this.iterations, message: assistantMessage } });
        if (response.tool_calls && response.tool_calls.length > 0) {
          for (const toolCall of response.tool_calls) {
            await this.executeToolCall(toolCall);
          }
          continue;
        }
        break;
      }
      if (this.iterations >= this.config.maxIterations) {
        throw new MaxIterationsError(this.config.maxIterations);
      }
      const result = {
        success: true,
        result: this.messages[this.messages.length - 1]?.content,
        messages: this.messages,
        costTracking: this.costTracker.getTracking(),
        iterations: this.iterations,
        toolCallsUsed: this.toolRegistry.getUsedTools()
      };
      this.eventEmitter.emit({ type: "complete", data: result });
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messages: this.messages,
        costTracking: this.costTracker.getTracking(),
        iterations: this.iterations,
        toolCallsUsed: this.toolRegistry.getUsedTools()
      };
      this.eventEmitter.emit({ type: "error", data: { error: errorResult.error, iteration: this.iterations } });
      return errorResult;
    }
  }
  onEvent(handler) {
    this.eventEmitter.on(handler);
  }
  offEvent(handler) {
    this.eventEmitter.off(handler);
  }
  async executeToolCall(toolCall) {
    try {
      this.eventEmitter.emit({
        type: "tool_call",
        data: {
          toolName: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments)
        }
      });
      const result = await this.toolRegistry.execute(
        // Updated to match new method name
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments)
      );
      this.costTracker.incrementToolCalls();
      this.eventEmitter.emit({
        type: "tool_result",
        data: {
          toolName: toolCall.function.name,
          result,
          success: true
        }
      });
      this.messages.push({
        role: "tool",
        content: JSON.stringify(result),
        toolCallId: toolCall.id
      });
    } catch (error) {
      this.eventEmitter.emit({
        type: "tool_result",
        data: {
          toolName: toolCall.function.name,
          result: error,
          success: false
        }
      });
      this.messages.push({
        role: "tool",
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        toolCallId: toolCall.id
      });
    }
  }
  checkBudgetConstraints() {
    const tracking = this.costTracker.getTracking();
    const budget = this.config.budget;
    if (!budget) return;
    if (budget.maxCost && tracking.estimatedCost >= budget.maxCost) {
      throw new BudgetExceededError("cost", tracking.estimatedCost, budget.maxCost);
    }
    if (budget.maxTokens && tracking.inputTokens + tracking.outputTokens >= budget.maxTokens) {
      throw new BudgetExceededError("tokens", tracking.inputTokens + tracking.outputTokens, budget.maxTokens);
    }
    if (budget.maxToolCalls && tracking.toolCalls >= budget.maxToolCalls) {
      throw new BudgetExceededError("tool_calls", tracking.toolCalls, budget.maxToolCalls);
    }
  }
  getCostTracking() {
    return this.costTracker.getTracking();
  }
  getMessages() {
    return [...this.messages];
  }
  reset() {
    this.messages = this.config.systemPrompt ? [{ role: "system", content: this.config.systemPrompt }] : [];
    this.iterations = 0;
    this.costTracker.reset();
    this.toolRegistry.reset();
    this.eventEmitter.clear();
  }
  getEventListenerCount() {
    return this.eventEmitter.listenerCount();
  }
};

// src/orchestrators/simple.ts
var SimpleOrchestrator = class _SimpleOrchestrator extends Orchestrator {
  constructor(model, tools = [], systemPrompt, aiProvider, costTracker, toolRegistry) {
    const config = {
      model,
      tools,
      systemPrompt,
      maxIterations: 5,
      streaming: false,
      debug: false
    };
    super(
      config,
      aiProvider || new AIProvider(model),
      costTracker || new CostTracker(),
      toolRegistry || new ToolRegistry(tools)
    );
  }
  static create(options) {
    const model = {
      provider: options.provider,
      model: options.model,
      temperature: 0.7,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      project: options.project,
      location: options.location
    };
    return new _SimpleOrchestrator(
      model,
      options.tools || [],
      options.systemPrompt
    );
  }
};

// src/orchestrators/conversational.ts
var ConversationalOrchestrator = class _ConversationalOrchestrator extends Orchestrator {
  conversationHistory = [];
  constructor(model, tools = [], systemPrompt, aiProvider, costTracker, toolRegistry) {
    const config = {
      model,
      tools,
      systemPrompt: systemPrompt || "You are a helpful assistant that can use tools to help users. Maintain context from previous messages in this conversation.",
      maxIterations: 10,
      streaming: false,
      debug: false
    };
    super(
      config,
      aiProvider || new AIProvider(model),
      costTracker || new CostTracker(),
      toolRegistry || new ToolRegistry(tools)
    );
  }
  async continueConversation(userMessage) {
    this.conversationHistory.push({
      role: "user",
      content: userMessage
    });
    const result = await this.execute(userMessage);
    if (result.success && result.result) {
      this.conversationHistory.push({
        role: "assistant",
        content: result.result
      });
    }
    return result;
  }
  getConversationHistory() {
    return [...this.conversationHistory];
  }
  clearConversation() {
    this.conversationHistory = [];
    this.reset();
  }
  static create(options) {
    const model = {
      provider: options.provider,
      model: options.model,
      temperature: 0.7,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      project: options.project,
      location: options.location
    };
    return new _ConversationalOrchestrator(
      model,
      options.tools || [],
      options.systemPrompt
    );
  }
};

// src/orchestrators/task.ts
var TaskOrchestrator = class _TaskOrchestrator extends Orchestrator {
  steps;
  currentStep = 0;
  stepResults = [];
  constructor(model, tools = [], steps = [], systemPrompt, aiProvider, costTracker, toolRegistry) {
    const config = {
      model,
      tools,
      systemPrompt: systemPrompt || "You are a task-oriented assistant. Complete each task step systematically.",
      maxIterations: 15,
      streaming: false,
      debug: false
    };
    super(
      config,
      aiProvider || new AIProvider(model),
      costTracker || new CostTracker(),
      toolRegistry || new ToolRegistry(tools)
    );
    this.steps = steps;
  }
  async executeTask(taskDescription) {
    const fullPrompt = this.buildTaskPrompt(taskDescription);
    const result = await this.execute(fullPrompt);
    if (result.success) {
      this.stepResults.push(result.result);
    }
    return {
      ...result,
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      stepResults: [...this.stepResults]
    };
  }
  async executeNextStep() {
    if (this.currentStep >= this.steps.length) {
      return {
        success: false,
        error: "All steps completed",
        currentStep: this.currentStep,
        totalSteps: this.steps.length,
        stepResults: [...this.stepResults]
      };
    }
    const step = this.steps[this.currentStep];
    if (!step) {
      return {
        success: false,
        error: "Step not found",
        currentStep: this.currentStep,
        totalSteps: this.steps.length,
        stepResults: [...this.stepResults]
      };
    }
    const stepPrompt = this.buildStepPrompt(step);
    const result = await this.execute(stepPrompt);
    if (result.success) {
      this.stepResults.push(result.result);
      this.currentStep++;
    }
    return {
      ...result,
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      stepResults: [...this.stepResults],
      completedStep: step
    };
  }
  getProgress() {
    return {
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      completed: this.currentStep >= this.steps.length,
      stepResults: [...this.stepResults]
    };
  }
  buildTaskPrompt(taskDescription) {
    let prompt = `Task: ${taskDescription}

`;
    if (this.steps.length > 0) {
      prompt += "Please complete this task following these steps:\n";
      this.steps.forEach((step, index) => {
        prompt += `${index + 1}. ${step.name}: ${step.description}
`;
      });
      prompt += "\n";
    }
    if (this.stepResults.length > 0) {
      prompt += "Previous step results:\n";
      this.stepResults.forEach((result, index) => {
        prompt += `Step ${index + 1}: ${result}
`;
      });
      prompt += "\n";
    }
    return prompt;
  }
  buildStepPrompt(step) {
    let prompt = `Current Step: ${step.name}
`;
    prompt += `Description: ${step.description}

`;
    if (step.tools && step.tools.length > 0) {
      prompt += `Recommended tools for this step: ${step.tools.join(", ")}

`;
    }
    if (this.stepResults.length > 0) {
      prompt += "Previous step results for context:\n";
      this.stepResults.forEach((result, index) => {
        prompt += `Step ${index + 1}: ${result}
`;
      });
      prompt += "\n";
    }
    prompt += "Please complete this step.";
    return prompt;
  }
  static create(options) {
    const model = {
      provider: options.provider,
      model: options.model,
      temperature: 0.7,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      project: options.project,
      location: options.location
    };
    return new _TaskOrchestrator(
      model,
      options.tools || [],
      options.steps || [],
      options.systemPrompt
    );
  }
};

// src/tools/built-in.ts
var httpRequestTool = {
  name: "http_request",
  description: "Make HTTP requests to external APIs",
  parameters: {
    url: {
      type: "string",
      description: "The URL to make the request to",
      required: true
    },
    method: {
      type: "string",
      description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
      required: false,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    },
    headers: {
      type: "object",
      description: "HTTP headers to include in the request",
      required: false
    },
    body: {
      type: "string",
      description: "Request body (for POST, PUT, PATCH requests)",
      required: false
    }
  },
  execute: async (params) => {
    const { url, method = "GET", headers = {}, body } = params;
    const requestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };
    if (body) {
      requestInit.body = JSON.stringify(body);
    }
    const response = await fetch(url, requestInit);
    const data = await response.text();
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: (() => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      })()
    };
  },
  costEstimate: 1e-3
};
var calculatorTool = {
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: {
    expression: {
      type: "string",
      description: 'Mathematical expression to evaluate (e.g., "2 + 2", "Math.sqrt(16)")',
      required: true
    }
  },
  execute: async (params) => {
    const { expression } = params;
    const safeExpression = expression.replace(/[^0-9+\-*/.()Math.sqrtpowabsfloorceilminmax ]/g, "");
    try {
      const result = new Function("Math", `return ${safeExpression}`)(Math);
      return { result, expression: safeExpression };
    } catch (error) {
      throw new Error(`Invalid mathematical expression: ${expression}`);
    }
  },
  costEstimate: 0
};
var timestampTool = {
  name: "timestamp",
  description: "Get current timestamp and date information",
  parameters: {
    format: {
      type: "string",
      description: "Format for the timestamp (iso, unix, human)",
      required: false,
      enum: ["iso", "unix", "human"]
    },
    timezone: {
      type: "string",
      description: 'Timezone for the timestamp (e.g., "UTC", "America/New_York")',
      required: false
    }
  },
  execute: async (params) => {
    const { format = "iso", timezone } = params;
    const now = /* @__PURE__ */ new Date();
    switch (format) {
      case "unix":
        return { timestamp: Math.floor(now.getTime() / 1e3), format: "unix" };
      case "human":
        return {
          timestamp: timezone ? now.toLocaleString("en-US", { timeZone: timezone }) : now.toLocaleString(),
          format: "human",
          timezone: timezone || "local"
        };
      default:
        return {
          timestamp: timezone ? new Date(now.toLocaleString("en-US", { timeZone: timezone })).toISOString() : now.toISOString(),
          format: "iso",
          timezone: timezone || "UTC"
        };
    }
  },
  costEstimate: 0
};
var builtInTools = [
  httpRequestTool,
  calculatorTool,
  timestampTool
];

// src/orchestrators/templates.ts
function createResearchAssistant(model) {
  const tools = [
    builtInTools.find((t) => t.name === "http_request"),
    builtInTools.find((t) => t.name === "calculator")
  ];
  return new SimpleOrchestrator(
    model,
    tools,
    "You are a research assistant. Help users gather information, analyze data, and provide comprehensive reports. Use web requests to gather current information when needed."
  );
}
function createDataAnalyst(model) {
  const tools = [
    builtInTools.find((t) => t.name === "calculator"),
    builtInTools.find((t) => t.name === "timestamp")
  ];
  return new SimpleOrchestrator(
    model,
    tools,
    "You are a data analyst. Help users analyze data, perform calculations, and create insights. Be precise with numbers and show your work."
  );
}
function createAPIIntegrator(model) {
  const tools = [
    builtInTools.find((t) => t.name === "http_request")
  ];
  return new SimpleOrchestrator(
    model,
    tools,
    "You are an API integration specialist. Help users connect to external services, test APIs, and integrate data from various sources."
  );
}
function createCustomerService(model) {
  return new ConversationalOrchestrator(
    model,
    [],
    "You are a helpful customer service assistant. Maintain a friendly, professional tone and help users with their questions and concerns."
  );
}
function createContentCreator(model) {
  const steps = [
    {
      name: "Research",
      description: "Research the topic and gather relevant information",
      tools: ["http_request"]
    },
    {
      name: "Outline",
      description: "Create a detailed outline for the content"
    },
    {
      name: "Draft",
      description: "Write the first draft of the content"
    },
    {
      name: "Review",
      description: "Review and refine the content for quality and accuracy"
    }
  ];
  return new TaskOrchestrator(
    model,
    builtInTools,
    steps,
    "You are a content creator. Create high-quality, engaging content following a systematic approach."
  );
}
function createProjectManager(model) {
  const steps = [
    {
      name: "Requirements",
      description: "Gather and analyze project requirements"
    },
    {
      name: "Planning",
      description: "Create a detailed project plan with milestones"
    },
    {
      name: "Resource Allocation",
      description: "Identify and allocate necessary resources"
    },
    {
      name: "Timeline",
      description: "Create a realistic timeline with dependencies",
      tools: ["timestamp"]
    },
    {
      name: "Risk Assessment",
      description: "Identify potential risks and mitigation strategies"
    }
  ];
  return new TaskOrchestrator(
    model,
    builtInTools,
    steps,
    "You are a project manager. Help users plan, organize, and manage projects effectively."
  );
}

// src/tools/factory.ts
function createTool(factory) {
  return {
    name: factory.name,
    description: factory.description,
    parameters: factory.parameters,
    execute: factory.execute,
    costEstimate: factory.costEstimate || 0
  };
}
function createAsyncTool(name, description, parameters, execute, costEstimate = 0) {
  return createTool({
    name,
    description,
    parameters,
    execute,
    costEstimate
  });
}
function createSyncTool(name, description, parameters, execute, costEstimate = 0) {
  return createTool({
    name,
    description,
    parameters,
    execute: async (params) => execute(params),
    costEstimate
  });
}

// src/index.ts
init_providers();

// src/types/index.ts
var import_zod = require("zod");
var AIModelSchema = import_zod.z.object({
  provider: import_zod.z.enum(["openai", "anthropic", "google", "google-vertex", "perplexity", "xai", "custom"]),
  model: import_zod.z.string(),
  apiKey: import_zod.z.string().optional(),
  baseURL: import_zod.z.string().optional(),
  temperature: import_zod.z.number().min(0).max(2).optional().default(0.7),
  maxTokens: import_zod.z.number().positive().optional(),
  topP: import_zod.z.number().min(0).max(1).optional(),
  project: import_zod.z.string().optional(),
  location: import_zod.z.string().optional()
});
var MessageSchema = import_zod.z.object({
  role: import_zod.z.enum(["system", "user", "assistant", "tool"]),
  content: import_zod.z.string(),
  toolCallId: import_zod.z.string().optional(),
  toolCalls: import_zod.z.array(import_zod.z.object({
    id: import_zod.z.string(),
    type: import_zod.z.literal("function"),
    function: import_zod.z.object({
      name: import_zod.z.string(),
      arguments: import_zod.z.string()
    })
  })).optional()
});
var ToolParameterSchema = import_zod.z.object({
  type: import_zod.z.enum(["string", "number", "boolean", "object", "array"]),
  description: import_zod.z.string(),
  required: import_zod.z.boolean().default(false),
  enum: import_zod.z.array(import_zod.z.string()).optional(),
  properties: import_zod.z.record(import_zod.z.any()).optional(),
  items: import_zod.z.any().optional()
});
var ToolSchema = import_zod.z.object({
  name: import_zod.z.string(),
  description: import_zod.z.string(),
  parameters: import_zod.z.record(ToolParameterSchema),
  execute: import_zod.z.function(),
  costEstimate: import_zod.z.number().optional()
});
var CostTrackingSchema = import_zod.z.object({
  inputTokens: import_zod.z.number().default(0),
  outputTokens: import_zod.z.number().default(0),
  toolCalls: import_zod.z.number().default(0),
  estimatedCost: import_zod.z.number().default(0),
  actualCost: import_zod.z.number().optional()
});
var OrchestratorConfigSchema = import_zod.z.object({
  model: AIModelSchema,
  tools: import_zod.z.array(ToolSchema),
  systemPrompt: import_zod.z.string().optional(),
  maxIterations: import_zod.z.number().positive().default(10),
  budget: import_zod.z.object({
    maxCost: import_zod.z.number().positive(),
    maxTokens: import_zod.z.number().positive(),
    maxToolCalls: import_zod.z.number().positive()
  }).partial().optional(),
  streaming: import_zod.z.boolean().default(false),
  debug: import_zod.z.boolean().default(false)
});
var ExecutionResultSchema = import_zod.z.object({
  success: import_zod.z.boolean(),
  result: import_zod.z.any().optional(),
  error: import_zod.z.string().optional(),
  messages: import_zod.z.array(MessageSchema),
  costTracking: CostTrackingSchema,
  iterations: import_zod.z.number(),
  toolCallsUsed: import_zod.z.array(import_zod.z.string())
});

// src/utils/logger.ts
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["ERROR"] = 0] = "ERROR";
  LogLevel2[LogLevel2["WARN"] = 1] = "WARN";
  LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
  LogLevel2[LogLevel2["DEBUG"] = 3] = "DEBUG";
  return LogLevel2;
})(LogLevel || {});
var ConsoleLogger = class {
  constructor(level = 2 /* INFO */) {
    this.level = level;
  }
  error(message, ...args) {
    if (this.level >= 0 /* ERROR */) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
  warn(message, ...args) {
    if (this.level >= 1 /* WARN */) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }
  info(message, ...args) {
    if (this.level >= 2 /* INFO */) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }
  debug(message, ...args) {
    if (this.level >= 3 /* DEBUG */) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
var NoOpLogger = class {
  error() {
  }
  warn() {
  }
  info() {
  }
  debug() {
  }
};
var defaultLogger = new ConsoleLogger();

// src/utils/validators.ts
var import_zod2 = require("zod");
function validateSchema(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
function sanitizeToolName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}
function validateApiKey(apiKey) {
  return typeof apiKey === "string" && apiKey.length > 0;
}

// src/utils/helpers.ts
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function retry(fn, maxAttempts = 3, delayMs = 1e3) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const attempt = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          setTimeout(attempt, delayMs * attempts);
        }
      }
    };
    attempt();
  });
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function formatCost(cost) {
  return `$${cost.toFixed(4)}`;
}
function formatTokens(tokens) {
  if (tokens < 1e3) {
    return `${tokens} tokens`;
  }
  return `${(tokens / 1e3).toFixed(1)}K tokens`;
}
function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// src/index.ts
function createOrchestrator(config) {
  return new Orchestrator(config);
}
function createSimpleAgent(options) {
  return SimpleOrchestrator.create(options);
}
function createConversationalAgent(options) {
  return ConversationalOrchestrator.create(options);
}
function createTaskAgent(options) {
  return TaskOrchestrator.create(options);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AIModelSchema,
  AIProvider,
  BaseOrchestrator,
  BudgetExceededError,
  ConsoleLogger,
  ConversationalOrchestrator,
  CostTracker,
  CostTrackingSchema,
  ExecutionResultSchema,
  LogLevel,
  MaxIterationsError,
  MessageSchema,
  NoOpLogger,
  OpenAgenticError,
  Orchestrator,
  OrchestratorConfigSchema,
  OrchestratorError,
  ProviderError,
  SimpleEventEmitter,
  SimpleOrchestrator,
  TaskOrchestrator,
  ToolError,
  ToolParameterSchema,
  ToolRegistry,
  ToolSchema,
  ValidationError,
  anthropicModels,
  builtInTools,
  calculateCost,
  calculatorTool,
  createAPIIntegrator,
  createAnthropicModel,
  createAsyncTool,
  createContentCreator,
  createConversationalAgent,
  createCustomModel,
  createCustomerService,
  createDataAnalyst,
  createGeminiModel,
  createGoogleModel,
  createGoogleVertexModel,
  createOpenAIModel,
  createOrchestrator,
  createOrchestratorEventEmitter,
  createPerplexityModel,
  createProjectManager,
  createResearchAssistant,
  createSimpleAgent,
  createSyncTool,
  createTaskAgent,
  createTool,
  createXAIModel,
  deepClone,
  defaultLogger,
  delay,
  formatCost,
  formatTokens,
  geminiModels,
  generateId,
  getAllModels,
  getModelInfo,
  googleModels,
  googleVertexModels,
  httpRequestTool,
  isValidJson,
  isValidUrl,
  openAIModels,
  perplexityModels,
  providerConfigs,
  retry,
  sanitizeToolName,
  timestampTool,
  truncateText,
  validateApiKey,
  validateSchema,
  xaiModels
});
//# sourceMappingURL=index.js.map