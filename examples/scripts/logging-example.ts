import 'dotenv/config';

import { createAgent, createStreamingAgent, calculatorTool, timestampTool, httpTool } from '../../src';
import type { CoreMessage } from '../../src/types';

async function loggingExample() {
  console.log('📊 OpenAgentic - Enhanced Logging and Debugging Example\n');

  // =============================================================================
  // EXAMPLE 1: Standard Agent with Basic Logging
  // =============================================================================
  console.log('📝 Example 1: Standard Agent with Basic Logging');
  
  const basicAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool, timestampTool],
    systemPrompt: 'You are a helpful assistant with access to tools.',
    enableDebugLogging: true,
    logLevel: 'basic',
  });

  try {
    console.log('\n🔄 Executing with basic logging...\n');
    
    const result = await basicAgent.execute('Calculate 15 * 8 and tell me the current time');
    
    console.log('\n✅ Basic logging result:', {
      success: result.success,
      resultLength: result.result?.length || 0,
      toolsUsed: result.toolCallsUsed,
      iterations: result.iterations,
      stats: result.executionStats,
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 2: Standard Agent with Detailed Logging
  // =============================================================================
  console.log('📝 Example 2: Standard Agent with Detailed Logging');
  
  const detailedAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool, timestampTool, httpTool],
    systemPrompt: 'You are a helpful assistant with detailed logging.',
    enableDebugLogging: true,
    logLevel: 'detailed',
    enableStepLogging: true,
    enableToolLogging: true,
    enableTimingLogging: true,
    enableStatisticsLogging: true,
  });

  try {
    console.log('\n🔄 Executing with detailed logging...\n');
    
    const conversationHistory: CoreMessage[] = [
      { role: 'user', content: 'I need to do some calculations and check something online' },
      { role: 'assistant', content: 'I can help you with calculations and web requests!' },
      { role: 'user', content: 'Calculate 25 * 16, then check if httpbin.org/status/200 is accessible' }
    ];
    
    const result = await detailedAgent.execute(conversationHistory);
    
    console.log('\n✅ Detailed logging result:', {
      success: result.success,
      resultLength: result.result?.length || 0,
      toolsUsed: result.toolCallsUsed,
      iterations: result.iterations,
      messageHistory: result.messages.length,
      executionStats: result.executionStats,
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Streaming Agent with Comprehensive Logging
  // =============================================================================
  console.log('📝 Example 3: Streaming Agent with Comprehensive Logging');
  
  const streamingAgent = createStreamingAgent({
    model: 'claude-4-sonnet-20250514',
    tools: [calculatorTool, timestampTool],
    systemPrompt: 'You are a helpful streaming assistant with comprehensive logging.',
    enableDebugLogging: true,
    logLevel: 'detailed',
    enableStepLogging: true,
    enableToolLogging: true,
    enableTimingLogging: true,
    enableStatisticsLogging: true,
    enableStreamingLogging: true,
  });

  try {
    console.log('\n🔄 Streaming with comprehensive logging...\n');
    
    const streamingMessages: CoreMessage[] = [
      { role: 'user', content: 'Write a brief explanation of mathematics while calculating 7 * 9' },
      { role: 'assistant', content: 'I\'ll explain mathematics and do that calculation for you.' },
      { role: 'user', content: 'Also tell me what time it is now' }
    ];
    
    const stream = await streamingAgent.stream(streamingMessages);
    
    let content = '';
    let chunkCount = 0;
    
    for await (const chunk of stream.textStream) {
      content += chunk;
      chunkCount++;
      
      // Show streaming progress every 5 chunks
      if (chunkCount % 5 === 0) {
        process.stdout.write(`📡 [Chunk ${chunkCount}] `);
      }
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Streaming with logging completed', {
      totalChunks: chunkCount,
      contentLength: content.length,
      averageChunkSize: Math.round(content.length / chunkCount),
    });
  } catch (error) {
    console.error('❌ Streaming error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 4: Performance Comparison - Different Log Levels
  // =============================================================================
  console.log('📝 Example 4: Performance Comparison - Different Log Levels');
  
  const agents = [
    {
      name: 'No Logging',
      agent: createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
        enableDebugLogging: false,
        logLevel: 'none' as const,
      })
    },
    {
      name: 'Basic Logging',
      agent: createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
        enableDebugLogging: true,
        logLevel: 'basic' as const,
      })
    },
    {
      name: 'Detailed Logging',
      agent: createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
        enableDebugLogging: true,
        logLevel: 'detailed' as const,
      })
    }
  ];

  for (const { name, agent } of agents) {
    try {
      console.log(`\n⏱️ Testing ${name}...`);
      const startTime = Date.now();
      
      const result = await agent.execute('Calculate the square root of 144');
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${name} completed in ${duration}ms`, {
        toolsUsed: result.toolCallsUsed?.length || 0,
        success: result.success,
        executionStats: result.executionStats,
      });
    } catch (error) {
      console.error(`❌ ${name} failed:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 5: Error Handling with Enhanced Logging
  // =============================================================================
  console.log('📝 Example 5: Error Handling with Enhanced Logging');
  
  const errorAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool, httpTool],
    systemPrompt: 'You are an assistant that will demonstrate error handling.',
    enableDebugLogging: true,
    logLevel: 'detailed',
  });

  try {
    console.log('\n🔄 Testing error scenarios with enhanced logging...\n');
    
    // This should succeed
    const goodResult = await errorAgent.execute('Calculate 5 + 5');
    console.log('✅ Good calculation result:', goodResult.success);
    
    // Reset for next test
    errorAgent.reset();
    
    // This might cause an error or be handled gracefully
    const edgeCaseResult = await errorAgent.execute('Calculate the square root of -1');
    console.log('⚠️ Edge case result:', {
      success: edgeCaseResult.success,
      hasError: !!edgeCaseResult.error,
      toolsUsed: edgeCaseResult.toolCallsUsed?.length || 0,
    });
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 6: Tool Management with Logging
  // =============================================================================
  console.log('📝 Example 6: Tool Management with Logging');
  
  const toolAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [], // Start with no tools
    systemPrompt: 'You are an assistant for tool management demonstrations.',
    enableDebugLogging: true,
    logLevel: 'detailed',
  });

  try {
    console.log('\n🔧 Demonstrating tool management with logging...\n');
    
    // Add tools dynamically
    toolAgent.addTool(calculatorTool);
    toolAgent.addTool(timestampTool);
    
    console.log('🔧 Available tools:', toolAgent.getAllTools().map(t => t.toolId));
    
    const result = await toolAgent.execute('Calculate 10 * 10 and tell me the current time');
    
    console.log('✅ Tool management result:', {
      success: result.success,
      toolsUsed: result.toolCallsUsed,
      executionStats: result.executionStats,
    });
    
    // Remove a tool
    toolAgent.removeTool('calculator');
    console.log('🗑️ Removed calculator tool');
    
  } catch (error) {
    console.error('❌ Tool management error:', error);
  }

  console.log('\n🎉 Enhanced logging and debugging examples completed successfully!');
  console.log('\n💡 Key Features Demonstrated:');
  console.log('- ✅ Comprehensive execution logging with emoji indicators');
  console.log('- ✅ Step-by-step progress tracking with timing information');
  console.log('- ✅ Detailed tool execution logging with parameter sanitization');
  console.log('- ✅ Performance statistics and execution summaries');
  console.log('- ✅ Streaming-specific callbacks for real-time monitoring');
  console.log('- ✅ Error context and stack trace logging');
  console.log('- ✅ Configurable log levels (none, basic, detailed)');
  console.log('- ✅ Sensitive data sanitization in logs');
  console.log('- ✅ Tool management event logging');
  console.log('- ✅ Model switching and configuration change tracking');
}

if (require.main === module) {
  loggingExample().catch(console.error);
}