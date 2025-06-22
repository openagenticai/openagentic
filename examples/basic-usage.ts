import { createAgent, createStreamingAgent, qrcodeTool } from '../src';
import type { CoreMessage } from '../src/types';

async function basicUsageExample() {
  console.log('🚀 OpenAgentic Basic Usage Examples\n');

  // Example 1: Basic agent usage
  const agent = createAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful assistant that can create QR codes.',
  });

  try {
    console.log('📝 Example 1: String input');
    const result1 = await agent.execute('Create a QR code for https://example.com');
    console.log('✅ Result:', result1.result);
    console.log('🔧 Tools used:', result1.toolCallsUsed);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Example 2: Agent with initial messages
  const conversationMessages: CoreMessage[] = [
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there! How can I help you today?' },
    { role: 'user', content: 'I need to create a QR code for my website.' }
  ];

  const agentWithHistory = createAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful assistant that can create QR codes.',
    messages: conversationMessages,
  });

  try {
    console.log('\n📝 Example 2: Agent with conversation history');
    const result2 = await agentWithHistory.execute('The website URL is https://mywebsite.com');
    console.log('✅ Result:', result2.result);
    console.log('🔧 Tools used:', result2.toolCallsUsed);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Example 3: Streaming agent with messages
  const streamingAgent = createStreamingAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool],
    systemPrompt: 'You are a helpful assistant that can create QR codes.',
    messages: conversationMessages,
  });

  try {
    console.log('\n📝 Example 3: Streaming agent with conversation history');
    const stream = await streamingAgent.stream('Please create a QR code for https://streaming-example.com');
    
    // Process the stream
    for await (const chunk of stream.textStream) {
      process.stdout.write(chunk);
    }
    console.log('\n✅ Streaming completed');
    
    // Get final result
    const finalText = await stream.text;
    console.log('📊 Final result length:', finalText.length);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n🎉 All examples completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  basicUsageExample().catch(console.error);
}

export { basicUsageExample }; 