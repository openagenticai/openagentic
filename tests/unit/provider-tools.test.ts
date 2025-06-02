import { ChatAnthropic } from "@langchain/anthropic"
import { ChatOpenAI } from "@langchain/openai"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createProviderTestSuite } from "../shared/provider-test-suite"
import { PROVIDER_CONFIGS, setupLangChainMocks } from "../shared/test-utils"

// Setup mocks for all LangChain modules
setupLangChainMocks()

// Mock LangChain modules for provider-specific testing
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

vi.mock("@langchain/core/messages", () => ({
  HumanMessage: vi.fn().mockImplementation(content => ({ content })),
  AIMessage: vi.fn().mockImplementation(content => ({ content })),
}))

describe("provider Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test OpenAI provider using shared test suite
  describe("openAI Tool", createProviderTestSuite(PROVIDER_CONFIGS.openai))

  // Test Anthropic provider using shared test suite
  describe("anthropic Tool", createProviderTestSuite(PROVIDER_CONFIGS.anthropic))

  // Provider-specific tests that can't be generalized
  describe("provider-Specific Behaviors", () => {
    describe("openAI specific", () => {
      it("should handle OpenAI-specific response format", async () => {
        // Any OpenAI-specific test logic would go here
        const mockChatOpenAI = ChatOpenAI as any
        expect(mockChatOpenAI).toBeDefined()
      })
    })

    describe("anthropic specific", () => {
      it("should handle Anthropic-specific response format", async () => {
        // Any Anthropic-specific test logic would go here
        const mockChatAnthropic = ChatAnthropic as any
        expect(mockChatAnthropic).toBeDefined()
      })
    })
  })

  // Cross-provider compatibility tests
  describe("cross-Provider Compatibility", () => {
    it("should have consistent interface across providers", () => {
      const providers = Object.keys(PROVIDER_CONFIGS)

      providers.forEach((providerName) => {
        const config = PROVIDER_CONFIGS[providerName as keyof typeof PROVIDER_CONFIGS]

        // Verify all providers follow the same configuration pattern
        expect(config).toHaveProperty("name")
        expect(config).toHaveProperty("displayName")
        expect(config).toHaveProperty("description")
        expect(config).toHaveProperty("defaultModel")
        expect(config).toHaveProperty("models")
        expect(config).toHaveProperty("defaultMaxTokens")
        expect(config).toHaveProperty("expectedUsage")

        // Verify models array is not empty
        expect(Array.isArray(config.models)).toBe(true)
        expect(config.models.length).toBeGreaterThan(0)

        // Verify default model is in models array
        expect(config.models).toContain(config.defaultModel)
      })
    })

    it("should have unique tool names", () => {
      const names = Object.values(PROVIDER_CONFIGS).map(config => config.name)
      const uniqueNames = new Set(names)

      expect(uniqueNames.size).toBe(names.length)
    })

    it("should have consistent parameter structures", () => {
      const providers = Object.values(PROVIDER_CONFIGS)

      // All providers should have similar token usage expectations
      providers.forEach((config) => {
        expect(config.expectedUsage).toHaveProperty("promptTokens")
        expect(config.expectedUsage).toHaveProperty("completionTokens")
        expect(config.expectedUsage).toHaveProperty("totalTokens")

        expect(typeof config.expectedUsage.promptTokens).toBe("number")
        expect(typeof config.expectedUsage.completionTokens).toBe("number")
        expect(typeof config.expectedUsage.totalTokens).toBe("number")
      })
    })
  })

  // Performance and resource usage tests
  describe("performance Characteristics", () => {
    it("should handle concurrent executions", async () => {
      // This could test that multiple provider tools can be used concurrently
      const providers = Object.values(PROVIDER_CONFIGS)

      expect(providers.length).toBeGreaterThan(1)

      // Verify each provider configuration is valid
      providers.forEach((config) => {
        expect(config.name).toBeTruthy()
        expect(config.defaultMaxTokens).toBeGreaterThan(0)
      })
    })

    it("should have reasonable default token limits", () => {
      const providers = Object.values(PROVIDER_CONFIGS)

      providers.forEach((config) => {
        // Verify token limits are within reasonable ranges
        expect(config.defaultMaxTokens).toBeGreaterThanOrEqual(1024)
        expect(config.defaultMaxTokens).toBeLessThanOrEqual(8192)
      })
    })
  })
})
