# OpenAgentic

A TypeScript framework for building AI agents with self-contained tool orchestration capabilities.

## Overview

OpenAgentic provides a comprehensive framework for creating AI-powered agents that can orchestrate multiple self-contained tools and handle complex workflows. Built with TypeScript-first design principles, it offers excellent developer experience with strong typing and modular architecture.

## Features

### 🤖 Unified Orchestrator Design
- Single orchestrator class with flexible configuration
- Auto-detection of AI providers from model names
- Support for streaming and non-streaming execution
- Custom orchestration logic support
- Built-in tool management and model switching

### 🛠️ Self-Contained Tools
- **Complete independence** - no shared utilities or dependencies
- **Consistent @ai-sdk integration** for AI-powered tools
- **JSONSchema parameter validation** with proper type safety
- **Tool categories**: Utility tools (no AI), AI tools (@ai-sdk), Custom tools
- **Tool context** for AI tools with model access and API key management

### 🔄 Multiple Orchestration Patterns
- Simple one-shot execution
- Streaming real-time responses
- Multi-model consensus and refinement
- Pipeline orchestration for sequential processing
- Custom orchestration logic via callbacks

### 📊 Event-Driven Architecture
- Comprehensive event system for real-time monitoring
- Built-in event emitter for tool calls, iterations, and results
- Debug and monitoring capabilities

## Quick Start

### Installation

```bash
npm install openagentic
```

### Basic Usage

```typescript
import { Orchestrator, mathTool, httpTool } from 'openagentic';

// Create an orchestrator with auto-detected provider
const agent = new Orchestrator({
  model: 'gpt-4o-mini', // Auto-detects OpenAI
  tools: [mathTool, httpTool],
  systemPrompt: 'You are a helpful assistant.',
});

// Execute a task
const result = await agent.execute('What is 15 * 24 and what is the current time?');
console.log(result.result);
```

### Self-Contained Tools

Every tool in OpenAgentic is completely self-contained with no external dependencies:

```typescript
import { 
  httpTool,        // HTTP requests (utility)
  mathTool,        // Mathematical calculations (utility)
  timeTool,        // Timestamp operations (utility)
  aiTextTool,      // AI text generation (AI)
  aiImageTool,     // AI image generation (AI)
  aiCodeTool,      // AI code generation (AI)
  aiTranslateTool, // AI translation (AI)
  createTool       // Create custom tools
} from 'openagentic';

// Use utility tools (no AI dependency)
const utilityAgent = new Orchestrator({
  model: 'gpt-4o-mini',
  tools: [httpTool, mathTool, timeTool],
});

// Use AI tools (with @ai-sdk integration)
const aiAgent = new Orchestrator({
  model: 'claude-4-sonnet-20250514',
  tools: [aiTextTool, aiCodeTool],
});
```

## Tool Architecture

### Tool Categories

**Utility Tools** (No AI dependency):
- `httpTool` - HTTP requests using fetch API
- `mathTool` - Mathematical calculations with enhanced functions
- `timeTool` - Timestamp operations with timezone support

**AI Tools** (Use @ai-sdk providers):
- `aiTextTool` - Text generation using any @ai-sdk model
- `aiImageTool` - Image generation (DALL-E, etc.)
- `aiCodeTool` - Code generation optimized for programming
- `aiTranslateTool` - Language translation

**Custom Tools** (User-defined):
- Follow the same self-contained pattern
- Optional tool context for AI model access

### Tool Interface

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any, context?: ToolContext) => Promise<any>;
  
  // Optional metadata
  category?: 'utility' | 'ai' | 'custom';
  version?: string;
  requiresAuth?: boolean;
}

interface ToolContext {
  getModel: (provider?: string) => Promise<LanguageModel>;
  apiKeys: Record<string, string>;
}
```

### Creating Custom Tools

```typescript
import { createTool } from 'openagentic';

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
  execute: async (params, context) => {
    const { location, units = 'celsius' } = params;
    
    // Self-contained implementation
    // No dependencies on shared utilities
    const weatherData = await fetchWeatherFromAPI(location, units);
    
    return {
      location,
      temperature: weatherData.temp,
      condition: weatherData.condition,
      units,
      timestamp: new Date().toISOString(),
    };
  },
});
```

## AI Tool Context

AI-powered tools receive a context object for accessing models and API keys:

```typescript
const customAITool = createTool({
  name: 'custom_ai_analysis',
  description: 'Perform custom AI analysis',
  category: 'ai',
  requiresAuth: true,
  parameters: {
    type: 'object',
    properties: {
      data: { type: 'string', description: 'Data to analyze', required: true },
      provider: { type: 'string', description: 'AI provider to use', required: false },
    },
    required: ['data'],
  },
  execute: async (params, context) => {
    const { data, provider = 'openai' } = params;
    
    // Get model from context
    const model = await context?.getModel(provider);
    
    // Use @ai-sdk directly
    const { generateText } = await import('ai');
    const result = await generateText({
      model: model('gpt-4o'),
      prompt: `Analyze this data: ${data}`,
    });
    
    return {
      analysis: result.text,
      provider,
      timestamp: new Date().toISOString(),
    };
  },
});
```

## Supported Providers

OpenAgentic auto-detects providers based on model names:

### OpenAI
- **Models**: `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`, `o3`, `o3-mini`
- **Auto-detection**: Any model containing `gpt`, `o1`, or `o3`
- **Environment**: `OPENAI_API_KEY`

### Anthropic
- **Models**: `claude-4-opus-20250514`, `claude-4-sonnet-20250514`
- **Auto-detection**: Any model containing `claude`
- **Environment**: `ANTHROPIC_API_KEY`

### Google
- **Models**: `gemini-2.5-pro-preview-06-05`, `gemini-2.5-flash-preview-05-20`, `gemini-1.5-pro`, `gemini-1.5-flash`
- **Auto-detection**: Any model containing `gemini`
- **Environment**: `GOOGLE_GENERATIVE_AI_API_KEY`

### Perplexity
- **Models**: `llama-3.1-sonar-small-128k-online`, `llama-3.1-sonar-large-128k-online`, `llama-3.1-sonar-huge-128k-online`
- **Auto-detection**: Models containing both `llama` and `sonar`
- **Environment**: `PERPLEXITY_API_KEY`

### xAI
- **Models**: `grok-beta`
- **Auto-detection**: Any model containing `grok`
- **Environment**: `XAI_API_KEY`

## Advanced Usage

### Streaming Responses

```typescript
import { createStreamingAgent } from 'openagentic';

const streamingAgent = createStreamingAgent({
  model: 'claude-4-sonnet-20250514',
  tools: [aiTextTool],
});

for await (const chunk of streamingAgent.stream('Write a story about AI')) {
  process.stdout.write(chunk.delta);
  if (chunk.done) break;
}
```

### Multi-Model Orchestration

```typescript
import { createMultiModelAgent } from 'openagentic';

const multiAgent = createMultiModelAgent([
  'gpt-4o-mini',
  'claude-4-sonnet-20250514'
], [mathTool, aiTextTool]);

const consensus = await multiAgent.executeWithAllModels('Explain quantum computing');
console.log('Consensus:', consensus.consensus);
```

### Tool Registry Management

```typescript
import { ToolRegistry, allTools } from 'openagentic';

const registry = new ToolRegistry();

// Register tools by category
allTools.forEach(tool => registry.register(tool));

// Get tools by category
const utilityTools = registry.getByCategory('utility');
const aiTools = registry.getByCategory('ai');

// Validate tools
const isValid = registry.getAll().every(tool => 
  tool.name && tool.description && tool.execute
);
```

### Event Monitoring

```typescript
agent.onEvent((event) => {
  switch (event.type) {
    case 'start':
      console.log(`Started with ${event.data.model.model}`);
      break;
    case 'tool_call':
      console.log(`Calling ${event.data.toolName}`);
      break;
    case 'tool_result':
      console.log(`Tool ${event.data.success ? 'succeeded' : 'failed'}`);
      break;
    case 'complete':
      console.log(`Completed in ${event.data.iterations} iterations`);
      break;
  }
});
```

## Architecture

```
openagentic/
├── core/
│   ├── orchestrator.ts     # Unified orchestrator with tool context
│   ├── ai-provider.ts      # AI provider abstraction
│   └── errors.ts           # Error definitions
├── tools/
│   └── index.ts            # All self-contained tools
├── providers/
│   └── index.ts            # Provider configurations
├── utils/
│   ├── simple-event-emitter.ts # Event system
│   ├── helpers.ts          # Utility functions
│   └── validators.ts       # Validation utilities
└── types/
    └── index.ts            # TypeScript definitions with JSONSchema
```

## Key Improvements

### 🎯 Self-Contained Tools
- **No shared dependencies** - each tool is completely independent
- **Consistent @ai-sdk usage** for AI-powered tools
- **JSONSchema validation** with proper type safety
- **Tool context** for secure API key and model access
- **Category-based organization** (utility, ai, custom)

### 🔧 Enhanced Flexibility
- **Tool validation** at registration time
- **Tool context** for cross-provider AI model access
- **Metadata support** (version, category, auth requirements)
- **Simplified tool creation** with `createTool` utility

### 🚀 Better Developer Experience
- **Auto-detection** of providers from model names
- **Type-safe** tool parameters with JSONSchema
- **Event-driven** monitoring and debugging
- **Tool registry** for complex scenarios

### 📦 Modular Architecture
- **No complex configuration objects** (simplified)
- **No tool dependencies** on shared utilities
- **No provider-specific tool implementations**
- **Self-contained tools** with optional AI context

## Requirements

- Node.js 18+
- TypeScript 5.0+
- AI provider API keys (OpenAI, Anthropic, etc.)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://openagentic.dev/docs)
- 💬 [Discord Community](https://discord.gg/openagentic)
- 🐛 [Issue Tracker](https://github.com/openagentic/openagentic/issues)
- 📧 [Email Support](mailto:support@openagentic.dev)

---

**OpenAgentic** - Self-contained AI agent orchestration 🤖✨