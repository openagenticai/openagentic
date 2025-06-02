/**
 * Advanced Gemini Usage Example
 * Shows manual tool control with Gemini models for advanced users
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import {
  allTools,
  createToolCollection,
  getDynamicTool,
} from "openagentic"

async function advancedGeminiExample() {
  const GOOGLE_API_KEY = "your-google-api-key"
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-pro",
    apiKey: GOOGLE_API_KEY,
  })

  console.log("=== Step 1: Bind tools to model ===")
  const modelWithTools = model.bindTools(allTools.toolsForChatCompletion)

  console.log(
    "Available tools:",
    allTools.tools.map(t => t.function.name),
  )

  console.log("\n=== Step 2: Generate response with tool calls ===")
  const response = await modelWithTools.invoke([
    {
      role: "user",
      content: "Compare different AI models by using both OpenAI and Anthropic tools to generate creative content",
    },
  ])

  console.log("\nGemini's response:", response.content)
  console.log("Tool calls requested:", response.tool_calls?.length || 0)

  // Manual tool execution
  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log("\n=== Step 3: Execute tool calls ===")

    for (const toolCall of response.tool_calls) {
      console.log(`\nExecuting tool: ${toolCall.name}`)
      console.log("Arguments:", toolCall.args)

      try {
        const result = await allTools.execute({
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.args),
          },
        })

        console.log(`✅ ${toolCall.name} completed:`)
        console.log("Result:", result.response)
        console.log("Success:", result.success)
      } catch (error) {
        console.error(`❌ ${toolCall.name} failed:`, error)
      }
    }
  }

  console.log("\n=== Custom Tool Collection with Gemini ===")

  // Create custom collection using dynamic tools
  const openaiTool = getDynamicTool("openai")!
  const customTools = createToolCollection([openaiTool])
  const geminiWithCustom = model.bindTools(customTools.toolsForChatCompletion)

  const customResponse = await geminiWithCustom.invoke([
    {
      role: "user",
      content: "Use OpenAI to write a technical explanation of how large language models work",
    },
  ])

  console.log("Gemini with custom tools response:", customResponse.content)

  // Execute custom tools
  if (customResponse.tool_calls && customResponse.tool_calls.length > 0) {
    for (const toolCall of customResponse.tool_calls) {
      try {
        const result = await customTools.execute({
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.args),
          },
        })
        console.log("Custom tool result:", result)
      } catch (error) {
        console.error("Custom tool error:", error)
      }
    }
  }
}

advancedGeminiExample().catch(console.error)
