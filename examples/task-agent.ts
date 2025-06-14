import { createTaskAgent, httpRequestTool } from '../src';

async function main() {
  const agent = createTaskAgent({
    provider: 'google',
    model: 'gemini-2.5-pro-preview-06-05',
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    tools: [httpRequestTool],
    steps: [
      {
        name: 'research',
        description: 'Research the topic and gather current information',
        tools: ['http_request']
      },
      {
        name: 'analyze',
        description: 'Analyze the gathered information and identify key points'
      },
      {
        name: 'summarize',
        description: 'Create a comprehensive summary with actionable insights'
      }
    ],
    systemPrompt: 'You are a research analyst creating comprehensive reports.'
  });

  try {
    // Execute each step of the task
    console.log('Starting task execution...\n');

    while (!agent.getProgress().completed) {
      const result = await agent.executeNextStep();
      
      console.log(`Step ${result.currentStep}/${result.totalSteps} completed`);
      console.log('Result:', result.result);
      console.log('Cost so far:', `$${result.costTracking.estimatedCost.toFixed(4)}`);
      console.log('---\n');
    }

    const progress = agent.getProgress();
    console.log('Task completed!');
    console.log('All step results:', progress.stepResults);

  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}