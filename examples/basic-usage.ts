/**
 * Basic Usage Examples
 * Shows how OpenAgentic works identically across different AI providers
 * Same code, different providers - that's the power of abstraction!
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenAI } from "@langchain/openai"
import { allTools, createAIWithTools } from "openagentic"

// 🚀 5-Line Usage Pattern - Works with ANY LangChain Model!
async function basicUsagePattern() {
  console.log("=== 5-Line Usage Pattern ===\n")

  // Step 1: Choose your model (OpenAI, Gemini, Claude, etc.)
  const model = new ChatOpenAI({
    model: "gpt-4",
    apiKey: "your-openai-api-key",
  })

  // Step 2: Wrap with tools (one line!)
  const ai = createAIWithTools(model, allTools)

  // Step 3: Chat with automatic tool execution
  const result = await ai.chat("Use OpenAI to explain quantum physics in simple terms")

  // Step 4: Get results
  console.log("Response:", result.response)
  console.log("Tools used:", result.toolCalls?.map(t => t.toolCall?.name))
}

// 🔄 Same Code, Different Providers
async function multiProviderExample() {
  console.log("\n=== Multi-Provider Example ===\n")

  const prompt = "Use the OpenAI tool to write a haiku about coding"

  // OpenAI Example
  console.log("--- Using OpenAI Model ---")
  try {
    const openaiModel = new ChatOpenAI({
      model: "gpt-4",
      apiKey: "your-openai-api-key",
    })
    const openaiAI = createAIWithTools(openaiModel, allTools)
    const openaiResult = await openaiAI.chat(prompt)

    console.log("✅ OpenAI Result:", openaiResult.response.substring(0, 100) + "...")
    console.log("Tools called:", openaiResult.toolCalls?.length || 0)
  } catch (error) {
    console.log("❌ OpenAI Error:", error instanceof Error ? error.message : "Unknown error")
  }

  // Gemini Example - IDENTICAL CODE STRUCTURE!
  console.log("\n--- Using Gemini Model ---")
  try {
    const geminiModel = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-pro",
      apiKey: "your-google-api-key",
    })
    const geminiAI = createAIWithTools(geminiModel, allTools) // Same tools!
    const geminiResult = await geminiAI.chat(prompt) // Same method!

    console.log("✅ Gemini Result:", geminiResult.response.substring(0, 100) + "...")
    console.log("Tools called:", geminiResult.toolCalls?.length || 0)
  } catch (error) {
    console.log("❌ Gemini Error:", error instanceof Error ? error.message : "Unknown error")
  }
}

// 🛠️ Key Benefits Demonstration
async function benefitsDemo() {
  console.log("\n=== Key Benefits of OpenAgentic ===\n")

  console.log("✅ Provider Agnostic:")
  console.log("   - Same tools work with OpenAI, Gemini, Claude, etc.")
  console.log("   - Switch providers by changing ONE line of code")
  console.log("   - No vendor lock-in!")

  console.log("\n✅ Consistent Interface:")
  console.log("   - Same ai.chat() method regardless of provider")
  console.log("   - Same tool execution patterns")
  console.log("   - Same response format")

  console.log("\n✅ Universal Tools:")
  console.log("   - Tool definitions work across all providers")
  console.log("   - Write once, use everywhere")
  console.log("   - Automatic cost tracking and error handling")

  console.log("\n✅ Easy Migration:")
  console.log("   - Test multiple providers with same codebase")
  console.log("   - A/B test different models")
  console.log("   - Fallback to different providers on errors")
}

// 🎯 Practical Migration Example
async function migrationExample() {
  console.log("\n=== Practical Migration Example ===\n")

  const prompt = "Analyze this code for potential bugs"

  // Function that works with ANY model
  async function analyzeCode(model: any, providerName: string) {
    try {
      const ai = createAIWithTools(model, allTools)
      const start = Date.now()
      const result = await ai.chat(prompt)
      const duration = Date.now() - start

      console.log(`✅ ${providerName}:`)
      console.log(`   Response length: ${result.response.length} chars`)
      console.log(`   Duration: ${duration}ms`)
      console.log(`   Tools used: ${result.toolCalls?.length || 0}`)

      return { success: true, duration, length: result.response.length }
    } catch (error) {
      console.log(`❌ ${providerName}: ${error instanceof Error ? error.message : "Unknown error"}`)
      return { success: false, error }
    }
  }

  // Test multiple providers with identical code
  const models = [
    {
      model: new ChatOpenAI({ model: "gpt-4", apiKey: "your-openai-api-key" }),
      name: "OpenAI GPT-4",
    },
    {
      model: new ChatOpenAI({ model: "gpt-3.5-turbo", apiKey: "your-openai-api-key" }),
      name: "OpenAI GPT-3.5",
    },
    {
      model: new ChatGoogleGenerativeAI({ model: "gemini-1.5-pro", apiKey: "your-google-api-key" }),
      name: "Google Gemini Pro",
    },
  ]

  console.log("Testing same prompt across multiple providers...\n")

  for (const { model, name } of models) {
    await analyzeCode(model, name)
  }

  console.log("\n💡 Notice: Identical code structure for all providers!")
  console.log("💡 Change provider = Change ONE line (the model instantiation)")
}

// Run examples
if (require.main === module) {
  console.log("🚀 OpenAgentic Basic Usage Examples\n")
  console.log("This demonstrates how the same code works across different AI providers\n")

  basicUsagePattern()
    .then(() => multiProviderExample())
    .then(() => benefitsDemo())
    .then(() => migrationExample())
    .catch(console.error)
}

export {
  basicUsagePattern,
  benefitsDemo,
  migrationExample,
  multiProviderExample,
}
