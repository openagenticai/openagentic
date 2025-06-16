import 'dotenv/config';

import { createAgent, calculatorTool } from '../src';
import { tool } from 'ai';
import { z } from 'zod';
import { toOpenAgenticTool } from '../src/tools/utils';
import type { ToolDetails } from '../src/types';

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
  toolId: 'greeting',
  name: 'Greeting',
  useCases: [],
  parameters: {},
  logo: '',
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
  // EXAMPLE 2: Text Analysis Agent
  // =============================================================================
  console.log('📝 Example 2: Text Analysis Agent');
  
  const analysisAgent = createAgent({
    model: 'claude-4-sonnet-20250514',
    tools: [textAnalysisTool],
    systemPrompt: 'You are a text analysis expert. Analyze text and provide insights.',
  });

  try {
    const result = await analysisAgent.execute(
      'Analyze this text: "The quick brown fox jumps over the lazy dog. This is a sample sentence for testing." Include word count, character count, and readability metrics.'
    );
    console.log('✅ Result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 3: Multi-Tool Agent with Custom Tools
  // =============================================================================
  console.log('📝 Example 3: Multi-Tool Agent with Custom Tools');
  
  const multiToolAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool, greetingTool, textAnalysisTool],
    systemPrompt: 'You are a versatile assistant with access to calculation, greeting, and text analysis tools.',
  });

  try {
    const result = await multiToolAgent.execute(
      'Calculate 15 * 8 and generate a casual afternoon greeting for Bob'
    );
    console.log('✅ Result:', result.result);
    console.log('🔧 Tools used:', result.toolCallsUsed);
    console.log('📊 Iterations:', result.iterations);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 4: Tool Validation and Error Handling
  // =============================================================================
  console.log('📝 Example 4: Tool Validation and Error Handling');
  
  const configAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [configManagerTool],
    systemPrompt: 'You are a configuration management assistant.',
  });

  try {
    const result = await configAgent.execute(
      'Get the theme setting, then set the language to "fr", and finally list all configurations'
    );
    console.log('✅ Result:', result.result);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // =============================================================================
  // EXAMPLE 5: Tool Categories and Organization
  // =============================================================================
  console.log('📝 Example 5: Tool Categories and Organization');
  
  const organizedAgent = createAgent({
    model: 'gpt-4o-mini',
    tools: [calculatorTool, greetingTool, textAnalysisTool, configManagerTool],
  });

  console.log('🔧 All tools:', organizedAgent.getAllTools().map(t => `${t.name} (${t.category})`));
  console.log('🔢 Utility tools:', organizedAgent.getToolsByCategory('utility').map(t => t.name));
  console.log('🎨 Custom tools:', organizedAgent.getToolsByCategory('custom').map(t => t.name));

  // Demonstrate tool management
  console.log('\n🔧 Tool Management:');
  console.log('Initial tool count:', organizedAgent.getAllTools().length);
  
  organizedAgent.removeTool('greeting_generator');
  console.log('After removing greeting tool:', organizedAgent.getAllTools().length);
  
  organizedAgent.addTool(greetingTool);
  console.log('After re-adding greeting tool:', organizedAgent.getAllTools().length);

  console.log('\n🎉 Custom tool creation examples completed successfully!');
}

if (require.main === module) {
  toolCreationExample().catch(console.error);
}