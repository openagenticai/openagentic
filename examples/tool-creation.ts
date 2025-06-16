import { createAgent, createTool, calculatorTool } from '../src';

// =============================================================================
// CUSTOM TOOL EXAMPLES
// =============================================================================

// Example 1: Simple utility tool
const greetingTool = createTool({
  name: 'greeting_generator',
  description: 'Generate personalized greetings',
  category: 'custom',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the person to greet',
        required: true,
      },
      style: {
        type: 'string',
        description: 'Style of greeting',
        required: false,
        enum: ['formal', 'casual', 'funny'],
      },
      timeOfDay: {
        type: 'string',
        description: 'Time of day',
        required: false,
        enum: ['morning', 'afternoon', 'evening'],
      },
    },
    required: ['name'],
  },
  execute: async (params) => {
    const { name, style = 'casual', timeOfDay = 'morning' } = params;
    
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

// Example 2: Data processing tool
const textAnalysisTool = createTool({
  name: 'text_analyzer',
  description: 'Analyze text for various metrics',
  category: 'utility',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to analyze',
        required: true,
      },
      metrics: {
        type: 'array',
        description: 'Metrics to calculate',
        required: false,
        items: {
          type: 'string',
          enum: ['word_count', 'char_count', 'sentence_count', 'readability'],
        },
      },
    },
    required: ['text'],
  },
  execute: async (params) => {
    const { text, metrics = ['word_count', 'char_count'] } = params;
    
    const results: any = { text_length: text.length };
    
    if (metrics.includes('word_count')) {
      results.word_count = text.trim().split(/\s+/).length;
    }
    
    if (metrics.includes('char_count')) {
      results.char_count = text.length;
      results.char_count_no_spaces = text.replace(/\s/g, '').length;
    }
    
    if (metrics.includes('sentence_count')) {
      results.sentence_count = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    }
    
    if (metrics.includes('readability')) {
      const words = results.word_count || text.trim().split(/\s+/).length;
      const sentences = results.sentence_count || text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      results.avg_words_per_sentence = Math.round((words / sentences) * 100) / 100;
    }
    
    return {
      ...results,
      analyzed_at: new Date().toISOString(),
    };
  },
});

// Example 3: Configuration tool
const configManagerTool = createTool({
  name: 'config_manager',
  description: 'Manage configuration settings',
  category: 'custom',
  requiresAuth: false,
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform',
        required: true,
        enum: ['get', 'set', 'list', 'delete'],
      },
      key: {
        type: 'string',
        description: 'Configuration key',
        required: false,
      },
      value: {
        type: 'string',
        description: 'Configuration value (for set action)',
        required: false,
      },
    },
    required: ['action'],
  },
  execute: async (params) => {
    const { action, key, value } = params;
    
    // Simulate in-memory configuration store
    const config = new Map([
      ['theme', 'dark'],
      ['language', 'en'],
      ['debug', 'false'],
      ['max_retries', '3'],
    ]);
    
    switch (action) {
      case 'get':
        if (!key) throw new Error('Key required for get action');
        return {
          action: 'get',
          key,
          value: config.get(key) || null,
          exists: config.has(key),
        };
        
      case 'set':
        if (!key || value === undefined) throw new Error('Key and value required for set action');
        const oldValue = config.get(key);
        config.set(key, value);
        return {
          action: 'set',
          key,
          value,
          old_value: oldValue || null,
          success: true,
        };
        
      case 'list':
        return {
          action: 'list',
          configs: Object.fromEntries(config),
          count: config.size,
        };
        
      case 'delete':
        if (!key) throw new Error('Key required for delete action');
        const existed = config.has(key);
        const deletedValue = config.get(key);
        config.delete(key);
        return {
          action: 'delete',
          key,
          deleted_value: deletedValue || null,
          existed,
          success: true,
        };
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },
});

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
    tools: [calculatorTool, greetingTool, textAnalysisTool, configManagerTool],
    systemPrompt: 'You are a versatile assistant with access to calculation, greeting, text analysis, and configuration tools.',
  });

  try {
    const result = await multiToolAgent.execute(
      'Calculate 15 * 8, generate a casual afternoon greeting for Bob, and list all configuration settings'
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