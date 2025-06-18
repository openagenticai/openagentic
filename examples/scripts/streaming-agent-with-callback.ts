import 'dotenv/config';

import { createStreamingAgent, qrcodeTool } from '../../src';

async function streamingAgentWithCallbackExample() {
  console.log('📡 OpenAgentic - Streaming Agent with onFinish Callback Example\n');

  // =============================================================================
  // EXAMPLE 1: Basic Streaming with onFinish Callback
  // =============================================================================
  console.log('📝 Example 1: Basic Streaming with onFinish Callback');
  
  const basicAgent = createStreamingAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful QR code assistant.',
    enableDebugLogging: true,
    logLevel: 'basic',
    onFinish: (result) => {
      console.log('🎯 User onFinish callback triggered!');
      console.log('📊 Final result summary:', {
        finishReason: result.finishReason,
        tokensUsed: result.usage?.totalTokens,
        hasText: !!result.text,
        textLength: result.text?.length || 0,
      });
    },
  });

  try {
    console.log('🔄 Starting basic streaming with callback...\n');
    
    const stream = await basicAgent.stream('Create a QR code for https://openagentic.org and explain what QR codes are');
    
    let content = '';
    for await (const chunk of stream.textStream) {
      content += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Basic streaming with callback completed');
    console.log('📝 Total content length:', content.length);
  } catch (error) {
    console.error('❌ Basic streaming error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 2: Async onFinish Callback
  // =============================================================================
  console.log('📝 Example 2: Async onFinish Callback');
  
  const asyncAgent = createStreamingAgent({
    model: 'claude-sonnet-4-20250514',
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful assistant.',
    enableDebugLogging: true,
    logLevel: 'detailed',
    onFinish: async (result) => {
      console.log('🎯 Async onFinish callback starting...');
      
      // Simulate async processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('📊 Async callback result analysis:', {
        finishReason: result.finishReason,
        tokensUsed: result.usage?.totalTokens,
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        hasText: !!result.text,
        textPreview: result.text?.substring(0, 50) + '...',
      });
      
      console.log('✅ Async onFinish callback completed');
    },
  });

  try {
    console.log('🔄 Starting streaming with async callback...\n');
    
    const stream = await asyncAgent.stream('Generate a QR code for https://example.com and write a short explanation');
    
    let content = '';
    for await (const chunk of stream.textStream) {
      content += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Async streaming completed');
  } catch (error) {
    console.error('❌ Async streaming error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Error Handling in onFinish Callback
  // =============================================================================
  console.log('📝 Example 3: Error Handling in onFinish Callback');
  
  const errorAgent = createStreamingAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful assistant.',
    enableDebugLogging: true,
    logLevel: 'detailed',
    onFinish: (result) => {
      console.log('🎯 Error-prone onFinish callback triggered');
      
      // Intentionally throw an error to test error handling
      if (result.finishReason === 'stop') {
        throw new Error('Simulated error in onFinish callback');
      }
      
      console.log('📊 No error occurred in callback');
    },
  });

  try {
    console.log('🔄 Starting streaming with error-prone callback...\n');
    
    const stream = await errorAgent.stream('Create a QR code for https://github.com');
    
    let content = '';
    for await (const chunk of stream.textStream) {
      content += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Streaming with error-prone callback completed');
    console.log('💡 Notice how the internal logging still worked despite the callback error');
  } catch (error) {
    console.error('❌ Streaming error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 4: Data Collection with onFinish Callback
  // =============================================================================
  console.log('📝 Example 4: Data Collection with onFinish Callback');
  
  const collectionResults: any[] = [];
  
  const dataAgent = createStreamingAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful assistant that can create QR codes.',
    enableDebugLogging: true,
    logLevel: 'basic',
    onFinish: (result) => {
      // Collect completion data for analysis
      const completionData = {
        timestamp: new Date().toISOString(),
        finishReason: result.finishReason,
        tokensUsed: result.usage?.totalTokens || 0,
        textLength: result.text?.length || 0,
        successful: result.finishReason === 'stop',
      };
      
      collectionResults.push(completionData);
      console.log('📈 Collected completion data:', completionData);
    },
  });

  try {
    console.log('🔄 Running multiple streams for data collection...\n');
    
    const queries = [
      'Create a QR code for https://openagentic.org',
      'Generate a QR code for a business card',
      'Make a QR code for WiFi sharing',
    ];

    for (let i = 0; i < queries.length; i++) {
      console.log(`\n--- Query ${i + 1}: ${queries[i]} ---`);
      
      const stream = await dataAgent.stream(queries[i]);
      
      let content = '';
      for await (const chunk of stream.textStream) {
        content += chunk;
        process.stdout.write(chunk);
      }
      
      console.log(`\n--- End Query ${i + 1} ---`);
    }
    
    console.log('\n\n📊 Data Collection Summary:');
    console.log(`Total streams: ${collectionResults.length}`);
    console.log(`Average tokens per stream: ${Math.round(collectionResults.reduce((sum, r) => sum + r.tokensUsed, 0) / collectionResults.length)}`);
    console.log(`Average text length: ${Math.round(collectionResults.reduce((sum, r) => sum + r.textLength, 0) / collectionResults.length)}`);
    console.log(`Successful completions: ${collectionResults.filter(r => r.successful).length}/${collectionResults.length}`);
    
  } catch (error) {
    console.error('❌ Data collection error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 5: Integration with External Systems
  // =============================================================================
  console.log('📝 Example 5: Integration with External Systems');
  
  const integrationAgent = createStreamingAgent({
    model: 'claude-sonnet-4-20250514',
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful QR code assistant.',
    enableDebugLogging: true,
    logLevel: 'basic',
    onFinish: async (result) => {
      console.log('🎯 Integration callback: Sending data to external system...');
      
      // Simulate sending completion data to an external API
      const payload = {
        sessionId: 'demo-session-123',
        completion: {
          timestamp: new Date().toISOString(),
          model: 'claude-sonnet-4-20250514',
          finishReason: result.finishReason,
          usage: result.usage,
          success: result.finishReason === 'stop',
        }
      };
      
      // Simulate HTTP request delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('📤 Simulated API payload sent:', payload);
      console.log('✅ External system integration completed');
    },
  });

  try {
    console.log('🔄 Starting streaming with external integration...\n');
    
    const stream = await integrationAgent.stream('Create a QR code for a social media profile and explain the process');
    
    let content = '';
    for await (const chunk of stream.textStream) {
      content += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Integration streaming completed');
  } catch (error) {
    console.error('❌ Integration streaming error:', error);
  }

  console.log('\n🎉 Streaming agent with onFinish callback examples completed successfully!');
  console.log('\n💡 Key Features Demonstrated:');
  console.log('- ✅ Synchronous onFinish callbacks');
  console.log('- ✅ Asynchronous onFinish callbacks with proper awaiting');
  console.log('- ✅ Error handling that preserves internal functionality');
  console.log('- ✅ Data collection and analytics integration');
  console.log('- ✅ External system integration patterns');
  console.log('- ✅ Comprehensive result metadata access');
  console.log('- ✅ Non-breaking integration with existing logging');
}

if (require.main === module) {
  streamingAgentWithCallbackExample().catch(console.error);
}