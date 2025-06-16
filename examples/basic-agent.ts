import { createAgent, calculatorTool, httpTool, timestampTool } from '../src';

async function basicAgentExample() {
  console.log('🤖 OpenAgentic - Basic Agent Example\n');

  // =============================================================================
  // EXAMPLE 1: Simple Calculator Agent
  // =============================================================================
  console.log('📝 Example 1: Simple Calculator Agent');
  
  const mathAgent = createAgent({
    model: 'gpt-4o-mini', // Auto-detects OpenAI provider
    tools: [calculatorTool],
    systemPrompt: 'You are a helpful mathematics assistant. Always show your calculations clearly.',
  });

  try {
    const result = await mathAgent.execute('What is 15 * 24? Also calculate the square root of 144.');
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
    model: 'claude-4-sonnet-20250514', // Auto-detects Anthropic provider
    tools: [calculatorTool, httpTool, timestampTool],
    systemPrompt: 'You are a versatile assistant with access to multiple tools. Use them as needed.',
  });

  try {
    const result = await multiAgent.execute(
      'Calculate 25 * 16, get the current timestamp in human format, and check if httpbin.org/status/200 is accessible'
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
    tools: [calculatorTool],
    systemPrompt: 'You are a mathematical problem solver.',
    customLogic: async (input, context) => {
      // Custom pre-processing logic
      console.log('🔍 Custom logic: Processing input...');
      
      if (input.toLowerCase().includes('fibonacci')) {
        return {
          content: 'Custom logic detected Fibonacci! The 10th Fibonacci number is 55. This was handled by custom logic without calling the AI model.',
          customHandled: true
        };
      }
      
      // Let the normal orchestration handle it
      return null;
    }
  });

  try {
    const result = await customAgent.execute('Calculate the 10th fibonacci number');
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
  toolAgent.addTool(calculatorTool);
  toolAgent.addTool(timestampTool);

  console.log('🔧 Available tools:', toolAgent.getAllTools().map(t => t.name));
  console.log('🔢 Utility tools:', toolAgent.getToolsByCategory('utility').map(t => t.name));

  try {
    const result = await toolAgent.execute('What is 100 / 5 and what time is it?');
    console.log('✅ Result:', result.result);
    
    // Remove a tool
    toolAgent.removeTool('timestamp');
    console.log('🗑️ Removed timestamp tool');
    console.log('🔧 Remaining tools:', toolAgent.getAllTools().map(t => t.name));
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
    tools: [calculatorTool],
  });

  console.log('🔄 Initial model:', switchingAgent.getModelInfo().model);

  // Switch to a different provider
  switchingAgent.switchModel('claude-4-sonnet-20250514');
  console.log('🔄 Switched to:', switchingAgent.getModelInfo().model);

  // Switch to Google's model
  switchingAgent.switchModel('gemini-1.5-pro');
  console.log('🔄 Switched to:', switchingAgent.getModelInfo().model);

  console.log('\n🎉 Basic agent examples completed successfully!');
}

if (require.main === module) {
  basicAgentExample().catch(console.error);
}