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
      switch (this.model.provider) {
        case "openai":
          return await this.completeOpenAI(messages, tools, streaming);
        case "anthropic":
          return await this.completeAnthropic(messages, tools, streaming);
        case "google":
          return await this.completeGoogle(messages, tools, streaming);
        case "google-vertex":
          return await this.completeGoogleVertex(messages, tools, streaming);
        case "perplexity":
          return await this.completePerplexity(messages, tools, streaming);
        case "xai":
          return await this.completeXai(messages, tools, streaming);
        case "custom":
          return await this.completeCustom(messages, tools, streaming);
        default:
          throw new ProviderError(`Unsupported provider: ${this.model.provider}`);
      }
    } catch (error) {
      throw new ProviderError(
        `Failed to complete request with ${this.model.provider}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  async completeOpenAI(messages, tools, streaming = false) {
    if (typeof globalThis !== "undefined" && "window" in globalThis) {
      throw new ProviderError("OpenAI provider not available in browser environment");
    }
    try {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const { createVertex } = await import("@ai-sdk/google-vertex");
      const { createPerplexity } = await import("@ai-sdk/perplexity");
      const { createXai } = await import("@ai-sdk/xai");
      const { generateText } = await import("ai");
      const openai = createOpenAI({
        baseURL: this.model.baseURL,
        apiKey: this.model.apiKey || ""
      });
      const anthropic = createAnthropic({
        apiKey: this.model.apiKey || ""
      });
      const google = createGoogleGenerativeAI({
        apiKey: this.model.apiKey || ""
      });
      const googleVertex = createVertex({
        project: this.model.project || "",
        location: this.model.location || ""
      });
      const perplexity = createPerplexity({
        apiKey: this.model.apiKey || ""
      });
      const xai = createXai({
        apiKey: this.model.apiKey || ""
      });
      const provider = this.model.provider === "openai" ? openai : this.model.provider === "anthropic" ? anthropic : this.model.provider === "google" ? google : this.model.provider === "google-vertex" ? googleVertex : this.model.provider === "perplexity" ? perplexity : this.model.provider === "xai" ? xai : openai;
      const coreMessages = messages.filter((m) => m.role !== "system").map((m) => {
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
    } catch (error) {
      throw new ProviderError(`AI SDK error: ${error}`);
    }
  }
  async completeAnthropic(messages, tools, streaming = false) {
    return this.completeOpenAI(messages, tools, streaming);
  }
  async completeGoogle(messages, tools, streaming = false) {
    return this.completeOpenAI(messages, tools, streaming);
  }
  async completeGoogleVertex(messages, tools, streaming = false) {
    return this.completeOpenAI(messages, tools, streaming);
  }
  async completePerplexity(messages, tools, streaming = false) {
    return this.completeOpenAI(messages, tools, streaming);
  }
  async completeXai(messages, tools, streaming = false) {
    return this.completeOpenAI(messages, tools, streaming);
  }
  async completeCustom(messages, tools, streaming = false) {
    throw new ProviderError("Custom provider not yet implemented");
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

// src/types/index.ts
import { z } from "zod";
var AIModelSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "google-vertex", "perplexity", "xai", "custom"]),
  model: z.string(),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  project: z.string().optional(),
  location: z.string().optional()
});
var MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
  toolCallId: z.string().optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal("function"),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional()
});
var ToolParameterSchema = z.object({
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  description: z.string(),
  required: z.boolean().default(false),
  enum: z.array(z.string()).optional(),
  properties: z.record(z.any()).optional(),
  items: z.any().optional()
});
var ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(ToolParameterSchema),
  execute: z.function(),
  costEstimate: z.number().optional()
});
var CostTrackingSchema = z.object({
  inputTokens: z.number().default(0),
  outputTokens: z.number().default(0),
  toolCalls: z.number().default(0),
  estimatedCost: z.number().default(0),
  actualCost: z.number().optional()
});
var OrchestratorConfigSchema = z.object({
  model: AIModelSchema,
  tools: z.array(ToolSchema),
  systemPrompt: z.string().optional(),
  maxIterations: z.number().positive().default(10),
  budget: z.object({
    maxCost: z.number().positive(),
    maxTokens: z.number().positive(),
    maxToolCalls: z.number().positive()
  }).partial().optional(),
  streaming: z.boolean().default(false),
  debug: z.boolean().default(false)
});
var ExecutionResultSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  messages: z.array(MessageSchema),
  costTracking: CostTrackingSchema,
  iterations: z.number(),
  toolCallsUsed: z.array(z.string())
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
import "zod";
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
export {
  AIModelSchema,
  AIProvider,
  Orchestrator as BaseOrchestrator,
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
  SimpleOrchestrator,
  TaskOrchestrator,
  ToolError,
  ToolParameterSchema,
  ToolRegistry,
  ToolSchema,
  ValidationError,
  anthropicModels,
  builtInTools,
  calculatorTool,
  createAPIIntegrator,
  createAnthropicModel,
  createAsyncTool,
  createContentCreator,
  createConversationalAgent,
  createCustomModel,
  createCustomerService,
  createDataAnalyst,
  createGoogleModel as createGeminiModel,
  createGoogleModel,
  createGoogleVertexModel,
  createOpenAIModel,
  createOrchestrator,
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
  googleModels as geminiModels,
  generateId,
  googleModels,
  googleVertexModels,
  httpRequestTool,
  isValidJson,
  isValidUrl,
  openAIModels,
  perplexityModels,
  retry,
  sanitizeToolName,
  timestampTool,
  truncateText,
  validateApiKey,
  validateSchema,
  xaiModels
};
//# sourceMappingURL=index.mjs.map