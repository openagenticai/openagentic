import { createSimpleAgent, httpRequestTool, calculatorTool } from '../src';

async function main() {
  // Create a simple agent with basic tools
  const agent = createSimpleAgent({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY,
    tools: [httpRequestTool, calculatorTool],
    systemPrompt: 'You are a helpful assistant that can fetch data and perform calculations.'
  });

  try {
    // Execute a simple task
    const result = await agent.execute(
      'Calculate the square root of 144 and then tell me what 12 multiplied by 8 equals.'
    );

    console.log('Result:', result.result);
    console.log('Cost:', `$${result.costTracking.estimatedCost.toFixed(4)}`);
    console.log('Tokens used:', result.costTracking.inputTokens + result.costTracking.outputTokens);
    console.log('Tools used:', result.toolCallsUsed);

  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}