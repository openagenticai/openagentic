import { 
  Orchestrator, 
  ProviderManager,
  createOrchestrator,
  mathTool,
  aiTextTool
} from '../src';

async function main() {
  console.log('🔧 Provider Integration Architecture Examples\n');

  // 1. Basic auto-detection from model string
  console.log('1. Auto-Detection from Model Names:');
  
  // These models will be auto-detected
  const gptModel = ProviderManager.createModel('gpt-4o-mini'); // -> OpenAI
  const claudeModel = ProviderManager.createModel('claude-4-sonnet-20250514'); // -> Anthropic
  const geminiModel = ProviderManager.createModel('gemini-1.5-pro'); // -> Google
  const grokModel = ProviderManager.createModel('grok-beta'); // -> xAI
  const sonarModel = ProviderManager.createModel('llama-3.1-sonar-small-128k-online'); // -> Perplexity

  console.log('Auto-detected models:');
  console.log(`- ${gptModel.model} -> ${gptModel.provider}`);
  console.log(`- ${claudeModel.model} -> ${claudeModel.provider}`);
  console.log(`- ${geminiModel.model} -> ${geminiModel.provider}`);
  console.log(`- ${grokModel.model} -> ${grokModel.provider}`);
  console.log(`- ${sonarModel.model} -> ${sonarModel.provider}`);
  console.log('---\n');

  // 2. Provider Manager utilities
  console.log('2. Provider Manager Utilities:');
  
  console.log('All available providers:');
  const providers = ProviderManager.getAllProviders();
  providers.forEach(p => {
    console.log(`- ${p.provider}: ${p.models.length} models`);
  });

  console.log('\nOpenAI models:', ProviderManager.getProviderModels('openai'));
  console.log('Anthropic models:', ProviderManager.getProviderModels('anthropic'));

  // Check if models are supported
  console.log('\nModel support checks:');
  console.log(`gpt-4o supported by OpenAI: ${ProviderManager.isModelSupported('openai', 'gpt-4o')}`);
  console.log(`claude-3-opus supported by Anthropic: ${ProviderManager.isModelSupported('anthropic', 'claude-3-opus')}`);
  console.log(`fake-model supported by OpenAI: ${ProviderManager.isModelSupported('openai', 'fake-model')}`);
  console.log('---\n');

  // 3. Get model information
  console.log('3. Model Information:');
  
  try {
    const gpt4oInfo = ProviderManager.getModelInfo('openai', 'gpt-4o');
    console.log('GPT-4o info:', {
      contextWindow: gpt4oInfo.contextWindow,
      cost: gpt4oInfo.cost,
      description: gpt4oInfo.description,
    });

    const claudeInfo = ProviderManager.getModelInfo('anthropic', 'claude-4-sonnet-20250514');
    console.log('Claude 4 Sonnet info:', {
      contextWindow: claudeInfo.contextWindow,
      cost: claudeInfo.cost,
      description: claudeInfo.description,
    });
  } catch (error) {
    console.log('Error getting model info:', error instanceof Error ? error.message : error);
  }
  console.log('---\n');

  // 4. Using string models in orchestrators
  console.log('4. String Models in Orchestrators:');
  
  const autoAgent1 = new Orchestrator({
    model: 'gpt-4o-mini', // Auto-detects OpenAI
    tools: [mathTool],
    systemPrompt: 'You are a helpful assistant.',
  });

  console.log('Model info from orchestrator:', autoAgent1.getModelInfo());

  let result = await autoAgent1.execute('What is 25 * 16?');
  console.log('GPT-4o-mini result:', result.result);

  // Switch model using string
  autoAgent1.switchModel('claude-4-sonnet-20250514');
  console.log('Switched to:', autoAgent1.getModelInfo());

  result = await autoAgent1.execute('What is 144 / 12?');
  console.log('Claude result:', result.result);
  console.log('---\n');

  // 5. Mixed usage: string and AIModel objects
  console.log('5. Mixed String and AIModel Usage:');
  
  const mixedAgent = createOrchestrator({
    model: gptModel, // Using AIModel object
    tools: [mathTool],
    systemPrompt: 'You are a mathematical assistant.',
  });

  result = await mixedAgent.execute('Calculate the square root of 256');
  console.log('Mixed usage result:', result.result);

  // Switch to string model
  mixedAgent.switchModel('gemini-1.5-flash');
  result = await mixedAgent.execute('What is the factorial of 5?');
  console.log('After string switch result:', result.result);
  console.log('---\n');

  // 6. Provider creation for tools
  console.log('6. Provider Creation for Tools:');
  
  const toolAgent = new Orchestrator({
    model: 'gpt-4o-mini',
    tools: [aiTextTool],
    systemPrompt: 'You can use AI tools that leverage different providers.',
  });

  toolAgent.onEvent((event) => {
    if (event.type === 'tool_call') {
      console.log(`🔧 Tool called: ${event.data.toolName}`);
    }
    if (event.type === 'tool_result') {
      console.log(`✅ Tool completed: ${event.data.success ? 'Success' : 'Failed'}`);
    }
  });

  result = await toolAgent.execute('Use AI text generation to write a haiku about technology');
  console.log('Tool-based result:', result.result);
  console.log('---\n');

  // 7. Error handling for unknown models
  console.log('7. Error Handling:');
  
  try {
    // This will auto-detect but warn about unknown model
    const unknownAgent = new Orchestrator({
      model: 'unknown-model-123',
      tools: [],
      systemPrompt: 'Testing unknown model.',
    });

    console.log('Unknown model detected as:', unknownAgent.getModelInfo());
  } catch (error) {
    console.log('Error with unknown model:', error instanceof Error ? error.message : error);
  }

  try {
    // This will fail because provider doesn't exist
    const info = ProviderManager.getModelInfo('fake-provider', 'fake-model');
    console.log('This should not print:', info);
  } catch (error) {
    console.log('Expected error for fake provider:', error instanceof Error ? error.message : error);
  }
  console.log('---\n');

  // 8. Cross-provider tool context
  console.log('8. Cross-Provider Tool Context:');
  
  const crossProviderAgent = new Orchestrator({
    model: 'claude-4-sonnet-20250514', // Main model is Claude
    tools: [aiTextTool], // But tool can use different providers
    systemPrompt: 'You can use tools that access different AI providers.',
  });

  crossProviderAgent.onEvent((event) => {
    if (event.type === 'tool_call') {
      console.log(`🔧 Cross-provider tool: ${event.data.toolName}`);
    }
  });

  result = await crossProviderAgent.execute('Use the text generation tool with an OpenAI model to write a short poem about AI');
  console.log('Cross-provider result:', result.result);

  console.log('\n✨ Provider integration examples completed!');
}

if (require.main === module) {
  main().catch(console.error);
}