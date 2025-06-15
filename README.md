# OpenAgentic

A TypeScript framework for building AI agents with tool orchestration capabilities.

## Overview

OpenAgentic provides a comprehensive framework for creating AI-powered agents that can orchestrate multiple tools and handle complex workflows. Built with TypeScript-first design principles, it offers excellent developer experience with strong typing and modular architecture.

## Features

### 🤖 Unified Orchestrator Design
- Single orchestrator class with flexible configuration
- Auto-detection of AI providers from model names
- Support for streaming and non-streaming execution
- Custom orchestration logic support
- Built-in tool management and model switching

### 🛠️ Self-Contained Tools
- Plugin-based tool system for extensibility
- Built-in tools for common tasks (HTTP requests, calculations, timestamps, AI generation)
- Custom tool creation with type safety
- All tools use @ai-sdk providers when available

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

### Streaming Responses

```typescript
import { createStreamingAgent } from 'openagentic';

const streamingAgent = createStreamingAgent({
  model: 'claude-4-sonnet-20250514', // Auto-detects Anthropic
  systemPrompt: 'You are a creative writer.',
});

// Stream response in real-time
for await (const chunk of streamingAgent.stream('Write a story about AI')) {
  process.stdout.write(chunk.delta);
  if (chunk.done) break;
}
```

### Factory Functions

```typescript
import { 
  createSimpleAgent, 
  createConversationalAgent,
  createMultiModelAgent 
} from 'openagentic';

// Simple agent for quick tasks
const simpleAgent = createSimpleAgent({
  model: 'gpt-4o-mini',
  tools: [mathTool],
});

// Conversational agent with memory
const chatAgent = createConversationalAgent({
  model: 'claude-4-sonnet-20250514',
  systemPrompt: 'You are a helpful tutor.',
});

// Multi-model consensus
const multiAgent = createMultiModelAgent([
  'gpt-4o-mini',
  'claude-4-sonnet-20250514'
]);

const consensus = await multiAgent.executeWithAllModels('Explain quantum computing');
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

## Core Concepts

### Unified Orchestrator

The `Orchestrator` class is the main execution engine:

```typescript
const agent = new Orchestrator({
  model: 'gpt-4o-mini',           // String or AIModel object
  tools: [httpTool, mathTool],    // Array of tools
  systemPrompt: 'You are...',     // Optional system prompt
  maxIterations: 10,              // Max iterations for tool loops
  customLogic: async (input, context) => {
    // Custom orchestration logic
    return await customProcess(input, context);
  }
});

// Core methods
await agent.execute('Your prompt');           // Standard execution
for await (const chunk of agent.stream('Your prompt')) { } // Streaming

// Tool management
agent.addTool(newTool);                      // Add tool
agent.removeTool('toolName');                // Remove tool

// Model switching
agent.switchModel('claude-4-sonnet-20250514'); // Switch model
```

### Built-in Tools

```typescript
import { 
  httpTool,        // HTTP requests
  mathTool,        // Mathematical calculations
  timeTool,        // Timestamp operations
  aiTextTool,      // AI text generation
  aiImageTool,     // AI image generation
  aiCodeTool       // AI code generation
} from 'openagentic';

// All tools are self-contained and use @ai-sdk providers
const agent = new Orchestrator({
  model: 'gpt-4o',
  tools: [httpTool, mathTool, aiTextTool],
});
```

### Custom Tools

```typescript
import { createTool } from 'openagentic';

const customTool = createTool({
  name: 'weather',
  description: 'Get weather information',
  parameters: {
    location: {
      type: 'string',
      description: 'City name',
      required: true,
    },
  },
  execute: async ({ location }) => {
    // Tool implementation
    return { temperature: 72, condition: 'sunny' };
  },
});
```

### Advanced Orchestration

```typescript
// Multi-model orchestration
const multiAgent = createMultiModelAgent(['gpt-4o', 'claude-4-sonnet-20250514']);
const consensus = await multiAgent.executeWithAllModels('Complex question');
const refined = await multiAgent.executeWithRefinement('Initial prompt');

// Pipeline orchestration
const pipeline = createPipeline()
  .addStep('gpt-4o-mini', input => `Brainstorm: ${input}`)
  .addStep('claude-4-sonnet-20250514', (input, prev) => `Refine: ${prev.result}`)
  .addStep('gpt-4o', (input, prev) => `Finalize: ${prev.result}`);

const result = await pipeline.execute('Create a business plan');

// Custom orchestration logic
const customAgent = new Orchestrator({
  model: 'gpt-4o',
  customLogic: async (input, context) => {
    // Your custom orchestration logic
    const step1 = await firstModel.execute(input);
    const step2 = await secondModel.execute(step1.result);
    return combineResults(step1, step2);
  }
});
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
    case 'stream':
      console.log(`Delta: ${event.data.delta}`);
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
│   ├── orchestrator.ts    # Main unified orchestrator
│   ├── ai-provider.ts     # AI provider abstraction
│   ├── tool-registry.ts   # Tool management
│   └── errors.ts          # Error definitions
├── tools/
│   └── index.ts           # Self-contained tools with @ai-sdk
├── providers/
│   └── index.ts           # Provider configurations and metadata
├── utils/
│   ├── simple-event-emitter.ts # Event system
│   ├── helpers.ts         # Utility functions
│   └── validators.ts      # Validation utilities
└── types/
    └── index.ts           # TypeScript definitions
```

## Key Improvements

### 🎯 Simplified Design
- **Single orchestrator class** instead of multiple variants
- **Auto-detection** of providers from model strings
- **Unified interface** for all orchestration patterns
- **Self-contained tools** with minimal dependencies

### 🔧 Enhanced Flexibility
- **Model switching** at runtime
- **Dynamic tool management** (add/remove tools)
- **Custom orchestration logic** via callbacks
- **Streaming support** built-in

### 🚀 Better Developer Experience
- **Factory functions** for common patterns
- **Type-safe** tool and model configuration
- **Event-driven** monitoring and debugging
- **Minimal configuration** required

### 📦 Modular Architecture
- **No cost tracking complexity** (removed)
- **No configuration object sprawl** (simplified)
- **No orchestrator variants** (unified)
- **Tools are self-contained** (not spread across files)

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