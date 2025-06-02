/**
 * Cost-Aware Usage Examples
 * Shows how to use OpenAgentic with budget limits and cost tracking
 * Combines simple usage patterns with advanced cost management
 */

import { ChatOpenAI } from "@langchain/openai"
import { allTools, createAIWithTools } from "openagentic"

// 💰 Exact API Pattern from User Request
async function chatWithOpenAI({
  query,
  maxCostCents,
  model,
  apiKey = "your-openai-api-key",
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

// 🚀 Basic Cost-Aware Usage
async function basicCostAwareExample() {
  console.log("=== Basic Cost-Aware Usage ===\n")

  try {
    // This is the exact API signature from the user request
    const result = await chatWithOpenAI({
      query: "please find and fix the bugs in this codebase",
      maxCostCents: 512, // $5.12 budget
      model: "gpt-4",
    })

    console.log("✅ Query completed successfully!")
    console.log("Response:", result.response.substring(0, 200) + "...")

    console.log("\n📊 Cost Breakdown:")
    console.log(`- Total Cost: ${result.costTracker!.totalCostCents} cents ($${(result.costTracker!.totalCostCents / 100).toFixed(2)})`)
    console.log(`- Budget Used: ${result.costTracker!.budgetUsedPercentage.toFixed(1)}%`)
    console.log(`- Remaining: ${result.costTracker!.remainingBudgetCents} cents ($${(result.costTracker!.remainingBudgetCents / 100).toFixed(2)})`)
    console.log(`- Orchestrator Queries: ${result.costTracker!.orchestratorQueries}`)
    console.log(`- Tool Queries: ${result.costTracker!.toolQueries}`)

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log("\n🔧 Tools Used:")
      result.toolCalls.forEach((toolCall, index) => {
        console.log(`${index + 1}. ${toolCall.toolCall?.name}`)
      })
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : "Unknown error")

    if (error instanceof Error && error.message.includes("Insufficient budget")) {
      console.log("💡 Tip: Try increasing maxCostCents or using a less expensive model")
    }
  }
}

// 📈 Advanced Cost Management
async function advancedCostManagementExample() {
  console.log("\n=== Advanced Cost Management ===\n")

  const OPENAI_API_KEY = "your-openai-api-key"
  const model = new ChatOpenAI({ model: "gpt-4", apiKey: OPENAI_API_KEY })
  const ai = createAIWithTools(model, allTools)

  try {
    // Large analysis task with comprehensive cost tracking
    const result = await ai.chat(
      "Please perform a thorough code review, security audit, and performance analysis of this entire codebase. Use tools to examine each component systematically.",
      {
        maxCostCents: 1000, // $10.00 budget
        conservativeMode: false, // Allow full token usage
      },
    )

    console.log("✅ Comprehensive analysis completed!")
    console.log("Response length:", result.response.length, "characters")

    console.log("\n📈 Detailed Cost Analysis:")
    console.log(`- Total Cost: ${result.costTracker!.totalCostCents} cents ($${(result.costTracker!.totalCostCents / 100).toFixed(2)})`)
    console.log(`- Max Budget: ${result.costTracker!.maxCostCents} cents ($${(result.costTracker!.maxCostCents / 100).toFixed(2)})`)
    console.log(`- Budget Utilization: ${result.costTracker!.budgetUsedPercentage.toFixed(1)}%`)
    console.log(`- Remaining Budget: ${result.costTracker!.remainingBudgetCents} cents`)
    console.log(`- Total Queries: ${result.costTracker!.totalQueries}`)
    console.log(`- Orchestrator Queries: ${result.costTracker!.orchestratorQueries}`)
    console.log(`- Tool Execution Queries: ${result.costTracker!.toolQueries}`)

    if (result.toolCalls) {
      console.log(`\n🛠️ Tool Usage Summary (${result.toolCalls.length} total calls):`)
      const toolCount = result.toolCalls.reduce((acc, call) => {
        const toolName = call.toolCall?.name || "unknown"
        acc[toolName] = (acc[toolName] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      Object.entries(toolCount).forEach(([tool, count]) => {
        console.log(`- ${tool}: ${count} calls`)
      })
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : "Unknown error")
  }
}

// 🔄 Multiple Queries with Shared Budget
async function sharedBudgetExample() {
  console.log("\n=== Multiple Queries with Shared Budget ===\n")

  const model = new ChatOpenAI({ model: "gpt-3.5-turbo", apiKey: "your-openai-api-key" })
  const ai = createAIWithTools(model, allTools)

  const queries = [
    "Analyze the main.py file for potential improvements",
    "Check for security vulnerabilities in the authentication system",
    "Review database queries for performance optimization",
    "Suggest code refactoring opportunities",
  ]

  const totalBudget = 200 // $2.00
  let usedBudget = 0

  console.log(`💰 Starting with ${totalBudget} cents budget ($${(totalBudget / 100).toFixed(2)})\n`)

  for (const [index, query] of queries.entries()) {
    const remainingBudget = totalBudget - usedBudget

    if (remainingBudget <= 10) { // Keep 10 cents minimum
      console.log(`❌ Query ${index + 1}: Insufficient budget remaining (${remainingBudget} cents)`)
      break
    }

    try {
      console.log(`🔍 Query ${index + 1}: "${query.substring(0, 50)}..."`)

      const start = Date.now()
      const result = await ai.chat(query, {
        maxCostCents: remainingBudget,
        conservativeMode: true,
      })
      const duration = Date.now() - start

      const queryCost = result.costTracker!.totalCostCents
      usedBudget += queryCost

      console.log(`   ✅ Success: ${queryCost} cents, ${duration}ms`)
      console.log(`   📊 Budget: ${usedBudget}/${totalBudget} cents (${((usedBudget / totalBudget) * 100).toFixed(1)}% used)`)
      console.log(`   🛠️ Tools: ${result.toolCalls?.length || 0} calls\n`)
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}\n`)
      break
    }
  }

  console.log(`💰 Final Budget Usage: ${usedBudget}/${totalBudget} cents (${((usedBudget / totalBudget) * 100).toFixed(1)}%)`)
}

// ⚖️ Model Cost Comparison
async function modelCostComparisonExample() {
  console.log("\n=== Model Cost Comparison ===\n")

  const query = "Analyze this code structure and suggest improvements"
  const budget = 150 // $1.50 per model

  const models = [
    { name: "GPT-3.5 Turbo", model: "gpt-3.5-turbo" },
    { name: "GPT-4", model: "gpt-4" },
    { name: "GPT-4 Turbo", model: "gpt-4-turbo" },
  ]

  console.log(`Testing query: "${query}"\n`)

  for (const { name, model } of models) {
    try {
      console.log(`🤖 Testing ${name}...`)

      const start = Date.now()
      const result = await chatWithOpenAI({
        query,
        maxCostCents: budget,
        model,
        conservativeMode: true,
      })
      const duration = Date.now() - start

      console.log(`   ✅ ${name}:`)
      console.log(`      Cost: ${result.costTracker!.totalCostCents} cents`)
      console.log(`      Time: ${duration}ms`)
      console.log(`      Queries: ${result.costTracker!.totalQueries}`)
      console.log(`      Tools: ${result.costTracker!.toolQueries}`)
      console.log(`      Efficiency: ${(result.response.length / result.costTracker!.totalCostCents).toFixed(2)} chars/cent`)
      console.log()
    } catch (error) {
      console.log(`   ❌ ${name}: ${error instanceof Error ? error.message : "Unknown error"}\n`)
    }
  }
}

// 🛡️ Budget Protection Demo
async function budgetProtectionExample() {
  console.log("=== Budget Protection Demo ===\n")

  console.log("Testing budget exhaustion protection...\n")

  try {
    // Intentionally small budget to trigger protection
    const result = await chatWithOpenAI({
      query: "Please perform a comprehensive security audit of this entire codebase, including all dependencies, configurations, deployment scripts, and provide detailed documentation with specific recommendations for each finding.",
      maxCostCents: 5, // Very small budget - 5 cents
      model: "gpt-4",
    })

    console.log("❓ Unexpectedly succeeded with tiny budget:")
    console.log("Cost:", result.costTracker!.totalCostCents, "cents")
  } catch (error) {
    console.log("✅ Budget protection working correctly!")
    console.log("Expected error:", error instanceof Error ? error.message : "Unknown error")
    console.log("💡 This protects you from accidentally expensive queries")
  }
}

// 🔄 Backward Compatibility Demo
async function backwardCompatibilityExample() {
  console.log("\n=== Backward Compatibility (No Cost Tracking) ===\n")

  const model = new ChatOpenAI({ model: "gpt-3.5-turbo", apiKey: "your-openai-api-key" })
  const ai = createAIWithTools(model, allTools)

  try {
    // Regular chat without cost tracking - backward compatible!
    const result = await ai.chat("Hello world! How are you?")

    console.log("✅ Regular chat (no cost tracking):")
    console.log("Response:", result.response.substring(0, 100) + "...")
    console.log("Cost Tracker:", result.costTracker ? "Enabled" : "Disabled")
    console.log("💡 Existing code continues to work without changes!")
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : "Unknown error")
  }
}

// 💡 Best Practices
async function bestPracticesDemo() {
  console.log("\n=== Cost-Aware Best Practices ===\n")

  console.log("✅ Budget Management:")
  console.log("   - Set realistic budgets based on task complexity")
  console.log("   - Use conservativeMode for predictable costs")
  console.log("   - Monitor budget usage across multiple queries")
  console.log("   - Keep buffer for unexpected tool usage")

  console.log("\n✅ Model Selection:")
  console.log("   - GPT-3.5-turbo: Fast, cheap, good for simple tasks")
  console.log("   - GPT-4: Balanced cost/quality for complex analysis")
  console.log("   - GPT-4-turbo: Best quality, higher cost")

  console.log("\n✅ Cost Optimization:")
  console.log("   - Use tool subsets to limit expensive operations")
  console.log("   - Enable conservativeMode for cost-sensitive workflows")
  console.log("   - Batch similar queries when possible")
  console.log("   - Monitor cost per task for optimization")

  console.log("\n💰 Example Budgets:")
  console.log("   - Simple query: 25-50 cents")
  console.log("   - Code analysis: 100-300 cents")
  console.log("   - Comprehensive audit: 500-1000 cents")
  console.log("   - Research task: 1000+ cents")
}

// Run examples
if (require.main === module) {
  console.log("💰 OpenAgentic Cost-Aware Usage Examples\n")
  console.log("This demonstrates budget management and cost tracking capabilities\n")

  basicCostAwareExample()
    .then(() => advancedCostManagementExample())
    .then(() => sharedBudgetExample())
    .then(() => modelCostComparisonExample())
    .then(() => budgetProtectionExample())
    .then(() => backwardCompatibilityExample())
    .then(() => bestPracticesDemo())
    .catch(console.error)
}

export {
  advancedCostManagementExample,
  backwardCompatibilityExample,
  basicCostAwareExample,
  bestPracticesDemo,
  budgetProtectionExample,
  chatWithOpenAI,
  modelCostComparisonExample,
  sharedBudgetExample,
}
