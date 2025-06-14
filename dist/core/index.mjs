// src/core/orchestrator.ts
import { EventEmitter } from "events";

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
var Orchestrator = class extends EventEmitter {
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