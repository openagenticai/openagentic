/**
 * Provider Comparison Example
 * Shows how the same OpenAgentic interface works identically across providers
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenAI } from "@langchain/openai"
import { allTools, createAIWithTools } from "openagentic"

async function providerComparisonExample() {
  console.log("=== Provider Comparison: Same Code, Different Models ===\n")

  // Same prompt for both providers
  const prompt = "Use OpenAI to write a technical explanation of neural networks in simple terms"

  // OpenAI Setup
  console.log("--- OpenAI Setup ---")
  const OPENAI_API_KEY = "your-openai-api-key"
  const openaiModel = new ChatOpenAI({
    model: "gpt-4",
    apiKey: OPENAI_API_KEY,
  })
  const openaiAI = createAIWithTools(openaiModel, allTools)

  // Gemini Setup
  console.log("--- Gemini Setup ---")
  const GOOGLE_API_KEY = "your-google-api-key"
  const geminiModel = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-pro",
    apiKey: GOOGLE_API_KEY,
  })
  const geminiAI = createAIWithTools(geminiModel, allTools)

  // Execute with OpenAI
  console.log("\n=== Executing with OpenAI ===")
  try {
    const openaiResult = await openaiAI.chat(prompt)
    console.log("OpenAI Response Length:", openaiResult.response.length)
    console.log("OpenAI Tools Used:", openaiResult.toolCalls?.length || 0)
    console.log("OpenAI Sample:", openaiResult.response.substring(0, 200) + "...")
  } catch (error) {
    console.error("OpenAI Error:", error)
  }

  console.log("\n=== Executing with Gemini ===")
  try {
    const geminiResult = await geminiAI.chat(prompt)
    console.log("Gemini Response Length:", geminiResult.response.length)
    console.log("Gemini Tools Used:", geminiResult.toolCalls?.length || 0)
    console.log("Gemini Sample:", geminiResult.response.substring(0, 200) + "...")
  } catch (error) {
    console.error("Gemini Error:", error)
  }

  console.log("\n=== Key Insights ===")
  console.log("✅ Same OpenAgentic interface")
  console.log("✅ Same tool definitions")
  console.log("✅ Same execution patterns")
  console.log("✅ Provider-agnostic architecture")
  console.log("✅ Drop-in model replacement")

  console.log("\n=== Performance Comparison ===")

  try {
    const [openaiSpeed, geminiSpeed] = await Promise.all([
      measureProviderSpeed(openaiAI, "Quick test"),
      measureProviderSpeed(geminiAI, "Quick test"),
    ])

    console.log(`OpenAI Speed: ${openaiSpeed}ms`)
    console.log(`Gemini Speed: ${geminiSpeed}ms`)
  } catch (error) {
    console.error("Speed test error:", error)
  }
}

async function measureProviderSpeed(ai: any, prompt: string): Promise<number> {
  const start = Date.now()
  await ai.chat(prompt)
  return Date.now() - start
}

providerComparisonExample().catch(console.error)
