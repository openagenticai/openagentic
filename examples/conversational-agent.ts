import { createConversationalAgent } from '../src';

async function main() {
  const agent = createConversationalAgent({
    provider: 'anthropic',
    model: 'claude-4-sonnet-20250514',
    apiKey: process.env.ANTHROPIC_API_KEY,
    systemPrompt: 'You are a friendly assistant helping with project planning.'
  });

  try {
    // First message
    let result = await agent.continueConversation(
      'I need to plan a software development project. What should I consider first?'
    );
    console.log('Assistant:', result.result);

    // Follow-up message
    result = await agent.continueConversation(
      'The project is a web application for task management. What technology stack would you recommend?'
    );
    console.log('Assistant:', result.result);

    // Another follow-up
    result = await agent.continueConversation(
      'How long do you think this project would take for a team of 3 developers?'
    );
    console.log('Assistant:', result.result);

    // Show conversation history
    console.log('\nConversation History:');
    const history = agent.getConversationHistory();
    history.forEach((message, index) => {
      console.log(`${index + 1}. ${message.role}: ${message.content.substring(0, 100)}...`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}