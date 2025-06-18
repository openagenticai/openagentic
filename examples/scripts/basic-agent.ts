import 'dotenv/config';

import { createAgent, qrcodeTool, githubTool } from '../../src';

async function basicAgentExample() {
  console.log('🤖 OpenAgentic - Basic Agent Example\n');

  // =============================================================================
  // EXAMPLE 1: Simple QR Code Agent
  // =============================================================================
  console.log('📝 Example 1: Simple QR Code Generator Agent');
  
  const qrAgent = createAgent({
    model: 'gpt-4o-mini', // Auto-detects OpenAI provider
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful QR code assistant. Generate QR codes for users.',
  });

  try {
    const result = await qrAgent.execute('Create a QR code for the OpenAgentic website: https://openagentic.org. Make it size 512x512 with high error correction.');
    console.log('✅ Result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
    console.log('📊 Iterations:', result.iterations);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 2: Multi-Tool Agent
  // =============================================================================
  console.log('📝 Example 2: Multi-Tool Agent');
  
  const multiAgent = createAgent({
    model: 'claude-sonnet-4-20250514', // Auto-detects Anthropic provider
    tools: [qrcodeTool, githubTool],
    systemPrompt: 'You are a versatile assistant with access to multiple tools. Use them as needed.',
  });

  try {
    const result = await multiAgent.execute(
      'Create a QR code for a GitHub repository and also fetch the README.md file from the openai/openai-node repository'
    );
    console.log('✅ Result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
    console.log('📊 Iterations:', result.iterations);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Agent with Custom Logic
  // =============================================================================
  console.log('📝 Example 3: Agent with Custom Logic');
  
  const customAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool],
    systemPrompt: 'You are a QR code specialist.',
    customLogic: async (input, context) => {
      // Custom pre-processing logic
      console.log('🔍 Custom logic: Processing input...');
      
      if (input.toLowerCase().includes('business card')) {
        return {
          content: 'Custom logic detected business card request! I recommend including contact info in vCard format. This was handled by custom logic without calling the AI model.',
          customHandled: true
        };
      }
      
      // Let the normal orchestration handle it
      return null;
    }
  });

  try {
    const result = await customAgent.execute('I need a QR code for my business card');
    console.log('✅ Result:', result.result);
    console.log('🔧 Custom logic used:', result.result?.includes('custom logic'));
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 4: Tool Management
  // =============================================================================
  console.log('📝 Example 4: Tool Management');
  
  const toolAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [], // Start with no tools
    systemPrompt: 'You are a helpful assistant.',
  });

  // Add tools dynamically
  toolAgent.addTool(qrcodeTool);
  toolAgent.addTool(githubTool);

  console.log('🔧 Available tools count:', toolAgent.getAllTools().length);

  try {
    const result = await toolAgent.execute('Generate a QR code for a website URL and fetch a README file from a GitHub repository');
    console.log('✅ Result:', result.result);
    
    // Remove a tool
    const availableTools = toolAgent.getAllTools();
    if (availableTools.length > 0) {
      toolAgent.removeTool(availableTools[0].toolId);
      console.log('🗑️ Removed first tool');
      console.log('🔧 Remaining tools count:', toolAgent.getAllTools().length);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 5: Model Switching
  // =============================================================================
  console.log('📝 Example 5: Model Switching');
  
  const switchingAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool],
  });

  console.log('🔄 Initial model:', switchingAgent.getModelInfo().model);

  // Switch to a different provider
  switchingAgent.switchModel('claude-sonnet-4-20250514');
  console.log('🔄 Switched to:', switchingAgent.getModelInfo().model);

  // Switch to Google's model
  switchingAgent.switchModel('gemini-1.5-pro');
  console.log('🔄 Switched to:', switchingAgent.getModelInfo().model);

  console.log('\n🎉 Basic agent examples completed successfully!');
}

if (require.main === module) {
  basicAgentExample().catch(console.error);
}