import 'dotenv/config';
import { createAgent, convertLangchainTool } from '../../src';
import { DallEAPIWrapper } from '@langchain/openai';

// =============================================================================
// LANGCHAIN DALLE TOOL EXAMPLE
// =============================================================================

async function main() {
  console.log('🦜 LangChain DALL-E Tool Integration Example\n');

  // Validate required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  try {
    // =============================================================================
    // EXAMPLE 1: MANUAL CONVERSION
    // =============================================================================
    
    console.log('📋 Example 1: Manual LangChain Tool Conversion');
    console.log('='.repeat(50));

    // Create LangChain DALL-E tool
    const langchainDallETool = new DallEAPIWrapper({
      n: 1,
      model: 'dall-e-3',
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('🔧 Created LangChain DALL-E tool:', {
      name: langchainDallETool.name,
      description: langchainDallETool.description,
    });

    // Manually convert to OpenAgentic format
    const convertedTool = await convertLangchainTool(langchainDallETool, {
      toolId: 'dalle_image_gen',
      useCases: [
        'Generate AI images from text descriptions',
        'Create artistic visuals for content',
        'Prototype visual concepts',
        'Generate marketing imagery'
      ],
      logo: '🎨'
    });

    console.log('✅ Successfully converted LangChain tool to OpenAgentic format:', {
      toolId: convertedTool.toolId,
      name: convertedTool.name,
      useCases: convertedTool.useCases.length,
      logo: convertedTool.logo
    });

    // Create agent with manually converted tool
    const agent1 = createAgent({
      model: 'gpt-4o-mini',
      tools: [convertedTool],
      systemPrompt: 'You are a helpful AI assistant that can generate images using DALL-E. When asked to create an image, use the available image generation tool.',
    });

    console.log('🤖 Created agent with manually converted LangChain tool\n');

    // Test the manually converted tool
    console.log('🎯 Testing manually converted tool...');
    const result1 = await agent1.execute('Create a beautiful sunset landscape image');
    
    console.log('📊 Manual conversion result:', {
      success: result1.success,
      toolsUsed: result1.toolCallsUsed,
      iterations: result1.iterations,
      resultPreview: result1.result ? result1.result.substring(0, 100) + '...' : 'No result'
    });

    // =============================================================================
    // EXAMPLE 2: AUTO-CONVERSION
    // =============================================================================
    
    console.log('\n📋 Example 2: Automatic LangChain Tool Conversion');
    console.log('='.repeat(50));

    // Create agent with LangChain tool directly (auto-conversion)
    const agent2 = createAgent({
      model: 'gpt-4o-mini',
      tools: [langchainDallETool], // Pass LangChain tool directly
      systemPrompt: 'You are a helpful AI assistant that can generate images using DALL-E. When asked to create an image, use the available image generation tool.',
    });

    console.log('🤖 Created agent with auto-converted LangChain tool');

    // Test the auto-converted tool
    console.log('🎯 Testing auto-converted tool...');
    const result2 = await agent2.execute('Generate an image of a futuristic city with flying cars');
    
    console.log('📊 Auto-conversion result:', {
      success: result2.success,
      toolsUsed: result2.toolCallsUsed,
      iterations: result2.iterations,
      resultPreview: result2.result ? result2.result.substring(0, 100) + '...' : 'No result'
    });

    // =============================================================================
    // EXAMPLE 3: MIXED TOOLS (OPENAGENTIC + LANGCHAIN)
    // =============================================================================
    
    console.log('\n📋 Example 3: Mixed OpenAgentic + LangChain Tools');
    console.log('='.repeat(50));

    // Import some OpenAgentic tools
    const { qrcodeTool, openaiTool } = await import('../../src/tools');

    // Create agent with mixed tools
    const agent3 = createAgent({
      model: 'gpt-4o-mini',
      tools: [
        openaiTool,        // Native OpenAgentic tool
        langchainDallETool, // LangChain tool (auto-converted)
        qrcodeTool         // Native OpenAgentic tool
      ],
      systemPrompt: 'You are a versatile AI assistant with image generation, QR code creation, and text generation capabilities. Use the appropriate tool based on the user request.',
    });

    console.log('🤖 Created agent with mixed tool types:', {
      totalTools: 3,
      openAgenticTools: 2,
      langChainTools: 1
    });

    // Test mixed tools workflow
    console.log('🎯 Testing mixed tools workflow...');
    const result3 = await agent3.execute('Create a QR code for "https://openagentic.org" and also generate an image of a robot coding');
    
    console.log('📊 Mixed tools result:', {
      success: result3.success,
      toolsUsed: result3.toolCallsUsed,
      iterations: result3.iterations,
      resultPreview: result3.result ? result3.result.substring(0, 150) + '...' : 'No result'
    });

    // =============================================================================
    // EXAMPLE 4: TOOL INTROSPECTION
    // =============================================================================
    
    console.log('\n📋 Example 4: Tool Introspection and Metadata');
    console.log('='.repeat(50));

    // Inspect the agent's tools
    const allTools = agent3.getAllTools();
    
    console.log('🔍 Agent tool inventory:');
    allTools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} (${tool.toolId})`);
      console.log(`      📝 ${tool.description}`);
      console.log(`      🎯 Use cases: ${tool.useCases.length}`);
      console.log(`      ${tool.logo} Logo: ${tool.logo}`);
      console.log('');
    });

    // =============================================================================
    // SUMMARY
    // =============================================================================
    
    console.log('📊 Example Summary');
    console.log('='.repeat(50));
    console.log('✅ Successfully demonstrated LangChain tool compatibility');
    console.log('🔧 Manual conversion works for custom configuration');
    console.log('🔄 Auto-conversion seamlessly handles LangChain tools');
    console.log('🔗 Mixed OpenAgentic + LangChain tools work together');
    console.log('🔍 Tool introspection provides full metadata access');
    
    console.log('\n🎉 LangChain integration example completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error);
    
    if (error instanceof Error) {
      console.error('📝 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
      });
    }
    
    process.exit(1);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Test LangChain tool directly (without OpenAgentic)
 */
async function testLangChainToolDirectly() {
  console.log('\n🧪 Testing LangChain DALL-E tool directly...');
  
  const dalleTool = new DallEAPIWrapper({
    n: 1,
    model: 'dall-e-3',
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const result = await dalleTool.invoke('A beautiful mountain landscape');
    console.log('📊 Direct LangChain tool result:', {
      type: typeof result,
      length: typeof result === 'string' ? result.length : 'N/A',
      preview: typeof result === 'string' ? result.substring(0, 100) + '...' : result
    });
  } catch (error) {
    console.error('❌ Direct LangChain tool test failed:', error);
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

if (require.main === module) {
  main().catch(console.error);
} 