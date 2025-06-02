/**
 * Tool Subsets Examples
 * Shows how to use specific tools with different AI providers
 * Demonstrates createToolCollection and selective tool usage
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenAI } from "@langchain/openai"
import {
  allTools,
  createAIWithTools,
  createToolCollection,
  getDynamicTool,
} from "openagentic"

// 🎯 Using Specific Tools Only
async function specificToolExample() {
  console.log("=== Using Specific Tools Only ===\n")

  // Get specific tool using dynamic system
  const anthropicTool = getDynamicTool("anthropic")!
  const onlyAnthropic = createToolCollection([anthropicTool])

  console.log("Available tools in subset:", onlyAnthropic.tools.map(t => t.function.name))

  // Use with OpenAI model (OpenAI model + Anthropic tool)
  console.log("\n--- OpenAI Model + Anthropic Tool ---")
  try {
    const openaiModel = new ChatOpenAI({
      model: "gpt-4",
      apiKey: "your-openai-api-key",
    })
    const openaiAI = createAIWithTools(openaiModel, onlyAnthropic)
    const result = await openaiAI.chat("Use Anthropic to write a haiku about coding")

    console.log("✅ OpenAI orchestrating Anthropic tool:")
    console.log("Response:", result.response.substring(0, 150) + "...")
    console.log("Tools used:", result.toolCalls?.map(t => t.toolCall?.name))
  } catch (error) {
    console.log("❌ Error:", error instanceof Error ? error.message : "Unknown error")
  }

  // Use with Gemini model (Gemini model + Anthropic tool)
  console.log("\n--- Gemini Model + Anthropic Tool ---")
  try {
    const geminiModel = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-pro",
      apiKey: "your-google-api-key",
    })
    const geminiAI = createAIWithTools(geminiModel, onlyAnthropic)
    const result = await geminiAI.chat("Use Anthropic to analyze the ethics of AI development")

    console.log("✅ Gemini orchestrating Anthropic tool:")
    console.log("Response:", result.response.substring(0, 150) + "...")
    console.log("Tools used:", result.toolCalls?.map(t => t.toolCall?.name))
  } catch (error) {
    console.log("❌ Error:", error instanceof Error ? error.message : "Unknown error")
  }
}

// 🔧 Custom Tool Collections
async function customCollectionExample() {
  console.log("\n=== Custom Tool Collections ===\n")

  // Create different tool collections for different use cases
  const openaiTool = getDynamicTool("openai")!
  const anthropicTool = getDynamicTool("anthropic")!

  // Writing-focused collection
  const writingTools = createToolCollection([anthropicTool])
  console.log("Writing tools:", writingTools.tools.map(t => t.function.name))

  // Analysis-focused collection
  const analysisTools = createToolCollection([openaiTool])
  console.log("Analysis tools:", analysisTools.tools.map(t => t.function.name))

  // Multi-purpose collection
  const multiTools = createToolCollection([openaiTool, anthropicTool])
  console.log("Multi-purpose tools:", multiTools.tools.map(t => t.function.name))

  // Test with Gemini as orchestrator
  const geminiModel = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash", // Using faster model for demo
    apiKey: "your-google-api-key",
  })

  console.log("\n--- Testing Custom Collections ---")

  // Writing task
  try {
    const writingAI = createAIWithTools(geminiModel, writingTools)
    const writingResult = await writingAI.chat("Write a creative story about a robot")
    console.log("✅ Writing task completed with:", writingResult.toolCalls?.map(t => t.toolCall?.name))
  } catch (error) {
    console.log("❌ Writing task error:", error instanceof Error ? error.message : "Unknown error")
  }

  // Analysis task
  try {
    const analysisAI = createAIWithTools(geminiModel, analysisTools)
    const analysisResult = await analysisAI.chat("Analyze the performance implications of this code structure")
    console.log("✅ Analysis task completed with:", analysisResult.toolCalls?.map(t => t.toolCall?.name))
  } catch (error) {
    console.log("❌ Analysis task error:", error instanceof Error ? error.message : "Unknown error")
  }
}

// ⚡ Performance Comparison: All Tools vs Subsets
async function performanceComparisonExample() {
  console.log("\n=== Performance Comparison: All Tools vs Subsets ===\n")

  const prompt = "Help me understand machine learning concepts"

  // Test with different model/tool combinations
  const testCases = [
    {
      name: "OpenAI + All Tools",
      model: new ChatOpenAI({ model: "gpt-3.5-turbo", apiKey: "your-openai-api-key" }),
      tools: allTools,
    },
    {
      name: "OpenAI + Only OpenAI Tool",
      model: new ChatOpenAI({ model: "gpt-3.5-turbo", apiKey: "your-openai-api-key" }),
      tools: createToolCollection([getDynamicTool("openai")!]),
    },
    {
      name: "Gemini + All Tools",
      model: new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash", apiKey: "your-google-api-key" }),
      tools: allTools,
    },
    {
      name: "Gemini + Only Anthropic Tool",
      model: new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash", apiKey: "your-google-api-key" }),
      tools: createToolCollection([getDynamicTool("anthropic")!]),
    },
  ]

  for (const testCase of testCases) {
    try {
      const ai = createAIWithTools(testCase.model, testCase.tools)
      const start = Date.now()
      const result = await ai.chat(prompt)
      const duration = Date.now() - start

      console.log(`✅ ${testCase.name}:`)
      console.log(`   Duration: ${duration}ms`)
      console.log(`   Tools available: ${testCase.tools.tools.length}`)
      console.log(`   Tools used: ${result.toolCalls?.length || 0}`)
      console.log(`   Response length: ${result.response.length} chars`)
      console.log()
    } catch (error) {
      console.log(`❌ ${testCase.name}: ${error instanceof Error ? error.message : "Unknown error"}\n`)
    }
  }
}

// 🎛️ Dynamic Tool Selection
async function dynamicSelectionExample() {
  console.log("=== Dynamic Tool Selection ===\n")

  const geminiModel = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-pro",
    apiKey: "your-google-api-key",
  })

  // Function to select tools based on task type
  function selectToolsForTask(taskType: "creative" | "analytical" | "general") {
    switch (taskType) {
      case "creative":
        return createToolCollection([getDynamicTool("anthropic")!])
      case "analytical":
        return createToolCollection([getDynamicTool("openai")!])
      case "general":
        return allTools
      default:
        return allTools
    }
  }

  const tasks = [
    { type: "creative" as const, prompt: "Write a poem about artificial intelligence" },
    { type: "analytical" as const, prompt: "Analyze the complexity of sorting algorithms" },
    { type: "general" as const, prompt: "Explain what quantum computing is" },
  ]

  for (const task of tasks) {
    try {
      const selectedTools = selectToolsForTask(task.type)
      const ai = createAIWithTools(geminiModel, selectedTools)

      console.log(`🎯 Task: ${task.type.toUpperCase()}`)
      console.log(`   Tools: ${selectedTools.tools.map(t => t.function.name).join(", ")}`)

      const result = await ai.chat(task.prompt)
      console.log(`   ✅ Completed with ${result.toolCalls?.length || 0} tool calls`)
      console.log(`   Sample: ${result.response.substring(0, 100)}...\n`)
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : "Unknown error"}\n`)
    }
  }
}

// 💡 Best Practices
async function bestPracticesDemo() {
  console.log("=== Tool Subset Best Practices ===\n")

  console.log("✅ When to use tool subsets:")
  console.log("   - Reduce complexity for specific tasks")
  console.log("   - Improve performance (fewer tools to consider)")
  console.log("   - Control costs (limit expensive tools)")
  console.log("   - Domain-specific applications")

  console.log("\n✅ Example use cases:")
  console.log("   - Writing app: Only creative tools (Anthropic)")
  console.log("   - Code analysis: Only analytical tools (OpenAI)")
  console.log("   - Customer support: Balanced set of tools")
  console.log("   - Research: All available tools")

  console.log("\n✅ Performance benefits:")
  console.log("   - Faster tool selection by orchestrator")
  console.log("   - More predictable behavior")
  console.log("   - Easier testing and debugging")
  console.log("   - Better cost control")

  console.log("\n💡 Pro tip: createToolCollection is your friend!")
  console.log("   - Mix and match any tools")
  console.log("   - Works with any LangChain model")
  console.log("   - Maintains same interface as allTools")
}

// Run examples
if (require.main === module) {
  console.log("🔧 OpenAgentic Tool Subsets Examples\n")
  console.log("This demonstrates how to use specific tools with different providers\n")

  specificToolExample()
    .then(() => customCollectionExample())
    .then(() => performanceComparisonExample())
    .then(() => dynamicSelectionExample())
    .then(() => bestPracticesDemo())
    .catch(console.error)
}

export {
  bestPracticesDemo,
  customCollectionExample,
  dynamicSelectionExample,
  performanceComparisonExample,
  specificToolExample,
}
