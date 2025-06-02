/**
 * Dynamic Tools Usage Example
 * Shows how to use the new dynamic tool system for easy tool management
 */

import { ChatOpenAI } from "@langchain/openai"
import {
  addToolConfig,
  allToolsEnhanced,
  createAIWithTools,
  createExecutableTool,
  getAvailableToolNames,

} from "openagentic"
import type { ToolConfig } from "openagentic"

async function basicDynamicToolsExample() {
  console.log("=== Basic Dynamic Tools Example ===\n")

  const OPENAI_API_KEY = "your-openai-api-key"

  // 1. See all available tools
  console.log("Available tools:", getAvailableToolNames())
  // Output: ['openai', 'anthropic', 'gemini', 'cohere', 'huggingface']

  // 2. Use enhanced tool collection with all dynamic tools
  const model = new ChatOpenAI({
    model: "gpt-4",
    apiKey: OPENAI_API_KEY,
  })

  const ai = createAIWithTools(model, allToolsEnhanced)

  // 3. Now you can use any tool defined in the JSON config
  const result = await ai.chat(
    "Use the OpenAI tool to analyze this text, then use Anthropic for a different perspective",
    { maxCostCents: 200 },
  )

  console.log("Response:", result.response)
  console.log("Tools used:", result.toolCalls?.length || 0)
}

async function customToolExample() {
  console.log("\n=== Custom Tool Creation Example ===\n")

  // 1. Define a custom tool configuration
  const customToolConfig: ToolConfig = {
    name: "custom-llama",
    description: "Use custom Llama model for specialized tasks",
    provider: "custom",
    modelClass: "custom",
    defaultModel: "llama-2-7b-chat",
    modelOptions: ["llama-2-7b-chat", "llama-2-13b-chat", "llama-2-70b-chat"],
    customParameters: {
      temperature: {
        type: "number",
        description: "Temperature for randomness in responses",
        minimum: 0,
        maximum: 1,
      },
      systemPrompt: {
        type: "string",
        description: "System prompt to guide the model behavior",
      },
    },
    // Custom executor for non-standard model classes
    customExecutor: async (params, costTracker) => {
      const { message, temperature = 0.7, systemPrompt = "You are a helpful assistant." } = params

      // Pre-execution cost check
      if (costTracker) {
        const promptLength = message.length + systemPrompt.length
        if (!costTracker.canAffordQuery("llama-2-7b-chat", promptLength, 512)) {
          throw new Error(`Insufficient budget for custom tool`)
        }
      }

      // Simulate custom model execution
      const response = {
        content: `[Custom Llama Response] ${message} (temp: ${temperature})`,
        response_metadata: {
          tokenUsage: {
            promptTokens: Math.ceil(message.length / 4),
            completionTokens: 50,
          },
        },
      }

      // Track usage if cost tracker provided
      if (costTracker) {
        const actualCost = costTracker.estimateCost(
          "llama-2-7b-chat",
          response.response_metadata.tokenUsage.promptTokens,
          response.response_metadata.tokenUsage.completionTokens,
        )

        costTracker.addUsage({
          model: "llama-2-7b-chat",
          inputTokens: response.response_metadata.tokenUsage.promptTokens,
          outputTokens: response.response_metadata.tokenUsage.completionTokens,
          costCents: actualCost,
          timestamp: new Date(),
          source: "tool",
          toolName: "custom-llama",
        })
      }

      return {
        success: true,
        response: response.content,
        model: "llama-2-7b-chat",
        usage: response.response_metadata.tokenUsage,
        ...(costTracker && { costTracker: costTracker.getSummary() }),
      }
    },
  }

  // 2. Create the custom tool
  const customTool = createExecutableTool(customToolConfig)

  console.log("Created custom tool:", customTool.function.name)
  console.log("Custom parameters:", Object.keys(customTool.function.parameters.properties))

  // 3. Add it to the runtime (in a real app, you might persist this)
  const dynamicCustomTool = addToolConfig(customToolConfig)

  console.log("Custom tool available for use!", dynamicCustomTool)
}

async function minimumCodeChangesExample() {
  console.log("\n=== Minimum Code Changes for New Tools ===\n")

  // To add a new standard tool (like Google's PaLM), you only need to:
  // 1. Add it to tool-definitions.json
  // 2. That's it! No code changes needed.

  console.log("To add a new tool like Google PaLM:")
  console.log("1. Add to src/configs/tool-definitions.json:")
  console.log(`{
    "name": "palm",
    "description": "Use Google PaLM model for text generation",
    "provider": "google",
    "modelClass": "custom", // or "ChatPaLM" if LangChain supports it
    "defaultModel": "text-bison-001",
    "modelOptions": ["text-bison-001", "chat-bison-001"]
  }`)
  console.log("2. Restart the application")
  console.log("3. Tool is automatically available!")
}

async function comparisonExample() {
  console.log("\n=== Before vs After Comparison ===\n")

  console.log("BEFORE (manual tool creation):")
  console.log(`// For each new tool, you needed:
// 1. Create tool schema (30+ lines)
// 2. Create execution function (50+ lines)  
// 3. Handle cost tracking manually (20+ lines)
// 4. Handle errors manually (10+ lines)
// 5. Export tool and add to collections (5+ lines)
// Total: ~115 lines per tool + testing`)

  console.log("\nAFTER (dynamic tool system):")
  console.log(`// For each new tool, you only need:
// 1. Add JSON config (8-12 lines)
// 2. That's it!
// Total: ~10 lines per tool, auto-tested`)

  console.log("\nFor 1000 LangChain tools:")
  console.log("Before: ~115,000 lines of duplicated code")
  console.log("After: ~10,000 lines of JSON config")
  console.log("Reduction: 91% less code, 100% consistent implementation")
}

// Run examples
if (require.main === module) {
  basicDynamicToolsExample()
    .then(() => customToolExample())
    .then(() => minimumCodeChangesExample())
    .then(() => comparisonExample())
    .catch(console.error)
}

export {
  basicDynamicToolsExample,
  comparisonExample,
  customToolExample,
  minimumCodeChangesExample,
}
