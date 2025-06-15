import { createAgent, createStreamingAgent, httpTool, calculatorTool, timestampTool } from '../src';

async function main() {
  console.log('🤖 OpenAgentic - New Simplified API Demo\n');

  // =============================================================================
  // EXAMPLE 1: Basic Agent with Utility Tools
  // =============================================================================
  console.log('📝 Example 1: Basic Agent with Utility Tools');
  
  const basicAgent = createAgent({
    model: 'gpt-4o-mini', // Auto-detects OpenAI provider
    tools: [httpTool, calculatorTool, timestampTool],
    systemPrompt: 'You are a helpful assistant that can make calculations, web requests, and get timestamps.',
  });

  try {
    const result = await basicAgent.execute('What is 15 * 24? Also, what is the current timestamp in human format?');
    console.log('✅ Result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
    console.log('📊 Iterations:', result.iterations);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 2: Streaming Agent
  // =============================================================================
  console.log('📡 Example 2: Streaming Agent');
  
  const streamingAgent = createStreamingAgent({
    model: 'gpt-4o-mini', // Use consistent model for demo
    tools: [calculatorTool],
    systemPrompt: 'You are a creative writing assistant. Be concise but engaging.',
  });

  try {
    console.log('🔄 Streaming response...\n');
    
    const stream = await streamingAgent.stream('Write a very short story (2-3 sentences) about a robot learning to paint. Also calculate 5 * 7.');
    
    let content = '';
    for await (const chunk of stream.textStream) {
      content += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Streaming completed');
    console.log('📝 Total content length:', content.length);
  } catch (error) {
    console.error('❌ Streaming error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Agent with Custom Logic
  // =============================================================================
  console.log('🧠 Example 3: Agent with Custom Logic');
  
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
  // EXAMPLE 4: Event Monitoring
  // =============================================================================
  console.log('📊 Example 4: Event Monitoring');
  
  const monitoredAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool, timestampTool],
    systemPrompt: 'You are a helpful assistant.',
  });

  const events: any[] = [];

  // Set up event monitoring
  monitoredAgent.onEvent((event) => {
    events.push(event);
    switch (event.type) {
      case 'start':
        console.log(`🚀 Started with model: ${event.data.model.model}`);
        break;
      case 'tool_call':
        console.log(`🔧 Calling tool: ${event.data.toolName} with args:`, JSON.stringify(event.data.arguments));
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
    const result = await monitoredAgent.execute('Calculate 25 * 16 and tell me the current timestamp');
    console.log('✅ Final result:', result.result);
    console.log('📊 Total events captured:', events.length);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 5: Tool Management
  // =============================================================================
  console.log('🛠️ Example 5: Tool Management');
  
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

  console.log('\n🎉 Demo completed successfully!');
}

if (require.main === module) {
  main().catch(console.error);
}