import 'dotenv/config';

import { createAgent, timestampTool, httpTool } from '../../src';

async function basicAgentExample() {
  console.log('🤖 OpenAgentic - Basic Agent Example\n');

  // =============================================================================
  // EXAMPLE 1: Simple Timestamp Agent
  // =============================================================================
  console.log('📝 Example 1: Simple Timestamp Agent');
  
  const timeAgent = createAgent({
    model: 'gpt-4o-mini', // Auto-detects OpenAI provider
    tools: [timestampTool],
    systemPrompt: 'You are a helpful time assistant. Always provide clear time information.',
  });

  try {
    const result = await timeAgent.execute('What time is it right now? Also provide the timestamp in both human format and ISO format.');
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
    tools: [timestampTool, httpTool],
    systemPrompt: 'You are a versatile assistant with access to multiple tools. Use them as needed.',
  });

  try {
    const result = await multiAgent.execute(
      'Get the current timestamp in human format, and check if httpbin.org/status/200 is accessible'
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
    tools: [timestampTool],
    systemPrompt: 'You are a time-aware assistant.',
    customLogic: async (input, context) => {
      // Custom pre-processing logic
      console.log('🔍 Custom logic: Processing input...');
      
      if (input.toLowerCase().includes('birthday')) {
        return {
          content: 'Custom logic detected birthday mention! Happy Birthday! 🎉 This was handled by custom logic without calling the AI model.',
          customHandled: true
        };
      }
      
      // Let the normal orchestration handle it
      return null;
    }
  });

  try {
    const result = await customAgent.execute('It\'s my birthday today!');
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
  toolAgent.addTool(timestampTool);
  toolAgent.addTool(httpTool);

  console.log('🔧 Available tools count:', toolAgent.getAllTools().length);

  try {
    const result = await toolAgent.execute('What time is it and can you check if google.com is accessible?');
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
    tools: [timestampTool],
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