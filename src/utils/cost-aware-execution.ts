import type { CostTracker, UsageRecord } from "../types"

/**
 * Pre-execution cost check and token limit setting
 */
export function prepareExecution(
  {
    message,
    modelName,
    maxTokens,
    costTracker,
  }: {
    message: string
    modelName: string
    maxTokens?: number
    costTracker?: CostTracker
  },
): { maxTokens?: number } {
  if (!costTracker) {
    return { maxTokens }
  }

  const promptLength = message.length
  const estimatedOutputTokens = maxTokens || costTracker.getDefaultMaxTokens(modelName)

  // Pre-execution cost check
  if (!costTracker.canAffordQuery(modelName, promptLength, estimatedOutputTokens)) {
    throw new Error(`Insufficient budget: Query estimated to cost more than remaining budget of ${costTracker.getRemainingBudgetCents()} cents`)
  }

  // Use cost-aware maxTokens if not provided
  const finalMaxTokens = maxTokens || costTracker.getDefaultMaxTokens(modelName)

  return { maxTokens: finalMaxTokens }
}

/**
 * Post-execution usage tracking
 */
export function trackUsage(
  {
    modelName,
    toolName,
    responseMetadata,
    costTracker,
  }: {
    modelName: string
    toolName: string
    responseMetadata?: any
    costTracker?: CostTracker
  },
): void {
  if (!costTracker) {
    return
  }

  const usage = responseMetadata?.tokenUsage
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
      source: "tool",
      toolName,
    }

    costTracker.addUsage(usageRecord)
  }
}

/**
 * Create a standardized tool response
 */
export function createToolResponse(
  {
    content,
    modelName,
    responseMetadata,
    costTracker,
  }: {
    content: any
    modelName: string
    responseMetadata?: any
    costTracker?: CostTracker
  },
) {
  return {
    success: true,
    response: content,
    model: modelName,
    usage: responseMetadata?.tokenUsage || null,
    ...(costTracker && { costTracker: costTracker.getSummary() }),
  }
}

/**
 * Standardized error handling for tool execution
 */
export function handleToolError(error: unknown, toolName: string): never {
  const message = error instanceof Error ? error.message : "Unknown error"
  throw new Error(`${toolName} execution failed: ${message}`)
}
