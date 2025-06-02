# Cost-Aware Model Querying

OpenAgentic now supports cost-aware model querying, allowing you to set budget limits and track costs across orchestrator models and the tools they call. **Cost tracking is now built into the main tools and AI interface as an optional feature.**

## Quick Start

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { allTools, createAIWithTools } from "openagentic"

// Create your model
const model = new ChatOpenAI({ model: "gpt-4", apiKey: "your-api-key" })

// Create AI with tools (same as before!)
const ai = createAIWithTools(model, allTools)

// Chat with cost limit (optional)
const result = await ai.chat(
  "Please find and fix the bugs in this codebase",
  {
    maxCostCents: 512, // $5.12 budget
    conservativeMode: true // Optional: use conservative token limits
  }
)

console.log("Response:", result.response)
console.log("Total cost:", result.costTracker!.totalCostCents, "cents")
console.log("Budget used:", result.costTracker!.budgetUsedPercentage.toFixed(1), "%")

// Or chat without cost tracking (also works!)
const regularResult = await ai.chat("Hello world!")
// regularResult.costTracker will be undefined
```

## Features

### 🎯 **Optional Cost Tracking**
- **Same tools, optional cost tracking**: Use `allTools` for everything
- **Backward compatible**: Existing code works unchanged
- **Budget management**: Set `maxCostCents` to enable cost tracking
- **Budget exhaustion protection**: Queries fail gracefully when budget is exceeded

### 📊 **Cost Tracking**
- Real-time cost calculation based on token usage
- Separate tracking for orchestrator vs. tool queries
- Detailed cost summaries and usage history

### 🛡️ **Conservative Mode**
- Automatically reduces `maxTokens` as budget gets low
- 90%+ budget remaining: Full token capacity
- 70-90% budget remaining: Moderate token limits (2048 max)
- <70% budget remaining: Minimal token limits (512 max)

### 💰 **Cost Estimation**
- Pre-execution cost estimation to prevent budget overruns
- Uses real model pricing data from [model_prices_and_context_window.json](../src/utils/model_prices_and_context_window.json)
- Supports 1000+ models across multiple providers

## API Reference

### `createAIWithTools(model, toolCollection)`

Creates an AI interface that handles tool binding, execution, and optional cost tracking.

**Parameters:**
- `model`: LangChain model instance
- `toolCollection`: Tool collection (use `allTools`)

**Returns:** `AIWithTools` with `chat` method

### `chat(message, options?)`

Execute a query with optional cost tracking and budget limits.

**Parameters:**
- `message`: String query to send to the model
- `options`: Optional object with:
  - `maxCostCents`: Maximum cost in cents (enables cost tracking)
  - `conservativeMode`: Boolean to enable conservative token usage

**Returns:** Object with:
- `response`: Model response string
- `toolCalls`: Array of tool executions (if any)
- `metadata`: Model response metadata
- `costTracker`: Cost tracking summary (only if `maxCostCents` provided)

### Cost Tracker Summary

The `costTracker` object (when enabled) includes:

```
{
  totalCostCents: number,           // Total cost in cents
  maxCostCents: number,             // Budget limit in cents
  remainingBudgetCents: number,     // Remaining budget in cents
  budgetUsedPercentage: number,     // Percentage of budget used
  totalQueries: number,             // Total number of queries
  orchestratorQueries: number,      // Queries made by orchestrator
  toolQueries: number               // Queries made by tools
}
```

## Examples

### Basic Usage

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { allTools, createAIWithTools } from "openagentic"

const model = new ChatOpenAI({ model: "gpt-4", apiKey: "your-key" })
const ai = createAIWithTools(model, allTools)

// With cost tracking
const result = await ai.chat(
  "Analyze this codebase for security vulnerabilities",
  { maxCostCents: 200 } // $2.00 budget
)

// Without cost tracking (backward compatible)
const regularResult = await ai.chat("Hello world!")
```

### Multiple Queries with Shared Budget

```typescript
const totalBudget = 500 // $5.00
let usedBudget = 0

const queries = [
  "Find potential bugs",
  "Suggest performance improvements",
  "Check security vulnerabilities"
]

for (const query of queries) {
  const remainingBudget = totalBudget - usedBudget

  if (remainingBudget <= 0) {
    break
  }

  const result = await ai.chat(query, {
    maxCostCents: remainingBudget
  })

  usedBudget += result.costTracker!.totalCostCents
}
```

### Different Models Cost Comparison

```typescript
const models = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]
const query = "Analyze this code"
const budget = 100 // $1.00

for (const modelName of models) {
  const model = new ChatOpenAI({ model: modelName, apiKey: "your-key" })
  const ai = createAIWithTools(model, allTools)

  try {
    const result = await ai.chat(query, { maxCostCents: budget })
    console.log(`${modelName}: ${result.costTracker!.totalCostCents} cents`)
  } catch (error) {
    console.log(`${modelName}: Budget exceeded`)
  }
}
```

### Creating a Simple API Wrapper

```typescript
// Helper function that provides the exact API mentioned in the original request
async function chatWithOpenAI({
  query,
  maxCostCents,
  model,
  apiKey = process.env.OPENAI_API_KEY,
  conservativeMode = false,
}: {
  query: string
  maxCostCents: number
  model: string
  apiKey?: string
  conservativeMode?: boolean
}) {
  const modelInstance = new ChatOpenAI({ model, apiKey })
  const ai = createAIWithTools(modelInstance, allTools)

  return ai.chat(query, { maxCostCents, conservativeMode })
}

// Usage exactly as requested:
const result = await chatWithOpenAI({
  query: "please find and fix the bugs in this codebase",
  maxCostCents: 512,
  model: "gpt-4"
})
```

## Tool Usage

All tools now support optional cost tracking automatically:

```typescript
import { allTools, createToolCollection } from "openagentic"

// Use the standard tools - cost tracking is built-in
const ai = createAIWithTools(model, allTools)

// Or create custom tool collections
const customTools = createToolCollection([
  openaiExecutableTool,
  anthropicExecutableTool,
])
```

## Error Handling

```typescript
try {
  const result = await ai.chat(query, { maxCostCents: 10 })
  // Process result
} catch (error) {
  if (error.message.includes("Insufficient budget")) {
    console.log("Budget exceeded - try increasing maxCostCents")
  } else {
    console.log("Other error:", error.message)
  }
}
```

## Best Practices

1. **Start with Conservative Budgets**: Begin with small budgets and increase as needed
2. **Use Conservative Mode**: Enable for production environments with strict cost controls
3. **Monitor Budget Usage**: Check `budgetUsedPercentage` to understand spending patterns
4. **Handle Budget Exhaustion**: Always wrap calls in try-catch blocks
5. **Choose Appropriate Models**: Use cheaper models (gpt-3.5-turbo) for simple tasks

## Model Pricing

Pricing data is automatically loaded from the comprehensive [model_prices_and_context_window.json](../src/utils/model_prices_and_context_window.json) file, which includes:

- **1000+ models** across multiple providers
- **Real-time pricing** in cost per token
- **Context window limits** for each model
- **Feature support** flags (function calling, vision, etc.)

Costs are calculated as:
```
Total Cost = (Input Tokens × Input Cost per Token) + (Output Tokens × Output Cost per Token)
```

## Backward Compatibility

All existing APIs work unchanged. Cost tracking is completely opt-in:

```typescript
// Existing API - works exactly the same
const ai = createAIWithTools(model, allTools)
const result = await ai.chat("Hello")
// result.costTracker is undefined

// New cost-aware API - opt-in via options
const result = await ai.chat("Hello", { maxCostCents: 100 })
// result.costTracker contains cost information
```

## Migration from Previous Cost-Aware API

If you were using the previous cost-aware API, here's how to migrate:

```typescript
// Old API (no longer needed)
const ai = createCostAwareAIWithTools(model, allCostAwareTools)
const result = await ai.chatWithCostLimit(query, { maxCostCents: 100 })

// New consolidated API
const ai = createAIWithTools(model, allTools)
const result = await ai.chat(query, { maxCostCents: 100 })
```
