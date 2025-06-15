import { 
  Orchestrator, 
  httpTool,
  mathTool,
  timeTool,
  aiTextTool,
  aiImageTool,
  aiCodeTool,
  aiTranslateTool,
  createTool,
  utilityTools,
  aiTools,
  allTools,
  ToolRegistry
} from '../src';

async function main() {
  console.log('🛠️ Self-Contained Tools Architecture Examples\n');

  // 1. Using categorized tool collections
  console.log('1. Categorized Tool Collections:');
  console.log('Utility Tools:', utilityTools.map(t => `${t.name} (v${t.version})`));
  console.log('AI Tools:', aiTools.map(t => `${t.name} (v${t.version}) ${t.requiresAuth ? '[Auth Required]' : ''}`));
  console.log('---\n');

  // 2. Basic orchestrator with utility tools
  console.log('2. Utility Tools (No AI dependency):');
  const utilityAgent = new Orchestrator({
    model: 'gpt-4o-mini',
    tools: utilityTools,
    systemPrompt: 'You are a helpful assistant with access to utility tools.',
  });

  let result = await utilityAgent.execute('What time is it in UTC and what is 15 * 23?');
  console.log('Utility Result:', result.result);
  console.log('---\n');

  // 3. AI-powered tools with context
  console.log('3. AI Tools (Using @ai-sdk):');
  const aiAgent = new Orchestrator({
    model: 'gpt-4o-mini',
    tools: [aiTextTool, aiCodeTool],
    systemPrompt: 'You are an AI assistant that can use other AI models as tools.',
  });

  // Monitor tool calls
  aiAgent.onEvent((event) => {
    if (event.type === 'tool_call') {
      console.log(`🔧 Using AI tool: ${event.data.toolName}`);
    }
  });

  result = await aiAgent.execute('Generate a simple TypeScript function that calculates fibonacci numbers');
  console.log('AI Tool Result:', result.result);
  console.log('---\n');

  // 4. Custom self-contained tool
  console.log('4. Custom Self-Contained Tool:');
  
  const weatherTool = createTool({
    name: 'weather_lookup',
    description: 'Get weather information for a location',
    category: 'custom',
    version: '1.0.0',
    requiresAuth: false,
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name or coordinates',
          required: true,
        },
        units: {
          type: 'string',
          description: 'Temperature units',
          required: false,
          enum: ['celsius', 'fahrenheit'],
        },
      },
      required: ['location'],
    },
    execute: async (params: any) => {
      const { location, units = 'celsius' } = params;
      
      // Simulate weather API call (self-contained)
      const weatherData = {
        location,
        temperature: units === 'celsius' ? 22 : 72,
        condition: 'partly cloudy',
        humidity: 65,
        windSpeed: 10,
        units,
        timestamp: new Date().toISOString(),
      };
      
      return weatherData;
    },
  });

  const customAgent = new Orchestrator({
    model: 'gpt-4o-mini',
    tools: [weatherTool, timeTool],
    systemPrompt: 'You are a weather assistant.',
  });

  result = await customAgent.execute('What is the weather like in London and what time is it there?');
  console.log('Custom Tool Result:', result.result);
  console.log('---\n');

  // 5. Tool registry for complex scenarios
  console.log('5. Tool Registry Management:');
  
  const registry = new ToolRegistry();
  
  // Register tools by category
  utilityTools.forEach(tool => registry.register(tool));
  aiTools.forEach(tool => registry.register(tool));
  registry.register(weatherTool);
  
  console.log('Registered Tools:', registry.getAll().map(t => t.name));
  console.log('Utility Tools:', registry.getByCategory('utility').map(t => t.name));
  console.log('AI Tools:', registry.getByCategory('ai').map(t => t.name));
  console.log('Custom Tools:', registry.getByCategory('custom').map(t => t.name));
  console.log('---\n');

  // 6. Multi-provider AI tool usage
  console.log('6. Multi-Provider AI Tools:');
  
  const multiAIAgent = new Orchestrator({
    model: 'claude-4-sonnet-20250514',
    tools: [aiTextTool, aiTranslateTool],
    systemPrompt: 'You can use different AI models as tools.',
  });

  multiAIAgent.onEvent((event) => {
    if (event.type === 'tool_call') {
      console.log(`🤖 AI tool called: ${event.data.toolName}`);
    }
    if (event.type === 'tool_result' && event.data.success) {
      console.log(`✅ AI tool completed successfully`);
    }
  });

  result = await multiAIAgent.execute('Generate a short poem about programming, then translate it to Spanish');
  console.log('Multi-AI Result:', result.result);
  console.log('---\n');

  // 7. Tool validation and error handling
  console.log('7. Tool Validation:');
  
  try {
    // This should fail validation
    const invalidTool = createTool({
      name: '',  // Invalid: empty name
      description: 'Test tool',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => ({}),
    });
    
    registry.register(invalidTool);
  } catch (error) {
    console.log('Validation Error (expected):', error instanceof Error ? error.message : error);
  }
  
  try {
    // This should work
    const validTool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Test input',
            required: true,
          },
        },
        required: ['input'],
      },
      execute: async (params) => ({ result: `Processed: ${params.input}` }),
    });
    
    registry.register(validTool);
    console.log('Valid tool registered successfully:', validTool.name);
  } catch (error) {
    console.log('Unexpected error:', error);
  }
  console.log('---\n');

  // 8. Tool context demonstration
  console.log('8. Tool Context Usage:');
  
  const contextTool = createTool({
    name: 'context_demo',
    description: 'Demonstrates tool context usage',
    category: 'custom',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action to perform',
          required: true,
          enum: ['get_model', 'check_keys', 'generate_text'],
        },
      },
      required: ['action'],
    },
    execute: async (params: any, context) => {
      const { action } = params;
      
      switch (action) {
        case 'get_model':
          const model = await context?.getModel?.();
          return { action, hasModel: !!model, contextAvailable: !!context };
          
        case 'check_keys':
          return { 
            action, 
            availableKeys: Object.keys(context?.apiKeys || {}),
            hasOpenAI: !!(context?.apiKeys?.openai),
          };
          
        case 'generate_text':
          if (!context?.getModel) {
            return { action, error: 'No context available' };
          }
          try {
            const provider = await context.getModel('openai');
            return { action, result: 'Generated with OpenAI model', hasProvider: !!provider };
          } catch (error) {
            return { action, error: error instanceof Error ? error.message : String(error) };
          }
          
        default:
          return { action, error: 'Unknown action' };
      }
    },
  });

  const contextAgent = new Orchestrator({
    model: 'gpt-4o-mini',
    tools: [contextTool],
    systemPrompt: 'You can demonstrate tool context usage.',
  });

  result = await contextAgent.execute('Use the context demo tool to check available API keys');
  console.log('Context Demo Result:', result.result);

  console.log('\n✨ Self-contained tools examples completed!');
}

if (require.main === module) {
  main().catch(console.error);
}