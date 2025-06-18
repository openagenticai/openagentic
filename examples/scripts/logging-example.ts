import 'dotenv/config';

import { createAgent, createStreamingAgent, qrcodeTool, githubTool } from '../../src';
import type { CoreMessage } from '../../src/types';

async function loggingExample() {
  console.log('📊 OpenAgentic - Enhanced Logging and Debugging Example\n');

  // =============================================================================
  // EXAMPLE 1: Standard Agent with Basic Logging
  // =============================================================================
  console.log('📝 Example 1: Standard Agent with Basic Logging');
  
  const basicAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful assistant with access to tools.',
    enableDebugLogging: true,
    logLevel: 'basic',
  });

  try {
    console.log('\n🔄 Executing with basic logging...\n');
    
    const result = await basicAgent.execute('Create a QR code for the website https://example.com with size 256x256');
    
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
    tools: [qrcodeTool, githubTool],
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
      { role: 'user', content: 'I need to create some QR codes and check a GitHub repository' },
      { role: 'assistant', content: 'I can help you generate QR codes and access GitHub repositories!' },
      { role: 'user', content: 'Create a QR code for https://github.com and fetch the README from openai/openai-node repository' }
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
    model: 'claude-sonnet-4-20250514',
    tools: [qrcodeTool],
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
      { role: 'user', content: 'Write a brief explanation of QR codes while creating one for me' },
      { role: 'assistant', content: 'I\'ll explain QR codes and create one for you.' },
      { role: 'user', content: 'Create a QR code for https://openagentic.org with high error correction' }
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
        tools: [qrcodeTool],
        enableDebugLogging: false,
        logLevel: 'none' as const,
      })
    },
    {
      name: 'Basic Logging',
      agent: createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
        enableDebugLogging: true,
        logLevel: 'basic' as const,
      })
    },
    {
      name: 'Detailed Logging',
      agent: createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
        enableDebugLogging: true,
        logLevel: 'detailed' as const,
      })
    }
  ];

  for (const { name, agent } of agents) {
    try {
      console.log(`\n⏱️ Testing ${name}...`);
      const startTime = Date.now();
      
      const result = await agent.execute('Create a QR code for https://example.com');
      
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
    tools: [qrcodeTool, githubTool],
    systemPrompt: 'You are an assistant that will demonstrate error handling.',
    enableDebugLogging: true,
    logLevel: 'detailed',
  });

  try {
    console.log('\n🔄 Testing error scenarios with enhanced logging...\n');
    
    // This should succeed
    const goodResult = await errorAgent.execute('Create a QR code for https://example.com');
    console.log('✅ Good QR generation result:', goodResult.success);
    
    // Reset for next test
    errorAgent.reset();
    
    // This might cause an error or be handled gracefully
    const edgeCaseResult = await errorAgent.execute('Fetch content from a non-existent GitHub repository: invalid/repo-does-not-exist');
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
    toolAgent.addTool(qrcodeTool);
    toolAgent.addTool(githubTool);
    
    console.log('🔧 Available tools:', toolAgent.getAllTools().map(t => t.toolId));
    
    const result = await toolAgent.execute('Create a QR code for https://github.com and fetch a README file');
    
    console.log('✅ Tool management result:', {
      success: result.success,
      toolsUsed: result.toolCallsUsed,
      executionStats: result.executionStats,
    });
    
    // Remove a tool
    toolAgent.removeTool('qr_code_generator');
    console.log('🗑️ Removed QR code tool');
    
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