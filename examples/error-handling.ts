import { createAgent, calculatorTool, httpTool } from '../src';

async function testErrorHandling() {
  console.log('🛡️ Error Handling Tests\n');

  // =============================================================================
  // TEST 1: Invalid Tool Parameters
  // =============================================================================
  console.log('📝 Test 1: Invalid Tool Parameters');
  
  const agent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool],
    systemPrompt: 'You are a calculator. If the user asks for something invalid, explain the error.',
  });

  try {
    const result = await agent.execute('Calculate something that is clearly not a mathematical expression');
    console.log('✅ Handled gracefully:', result.success);
    console.log('📝 Response:', result.result?.substring(0, 100) + '...');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // TEST 2: Network Errors
  // =============================================================================
  console.log('📝 Test 2: Network Errors');
  
  const httpAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [httpTool],
    systemPrompt: 'You are a web assistant. Handle errors gracefully.',
  });

  try {
    const result = await httpAgent.execute('Make a request to an invalid URL like http://invalid-domain-12345.com');
    console.log('✅ Handled gracefully:', result.success);
    console.log('📝 Response:', result.result?.substring(0, 100) + '...');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // TEST 3: Tool Registration Errors
  // =============================================================================
  console.log('📝 Test 3: Tool Registration Errors');
  
  const toolAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [],
  });

  try {
    // Try to add an invalid tool
    toolAgent.addTool({
      name: 'invalid_tool',
      description: 'Invalid tool',
      parameters: { type: 'string' } as any, // Invalid parameters
      execute: async () => 'result',
    } as any);
    console.log('❌ Should have thrown an error');
  } catch (error) {
    console.log('✅ Correctly caught tool validation error:', (error as Error).message);
  }

  try {
    // Try to add the same tool twice
    toolAgent.addTool(calculatorTool);
    toolAgent.addTool(calculatorTool);
    console.log('❌ Should have thrown an error');
  } catch (error) {
    console.log('✅ Correctly caught duplicate tool error:', (error as Error).message);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // TEST 4: Model Provider Errors
  // =============================================================================
  console.log('📝 Test 4: Model Provider Errors');
  
  try {
    const invalidAgent = createAgent({
      model: 'totally-invalid-model-name-123',
      tools: [calculatorTool],
    });
    
    // This should work but might warn about unknown model
    console.log('✅ Created agent with unknown model (defaulted to OpenAI)');
    console.log('🔧 Model info:', invalidAgent.getModelInfo());
  } catch (error) {
    console.log('ℹ️ Expected behavior for invalid model:', (error as Error).message);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // TEST 5: Event Handler Errors
  // =============================================================================
  console.log('📝 Test 5: Event Handler Errors');
  
  const eventAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool],
  });

  // Add an event handler that throws
  eventAgent.onEvent((event) => {
    if (event.type === 'tool_call') {
      throw new Error('Event handler error');
    }
  });

  // Add a normal event handler
  eventAgent.onEvent((event) => {
    console.log(`📊 Event: ${event.type}`);
  });

  try {
    const result = await eventAgent.execute('Calculate 10 + 5');
    console.log('✅ Execution continued despite event handler error');
    console.log('📝 Result:', result.result);
  } catch (error) {
    console.error('❌ Execution failed:', error);
  }

  console.log('\n🎯 Error handling tests completed!');
}

if (require.main === module) {
  testErrorHandling().catch(console.error);
}