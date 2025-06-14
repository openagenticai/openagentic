import { createSimpleAgent, createTool } from '../src';

// Create a custom tool for file operations
const fileReaderTool = createTool({
  name: 'read_file',
  description: 'Read the contents of a text file',
  parameters: {
    filepath: {
      type: 'string',
      description: 'Path to the file to read',
      required: true
    },
    encoding: {
      type: 'string',
      description: 'File encoding (default: utf8)',
      required: false,
      enum: ['utf8', 'ascii', 'base64']
    }
  },
  execute: async ({ filepath, encoding = 'utf8' }) => {
    const fs = await import('fs/promises');
    try {
      const content = await fs.readFile(filepath, encoding as any);
      return {
        success: true,
        content,
        size: content.length,
        filepath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filepath
      };
    }
  },
  costEstimate: 0.001
});

async function main() {
  const agent = createSimpleAgent({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: process.env.OPENAI_API_KEY,
    tools: [fileReaderTool],
    systemPrompt: 'You are a file analysis assistant. Help users read and analyze file contents.'
  });

  // Monitor events
  agent.onEvent((event) => {
    switch (event.type) {
      case 'tool_call':
        console.log(`🔧 Calling tool: ${event.data.toolName}`);
        console.log(`   Arguments:`, event.data.arguments);
        break;
      case 'tool_result':
        console.log(`✅ Tool result: ${event.data.success ? 'Success' : 'Failed'}`);
        break;
      case 'cost_update':
        console.log(`💰 Cost update: $${event.data.estimatedCost.toFixed(4)}`);
        break;
    }
  });

  try {
    const result = await agent.execute(
      'Please read the package.json file and tell me about this project.'
    );

    console.log('\n📋 Final Result:');
    console.log(result.result);

  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}