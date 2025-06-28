# OpenAgentic

A powerful TypeScript framework for building AI agents with self-contained tool orchestration capabilities. Create intelligent agents that can seamlessly integrate with multiple AI providers and execute complex tasks using a rich ecosystem of built-in tools.

[![npm version](https://badge.fury.io/js/openagentic.svg)](https://badge.fury.io/js/openagentic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- 🤖 **Multi-Provider AI Support** - OpenAI, Anthropic, Google, xAI, Perplexity, and more
- 🔧 **17+ Built-in Tools** - From QR codes to video generation, GitHub integration to web search  
- ⚡ **Streaming & Non-Streaming** - Real-time responses or batch processing
- 🎯 **Smart Orchestration** - Custom logic and prompt-based orchestrators
- 📝 **TypeScript Native** - Full type safety with Zod validation
- 🔄 **Dynamic Tool Management** - Add, remove, and manage tools at runtime
- 📊 **Advanced Logging** - Comprehensive debugging and performance monitoring
- 🌐 **AI SDK Compatible** - Works seamlessly with [Vercel's AI SDK](https://ai-sdk.dev/docs/introduction)

## 🚀 Quick Start

### Installation

OpenAgentic is compatible with all major Node.js package managers:

```bash
# npm
npm install openagentic

# pnpm  
pnpm add openagentic

# yarn
yarn add openagentic

# bun
bun add openagentic
```

### Basic Usage

```typescript
import { createAgent, qrcodeTool, githubTool } from 'openagentic';

// Create a simple agent
const agent = createAgent({
  model: 'gpt-4o-mini', // Auto-detects OpenAI provider
  tools: [qrcodeTool, githubTool], // Specify tool subset to use
  systemPrompt: 'You are a helpful assistant with access to tools.',
});

// Execute a task
const result = await agent.execute(
  'Create a QR code for https://github.com/openagenticai/openagentic'
);

console.log(result.result);
console.log('Tools used:', result.toolCallsUsed);
```

### Streaming Agent

```typescript
import { createStreamingAgent, websearchTool } from 'openagentic';

const streamingAgent = createStreamingAgent({
  model: 'claude-sonnet-4-20250514',
  tools: [websearchTool],
  onFinish: (result) => {
    console.log('Streaming completed:', result);
  }
});

// Stream responses in real-time
for await (const chunk of streamingAgent.stream('Search for the latest AI news')) {
  process.stdout.write(chunk);
}
```

## 🛠️ Built-in Tools

OpenAgentic comes with 50+ pre-built tools organized into categories:

### AI & Search Tools (11)
- **OpenAI Text Generation** - GPT model integration
- **Anthropic Chat** - Claude model integration  
- **Gemini Chat** - Google's Gemini models
- **Grok Chat** - xAI's Grok models
- **Llama Chat** - Meta's Llama models
- **Mistral Chat** - Mistral AI's models
- **Cohere Chat** - Cohere AI's models
- **Perplexity Search** - AI-powered web search
- **Web Search** - General web search capabilities
- **Inception Labs** - Advanced AI chat
- **Groq** - Groq's models


### Utility Tools (13)
- **GitHub Integration** - Repository and file access
- **News Search** - Real-time news with filtering
- **QR Code Generator** - Customizable QR code creation
- **Image Generation (3)** - OpenAI DALL-E, Unsplash, Luma, and Gemini imaging
- **Text-to-Speech (2)** - ElevenLabs and Gemini TTS
- **Video Generation** - Google Veo video creation
- **HTML Composer** - Dynamic web page generation
- **Vector Store Search** - OpenAI vector store search
- **Slack Poster** - Post in Slack channels

### [LangChain Tools](https://js.langchain.com/docs/integrations/tools/) (27+)

### Usage Example

```typescript
import { 
  createAgent, 
  qrcodeTool, 
  githubTool, 
  openaiImageTool,
  elevenlabsTool 
} from 'openagentic';

const multiToolAgent = createAgent({
  model: 'gpt-4o',
  tools: [qrcodeTool, githubTool, openaiImageTool, elevenlabsTool],
  systemPrompt: 'You are a creative assistant with access to multiple tools.',
});

const result = await multiToolAgent.execute(`
  1. Create a QR code for our GitHub repo
  2. Generate an image of a futuristic robot
  3. Convert this text to speech: "Welcome to OpenAgentic!"
`);
```

## ☁️ AWS S3 Integration

OpenAgentic includes comprehensive AWS S3 integration for file uploads and management:

### S3 Features
- **Automatic file organization** into categorized directories
- **Content type detection** and file validation
- **Secure credential management** via environment variables
- **Batch upload support** with progress tracking
- **File size validation** and error handling

### S3 Usage

```typescript
import { 
  uploadImageToS3, 
  uploadAudioToS3,
  uploadVideoToS3,
  generateImageFileName,
  initializeS3 
} from 'openagentic';

// Initialize S3 connection
await initializeS3();

// Upload an image
const fileName = generateImageFileName('user avatar', 'png');
const imageUrl = await uploadImageToS3(
  imageBuffer,
  fileName,
  'image/png',
  'User profile avatar'
);

// Upload audio file
const audioUrl = await uploadAudioToS3(
  audioBuffer,
  'speech-output.mp3',
  'audio/mpeg'
);
```

### File Organization

Files are automatically organized in your S3 bucket:

```
your-bucket/
├── openagentic/
│   ├── images/         # Image files (.jpg, .png, .gif, etc.)
│   ├── audio/          # Audio files (.mp3, .wav, .ogg, etc.)
│   ├── videos/         # Video files (.mp4, .avi, .mov, etc.)
│   ├── documents/      # Document files (.pdf, .doc, .txt, etc.)
│   ├── websites/       # HTML files (.html, .htm)
│   └── uploads/        # Generic files
```

## 🔗 Using LangChain Tools

OpenAgentic provides seamless compatibility with LangChain tools, allowing you to use the vast ecosystem of LangChain tools alongside native OpenAgentic tools.

### Auto-Conversion

LangChain tools are automatically detected and converted when passed to `createAgent()`:

```typescript
import { createAgent } from 'openagentic';
import { DallEAPIWrapper } from '@langchain/openai';
import { SerpAPI } from '@langchain/community/tools/serpapi';

// LangChain tools are automatically converted
const agent = createAgent({
  model: 'gpt-4o-mini',
  tools: [
    new DallEAPIWrapper(), // LangChain tool - auto-converted
    new SerpAPI()          // LangChain tool - auto-converted
  ],
});

const result = await agent.execute('Generate an image of a sunset and search for sunset photography tips');
```

### Manual Conversion

For more control over the conversion process:

```typescript
import { convertLangchainTool, createAgent } from 'openagentic';
import { DallEAPIWrapper } from '@langchain/openai';

// Create LangChain tool
const dalleTool = new DallEAPIWrapper({
  model: 'dall-e-3',
  n: 1
});

// Convert with custom options
const convertedTool = await convertLangchainTool(dalleTool, {
  toolId: 'custom_dalle',
  useCases: [
    'Generate marketing visuals',
    'Create concept art',
    'Prototype designs'
  ],
  logo: '🎨'
});

const agent = createAgent({
  model: 'gpt-4o-mini',
  tools: [convertedTool]
});
```

### Mixed Tool Usage

Combine LangChain tools with native OpenAgentic tools:

```typescript
import { createAgent, qrcodeTool, openaiTool } from 'openagentic';
import { DallEAPIWrapper } from '@langchain/openai';

const agent = createAgent({
  model: 'gpt-4o-mini',
  tools: [
    openaiTool,               // Native OpenAgentic tool
    new DallEAPIWrapper(),    // LangChain tool (auto-converted)
    qrcodeTool               // Native OpenAgentic tool
  ]
});
```

### Supported LangChain Tool Types

- **Tool** - Basic LangChain tools with `call()` method
- **StructuredTool** - Advanced tools with schema and `invoke()` method
- **DynamicTool** - Dynamically created tools
- **Custom Tools** - Any tool implementing LangChain's tool interface

## 🎯 Advanced Features

### Multi-Provider Support

```typescript
// OpenAI
const openaiAgent = createAgent({ model: 'gpt-4o-mini' });

// Anthropic  
const claudeAgent = createAgent({ model: 'claude-sonnet-4-20250514' });

// Google
const geminiAgent = createAgent({ model: 'gemini-1.5-pro' });

// xAI
const grokAgent = createAgent({ model: 'grok-beta' });

// Custom provider configuration
const customAgent = createAgent({
  model: {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'your-key',
    temperature: 0.7,
    maxTokens: 1000
  }
});
```

### Dynamic Tool Management

```typescript
const agent = createAgent({
  model: 'gpt-4o-mini',
  tools: [qrcodeTool] // Start with one tool
});

// Add tools at runtime
agent.addTool(githubTool);
agent.addTool(websearchTool);

// Remove tools
agent.removeTool('qr_code_generator');

// List all tools
const availableTools = agent.getAllTools();
console.log('Available tools:', availableTools.map(t => t.name));
```

### Custom Logic & Orchestrators

```typescript
const customAgent = createAgent({
  model: 'gpt-4o-mini',
  tools: [qrcodeTool],
  customLogic: async (input, context) => {
    // Pre-process input
    if (input.includes('urgent')) {
      return {
        content: 'This requires immediate attention!',
        priority: 'high'
      };
    }
    return null; // Continue with normal processing
  }
});

// Using orchestrators for advanced control
const orchestratedAgent = createAgent({
  model: 'gpt-4o-mini',
  tools: [websearchTool],
  orchestrator: 'multi-ai', // Built-in orchestrator
  orchestratorParams: {
    fallbackModels: ['claude-sonnet-4-20250514', 'gemini-1.5-pro']
  }
});
```

### Message Array Support (AI SDK Compatible)

```typescript
import type { CoreMessage } from 'openagentic';

const messages: CoreMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' },
  { role: 'assistant', content: 'Hi! How can I help you?' },
  { role: 'user', content: 'Create a QR code for my website.' }
];

const result = await agent.execute(messages);
```

### Advanced Logging & Debugging

```typescript
const debugAgent = createAgent({
  model: 'gpt-4o-mini',
  tools: [qrcodeTool],
  enableDebugLogging: true,
  logLevel: 'detailed',
  enableStepLogging: true,
  enableToolLogging: true,
  enableTimingLogging: true,
  enableStatisticsLogging: true
});

const result = await debugAgent.execute('Create a QR code');

// Access execution statistics
console.log('Execution stats:', result.executionStats);
console.log('Token usage:', result.usage);
```

## 🔧 API Reference

### Core Functions

#### `createAgent(options)`

Creates a standard agent for non-streaming execution.

```typescript
interface AgentOptions {
  model: string | AIModel;
  tools?: Tool[];
  systemPrompt?: string;
  maxIterations?: number;
  customLogic?: (input: string, context: any) => Promise<any>;
  apiKeys?: ApiKeyMap;
  enableDebugLogging?: boolean;
  logLevel?: 'none' | 'basic' | 'detailed';
  // ... additional options
}
```

#### `createStreamingAgent(options)`

Creates a streaming agent for real-time responses.

```typescript
interface StreamingAgentOptions extends AgentOptions {
  onFinish?: (result: any) => void | Promise<void>;
}
```

### Agent Methods

```typescript
// Execute tasks
await agent.execute(input: string | CoreMessage[]): Promise<ExecutionResult>

// Streaming execution  
for await (const chunk of agent.stream(input)) { /* handle chunk */ }

// Tool management
agent.addTool(tool: Tool): void
agent.removeTool(toolId: string): void
agent.getAllTools(): Tool[]

// Model management
agent.switchModel(model: string | AIModel): void
agent.getModelInfo(): AIModel
```

### Supported AI Providers

OpenAgentic auto-detects providers from model names:

**OpenAI**: `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`, `o3`, `o3-mini`
**Anthropic**: `claude-opus-4-20250514`, `claude-sonnet-4-20250514`, `claude-haiku-4-20250514`
**Google**: `gemini-2.0-flash-exp`, `gemini-1.5-pro`, `gemini-1.5-flash`
**xAI**: `grok-beta`, `grok-2-vision-1212`
**Perplexity**: `llama-3.1-sonar-small-128k-online`, `llama-3.1-sonar-large-128k-online`

## 🌍 Environment Setup

Create a `.env` file with your API keys:

```bash
# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key  
GOOGLE_API_KEY=your_google_key
XAI_API_KEY=your_xai_key
PERPLEXITY_API_KEY=your_perplexity_key

# Utility Services
GITHUB_TOKEN=your_github_token
NEWSDATA_API_KEY=your_newsdata_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# AWS/S3 (for media generation)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

## 📚 Examples

The package includes comprehensive examples in the `examples/` directory:

```bash
# Basic agent usage
npm run example:basic

# Streaming responses
npm run example:streaming

# Tool testing and validation
npm run test:tools

# Orchestrator testing and validation
npm run test:orchestrators

# Advanced logging
npm run example:logging

# S3 integration
npm run example:s3
```

## 🔍 Tool Development

Create custom tools using the OpenAgentic tool interface:

```typescript
import { z } from 'zod';
import { toOpenAgenticTool } from 'openagentic/tools';

const customTool = toOpenAgenticTool({
  toolId: 'custom_calculator',
  name: 'Custom Calculator',
  description: 'Performs mathematical calculations',
  useCases: ['Math', 'Calculations'],
  logo: '🧮',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression to evaluate')
  }),
  execute: async ({ expression }) => {
    // Implement your tool logic
    return { result: eval(expression) };
  }
});

// Use in agent
const agent = createAgent({
  model: 'gpt-4o-mini',
  tools: [customTool]
});
```

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING](CONTRIBUTING.md) guidelines for more details.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/openagenticai/openagentic)
- [npm Package](https://www.npmjs.com/package/openagentic)
- [Issues & Bug Reports](https://github.com/openagenticai/openagentic/issues)
- [Website](https://openagentic.org)

---

**Build powerful AI agents with OpenAgentic** 🤖✨
