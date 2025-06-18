import 'dotenv/config';

import { createAgent, openaiTool, qrcodeTool } from '../../src';

async function openaiToolExample() {
  console.log('🤖 OpenAI Tool Example\n');

  // =============================================================================
  // EXAMPLE 1: Basic Text Generation
  // =============================================================================
  console.log('📝 Example 1: Basic Text Generation');
  
  try {
    const result = await openaiTool.execute({
      prompt: 'Write a short story about a robot learning to paint. Keep it under 200 words.',
      model: 'gpt-4o-mini',
      temperature: 0.8,
      maxTokens: 300,
    });

    console.log('✅ Generated Text:');
    console.log(result.text);
    console.log('\n📊 Generation Stats:');
    console.log(`- Model: ${result.model}`);
    console.log(`- Tokens Used: ${result.usage.totalTokens}`);
    console.log(`- Finish Reason: ${result.finishReason}`);
    console.log(`- Response Length: ${result.metadata.responseLength} characters`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 2: Technical Explanation
  // =============================================================================
  console.log('📝 Example 2: Technical Explanation');
  
  try {
    const result = await openaiTool.execute({
      prompt: 'Explain quantum computing in simple terms that a high school student could understand.',
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 500,
      presencePenalty: 0.1,
    });

    console.log('✅ Technical Explanation:');
    console.log(result.text);
    console.log('\n📊 Generation Stats:');
    console.log(`- Model: ${result.model}`);
    console.log(`- Temperature: ${result.parameters.temperature}`);
    console.log(`- Tokens: ${result.usage.promptTokens} prompt + ${result.usage.completionTokens} completion = ${result.usage.totalTokens} total`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Creative Writing with High Temperature
  // =============================================================================
  console.log('📝 Example 3: Creative Writing with High Temperature');
  
  try {
    const result = await openaiTool.execute({
      prompt: 'Write a haiku about technology and nature finding harmony.',
      model: 'gpt-4o-mini',
      temperature: 1.5,
      maxTokens: 100,
      frequencyPenalty: 0.2,
    });

    console.log('✅ Creative Haiku:');
    console.log(result.text);
    console.log('\n📊 Generation Stats:');
    console.log(`- High Temperature: ${result.parameters.temperature}`);
    console.log(`- Frequency Penalty: ${result.parameters.frequencyPenalty}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 4: Integration with OpenAgentic Agent
  // =============================================================================
  console.log('📝 Example 4: Integration with OpenAgentic Agent');
  
  try {
    const agent = createAgent({
      model: 'gpt-4o-mini',
      tools: [openaiTool, qrcodeTool],
      systemPrompt: 'You are a helpful assistant that can generate text using OpenAI models and create QR codes.',
    });

    const result = await agent.execute(
      'Use the OpenAI tool to generate a creative product description for a "smart garden" device, then create a QR code for the product website https://smartgarden.example.com'
    );

    console.log('✅ Agent Result:');
    console.log(result.result);
    console.log('\n📊 Agent Stats:');
    console.log(`- Tools Used: ${result.toolCallsUsed.join(', ')}`);
    console.log(`- Iterations: ${result.iterations}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 5: Different Models Comparison
  // =============================================================================
  console.log('📝 Example 5: Different Models Comparison');
  
  const models = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
  const prompt = 'Summarize the concept of artificial intelligence in exactly one sentence.';

  for (const model of models) {
    try {
      console.log(`\n🔄 Testing ${model}:`);
      
      const result = await openaiTool.execute({
        prompt,
        model,
        temperature: 0.5,
        maxTokens: 100,
      });

      console.log(`📝 Response: ${result.text}`);
      console.log(`📊 Tokens: ${result.usage.totalTokens}, Length: ${result.metadata.responseLength} chars`);
    } catch (error) {
      console.log(`❌ ${model} error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 6: Code Generation
  // =============================================================================
  console.log('📝 Example 6: Code Generation');
  
  try {
    const result = await openaiTool.execute({
      prompt: 'Write a Python function that generates QR codes using the qrcode library. Include comments and error handling.',
      model: 'gpt-4o',
      temperature: 0.2,
      maxTokens: 800,
      presencePenalty: -0.1,
    });

    console.log('✅ Generated Code:');
    console.log(result.text);
    console.log('\n📊 Code Generation Stats:');
    console.log(`- Low Temperature: ${result.parameters.temperature} (for consistency)`);
    console.log(`- Presence Penalty: ${result.parameters.presencePenalty} (encourages repetition of code patterns)`);
    console.log(`- Total Tokens: ${result.usage.totalTokens}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n🎉 OpenAI Tool examples completed successfully!');
  console.log('\n💡 Tips:');
  console.log('- Use lower temperature (0.1-0.3) for factual/technical content');
  console.log('- Use higher temperature (0.7-1.5) for creative content');
  console.log('- Use presence penalty to reduce repetition');
  console.log('- Use frequency penalty to encourage diverse vocabulary');
  console.log('- Monitor token usage to control costs');
}

if (require.main === module) {
  openaiToolExample().catch(console.error);
}