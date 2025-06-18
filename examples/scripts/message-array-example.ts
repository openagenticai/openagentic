import 'dotenv/config';

import { createAgent, createStreamingAgent, timestampTool } from '../../src';
import type { CoreMessage } from '../../src/types';

async function messageArrayExample() {
  console.log('🤖 OpenAgentic - Message Array Support Example\n');

  // =============================================================================
  // EXAMPLE 1: Standard Agent with Message Array
  // =============================================================================
  console.log('📝 Example 1: Standard Agent with Message Array');
  
  const agent = createAgent({
    model: 'gpt-4o-mini',
    tools: [timestampTool],
    systemPrompt: 'You are a helpful assistant with access to tools.',
  });

  try {
    // Simulate a conversation history
    const conversationHistory: CoreMessage[] = [
      { role: 'system', content: 'You are a helpful assistant with access to tools.' },
      { role: 'user', content: 'Hello! What time is it?' },
      { role: 'assistant', content: 'I can help you check the current time!' },
      { role: 'user', content: 'Now also tell me what the timestamp looks like in ISO format' }
    ];

    console.log('🔄 Executing with conversation history...');
    const result = await agent.execute(conversationHistory);
    
    console.log('✅ Result with context:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
    console.log('📊 Iterations:', result.iterations);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 2: Compare String vs Message Array Input
  // =============================================================================
  console.log('📝 Example 2: Compare String vs Message Array Input');
  
  const comparisonAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [timestampTool],
    systemPrompt: 'You are a time assistant.',
  });

  try {
    // Test with string input (original behavior)
    console.log('🔤 Testing string input:');
    const stringResult = await comparisonAgent.execute('What time is it right now?');
    console.log('Result:', stringResult.result);
    
    // Reset for fresh state
    comparisonAgent.reset();
    
    // Test with message array (new behavior)
    console.log('\n📝 Testing message array input:');
    const messageArray: CoreMessage[] = [
      { role: 'user', content: 'I need to know the current time' },
      { role: 'assistant', content: 'I\'d be happy to help you with the current time!' },
      { role: 'user', content: 'What time is it right now?' }
    ];
    
    const arrayResult = await comparisonAgent.execute(messageArray);
    console.log('Result:', arrayResult.result);
    
    console.log('\n📊 Comparison:');
    console.log('- String input provides no context');
    console.log('- Message array provides full conversation context');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Streaming Agent with Message Array
  // =============================================================================
  console.log('📝 Example 3: Streaming Agent with Message Array');
  
  const streamingAgent = createStreamingAgent({
    model: 'claude-sonnet-4-20250514',
    tools: [timestampTool],
    systemPrompt: 'You are a helpful streaming assistant.',
  });

  try {
    // Create a conversation with context
    const streamingMessages: CoreMessage[] = [
      { role: 'user', content: 'Hi, I\'m working on a project that needs timestamps' },
      { role: 'assistant', content: 'I\'d be happy to help you with timestamps for your project!' },
      { role: 'user', content: 'Get the current time and tell me about different timestamp formats' }
    ];

    console.log('🔄 Streaming response with conversation context...\n');
    
    const stream = await streamingAgent.stream(streamingMessages);
    
    let content = '';
    for await (const chunk of stream.textStream) {
      content += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Streaming with message array completed');
    console.log('📝 Total content length:', content.length);
  } catch (error) {
    console.error('❌ Streaming error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 4: Complex Multi-Turn Conversation
  // =============================================================================
  console.log('📝 Example 4: Complex Multi-Turn Conversation');
  
  const conversationAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [timestampTool],
    systemPrompt: 'You are a helpful assistant that remembers conversation context.',
  });

  try {
    // Build up a complex conversation
    const complexConversation: CoreMessage[] = [
      { role: 'user', content: 'I need to track some time information for my project' },
      { role: 'assistant', content: 'I\'d be happy to help with time tracking for your project!' },
      { role: 'user', content: 'First, what time is it right now?' },
      { role: 'assistant', content: 'Let me get the current time for you.' },
      { role: 'user', content: 'Now can you explain what that timestamp means and show it in different formats?' }
    ];

    console.log('🔄 Processing complex conversation...');
    const result = await conversationAgent.execute(complexConversation);
    
    console.log('✅ Complex conversation result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
    console.log('💬 Message history length:', result.messages.length);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 5: Message Array vs Direct API Comparison
  // =============================================================================
  console.log('📝 Example 5: Integration Pattern Example');
  
  try {
    // Simulate what would come from a chat application
    const chatMessages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there! How can I help you?' },
      { role: 'user' as const, content: 'What time is it and explain timestamp formats' }
    ];

    // Convert to CoreMessage format (this is what convertToCoreMessages would do)
    const coreMessages: CoreMessage[] = chatMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const integrationAgent = createAgent({
      model: 'gpt-4o-mini',
      tools: [timestampTool],
      systemPrompt: 'You are a helpful chat assistant.',
    });

    console.log('🔄 Processing chat messages directly...');
    const result = await integrationAgent.execute(coreMessages);
    
    console.log('✅ Integration result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
    
    console.log('\n💡 This pattern allows direct integration with AI SDK convertToCoreMessages()');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n🎉 Message array support examples completed successfully!');
  console.log('\n💡 Key Benefits:');
  console.log('- ✅ Full conversation context for better responses');
  console.log('- ✅ Backward compatibility with string inputs');
  console.log('- ✅ Direct AI SDK integration with convertToCoreMessages');
  console.log('- ✅ Better tool usage decisions based on context');
  console.log('- ✅ Support for multi-turn conversations');
}

if (require.main === module) {
  messageArrayExample().catch(console.error);
}