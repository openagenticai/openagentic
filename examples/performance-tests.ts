import { createAgent, createStreamingAgent, calculatorTool, timestampTool } from '../src';

async function performanceTests() {
  console.log('⚡ Performance Tests\n');

  // =============================================================================
  // TEST 1: Agent Creation Performance
  // =============================================================================
  console.log('📝 Test 1: Agent Creation Performance');
  
  const startTime = Date.now();
  const agents = [];
  
  for (let i = 0; i < 10; i++) {
    const agent = createAgent({
      model: 'gpt-4o-mini',
      tools: [calculatorTool, timestampTool],
      systemPrompt: `Agent ${i}`,
    });
    agents.push(agent);
  }
  
  const creationTime = Date.now() - startTime;
  console.log(`✅ Created 10 agents in ${creationTime}ms (${creationTime/10}ms per agent)`);

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // TEST 2: Tool Execution Performance
  // =============================================================================
  console.log('📝 Test 2: Tool Execution Performance');
  
  const testAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool, timestampTool],
  });

  // Test direct tool execution
  const toolStartTime = Date.now();
  
  for (let i = 0; i < 100; i++) {
    await calculatorTool.execute({ expression: `${i} + ${i}` });
  }
  
  const toolTime = Date.now() - toolStartTime;
  console.log(`✅ Executed calculator tool 100 times in ${toolTime}ms (${toolTime/100}ms per execution)`);

  // Test timestamp tool
  const timestampStartTime = Date.now();
  
  for (let i = 0; i < 100; i++) {
    await timestampTool.execute({ format: 'unix' });
  }
  
  const timestampTime = Date.now() - timestampStartTime;
  console.log(`✅ Executed timestamp tool 100 times in ${timestampTime}ms (${timestampTime/100}ms per execution)`);

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // TEST 3: Memory Usage Monitoring
  // =============================================================================
  console.log('📝 Test 3: Memory Usage Monitoring');
  
  const getMemoryUsage = () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
      };
    }
    return { rss: 0, heapUsed: 0, heapTotal: 0 };
  };

  const initialMemory = getMemoryUsage();
  console.log('📊 Initial Memory:', initialMemory);

  // Create many agents and tools
  const manyAgents = [];
  for (let i = 0; i < 50; i++) {
    const agent = createAgent({
      model: 'gpt-4o-mini',
      tools: [calculatorTool, timestampTool],
      systemPrompt: `Performance test agent ${i}`,
    });
    manyAgents.push(agent);
  }

  const afterCreationMemory = getMemoryUsage();
  console.log('📊 After creating 50 agents:', afterCreationMemory);
  console.log(`📈 Memory increase: ${afterCreationMemory.heapUsed - initialMemory.heapUsed}MB`);

  // Clear references
  manyAgents.length = 0;
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const afterCleanupMemory = getMemoryUsage();
  console.log('📊 After cleanup:', afterCleanupMemory);

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // TEST 4: Concurrent Agent Execution
  // =============================================================================
  console.log('📝 Test 4: Concurrent Agent Execution');
  
  const concurrentAgents = [
    createAgent({ model: 'gpt-4o-mini', tools: [calculatorTool] }),
    createAgent({ model: 'gpt-4o-mini', tools: [timestampTool] }),
    createAgent({ model: 'gpt-4o-mini', tools: [calculatorTool, timestampTool] }),
  ];

  // Note: For actual performance testing, you would need valid API keys
  // This test simulates the setup and measures creation time
  const concurrentStartTime = Date.now();
  
  try {
    const promises = concurrentAgents.map((agent, index) => {
      // Simulate concurrent execution with timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(`Agent ${index} would execute here`);
        }, Math.random() * 100);
      });
    });
    
    await Promise.all(promises);
    const concurrentTime = Date.now() - concurrentStartTime;
    console.log(`✅ Simulated concurrent execution completed in ${concurrentTime}ms`);
  } catch (error) {
    console.log('ℹ️ Concurrent execution test (simulated):', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // TEST 5: Event System Performance
  // =============================================================================
  console.log('📝 Test 5: Event System Performance');
  
  const eventAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool],
  });

  let eventCount = 0;
  const eventStartTime = Date.now();

  // Add multiple event handlers
  for (let i = 0; i < 10; i++) {
    eventAgent.onEvent((event) => {
      eventCount++;
    });
  }

  // Simulate events
  for (let i = 0; i < 1000; i++) {
    eventAgent.onEvent(() => {}); // Add handler
  }

  const eventTime = Date.now() - eventStartTime;
  console.log(`✅ Added 1000 event handlers in ${eventTime}ms`);
  console.log(`📊 Average handler addition time: ${eventTime/1000}ms`);

  console.log('\n🎯 Performance tests completed!');
  
  // Summary
  console.log('\n📋 Performance Summary:');
  console.log(`• Agent creation: ~${creationTime/10}ms per agent`);
  console.log(`• Calculator tool: ~${toolTime/100}ms per execution`);
  console.log(`• Timestamp tool: ~${timestampTime/100}ms per execution`);
  console.log(`• Memory usage: ${afterCreationMemory.heapUsed - initialMemory.heapUsed}MB for 50 agents`);
  console.log(`• Event system: ~${eventTime/1000}ms per handler addition`);
}

if (require.main === module) {
  performanceTests().catch(console.error);
}