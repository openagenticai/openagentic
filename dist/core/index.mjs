var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
export {
  AIProvider,
  BudgetExceededError,
  CostTracker,
  MaxIterationsError,
  OpenAgenticError,
  Orchestrator,
  OrchestratorError,
  ProviderError,
  ToolError,
  ToolRegistry,
  ValidationError
};
//# sourceMappingURL=index.mjs.map