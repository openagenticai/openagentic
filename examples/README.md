# OpenAgentic Examples

This directory contains comprehensive examples showing how OpenAgentic works seamlessly across different AI providers with consistent APIs and universal tool compatibility.

## 🚀 Quick Start

Pick any example based on what you want to learn:

- **New to OpenAgentic?** → Start with [`basic-usage.ts`](#basic-usagets)
- **Need cost control?** → Check out [`cost-aware-usage.ts`](#cost-aware-usagets)
- **Want specific tools?** → See [`tool-subsets.ts`](#tool-subsetsts)
- **Adding new tools?** → Read [`dynamic-tools.ts`](#dynamic-toolsts)

## Key Benefits

🔥 **Same Code, Different Provider**: OpenAgentic abstractions work identically across AI providers

✅ **No Provider Lock-in**: Switch between OpenAI, Gemini, Claude, and others with minimal code changes

🚀 **Provider-Agnostic**: Tool definitions and execution patterns remain consistent

💰 **Built-in Cost Control**: Optional budget management and real-time cost tracking

🛠️ **Dynamic Tool System**: Add new tools with just JSON configuration

## Prerequisites

```bash
# Install OpenAgentic with your preferred providers
npm install openagentic @langchain/openai @langchain/google-genai @langchain/anthropic
```

Set your API keys:
```bash
export OPENAI_API_KEY="your-openai-api-key"
export GOOGLE_API_KEY="your-google-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

## Examples Overview

### `basic-usage.ts`
**5-line usage pattern** - Shows identical interface across multiple providers
```typescript
// Works with ANY LangChain model!
const model = new ChatOpenAI({ model: "gpt-4", apiKey: OPENAI_API_KEY })
const ai = createAIWithTools(model, allTools)
const result = await ai.chat("Your prompt")
```

### `cost-aware-usage.ts`
**Budget management** - Control costs with built-in tracking and limits
```typescript
// Set budget limits and track spending
const result = await ai.chat("Analyze this codebase", {
  maxCostCents: 500, // $5.00 budget
  conservativeMode: true
})
console.log(`Cost: ${result.costTracker.totalCostCents} cents`)
```

### `tool-subsets.ts`
**Selective tools** - Use specific tools with any provider
```typescript
// Use only Anthropic tool with OpenAI model
const anthropicTool = getDynamicTool("anthropic")!
const customTools = createToolCollection([anthropicTool])
const ai = createAIWithTools(openaiModel, customTools)
```

### `dynamic-tools.ts`
**Tool management** - Add new tools with minimal code
```typescript
// Get available tools from JSON config
console.log(getAvailableToolNames())
// → ['openai', 'anthropic', 'gemini', 'cohere', 'huggingface']

// Use enhanced tool collection with all tools
const ai = createAIWithTools(model, allToolsEnhanced)
```

### `provider-comparison.ts`
**Side-by-side comparison** - Compare providers with identical code
```typescript
const openaiAI = createAIWithTools(openaiModel, allTools)
const geminiAI = createAIWithTools(geminiModel, allTools)
// Same interface, different providers!
```

### `advanced-manual-control.ts`
**Manual control** - Fine-grained tool management for advanced users
```
const modelWithTools = model.bindTools(allTools.toolsForChatCompletion)
const response = await modelWithTools.invoke([...])
// Manual tool execution with full control
```

## Running Examples

```bash
# Quick start - basic usage across providers
npx tsx examples/basic-usage.ts

# Cost management and budget tracking
npx tsx examples/cost-aware-usage.ts

# Tool selection and customization
npx tsx examples/tool-subsets.ts

# Dynamic tool system
npx tsx examples/dynamic-tools.ts

# Provider comparison
npx tsx examples/provider-comparison.ts

# Advanced manual control
npx tsx examples/advanced-manual-control.ts
```

## Common Patterns

### Switch Providers (1 line change)
```typescript
// Change this:
const model = new ChatOpenAI({ model: "gpt-4", apiKey: OPENAI_API_KEY })

// To this:
const model = new ChatGoogleGenerativeAI({ model: "gemini-1.5-pro", apiKey: GOOGLE_API_KEY })

// Everything else stays the same!
```

### Add Budget Control (1 parameter)
```typescript
// Regular usage
const result = await ai.chat("Your prompt")

// With budget control
const result = await ai.chat("Your prompt", { maxCostCents: 100 })
```

### Custom Tool Selection
```typescript
// All tools
const ai = createAIWithTools(model, allTools)

// Specific tools only
const specificTools = createToolCollection([getDynamicTool("openai")!])
const ai = createAIWithTools(model, specificTools)
```

## Architecture Benefits

OpenAgentic's provider-agnostic design means:

1. **Universal Tool Definitions** - Define once, use with any provider
2. **Consistent APIs** - Same patterns across OpenAI, Gemini, Claude, etc.
3. **Easy Migration** - Change providers without rewriting code
4. **Cost Protection** - Built-in budget management and tracking
5. **Extensible** - Add new tools with JSON configuration
6. **Type Safe** - Full TypeScript support across all providers

## Adding New Tools

With the dynamic tool system, adding new tools is simple:

1. **Add JSON config** to `src/configs/tool-definitions.json`
2. **Restart application** - tool is automatically available
3. **Use immediately** with `getDynamicTool("your-tool")`

See [`dynamic-tools.ts`](./dynamic-tools.ts) for detailed examples!

---

💡 **Pro Tip**: All examples use the same core patterns - master one, understand them all!
