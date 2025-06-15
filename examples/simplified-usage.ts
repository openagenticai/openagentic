import { 
  Orchestrator, 
  createOrchestrator, 
  createSimpleAgent,
  createConversationalAgent,
  createStreamingAgent,
  createMultiModelAgent,
  createPipeline,
  httpTool,
  mathTool,
  timeTool
} from '../src';

async function main() {
  console.log('🚀 OpenAgentic Simplified Architecture Examples\n');

  // 1. Basic orchestrator with string model (auto-detection)
  console.log('1. Basic Orchestrator with Auto-Detection:');
  const basicAgent = new Orchestrator({
    model: 'gpt-4o-mini', // Auto-detects OpenAI provider
    tools: [mathTool, httpTool],
    systemPrompt: 'You are a helpful assistant.',
  });

  let result = await basicAgent.execute('What is 15 * 24?');
  console.log('Result:', result.result);
  console.log('---\n');

  // 2. Factory function approach
  console.log('2. Factory Function Approach:');
  const simpleAgent = createSimpleAgent({
    model: 'claude-4-sonnet-20250514', // Auto-detects Anthropic
    tools: [mathTool],
    systemPrompt: 'You are a math tutor.',
  });

  result = await simpleAgent.execute('Explain the Pythagorean theorem and calculate 3² + 4²');
  console.log('Result:', result.result);
  console.log('---\n');

  // 3. Streaming agent
  console.log('3. Streaming Agent:');
  const streamingAgent = createStreamingAgent({
    model: 'gpt-4o',
    systemPrompt: 'You are a creative writer.',
  });

  console.log('Streaming response:');
  for await (const chunk of streamingAgent.stream('Write a short haiku about programming')) {
    process.stdout.write(chunk.delta);
    if (chunk.done) break;
  }
  console.log('\n---\n');

  // 4. Multi-model orchestration
  console.log('4. Multi-Model Orchestration:');
  const multiAgent = createMultiModelAgent([
    'gpt-4o-mini',
    'claude-4-sonnet-20250514'
  ], [mathTool]);

  const multiResult = await multiAgent.executeWithAllModels('What are the benefits of functional programming?');
  console.log('Consensus:', multiResult.consensus);
  console.log('Individual results:', multiResult.results.map(r => ({
    model: r.model,
    success: r.success,
    preview: r.result?.substring(0, 100) + '...'
  })));
  console.log('---\n');

  // 5. Pipeline orchestration
  console.log('5. Pipeline Orchestration:');
  const pipeline = createPipeline()
    .addStep('gpt-4o-mini', (input) => `Brainstorm ideas for: ${input}`)
    .addStep('claude-4-sonnet-20250514', (input, prev) => `Refine these ideas: ${prev?.result}`)
    .addStep('gpt-4o', (input, prev) => `Create an action plan based on: ${prev?.result}`);

  const pipelineResult = await pipeline.execute('a new mobile app for productivity');
  console.log('Pipeline Success:', pipelineResult.success);
  console.log('Final Result:', pipelineResult.finalResult);
  console.log('---\n');

  // 6. Tool management
  console.log('6. Dynamic Tool Management:');
  const toolAgent = new Orchestrator({
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful assistant.',
  });

  // Add tools dynamically
  toolAgent.addTool(mathTool);
  toolAgent.addTool(timeTool);

  result = await toolAgent.execute('What time is it and what is 100 * 37?');
  console.log('With tools:', result.result);

  // Remove a tool
  toolAgent.removeTool('timestamp');
  result = await toolAgent.execute('What time is it now?');
  console.log('Without time tool:', result.result);
  console.log('---\n');

  // 7. Model switching
  console.log('7. Model Switching:');
  const flexibleAgent = new Orchestrator({
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful assistant.',
  });

  result = await flexibleAgent.execute('Explain quantum computing in simple terms');
  console.log('GPT-4o-mini result:', result.result?.substring(0, 150) + '...');

  // Switch to a different model
  flexibleAgent.switchModel('claude-4-sonnet-20250514');
  result = await flexibleAgent.execute('Explain quantum computing in simple terms');
  console.log('Claude result:', result.result?.substring(0, 150) + '...');
  console.log('---\n');

  // 8. Custom orchestration logic
  console.log('8. Custom Orchestration Logic:');
  const customAgent = new Orchestrator({
    model: 'gpt-4o-mini',
    tools: [mathTool],
    customLogic: async (input, context) => {
      // Custom logic: first try with one model, then refine with another
      console.log('Using custom orchestration logic...');
      
      const initialResponse = await context.model.provider === 'openai' 
        ? 'Initial response from OpenAI model'
        : 'Initial response from other model';
      
      // Switch model for refinement
      const refinedAgent = new Orchestrator({
        model: 'claude-4-sonnet-20250514',
        tools: context.tools,
      });
      
      const refinement = await refinedAgent.execute(`Improve this response: ${initialResponse}`);
      
      return {
        content: `Custom orchestration result: ${refinement.result}`,
        original: initialResponse,
        refined: refinement.result
      };
    }
  });

  result = await customAgent.execute('Explain machine learning');
  console.log('Custom logic result:', result.result);
  console.log('---\n');

  // 9. Event monitoring
  console.log('9. Event Monitoring:');
  const monitoredAgent = new Orchestrator({
    model: 'gpt-4o-mini',
    tools: [mathTool, httpTool],
    systemPrompt: 'You are a helpful assistant.',
  });

  monitoredAgent.onEvent((event) => {
    switch (event.type) {
      case 'start':
        console.log(`🚀 Started with model: ${event.data.model.model}`);
        break;
      case 'tool_call':
        console.log(`🔧 Calling tool: ${event.data.toolName}`);
        break;
      case 'tool_result':
        console.log(`✅ Tool result: ${event.data.success ? 'Success' : 'Failed'}`);
        break;
      case 'complete':
        console.log(`🎯 Completed in ${event.data.iterations} iterations`);
        break;
    }
  });

  result = await monitoredAgent.execute('Calculate 45 * 67 and then make a request to httpbin.org/json');
  console.log('Monitored result:', result.result);

  console.log('\n✨ All examples completed!');
}

if (require.main === module) {
  main().catch(console.error);
}