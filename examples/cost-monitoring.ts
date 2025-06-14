import { createSimpleAgent, httpRequestTool, calculatorTool } from '../src';

async function main() {
  // Create an agent with budget constraints
  const agent = createSimpleAgent({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: process.env.OPENAI_API_KEY,
    tools: [httpRequestTool, calculatorTool]
  });

  // Configure the orchestrator with budget limits
  const { Orchestrator } = await import('../src');
  const orchestrator = new Orchestrator({
    model: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      apiKey: process.env.OPENAI_API_KEY
    },
    tools: [httpRequestTool, calculatorTool],
    budget: {
      maxCost: 0.10,      // Maximum $0.10
      maxTokens: 5000,    // Maximum 5K tokens
      maxToolCalls: 10    // Maximum 10 tool calls
    },
    systemPrompt: 'You are a cost-conscious assistant.'
  });

  // Monitor costs in real-time
  orchestrator.onEvent((event) => {
    switch (event.type) {
      case 'start':
        console.log('🚀 Starting execution...');
        break;
      case 'iteration':
        console.log(`🔄 Iteration ${event.data.iteration}`);
        break;
      case 'tool_call':
        console.log(`🔧 Tool call: ${event.data.toolName}`);
        break;
      case 'cost_update':
        const cost = event.data;
        console.log(`💰 Cost update:`);
        console.log(`   Input tokens: ${cost.inputTokens}`);
        console.log(`   Output tokens: ${cost.outputTokens}`);
        console.log(`   Tool calls: ${cost.toolCalls}`);
        console.log(`   Estimated cost: $${cost.estimatedCost.toFixed(4)}`);
        break;
      case 'complete':
        console.log('✅ Execution completed');
        break;
      case 'error':
        console.log(`❌ Error: ${event.data.error}`);
        break;
    }
  });

  try {
    const result = await orchestrator.execute(
      'Calculate the factorial of 10, then make a request to httpbin.org to get my IP address.'
    );

    console.log('\n📊 Final Report:');
    console.log('Success:', result.success);
    console.log('Result:', result.result);
    console.log('Iterations:', result.iterations);
    console.log('Tools used:', result.toolCallsUsed);
    
    const finalCost = result.costTracking;
    console.log('\n💰 Cost Breakdown:');
    console.log(`Input tokens: ${finalCost.inputTokens}`);
    console.log(`Output tokens: ${finalCost.outputTokens}`);
    console.log(`Total tokens: ${finalCost.inputTokens + finalCost.outputTokens}`);
    console.log(`Tool calls: ${finalCost.toolCalls}`);
    console.log(`Estimated cost: $${finalCost.estimatedCost.toFixed(4)}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}