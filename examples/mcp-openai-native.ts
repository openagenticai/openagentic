/**
 * OpenAI Native MCP Integration Example (via LangChain)
 *
 * This example demonstrates how to use MCP tools with OpenAI's native MCP support
 * via LangChain's ChatOpenAI client and the Responses API.
 * LangChain automatically routes to Responses API when MCP tools are bound.
 *
 * Prerequisites:
 * Set environment variables:
 * OPENAI_API_KEY=your_openai_key
 * GITHUB_TOKEN=your_github_token (for GitHub MCP example)
 * SHOPIFY_ACCESS_TOKEN=your_shopify_token (for Shopify MCP example)
 */

import { createAIWithMCPTools, getDynamicMCPTool } from "../src"

const githubToken = "add-github-token"
const shopifyAccessToken = "add-shopify-token"
const openaiApiKey = "add-openai-key"

async function basicMCPExample() {
  console.log("🔗 Basic OpenAI Native MCP Example (via LangChain ChatOpenAI)")

  try {
    // Get MCP tools from our JSON configuration
    const githubTool = getDynamicMCPTool("github")

    if (!githubTool) {
      console.log("❌ GitHub MCP tool not found in configuration")
      return
    }

    // Set authentication headers at runtime
    githubTool.headers = {
      Authorization: `Bearer ${githubToken}`,
    }

    console.log("🛠️ Creating AI with MCP tools using LangChain ChatOpenAI...")

    // Create AI with MCP tools - LangChain handles Responses API integration
    const ai = createAIWithMCPTools([githubTool], {
      apiKey: openaiApiKey,
      model: "gpt-4",
      maxCostCents: 50,
    })

    console.log("💬 Asking AI to search GitHub repositories...")

    const result = await ai.chat(
      "Search for popular React repositories and tell me about the top 3 results",
    )

    console.log("✅ Response:", result.response)
    console.log("📊 Usage:", result.usage)
    console.log("💰 Cost:", `${result.cost} cents`)
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

async function multiMCPExample() {
  console.log("\n🔗 Multi-MCP Tools Example")

  try {
    // Get multiple MCP tools
    const githubTool = getDynamicMCPTool("github")
    const shopifyTool = getDynamicMCPTool("shopify")

    if (!githubTool || !shopifyTool) {
      console.log("❌ Required MCP tools not found in configuration")
      return
    }

    // Set authentication for both tools
    githubTool.headers = {
      Authorization: `Bearer ${githubToken}`,
    }

    shopifyTool.headers = {
      "X-Shopify-Access-Token": shopifyAccessToken,
    }

    console.log("🛠️ Creating AI with multiple MCP tools...")

    const ai = createAIWithMCPTools([githubTool, shopifyTool], {
      apiKey: openaiApiKey,
      model: "gpt-4",
      maxCostCents: 100,
    })

    console.log("💬 Asking AI to coordinate across GitHub and Shopify...")

    const result = await ai.chat(
      "Check my GitHub profile for any e-commerce projects, then search our Shopify store for related products we might be selling",
    )

    console.log("✅ Multi-service response:", result.response)
    console.log("📊 Total usage:", result.usage)
    console.log("💰 Total cost:", `${result.cost} cents`)
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

basicMCPExample()
  .then(() => multiMCPExample())
  .then(() => {
    console.log("\n🎉 MCP examples completed!")
    console.log("💡 Key benefits:")
    console.log("  - LangChain ChatOpenAI handles Responses API routing")
    console.log("  - OpenAI manages all MCP protocol communication")
    console.log("  - JSON configuration for easy MCP server setup")
    console.log("  - Integrated cost tracking and usage monitoring")
  })
  .catch(console.error)
