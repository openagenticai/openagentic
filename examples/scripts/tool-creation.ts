import 'dotenv/config';

import { createAgent, qrcodeTool } from '../../src';
import { tool } from 'ai';
import { z } from 'zod';
import { toOpenAgenticTool } from '../../src/tools/utils';
import type { ToolDetails } from '../../src/types';

// =============================================================================
// CUSTOM TOOL EXAMPLES
// =============================================================================

// Example 1: Simple utility tool
const rawGreetingTool = tool({
  parameters: z.object({
      name: z.string().describe('Name of the person to greet'),
      style: z.enum(['formal', 'casual', 'funny']).optional().default('casual').describe('Style of greeting'),
      timeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional().default('morning').describe('Time of day'),
  }),
  execute: async ({ name, style = 'casual', timeOfDay = 'morning' }) => {
    const greetings = {
      formal: {
        morning: `Good morning, ${name}. I hope you have a productive day ahead.`,
        afternoon: `Good afternoon, ${name}. I trust your day is going well.`,
        evening: `Good evening, ${name}. I hope you've had a successful day.`,
      },
      casual: {
        morning: `Hey ${name}! Hope you're having a great morning!`,
        afternoon: `Hi ${name}! How's your afternoon going?`,
        evening: `Hey ${name}! Hope you're having a nice evening!`,
      },
      funny: {
        morning: `Rise and shine, ${name}! Time to pretend to be a functioning adult!`,
        afternoon: `Afternoon, ${name}! Still surviving the day, I see!`,
        evening: `Evening, ${name}! Time to Netflix and avoid responsibilities!`,
      },
    };
    
    return {
      greeting: greetings[style as keyof typeof greetings][timeOfDay as keyof typeof greetings.formal],
      name,
      style,
      timeOfDay,
      timestamp: new Date().toISOString(),
    };
  },
});

const greetingToolDetails: ToolDetails = {
  toolId: 'greeting_generator',
  name: 'Greeting Generator',
  useCases: [
    'Generate personalized greetings for different times of day',
    'Create formal business greetings',
    'Generate casual friendly messages',
    'Create funny icebreaker greetings',
  ],
  logo: '👋',
};

const greetingTool = toOpenAgenticTool(rawGreetingTool, greetingToolDetails);

async function toolCreationExample() {
  console.log('🛠️ OpenAgentic - Custom Tool Creation Example\n');

  // =============================================================================
  // EXAMPLE 1: Agent with Custom Greeting Tool
  // =============================================================================
  console.log('📝 Example 1: Agent with Custom Greeting Tool');
  
  const greetingAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [greetingTool],
    systemPrompt: 'You are a friendly assistant that can generate personalized greetings.',
  });

  try {
    const result = await greetingAgent.execute('Generate a funny morning greeting for Alice');
    console.log('✅ Result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 2: Multi-Tool Agent with Custom Tools
  // =============================================================================
  console.log('📝 Example 2: Multi-Tool Agent with Custom Tools');
  
  const multiToolAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool, greetingTool],
    systemPrompt: 'You are a versatile assistant with access to QR code generation and greeting tools.',
  });

  try {
    const result = await multiToolAgent.execute(
      'Create a QR code for https://example.com and generate a casual afternoon greeting for Bob'
    );
    console.log('✅ Result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
    console.log('📊 Iterations:', result.iterations);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Tool Categories and Organization
  // =============================================================================
  console.log('📝 Example 3: Tool Categories and Organization');
  
  const organizedAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [qrcodeTool, greetingTool],
  });

  console.log('🔧 All tools:', organizedAgent.getAllTools().map(t => `${t.name} (${t.toolId})`));

  // Demonstrate tool management
  console.log('\n🔧 Tool Management:');
  console.log('Initial tool count:', organizedAgent.getAllTools().length);
  
  organizedAgent.removeTool('greeting_generator');
  console.log('After removing greeting tool:', organizedAgent.getAllTools().length);
  
  organizedAgent.addTool(greetingTool);
  console.log('After re-adding greeting tool:', organizedAgent.getAllTools().length);

  console.log('\n🎉 Custom tool creation examples completed successfully!');
  
  console.log('\n💡 Tool Creation Tips:');
  console.log('- ✅ Use descriptive parameter schemas with Zod');
  console.log('- ✅ Include comprehensive use cases in tool details');
  console.log('- ✅ Provide clear parameter descriptions');
  console.log('- ✅ Handle errors gracefully in execute functions');
  console.log('- ✅ Return structured, consistent results');
  console.log('- ✅ Use meaningful tool IDs and names');
}

if (require.main === module) {
  toolCreationExample().catch(console.error);
}