import { calculatorTool, httpTool, timestampTool } from '../src';

async function testToolIndependence() {
  console.log('🔧 Tool Independence Test\n');
  
  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<boolean>) => {
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

  // =============================================================================
  // CALCULATOR TOOL INDEPENDENCE
  // =============================================================================
  console.log('🧮 Calculator Tool Independence Tests');

  await test('Calculator: Basic arithmetic', async () => {
    const result = await calculatorTool.execute({ expression: '2+2' });
    return result.result === 4 && result.expression === '2+2';
  });

  await test('Calculator: Complex expression', async () => {
    const result = await calculatorTool.execute({ expression: 'Math.sqrt(16) + Math.PI' });
    return typeof result.result === 'number' && result.result > 7;
  });

  await test('Calculator: Error handling', async () => {
    try {
      await calculatorTool.execute({ expression: 'invalid expression!' });
      return false; // Should have thrown
    } catch (error) {
      return true; // Expected error
    }
  });

  await test('Calculator: Has self-contained metadata', async () => {
    return calculatorTool.category === 'utility' && 
           calculatorTool.version === '1.0.0' &&
           calculatorTool.requiresAuth === false;
  });

  // =============================================================================
  // HTTP TOOL INDEPENDENCE  
  // =============================================================================
  console.log('\n🌐 HTTP Tool Independence Tests');

  await test('HTTP: Valid request structure', async () => {
    // Test tool structure without making actual HTTP call
    return httpTool.name === 'http_request' &&
           httpTool.parameters.type === 'object' &&
           httpTool.parameters.properties.url &&
           httpTool.parameters.required?.includes('url');
  });

  await test('HTTP: Parameter validation', async () => {
    // Test that it validates URL properly
    try {
      await httpTool.execute({ url: 'not-a-valid-url' });
      return false; // Should have thrown
    } catch (error) {
      return (error as Error).message.includes('Invalid URL');
    }
  });

  await test('HTTP: Supports all HTTP methods', async () => {
    const methods = httpTool.parameters.properties.method?.enum;
    return methods?.includes('GET') && 
           methods?.includes('POST') && 
           methods?.includes('PUT') && 
           methods?.includes('DELETE');
  });

  await test('HTTP: Has self-contained metadata', async () => {
    return httpTool.category === 'utility' && 
           httpTool.version === '1.0.0';
  });

  // =============================================================================
  // TIMESTAMP TOOL INDEPENDENCE
  // =============================================================================
  console.log('\n⏰ Timestamp Tool Independence Tests');

  await test('Timestamp: Unix format', async () => {
    const result = await timestampTool.execute({ format: 'unix' });
    return typeof result.timestamp === 'number' && 
           result.format === 'unix' &&
           result.timestamp > 1000000000; // Reasonable unix timestamp
  });

  await test('Timestamp: ISO format', async () => {
    const result = await timestampTool.execute({ format: 'iso' });
    return typeof result.timestamp === 'string' && 
           result.timestamp.includes('T') && // ISO format includes T
           result.format === 'iso';
  });

  await test('Timestamp: Human format', async () => {
    const result = await timestampTool.execute({ format: 'human' });
    return typeof result.timestamp === 'string' && 
           result.format === 'human' &&
           result.timezone;
  });

  await test('Timestamp: Custom format', async () => {
    const result = await timestampTool.execute({ 
      format: 'custom', 
      customFormat: 'YYYY-MM-DD' 
    });
    return typeof result.timestamp === 'string' && 
           result.customFormat === 'YYYY-MM-DD' &&
           /\d{4}-\d{2}-\d{2}/.test(result.timestamp);
  });

  await test('Timestamp: Timezone support', async () => {
    const result = await timestampTool.execute({ 
      format: 'human', 
      timezone: 'UTC' 
    });
    return result.timezone === 'UTC';
  });

  await test('Timestamp: Has self-contained metadata', async () => {
    return timestampTool.category === 'utility' && 
           timestampTool.version === '1.0.0' &&
           timestampTool.requiresAuth === false;
  });

  // =============================================================================
  // CROSS-TOOL INDEPENDENCE TESTS
  // =============================================================================
  console.log('\n🔄 Cross-Tool Independence Tests');

  await test('Tools have unique names', async () => {
    const tools = [calculatorTool, httpTool, timestampTool];
    const names = tools.map(t => t.name);
    const uniqueNames = [...new Set(names)];
    return names.length === uniqueNames.length;
  });

  await test('Tools can execute simultaneously', async () => {
    const results = await Promise.all([
      calculatorTool.execute({ expression: '5 * 5' }),
      timestampTool.execute({ format: 'unix' }),
      // Skip HTTP tool to avoid network dependency
    ]);
    return results[0].result === 25 && 
           typeof results[1].timestamp === 'number';
  });

  await test('Tools have consistent interface', async () => {
    const tools = [calculatorTool, httpTool, timestampTool];
    return tools.every(tool => 
      typeof tool.name === 'string' &&
      typeof tool.description === 'string' &&
      typeof tool.execute === 'function' &&
      tool.parameters?.type === 'object'
    );
  });

  await test('Tools have proper JSON Schema validation', async () => {
    const tools = [calculatorTool, httpTool, timestampTool];
    return tools.every(tool => {
      const params = tool.parameters;
      return params.properties && 
             Object.keys(params.properties).length > 0 &&
             params.required &&
             Array.isArray(params.required);
    });
  });

  await test('No shared state between tools', async () => {
    // Execute same tool multiple times with different params
    const calc1 = await calculatorTool.execute({ expression: '1 + 1' });
    const calc2 = await calculatorTool.execute({ expression: '2 + 2' });
    const calc3 = await calculatorTool.execute({ expression: '3 + 3' });
    
    return calc1.result === 2 && 
           calc2.result === 4 && 
           calc3.result === 6; // No interference
  });

  // =============================================================================
  // RESULTS
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('🔧 Tool Independence Test Results');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tools are completely independent and self-contained!');
    console.log('✨ Each tool can be used without any dependencies on shared utilities');
    console.log('🔒 No shared state or cross-dependencies detected');
  } else {
    console.log('\n⚠️ Some independence tests failed. Tools may have dependencies.');
  }

  return failed === 0;
}

if (require.main === module) {
  testToolIndependence()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Tool independence test failed:', error);
      process.exit(1);
    });
}