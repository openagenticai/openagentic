import { expect, vi } from "vitest"

import type { CostTracker } from "../../src/types"

// Unified mock cost tracker factory
export const createMockCostTracker = (
  remainingBudget = 100,
  maxBudget = 500,
  defaultMaxTokens = 2048,
): CostTracker => ({
  totalCostCents: maxBudget - remainingBudget,
  maxCostCents: maxBudget,
  usageHistory: [],
  getRemainingBudgetCents: vi.fn().mockReturnValue(remainingBudget),
  canAfford: vi.fn().mockReturnValue(remainingBudget > 0),
  addUsage: vi.fn(),
  getDefaultMaxTokens: vi.fn().mockReturnValue(defaultMaxTokens),
  estimateCost: vi.fn().mockReturnValue(10), // Base cost estimate
  estimateQueryCost: vi.fn().mockReturnValue(15), // Query cost estimate
  canAffordQuery: vi.fn().mockReturnValue(remainingBudget > 15) as any,
  getSummary: vi.fn().mockReturnValue({
    totalCostCents: maxBudget - remainingBudget,
    maxCostCents: maxBudget,
    remainingBudgetCents: remainingBudget,
    budgetUsedPercentage: ((maxBudget - remainingBudget) / maxBudget) * 100,
    totalQueries: 2,
    orchestratorQueries: 1,
    toolQueries: 1,
  }),
})

// Mock LangChain modules setup
export const setupLangChainMocks = () => {
  // Mock core messages
  vi.mock("@langchain/core/messages", () => ({
    HumanMessage: vi.fn().mockImplementation(content => ({ content })),
    AIMessage: vi.fn().mockImplementation(content => ({ content })),
  }))

  // Mock OpenAI
  vi.mock("@langchain/openai", () => ({
    ChatOpenAI: vi.fn().mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue({
        content: "Mock OpenAI response",
        response_metadata: {
          tokenUsage: {
            promptTokens: 50,
            completionTokens: 50,
            totalTokens: 100,
          },
        },
      }),
    })),
  }))

  // Mock Anthropic
  vi.mock("@langchain/anthropic", () => ({
    ChatAnthropic: vi.fn().mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue({
        content: "Mock Anthropic response",
        response_metadata: {
          tokenUsage: {
            promptTokens: 75,
            completionTokens: 75,
            totalTokens: 150,
          },
        },
      }),
    })),
  }))
}

// Mock model for AI interface testing
export const createMockModel = () => {
  const mockModel = {
    invoke: vi.fn(),
    bindTools: vi.fn().mockImplementation(function (this: any) {
      return this
    }),
    modelName: "mock-model",

    // BaseLanguageModel required properties and methods
    callKeys: ["invoke"],
    caller: {},
    generatePrompt: vi.fn(),
    predict: vi.fn(),
    predictMessages: vi.fn(),
    _generate: vi.fn(),
    _llmType: () => "mock",
    _modelType: () => "base_language_model",
    _streamResponseChunks: vi.fn(),
    serialize: vi.fn(),
    _identifyingParams: {},

    // Additional LangChain base class methods
    pipe: vi.fn(),
    stream: vi.fn(),
    batch: vi.fn(),
    withConfig: vi.fn().mockImplementation(function (this: any) {
      return this
    }),
    withRetry: vi.fn().mockImplementation(function (this: any) {
      return this
    }),
    withFallbacks: vi.fn().mockImplementation(function (this: any) {
      return this
    }),
  }

  // Set up default return values
  mockModel.predict.mockResolvedValue("Mock prediction")
  mockModel.predictMessages.mockResolvedValue({ content: "Mock message response" })
  mockModel._generate.mockResolvedValue({ generations: [[{ text: "Mock generation" }]] })
  mockModel.serialize.mockReturnValue({ _type: "mock_model" })

  return mockModel as any
}

// Tool call creation helper
export const createMockToolCall = (name: string, args: Record<string, any>) => ({
  function: {
    name,
    arguments: JSON.stringify(args),
  },
})

// Common test data
export const TEST_API_KEYS = {
  openai: "test-openai-key",
  anthropic: "test-anthropic-key",
  google: "test-google-key",
}

export const TEST_PROMPTS = {
  simple: "Hello, world!",
  complex: "Analyze this complex problem and provide detailed insights",
  creative: "Write a creative story about AI",
}

// Provider-specific configurations for parameterized tests
export const PROVIDER_CONFIGS = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
    description: "Use OpenAI model to generate responses for various tasks including text generation, analysis, and creative writing",
    defaultModel: "gpt-4-1106-preview",
    models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-4-1106-preview"],
    defaultMaxTokens: 2048,
    mockClass: "ChatOpenAI",
    expectedUsage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
    costEstimate: 10, // Lower cost for OpenAI
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic Claude",
    description: "Use Anthropic Claude model to generate responses, analysis, and creative content with advanced reasoning capabilities",
    defaultModel: "claude-3-5-sonnet-20240620",
    models: ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
    defaultMaxTokens: 4096,
    mockClass: "ChatAnthropic",
    expectedUsage: { promptTokens: 75, completionTokens: 75, totalTokens: 150 },
    costEstimate: 15, // Higher cost for Claude
  },
}

// Assertion helpers
export const assertToolSchema = (tool: any, expectedConfig: any) => {
  expect(tool).toEqual({
    type: "function",
    function: {
      name: expectedConfig.name,
      description: expectedConfig.description,
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: `The message or prompt to send to the ${expectedConfig.displayName} model`,
          },
          apiKey: {
            type: "string",
            description: `The API key for accessing ${expectedConfig.displayName} services`,
          },
          modelName: {
            type: "string",
            description: `The ${expectedConfig.displayName} model to use for generation`,
            enum: expectedConfig.models,
          },
          maxTokens: {
            type: "number",
            description: "Maximum number of tokens to generate (optional, will use cost-aware default if not specified)",
          },
        },
        required: ["message", "apiKey"],
        additionalProperties: false,
      },
      strict: true,
    },
  })
}

export const assertExecutionResult = (
  result: any,
  expectedModel: string,
  expectedUsage: any,
  expectedResponse = "Mock response",
) => {
  expect(result).toEqual({
    success: true,
    response: expect.stringContaining(expectedResponse.split(" ")[0]), // Flexible matching
    model: expectedModel,
    usage: expectedUsage,
  })
}

// Budget scenario generators
export const BUDGET_SCENARIOS = {
  sufficient: { budget: 500, remaining: 400, canAfford: true },
  low: { budget: 100, remaining: 20, canAfford: true },
  insufficient: { budget: 50, remaining: 5, canAfford: false },
  exhausted: { budget: 100, remaining: 0, canAfford: false },
}

export const createBudgetScenario = (scenario: keyof typeof BUDGET_SCENARIOS) => {
  const config = BUDGET_SCENARIOS[scenario]
  return createMockCostTracker(config.remaining, config.budget)
}

// Error simulation helpers
export const ERROR_SCENARIOS = {
  networkError: new Error("Network connection failed"),
  authError: new Error("Invalid API key provided"),
  rateLimit: new Error("Rate limit exceeded"),
  invalidModel: new Error("Model not found"),
}

export const simulateError = (errorType: keyof typeof ERROR_SCENARIOS) => {
  return ERROR_SCENARIOS[errorType]
}

// Test cleanup utilities
export const cleanupMocks = () => {
  vi.clearAllMocks()
}

export const resetAllMocks = () => {
  vi.resetAllMocks()
}
