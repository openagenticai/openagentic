import { createAgent, createStreamingAgent, httpTool, calculatorTool, aiTextTool } from '../src';

async function main() {
  console.log('🤖 OpenAgentic - New Simplified API Demo\n');

  // =============================================================================
  // EXAMPLE 1: Basic Agent with Utility Tools
  // =============================================================================
  console.log('📝 Example 1: Basic Agent with Utility Tools');
  
  const basicAgent = createAgent({
    model: 'gpt-4o-mini', // Auto-detects OpenAI provider
    tools: [httpTool, calculatorTool],
    systemPrompt: 'You are a helpful assistant that can make calculations and web requests.',
  });

  try {
    const result = await basicAgent.execute('What is 15 * 24? Also, can you check the current time from worldtimeapi.org?');
    console.log('✅ Result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 2: Streaming Agent
  // =============================================================================
  console.log('📡 Example 2: Streaming Agent');
  
  const streamingAgent = createStreamingAgent({
    model: 'claude-4-sonnet-20250514', // Auto-detects Anthropic provider
    tools: [aiTextTool],
    systemPrompt: 'You are a creative writing assistant.',
  });

  try {
    console.log('🔄 Streaming response...\n');
    
    const stream = await streamingAgent.stream('Write a short story about a robot learning to paint');
    
    let content = '';
    for await (const chunk of stream.textStream) {
      content += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Streaming completed');
  } catch (error) {
    console.error('❌ Streaming error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Agent with Custom Logic
  // =============================================================================
  console.log('🧠 Example 3: Agent with Custom Logic');
  
  const customAgent = createAgent({
    model: 'gemini-1.5-pro', // Auto-detects Google provider
    tools: [calculatorTool],
    systemPrompt: 'You are a mathematical problem solver.',
    customLogic: async (input, context) => {
      // Custom pre-processing logic
      console.log('🔍 Custom logic: Processing input...');
      
      if (input.includes('fibonacci')) {
        return {
          content: 'Custom logic handled Fibonacci sequence request directly!',
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
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 4: Event Monitoring
  // =============================================================================
  console.log('📊 Example 4: Event Monitoring');
  
  const monitoredAgent = createAgent({
    model: 'o3-mini', // Auto-detects OpenAI provider
    tools: [httpTool, calculatorTool],
    systemPrompt: 'You are a helpful assistant.',
  });

  // Set up event monitoring
  monitoredAgent.onEvent((event) => {
    switch (event.type) {
      case 'start':
        console.log(`🚀 Started with model: ${event.data.model.model}`);
        break;
      case 'tool_call':
        console.log(`🔧 Calling tool: ${event.data.toolName}`);
        break;
      case 'tool_result':
        console.log(`${event.data.success ? '✅' : '❌'} Tool ${event.data.toolName} ${event.data.success ? 'succeeded' : 'failed'}`);
        break;
      case 'complete':
        console.log(`🏁 Completed in ${event.data.iterations} iterations`);
        break;
      case 'error':
        console.log(`💥 Error: ${event.data.error}`);
        break;
    }
  });

  try {
    const result = await monitoredAgent.execute('Calculate 25 * 16 and then check if httpbin.org is accessible');
    console.log('✅ Final result:', result.result);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n🎉 Demo completed!');
}

if (require.main === module) {
  main().catch(console.error);
}