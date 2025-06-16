# OpenAgentic

A TypeScript framework for building AI agents with self-contained tool orchestration capabilities.

## Overview

OpenAgentic provides a comprehensive framework for creating AI-powered agents that can orchestrate multiple self-contained tools and handle complex workflows. Built with TypeScript-first design principles, it offers excellent developer experience with strong typing and modular architecture.

## Features

### 🤖 Simplified Agent Creation
- **Two main functions**: `createAgent()` for standard execution, `createStreamingAgent()` for real-time streaming
- **Auto-detection of AI providers** from model names (OpenAI, Anthropic, Google, xAI, Perplexity)
- **Flexible configuration** with sensible defaults
- **Tool orchestration** with self-contained tools
- **Model switching** and provider management

### 🛠️ Self-Contained Tools
- **Complete independence** - no shared utilities or dependencies
- **Consistent interface** with JSONSchema parameter validation
- **Tool categories**: Utility tools (no AI), AI tools (@ai-sdk), Custom tools
- **Built-in tools**: Calculator, HTTP requests, timestamps, and more

### 🔄 Dual Execution Modes
- **Standard execution**: `createAgent()` for non-streaming, complete responses
- **Streaming execution**: `createStreamingAgent()` for real-time response streaming
- **Tool integration** works seamlessly in both modes

### 📊 Enterprise-Ready Features
- **Event-driven architecture** for monitoring and debugging
- **Tool management** (add, remove, categorize tools)
- **Model switching** at runtime
- **Error handling** with detailed error types

## Quick Start

### Installation

```bash
npm install openagentic
```

### Basic Usage

```typescript
import { createAgent, calculatorTool, httpTool } from 'openagentic';

// Create a standard agent
const agent = createAgent({
  model: 'gpt-4o-mini', // Auto-detects OpenAI provider
  tools: [calculatorTool, httpTool],
  systemPrompt: 'You are a helpful assistant.',
});

// Execute a task
const result = await agent.execute('What is 15 * 24 and what is the current time?');
console.log(result.result);
```

### Streaming Responses

```typescript
import { createStreamingAgent, calculatorTool } from 'openagentic';

// Create a streaming agent
const streamingAgent = createStreamingAgent({
  model: 'claude-4-sonnet-20250514', // Auto-detects Anthropic provider
  tools: [calculatorTool],
  systemPrompt: 'You are a helpful assistant.',
});

// Stream responses in real-time
const stream = await streamingAgent.stream('Write a short story and calculate 5 * 7');

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## API Reference

### Core Functions

#### `createAgent(options)`

Creates a standard agent for non-streaming execution.

```typescript
const agent = createAgent({
  model: string | AIModel,           // Required: Model name or AIModel object
  tools?: Tool[],                    // Optional: Array of tools
  systemPrompt?: string,             // Optional: System prompt
  maxIterations?: number,            // Optional: Max iterations (default: 10)
  customLogic?: (input, context) => Promise<any> // Optional: Custom logic
});
```

**Returns**: `Orchestrator` instance with methods:
- `execute(input: string): Promise<ExecutionResult>`
- `addTool(tool: Tool): void`
- `removeTool(toolName: string): void`
- `switchModel(model: string | AIModel): void`
- `getMessages(): Message[]`
- `reset(): void`

#### `createStreamingAgent(options)`

Creates a streaming agent for real-time response streaming.

```typescript
const streamingAgent = createStreamingAgent({
  model: string | AIModel,           // Required: Model name or AIModel object  
  tools?: Tool[],                    // Optional: Array of tools
  systemPrompt?: string,             // Optional: System prompt
  maxIterations?: number,            // Optional: Max iterations (default: 10)
});
```

**Returns**: `StreamingOrchestrator` instance with methods:
- `stream(input: string): Promise<StreamingResult>`
- `addTool(tool: Tool): void`
- `removeTool(toolName: string): void`
- `switchModel(model: string | AIModel): void`

### Built-in Tools

OpenAgentic includes several self-contained tools:

```typescript
import { 
  calculatorTool,    // Mathematical calculations
  httpTool,          // HTTP requests
  timestampTool,     // Timestamp operations
} from 'openagentic';
```

### Supported Providers

OpenAgentic auto-detects providers based on model names:

#### OpenAI
- **Models**: `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`, `o3`, `o3-mini`
- **Environment**: `OPENAI_API_KEY`

#### Anthropic
- **Models**: `claude-4-opus-20250514`, `claude-4-sonnet-20250514`
- **Environment**: `ANTHROPIC_API_KEY`

#### Google
- **Models**: `gemini-2.5-pro-preview-06-05`, `gemini-1.5-pro`, `gemini-1.5-flash`
- **Environment**: `GOOGLE_GENERATIVE_AI_API_KEY`

#### xAI
- **Models**: `grok-beta`
- **Environment**: `XAI_API_KEY`

#### Perplexity
- **Models**: `llama-3.1-sonar-small-128k-online`, `llama-3.1-sonar-large-128k-online`
- **Environment**: `PERPLEXITY_API_KEY`

## Advanced Usage

### Custom Tools

Create your own self-contained tools:

```typescript
import { createTool } from 'openagentic';

const weatherTool = createTool({
  name: 'weather_lookup',
  description: 'Get weather information for a location',
  category: 'custom',
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
  execute: async (params) => {
    const { location, units = 'celsius' } = params;
    
    // Your weather API implementation here
    const weatherData = await fetchWeatherFromAPI(location, units);
    
    return {
      location,
      temperature: weatherData.temp,
      condition: weatherData.condition,
      units,
    };
  },
});
```

### Model Configuration

Use specific model configurations:

```typescript
import type { AIModel } from 'openagentic';

const customModel: AIModel = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'your-api-key',
  temperature: 0.5,
  maxTokens: 2000,
  topP: 0.9,
};

const agent = createAgent({
  model: customModel,
  tools: [calculatorTool],
});
```

### Custom Logic

Add custom pre-processing logic:

```typescript
const agent = createAgent({
  model: 'gpt-4o-mini',
  tools: [calculatorTool],
  customLogic: async (input, context) => {
    // Custom pre-processing
    if (input.includes('fibonacci')) {
      return {
        content: 'Custom Fibonacci logic handled this!',
        customHandled: true
      };
    }
    
    // Let normal orchestration handle it
    return null;
  }
});
```

### Tool Management

Dynamically manage tools:

```typescript
const agent = createAgent({
  model: 'gpt-4o-mini',
  tools: [calculatorTool],
});

// Add tools
agent.addTool(httpTool);
agent.addTool(timestampTool);

// List tools
console.log('All tools:', agent.getAllTools().map(t => t.name));
console.log('Utility tools:', agent.getToolsByCategory('utility').map(t => t.name));

// Remove tools
agent.removeTool('calculator');
```

### Provider Management

```typescript
import { ProviderManager } from 'openagentic';

// Get all providers
const providers = ProviderManager.getAllProviders();

// Get models for a provider
const openaiModels = ProviderManager.getProviderModels('openai');

// Get model information
const modelInfo = ProviderManager.getModelInfo('openai', 'gpt-4o-mini');
console.log('Context window:', modelInfo.contextWindow);
console.log('Cost per token:', modelInfo.cost);
```

## Examples

### Basic Calculator Agent

```typescript
import { createAgent, calculatorTool } from 'openagentic';

const mathAgent = createAgent({
  model: 'gpt-4o-mini',
  tools: [calculatorTool],
  systemPrompt: 'You are a mathematics expert.',
});

const result = await mathAgent.execute('Calculate the square root of 144 plus 5 times 3');
console.log(result.result);
```

### Multi-Tool Agent

```typescript
import { createAgent, calculatorTool, httpTool, timestampTool } from 'openagentic';

const multiAgent = createAgent({
  model: 'claude-4-sonnet-20250514',
  tools: [calculatorTool, httpTool, timestampTool],
  systemPrompt: 'You are a versatile assistant with access to multiple tools.',
});

const result = await multiAgent.execute(
  'Calculate 25 * 16, get the current timestamp, and check if httpbin.org is accessible'
);
console.log(result.result);
```

### Streaming Story Writer

```typescript
import { createStreamingAgent } from 'openagentic';

const storyAgent = createStreamingAgent({
  model: 'claude-4-sonnet-20250514',
  systemPrompt: 'You are a creative writing assistant.',
});

const stream = await storyAgent.stream('Write a short story about a robot learning to paint');

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

## Error Handling

OpenAgentic provides comprehensive error handling:

```typescript
try {
  const result = await agent.execute('Your request here');
  if (result.success) {
    console.log('Success:', result.result);
  } else {
    console.error('Error:', result.error);
  }
} catch (error) {
  console.error('Execution failed:', error.message);
}
```

## Testing

Run the test suite:

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

## Architecture

```
openagentic/
├── src/
│   ├── index.ts                 # Main exports
│   ├── orchestrator.ts          # Standard orchestrator
│   ├── streaming-orchestrator.ts # Streaming orchestrator
│   ├── providers/
│   │   └── manager.ts           # Provider management
│   ├── tools/
│   │   ├── index.ts             # Tool exports
│   │   ├── calculator.ts        # Calculator tool
│   │   ├── http.ts              # HTTP tool
│   │   └── timestamp.ts         # Timestamp tool
│   └── types.ts                 # TypeScript definitions
├── examples/                    # Example scripts
├── tests/                       # Test suite
└── docs/                        # Documentation
```

## Key Improvements

### 🎯 Simplified API
- **Two main functions** instead of multiple complex factory functions
- **Consistent interface** with the same options pattern
- **Auto-detection** of providers from model names
- **Sensible defaults** for all optional parameters

### 🛠️ Self-Contained Tools
- **No shared dependencies** - each tool is completely independent
- **Consistent interface** with JSONSchema validation
- **Category-based organization** (utility, ai, custom)
- **Easy tool creation** with `createTool` utility

### 🚀 Better Developer Experience
- **Type-safe** tool parameters and execution results
- **Provider auto-detection** eliminates configuration complexity
- **Tool management** with add, remove, and categorization
- **Real-time streaming** with native AI SDK integration

### 📦 Modular Architecture
- **Clear separation** between standard and streaming execution
- **Centralized provider management** for consistent model handling
- **Tool registry** for complex scenarios
- **Event-driven** monitoring and debugging

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

**OpenAgentic** - Simplified AI agent orchestration 🤖✨