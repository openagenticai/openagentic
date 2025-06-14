"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/orchestrators/index.ts
var orchestrators_exports = {};
__export(orchestrators_exports, {
  ConversationalOrchestrator: () => ConversationalOrchestrator,
  SimpleOrchestrator: () => SimpleOrchestrator,
  TaskOrchestrator: () => TaskOrchestrator,
  createAPIIntegrator: () => createAPIIntegrator,
  createContentCreator: () => createContentCreator,
  createCustomerService: () => createCustomerService,
  createDataAnalyst: () => createDataAnalyst,
  createProjectManager: () => createProjectManager,
  createResearchAssistant: () => createResearchAssistant
});
module.exports = __toCommonJS(orchestrators_exports);

// src/core/orchestrator.ts
var import_events = require("events");

// src/core/errors.ts
var OpenAgenticError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "OpenAgenticError";
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

// src/core/ai-provider.ts
var AIProvider = class {
  model;
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
  constructor(budget) {
    this.budget = budget;
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
    const avgInputCost = 0.01 / 1e3;
    const avgOutputCost = 0.02 / 1e3;
    this.tracking.estimatedCost = this.tracking.inputTokens * avgInputCost + this.tracking.outputTokens * avgOutputCost;
  }
};

// src/core/tool-registry.ts
var ToolRegistry = class {
  tools = /* @__PURE__ */ new Map();
  usedTools = /* @__PURE__ */ new Set();
  constructor(tools = []) {
    tools.forEach((tool) => this.registerTool(tool));
  }
  registerTool(tool) {
    if (this.tools.has(tool.name)) {
      throw new ToolError(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }
  unregisterTool(name) {
    return this.tools.delete(name);
  }
  async executeTool(name, parameters) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolError(`Tool '${name}' not found`);
    }
    try {
      this.validateParameters(tool, parameters);
      this.usedTools.add(name);
      const result = await tool.execute(parameters);
      return result;
    } catch (error) {
      throw new ToolError(
        `Failed to execute tool '${name}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  getToolDefinitions() {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
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
  validateParameters(tool, parameters) {
    const required = Object.entries(tool.parameters).filter(([, param]) => param.required).map(([name]) => name);
    for (const requiredParam of required) {
      if (!(requiredParam in parameters)) {
        throw new ToolError(
          `Missing required parameter '${requiredParam}' for tool '${tool.name}'`
        );
      }
    }
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const paramSchema = tool.parameters[paramName];
      if (!paramSchema) continue;
      if (!this.validateParameterType(paramValue, paramSchema.type)) {
        throw new ToolError(
          `Invalid type for parameter '${paramName}' in tool '${tool.name}'. Expected ${paramSchema.type}, got ${typeof paramValue}`
        );
      }
    }
  }
  validateParameterType(value, expectedType) {
    switch (expectedType) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number";
      case "boolean":
        return typeof value === "boolean";
      case "object":
        return typeof value === "object" && value !== null && !Array.isArray(value);
      case "array":
        return Array.isArray(value);
      default:
        return true;
    }
  }
};

// src/core/orchestrator.ts
var Orchestrator = class extends import_events.EventEmitter {
  config;
  aiProvider;
  costTracker;
  toolRegistry;
  messages = [];
  iterations = 0;
  constructor(config) {
    super();
    this.config = config;
    this.aiProvider = new AIProvider(config.model);
    this.costTracker = new CostTracker(config.budget);
    this.toolRegistry = new ToolRegistry(config.tools);
    if (config.systemPrompt) {
      this.messages.push({
        role: "system",
        content: config.systemPrompt
      });
    }
  }
  async execute(userMessage) {
    this.emit("start", { config: this.config });
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
          this.toolRegistry.getToolDefinitions(),
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
        this.emit("iteration", { iteration: this.iterations, message: assistantMessage });
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
      this.emit("complete", result);
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
      this.emit("error", { error: errorResult.error, iteration: this.iterations });
      return errorResult;
    }
  }
  onEvent(handler) {
    this.on("start", (data) => handler({ type: "start", data }));
    this.on("iteration", (data) => handler({ type: "iteration", data }));
    this.on("tool_call", (data) => handler({ type: "tool_call", data }));
    this.on("tool_result", (data) => handler({ type: "tool_result", data }));
    this.on("cost_update", (data) => handler({ type: "cost_update", data }));
    this.on("complete", (data) => handler({ type: "complete", data }));
    this.on("error", (data) => handler({ type: "error", data }));
  }
  async executeToolCall(toolCall) {
    try {
      this.emit("tool_call", {
        toolName: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments)
      });
      const result = await this.toolRegistry.executeTool(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments)
      );
      this.costTracker.incrementToolCalls();
      this.emit("tool_result", {
        toolName: toolCall.function.name,
        result,
        success: true
      });
      this.messages.push({
        role: "tool",
        content: JSON.stringify(result),
        toolCallId: toolCall.id
      });
    } catch (error) {
      this.emit("tool_result", {
        toolName: toolCall.function.name,
        result: error,
        success: false
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
  }
};

// src/orchestrators/simple.ts
var SimpleOrchestrator = class _SimpleOrchestrator extends Orchestrator {
  constructor(model, tools = [], systemPrompt) {
    const config = {
      model,
      tools,
      systemPrompt,
      maxIterations: 5,
      streaming: false,
      debug: false
    };
    super(config);
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
  constructor(model, tools = [], systemPrompt) {
    const config = {
      model,
      tools,
      systemPrompt: systemPrompt || "You are a helpful assistant that can use tools to help users. Maintain context from previous messages in this conversation.",
      maxIterations: 10,
      streaming: false,
      debug: false
    };
    super(config);
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
  constructor(model, tools = [], steps = [], systemPrompt) {
    const config = {
      model,
      tools,
      systemPrompt: systemPrompt || "You are a task-oriented assistant. Complete each task step systematically.",
      maxIterations: 15,
      streaming: false,
      debug: false
    };
    super(config);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConversationalOrchestrator,
  SimpleOrchestrator,
  TaskOrchestrator,
  createAPIIntegrator,
  createContentCreator,
  createCustomerService,
  createDataAnalyst,
  createProjectManager,
  createResearchAssistant
});
//# sourceMappingURL=index.js.map