import type { BaseLanguageModel } from "@langchain/core/language_models/base"
import { ChatOpenAI } from "@langchain/openai"

import type { CostAwareOptions, ExecutableMCPTool, ToolCollection, UsageRecord } from "./types"
import { createCostTracker } from "./utils/cost-tracker"

export interface AIWithTools {
  chat: (message: string, options?: CostAwareOptions) => Promise<{
    response: string
    toolCalls?: any[]
    metadata?: any
    costTracker?: {
      totalCostCents: number
      maxCostCents: number
      remainingBudgetCents: number
      budgetUsedPercentage: number
      totalQueries: number
      orchestratorQueries: number
      toolQueries: number
    }
  }>
  model: BaseLanguageModel
  tools: ToolCollection
}

export interface AIWithMCPTools {
  chat: (message: string, options?: CostAwareOptions) => Promise<{
    response: string
    toolCalls?: any[]
    metadata?: any
    costTracker?: {
      totalCostCents: number
      maxCostCents: number
      remainingBudgetCents: number
      budgetUsedPercentage: number
      totalQueries: number
      orchestratorQueries: number
      toolQueries: number
    }
  }>
  mcpTools: ExecutableMCPTool[]
}

/**
 * Create an AI interface with tools that simplifies usage to just a few lines
 * Automatically handles tool binding, execution, result formatting, and optional cost tracking
 */
export const createAIWithTools = (
  model: BaseLanguageModel,
  toolCollection: ToolCollection,
): AIWithTools => {
  // Type assertion for bindTools method (available on most LangChain models)
  const modelWithBindTools = model as BaseLanguageModel & {
    bindTools?: (tools: any[]) => BaseLanguageModel
  }

  // Bind tools to the model if the method exists
  const boundModel = modelWithBindTools.bindTools
    ? modelWithBindTools.bindTools(toolCollection.toolsForChatCompletion)
    : model

  const chat = async (message: string, options?: CostAwareOptions) => {
    const costTracker = options?.maxCostCents ? createCostTracker(options.maxCostCents) : undefined

    try {
      // Get model name for cost tracking
      const modelName = (model as any).modelName || (model as any).model || "gpt-4"

      // Pre-execution cost check for orchestrator (if cost tracker enabled)
      if (costTracker && !costTracker.canAffordQuery(modelName, message.length)) {
        throw new Error(`Insufficient budget: Orchestrator query estimated to cost more than remaining budget of ${costTracker.getRemainingBudgetCents()} cents`)
      }

      // Use cost-aware maxTokens for the orchestrator (if cost tracker enabled)
      let maxTokens: number | undefined
      if (costTracker) {
        const baseMaxTokens = costTracker.getDefaultMaxTokens(modelName)
        if (options?.conservativeMode) {
          // Conservative mode: use more restrictive token limits
          maxTokens = Math.min(baseMaxTokens, 1024)
        } else {
          // Normal mode: use the cost tracker's dynamic token limits
          maxTokens = baseMaxTokens
        }
      }

      // Type assertion for invoke method
      const invokeModel = boundModel as BaseLanguageModel & {
        invoke: (messages: any[], options?: any) => Promise<any>
      }

      const response = await invokeModel.invoke([
        { role: "user", content: message },
      ], maxTokens ? { maxTokens } : undefined)

      // Track orchestrator usage (if cost tracker enabled)
      if (costTracker) {
        const usage = response.response_metadata?.tokenUsage
        if (usage) {
          const inputTokens = usage.promptTokens || 0
          const outputTokens = usage.completionTokens || 0
          const actualCost = costTracker.estimateCost(modelName, inputTokens, outputTokens)

          const usageRecord: UsageRecord = {
            model: modelName,
            inputTokens,
            outputTokens,
            costCents: actualCost,
            timestamp: new Date(),
            source: "orchestrator",
          }

          costTracker.addUsage(usageRecord)
        }
      }

      // Handle tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolResults = []

        for (const toolCall of response.tool_calls) {
          try {
            const result = await toolCollection.execute({
              function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.args || {}),
              },
            }, costTracker)
            toolResults.push({
              toolCall,
              result,
            })
          } catch (error) {
            toolResults.push({
              toolCall,
              error: error instanceof Error ? error.message : "Unknown error",
            })
          }
        }

        return {
          response: response.content || "",
          toolCalls: toolResults,
          metadata: response.response_metadata,
          ...(costTracker && { costTracker: costTracker.getSummary() }),
        }
      }

      return {
        response: response.content || response.toString(),
        metadata: response.response_metadata,
        ...(costTracker && { costTracker: costTracker.getSummary() }),
      }
    } catch (error) {
      throw new Error(`AI chat failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return {
    chat,
    model: boundModel,
    tools: toolCollection,
  }
}

/**
 * Create an AI interface with MCP tools using LangChain's ChatOpenAI and OpenAI's native MCP support
 * This leverages OpenAI's Responses API through LangChain's ChatOpenAI client for native MCP integration
 *
 * Usage:
 * ```typescript
 * import { getDynamicMCPTool, createAIWithMCPTools } from "openagentic"
 *
 * // Get MCP tools from our JSON configuration
 * const githubTool = getDynamicMCPTool("github")
 * const shopifyTool = getDynamicMCPTool("shopify")
 *
 * const ai = createAIWithMCPTools([githubTool, shopifyTool], {
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: "gpt-4"
 * })
 *
 * const result = await ai.chat("Search my GitHub repos and check our Shopify inventory")
 * ```
 */
export const createAIWithMCPTools = (
  mcpTools: ExecutableMCPTool[],
  options: {
    apiKey: string
    model: string
    maxCostCents?: number
    conservativeMode?: boolean
  },
) => {
  const { apiKey, model, maxCostCents = 100, conservativeMode = false } = options
  console.log("Note: Cost tracking is not supported for MCP tools", {
    maxCostCents,
    conservativeMode,
  })

  // Create ChatOpenAI instance that will use Responses API when MCP tools are present
  const llm = new ChatOpenAI({
    apiKey,
    model,
    temperature: 0,
    // LangChain will automatically route to Responses API when MCP tools are bound
  })

  // Convert our MCP tools to LangChain format
  const langchainMCPTools = mcpTools.map(tool => ({
    type: "mcp" as const,
    server_label: tool.server_label,
    server_url: tool.server_url,
    require_approval: tool.require_approval || "never" as const,
    allowed_tools: tool.allowed_tools,
    headers: tool.headers,
  }))

  // Bind MCP tools to the model - LangChain handles the Responses API integration
  const modelWithMCPTools = llm.bindTools(langchainMCPTools)

  return {
    chat: async (message: string) => {
      try {
        const response = await modelWithMCPTools.invoke([
          { role: "user", content: message },
        ])

        return {
          response: response.content,
          usage: response.usage_metadata,
          model,
          cost: response.usage_metadata
            ? calculateCost(model, response.usage_metadata.input_tokens, response.usage_metadata.output_tokens)
            : undefined,
        }
      } catch (error) {
        throw new Error(`MCP tool execution failed: ${error}`)
      }
    },
  }
}

// Helper function to calculate cost (simplified)
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // This would use our existing cost calculation logic
  // For now, return a placeholder
  return (inputTokens * 0.01 + outputTokens * 0.03) / 1000
}
