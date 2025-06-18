import 'dotenv/config';

import { createStreamingAgent, timestampTool } from '../../src';

async function streamingAgentExample() {
  console.log('📡 OpenAgentic - Streaming Agent Example\n');

  // =============================================================================
  // EXAMPLE 1: Basic Streaming Response
  // =============================================================================
  console.log('📝 Example 1: Basic Streaming Response');
  
  const storyAgent = createStreamingAgent({
    model: 'claude-sonnet-4-20250514', // Auto-detects Anthropic provider
    systemPrompt: 'You are a creative writing assistant. Be engaging and descriptive.',
  });

  try {
    console.log('🔄 Streaming story response...\n');
    
    const stream = await storyAgent.stream('Write a very short story (3-4 sentences) about a robot discovering art');
    
    let content = '';
    for await (const chunk of stream.textStream) {
      content += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Streaming completed');
    console.log('📝 Total content length:', content.length);
  } catch (error) {
    console.error('❌ Streaming error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 2: Streaming with Tools
  // =============================================================================
  console.log('📝 Example 2: Streaming with Tools');
  
  const toolStreamingAgent = createStreamingAgent({
    model: 'gpt-4o-mini', // Auto-detects OpenAI provider
    tools: [timestampTool],
    systemPrompt: 'You are a helpful assistant that can use tools while streaming responses.',
  });

  try {
    console.log('🔄 Streaming response with tool usage...\n');
    
    const stream = await toolStreamingAgent.stream(
      'Write a brief explanation of time and tell me what time it is right now. Also explain what timestamps are used for.'
    );
    
    let content = '';
    for await (const chunk of stream.textStream) {
      content += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Streaming with tools completed');
    console.log('📝 Total content length:', content.length);
  } catch (error) {
    console.error('❌ Streaming error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Real-time Code Generation
  // =============================================================================
  console.log('📝 Example 3: Real-time Code Generation');
  
  const codeAgent = createStreamingAgent({
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a programming assistant. Provide clear, working code examples.',
  });

  try {
    console.log('🔄 Streaming code generation...\n');
    
    const stream = await codeAgent.stream(
      'Write a simple JavaScript function to get the current timestamp. Keep it short and add comments.'
    );
    
    let codeContent = '';
    for await (const chunk of stream.textStream) {
      codeContent += chunk;
      process.stdout.write(chunk);
    }
    
    console.log('\n\n✅ Code generation completed');
    console.log('📝 Generated code length:', codeContent.length);
  } catch (error) {
    console.error('❌ Code generation error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 4: Different Provider Streaming
  // =============================================================================
  console.log('📝 Example 4: Different Provider Streaming');
  
  const providers = [
    { name: 'OpenAI', model: 'gpt-4o-mini' },
    { name: 'Anthropic', model: 'claude-sonnet-4-20250514' },
    { name: 'Google', model: 'gemini-1.5-pro' },
  ];

  for (const provider of providers) {
    try {
      console.log(`🔄 Streaming with ${provider.name} (${provider.model})...`);
      
      const agent = createStreamingAgent({
        model: provider.model,
        systemPrompt: `You are a helpful assistant powered by ${provider.name}.`,
      });

      const stream = await agent.stream('Say hello and introduce yourself in one sentence.');
      
      let response = '';
      for await (const chunk of stream.textStream) {
        response += chunk;
      }
      
      console.log(`✅ ${provider.name}:`, response.trim());
      console.log('');
    } catch (error) {
      console.log(`❌ ${provider.name} error:`, error instanceof Error ? error.message : String(error));
      console.log('');
    }
  }

  console.log('='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 5: Advanced Streaming Features
  // =============================================================================
  console.log('📝 Example 5: Advanced Streaming Features');
  
  const advancedAgent = createStreamingAgent({
    model: 'claude-sonnet-4-20250514',
    tools: [timestampTool],
    systemPrompt: 'You are an advanced assistant with real-time capabilities.',
    maxIterations: 5,
  });

  try {
    console.log('🔄 Advanced streaming with features...\n');
    
    const stream = await advancedAgent.stream(
      'Explain time concepts while getting the current timestamp. Stream your explanation as you think through it.'
    );
    
    let finalContent = '';
    let chunkCount = 0;
    
    for await (const chunk of stream.textStream) {
      finalContent += chunk;
      chunkCount++;
      process.stdout.write(chunk);
      
      // Add a small delay to demonstrate real-time streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log('\n\n✅ Advanced streaming completed');
    console.log('📊 Statistics:');
    console.log(`  - Total chunks: ${chunkCount}`);
    console.log(`  - Content length: ${finalContent.length}`);
    console.log(`  - Average chunk size: ${Math.round(finalContent.length / chunkCount)}`);
  } catch (error) {
    console.error('❌ Advanced streaming error:', error);
  }

  console.log('\n🎉 Streaming agent examples completed successfully!');
}

if (require.main === module) {
  streamingAgentExample().catch(console.error);
}