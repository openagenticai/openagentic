import { 
  createAgent, 
  createStreamingAgent, 
  httpTool, 
  calculatorTool, 
  timestampTool,
  ToolRegistry,
  validateTool,
  ProviderManager
} from '../src';

async function runValidationTests() {
  console.log('🧪 OpenAgentic Validation Tests\n');

  let passed = 0;
  let failed = 0;

  const test = (name: string, fn: () => Promise<boolean> | boolean) => {
    return async () => {
      try {
        const result = await fn();
        if (result) {
          console.log(`✅ ${name}`);
          passed++;
        } else {
          console.log(`❌ ${name} - Test returned false`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${name} - ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    };
  };

  // =============================================================================
  // CORE API TESTS
  // =============================================================================
  console.log('📋 Core API Tests');

  await test('createAgent factory function exists', () => {
    return typeof createAgent === 'function';
  })();

  await test('createStreamingAgent factory function exists', () => {
    return typeof createStreamingAgent === 'function';
  })();

  await test('createAgent creates valid orchestrator', () => {
    const agent = createAgent({
      model: 'gpt-4o-mini',
      tools: [calculatorTool],
    });
    return agent && typeof agent.execute === 'function';
  })();

  await test('createStreamingAgent creates valid streaming orchestrator', () => {
    const agent = createStreamingAgent({
      model: 'gpt-4o-mini',
      tools: [timestampTool],
    });
    return agent && typeof agent.stream === 'function';
  })();

  // =============================================================================
  // TOOL VALIDATION TESTS
  // =============================================================================
  console.log('\n🔧 Tool Validation Tests');

  await test('httpTool has required properties', () => {
    return httpTool.name === 'http_request' && 
           httpTool.description && 
           httpTool.parameters &&
           typeof httpTool.execute === 'function';
  })();

  await test('calculatorTool has required properties', () => {
    return calculatorTool.name === 'calculator' && 
           calculatorTool.description && 
           calculatorTool.parameters &&
           typeof calculatorTool.execute === 'function';
  })();

  await test('timestampTool has required properties', () => {
    return timestampTool.name === 'timestamp' && 
           timestampTool.description && 
           timestampTool.parameters &&
           typeof timestampTool.execute === 'function';
  })();

  await test('validateTool function works correctly', () => {
    return validateTool(calculatorTool) === true &&
           validateTool({ name: 'invalid' } as any) === false;
  })();

  // =============================================================================
  // TOOL EXECUTION TESTS
  // =============================================================================
  console.log('\n⚡ Tool Execution Tests');

  await test('calculatorTool executes correctly', async () => {
    const result = await calculatorTool.execute({ expression: '2 + 2' });
    return result.result === 4;
  })();

  await test('timestampTool executes correctly', async () => {
    const result = await timestampTool.execute({ format: 'unix' });
    return typeof result.timestamp === 'number' && result.format === 'unix';
  })();

  await test('calculatorTool handles errors', async () => {
    try {
      await calculatorTool.execute({ expression: 'invalid_expression' });
      return false; // Should have thrown
    } catch (error) {
      return true; // Expected error
    }
  })();

  // =============================================================================
  // TOOL REGISTRY TESTS
  // =============================================================================
  console.log('\n📚 Tool Registry Tests');

  await test('ToolRegistry can register tools', () => {
    const registry = new ToolRegistry();
    registry.register(calculatorTool);
    return registry.has('calculator') && registry.get('calculator') === calculatorTool;
  })();

  await test('ToolRegistry prevents duplicate registration', () => {
    const registry = new ToolRegistry();
    registry.register(calculatorTool);
    try {
      registry.register(calculatorTool);
      return false; // Should have thrown
    } catch (error) {
      return true; // Expected error
    }
  })();

  await test('ToolRegistry can unregister tools', () => {
    const registry = new ToolRegistry();
    registry.register(calculatorTool);
    const removed = registry.unregister('calculator');
    return removed === true && !registry.has('calculator');
  })();

  await test('ToolRegistry getByCategory works', () => {
    const registry = new ToolRegistry();
    registry.register(calculatorTool);
    registry.register(timestampTool);
    const utilityTools = registry.getByCategory('utility');
    return utilityTools.length === 2;
  })();

  // =============================================================================
  // PROVIDER MANAGER TESTS
  // =============================================================================
  console.log('\n🔌 Provider Manager Tests');

  await test('ProviderManager auto-detects OpenAI', () => {
    const model = ProviderManager.createModel('gpt-4o');
    return model.provider === 'openai' && model.model === 'gpt-4o';
  })();

  await test('ProviderManager auto-detects Anthropic', () => {
    const model = ProviderManager.createModel('claude-4-sonnet-20250514');
    return model.provider === 'anthropic' && model.model === 'claude-4-sonnet-20250514';
  })();

  await test('ProviderManager auto-detects Google', () => {
    const model = ProviderManager.createModel('gemini-1.5-pro');
    return model.provider === 'google' && model.model === 'gemini-1.5-pro';
  })();

  await test('ProviderManager lists all providers', () => {
    const providers = ProviderManager.getAllProviders();
    return providers.length > 0 && providers.some(p => p.provider === 'openai');
  })();

  await test('ProviderManager gets model info', () => {
    const info = ProviderManager.getModelInfo('openai', 'gpt-4o');
    return info.contextWindow > 0 && info.description;
  })();

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================
  console.log('\n🔗 Integration Tests');

  await test('Agent can execute simple calculation', async () => {
    const agent = createAgent({
      model: 'gpt-4o-mini',
      tools: [calculatorTool],
      systemPrompt: 'You are a calculator. Just do the math and respond with the result.',
    });

    // Set timeout for this test
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Test timeout')), 15000)
    );

    const testPromise = agent.execute('Calculate 5 * 7').then(result => {
      return result.success && result.result && result.result.includes('35');
    });

    return Promise.race([testPromise, timeoutPromise]);
  })();

  await test('Agent emits events correctly', async () => {
    const agent = createAgent({
      model: 'gpt-4o-mini',
      tools: [timestampTool],
      systemPrompt: 'You are helpful.',
    });

    let eventCount = 0;
    agent.onEvent(() => eventCount++);

    // Set timeout
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Test timeout')), 15000)
    );

    const testPromise = agent.execute('Get current timestamp').then(() => {
      return eventCount > 0;
    });

    return Promise.race([testPromise, timeoutPromise]);
  })();

  await test('Tool management works during execution', () => {
    const agent = createAgent({
      model: 'gpt-4o-mini',
      tools: [calculatorTool],
    });

    agent.addTool(timestampTool);
    const toolCount = agent.getAllTools().length;
    
    agent.removeTool('timestamp');
    const newToolCount = agent.getAllTools().length;
    
    return toolCount === 2 && newToolCount === 1;
  })();

  // =============================================================================
  // RESULTS
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Results');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The new API is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the implementation.');
  }

  return failed === 0;
}

if (require.main === module) {
  runValidationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}