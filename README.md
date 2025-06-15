# OpenAgentic

A TypeScript framework for building AI agents with tool orchestration capabilities.

## Overview

OpenAgentic provides a comprehensive framework for creating AI-powered agents that can orchestrate multiple tools and handle complex workflows. Built with TypeScript-first design principles, it offers excellent developer experience with strong typing and modular architecture.

## Features

### 🤖 AI Model Abstraction
- Support for multiple AI providers (OpenAI, Anthropic, Google, Perplexity, xAI)
- Unified interface powered by Vercel's AI SDK
- Easy provider switching and configuration

### 🛠️ Tool Orchestration
- Plugin-based tool system for extensibility
- Built-in tools for common tasks (HTTP requests, calculations, timestamps)
- Custom tool creation with type safety

### 🔄 Orchestration Patterns
- Simple one-shot orchestration
- Conversational agents with memory
- Task-based multi-step orchestration
- Pre-built templates for common use cases

### 📊 Monitoring & Debugging
- Comprehensive event system for real-time monitoring
- Detailed execution logs and metrics
- Error handling and recovery
- Debug mode for development

## Quick Start

### Installation

```bash
npm install openagentic
```

### Basic Usage

```typescript
import { createSimpleAgent, httpRequestTool, calculatorTool } from 'openagentic';

// Create a simple agent
const agent = createSimpleAgent({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: 'your-api-key',
  tools: [httpRequestTool, calculatorTool],
  systemPrompt: 'You are a helpful assistant that can fetch data and perform calculations.'
});

// Execute a task
const result = await agent.execute('What is the current price of Bitcoin in USD?');
console.log(result.result);
```

### Conversational Agent

```typescript
import { createConversationalAgent } from 'openagentic';

const agent = createConversationalAgent({
  provider: 'anthropic',
  model: 'claude-4-sonnet-20250514',
  apiKey: 'your-api-key'
});

// Have a conversation
await agent.continueConversation('Hello, I need help with my project.');
await agent.continueConversation('Can you help me plan a marketing strategy?');
await agent.continueConversation('What about social media campaigns?');
```

### Task-Based Agent

```typescript
import { createTaskAgent } from 'openagentic';

const agent = createTaskAgent({
  provider: 'google',
  model: 'gemini-2.5-pro-preview-06-05',
  apiKey: 'your-api-key',
  steps: [
    { name: 'research', description: 'Research the topic thoroughly' },
    { name: 'outline', description: 'Create a detailed outline' },
    { name: 'write', description: 'Write the content' },
    { name: 'review', description: 'Review and refine' }
  ]
});

const result = await agent.executeTask('Write a blog post about AI agents');
```

## Supported Providers

OpenAgentic supports all major AI providers through Vercel's AI SDK:

### OpenAI
```typescript
import { createOpenAIModel, openAIModels } from 'openagentic';

// Individual model
const model = createOpenAIModel({
  model: 'gpt-4o',
  apiKey: 'your-key'
});

// Pre-configured models
const gpt4o = openAIModels.gpt4o('your-key');
const o3 = openAIModels.o3('your-key');
const o3Mini = openAIModels.o3Mini('your-key');
```

### Anthropic
```typescript
import { createAnthropicModel, anthropicModels } from 'openagentic';

// Latest Claude 4 models
const claude4Opus = anthropicModels.claude4Opus('your-key');
const claude4Sonnet = anthropicModels.claude4Sonnet('your-key');
```

### Google
```typescript
import { createGoogleModel, googleModels, createGoogleVertexModel } from 'openagentic';

// Google AI Studio - Latest Gemini 2.5 models
const gemini25Pro = googleModels.gemini25ProPreview('your-key');
const gemini25Flash = googleModels.gemini25FlashPreview('your-key');

// Google Vertex AI
const vertexModel = createGoogleVertexModel({
  model: 'gemini-2.5-pro-preview-06-05',
  project: 'your-project-id',
  location: 'us-central1'
});
```

### Perplexity
```typescript
import { perplexityModels } from 'openagentic';

const sonar = perplexityModels.sonar('your-key');
```

### xAI
```typescript
import { xaiModels } from 'openagentic';

const grok = xaiModels.grok('your-key');
```

## Core Concepts

### Orchestrators

Orchestrators are the main execution engines that coordinate between AI models and tools:

- **SimpleOrchestrator**: For single-task execution
- **ConversationalOrchestrator**: For multi-turn conversations with memory
- **TaskOrchestrator**: For multi-step task execution

### Tools

Tools extend agent capabilities:

```typescript
import { createTool } from 'openagentic';

const weatherTool = createTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: {
    location: {
      type: 'string',
      description: 'City name or coordinates',
      required: true
    }
  },
  execute: async ({ location }) => {
    // Fetch weather data
    return { temperature: 72, condition: 'sunny' };
  },
  costEstimate: 0.001
});
```

### Cost Tracking

Monitor and control costs:

```typescript
const agent = createSimpleAgent({
  // ... configuration
  budget: {
    maxCost: 0.50,        // Maximum $0.50
    maxTokens: 10000,     // Maximum 10K tokens
    maxToolCalls: 20      // Maximum 20 tool calls
  }
});

// Get cost information
const cost = agent.getCostTracking();
console.log(`Estimated cost: $${cost.estimatedCost.toFixed(4)}`);
```

### Event Monitoring

Monitor execution in real-time:

```typescript
agent.onEvent((event) => {
  switch (event.type) {
    case 'tool_call':
      console.log(`Calling tool: ${event.data.toolName}`);
      break;
    case 'cost_update':
      console.log(`Cost: $${event.data.estimatedCost.toFixed(4)}`);
      break;
    case 'complete':
      console.log('Execution completed');
      break;
  }
});
```

## Built-in Templates

Pre-configured agents for common use cases:

```typescript
import {
  createResearchAssistant,
  createDataAnalyst,
  createCustomerService,
  createContentCreator,
  createProjectManager
} from 'openagentic';

// Research assistant with web access
const researcher = createResearchAssistant({
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: 'your-key'
});

// Data analyst with calculation tools
const analyst = createDataAnalyst({
  provider: 'anthropic',
  model: 'claude-4-sonnet-20250514',
  apiKey: 'your-key'
});
```

## Advanced Configuration

### Custom AI Provider

```typescript
import { createCustomModel, Orchestrator } from 'openagentic';

const customModel = createCustomModel({
  model: 'my-custom-model',
  baseURL: 'https://api.example.com/v1',
  apiKey: 'custom-key'
});

const orchestrator = new Orchestrator({
  model: customModel,
  tools: [],
  maxIterations: 10,
  streaming: true,
  debug: true
});
```

### Tool Development

```typescript
import { createAsyncTool } from 'openagentic';

const databaseTool = createAsyncTool(
  'database_query',
  'Execute database queries',
  {
    query: { type: 'string', required: true },
    database: { type: 'string', required: false }
  },
  async ({ query, database = 'default' }) => {
    // Execute database query
    return { rows: [], count: 0 };
  },
  0.002 // Cost estimate
);
```

## Architecture

```
openagentic/
├── core/              # Core orchestration logic
│   ├── orchestrator   # Main orchestration engine
│   ├── ai-provider    # AI model abstraction (AI SDK)
│   ├── cost-tracker   # Cost management
│   └── tool-registry  # Tool management
├── tools/             # Tool system
│   ├── built-in       # Pre-built tools
│   └── factory        # Tool creation utilities
├── orchestrators/     # Orchestrator variants
│   ├── simple         # Simple orchestration
│   ├── conversational # Conversational agents
│   ├── task           # Task-based execution
│   └── templates      # Pre-configured templates
├── providers/         # AI provider integrations
└── utils/             # Utility functions
```

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

**OpenAgentic** - Building the future of AI agent orchestration 🤖✨