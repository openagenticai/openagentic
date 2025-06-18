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
- **Built-in tools**: QR Code generator, GitHub access, news search, and more

### 🔄 Dual Execution Modes
- **Standard execution**: `createAgent()` for non-streaming, complete responses
- **Streaming execution**: `createStreamingAgent()` for real-time response streaming
- **Tool integration** works seamlessly in both modes

### 📊 Enterprise-Ready Features
- **Event-driven architecture** for monitoring and debugging
- **Tool management** (add, remove, categorize tools)
- **Model switching** at runtime
- **Error handling** with detailed error types

### ☁️ AWS S3 Integration
- **File upload utilities** for images, audio, video, HTML, and generic files
- **Automatic content type detection** and file organization
- **Secure credential management** via environment variables
- **Batch upload support** with detailed progress tracking
- **File size validation** and comprehensive error handling

## Quick Start

### Installation

```bash
npm install openagentic
```

### Basic Usage

```typescript
import { createAgent, qrcodeTool, githubTool } from 'openagentic';

// Create a standard agent
const agent = createAgent({
  model: 'gpt-4o-mini', // Auto-detects OpenAI provider
  tools: [qrcodeTool, githubTool],
  systemPrompt: 'You are a helpful assistant.',
});

// Execute a task
const result = await agent.execute('Create a QR code for https://openagentic.org and fetch the README from openai/openai-node');
console.log(result.result);
```

### Streaming Responses

```typescript
import { createStreamingAgent, qrcodeTool } from 'openagentic';

// Create a streaming agent
const streamingAgent = createStreamingAgent({
  model: 'claude-sonnet-4-20250514', // Auto-detects Anthropic provider
  tools: [qrcodeTool],
  systemPrompt: 'You are a helpful assistant.',
});

// Stream responses in real-time
const stream = await streamingAgent.stream('Write a short explanation of QR codes and create one for https://github.com');

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### AWS S3 File Uploads

```typescript
import { uploadImageToS3, generateImageFileName, initializeS3 } from 'openagentic';

// Initialize S3 (validates environment variables)
await initializeS3();

// Generate unique filename
const fileName = generateImageFileName('user avatar photo', 'png');

// Upload image
const imageUrl = await uploadImageToS3(
  imageBuffer,
  fileName,
  'image/png',
  'User profile avatar'
);

console.log('Image uploaded:', imageUrl);
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
  qrcodeTool,        // QR code generation
  githubTool,        // GitHub repository access
  newsdataTool,      // News search
  openaiImageTool,   // DALL-E image generation
  elevenlabsTool,    // Text-to-speech
  videoGenerationTool, // Video generation
} from 'openagentic';
```

### AWS S3 Utilities

Comprehensive S3 file upload functionality:

```typescript
import {
  // Initialization
  initializeS3,
  testS3Connection,
  
  // Upload functions
  uploadFileToS3,
  uploadImageToS3,
  uploadAudioToS3,
  uploadVideoToS3,
  uploadHtmlToS3,
  
  // Filename generators
  generateImageFileName,
  generateAudioFileName,
  generateVideoFileName,
  generateHtmlFileName,
  
  // Utilities
  sanitizeFilename,
  getContentTypeFromExtension,
} from 'openagentic';
```

### Supported Providers

OpenAgentic auto-detects providers based on model names:

#### OpenAI
- **Models**: `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`, `o3`, `o3-mini`
- **Environment**: `OPENAI_API_KEY`

#### Anthropic
- **Models**: `claude-opus-4-20250514`, `claude-sonnet-4-20250514`
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

## Environment Setup

### Required Environment Variables

Create a `.env` file in your project root:

```bash
# AI Provider API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# AWS S3 Configuration (for file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

### AWS S3 Setup

1. **Create an S3 bucket** in your AWS console
2. **Set up IAM user** with S3 permissions
3. **Configure bucket policy** for public read access (if needed)
4. **Set environment variables** as shown above

Required S3 permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

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

### Tool Management

Dynamically manage tools:

```typescript
const agent = createAgent({
  model: 'gpt-4o-mini',
  tools: [qrcodeTool],
});

// Add tools
agent.addTool(githubTool);
agent.addTool(newsdataTool);

// List tools
console.log('All tools:', agent.getAllTools().map(t => t.name));

// Remove tools
agent.removeTool('qr_code_generator');
```

## File Organization

S3 uploads are automatically organized into directories:

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

## Examples

### Basic QR Code Agent

```typescript
import { createAgent, qrcodeTool } from 'openagentic';

const qrAgent = createAgent({
  model: 'gpt-4o-mini',
  tools: [qrcodeTool],
  systemPrompt: 'You are a QR code specialist.',
});

const result = await qrAgent.execute('Create a QR code for https://openagentic.org with high error correction');
console.log(result.result);
```

### GitHub Repository Agent

```typescript
import { createAgent, githubTool } from 'openagentic';

const githubAgent = createAgent({
  model: 'gpt-4o-mini',
  tools: [githubTool],
  systemPrompt: 'You can help users access GitHub repositories.',
});

const result = await githubAgent.execute('Fetch the README.md file from the openai/openai-node repository');
console.log(result.result);
```

### Multi-Tool Agent

```typescript
import { createAgent, qrcodeTool, githubTool, newsdataTool } from 'openagentic';

const multiAgent = createAgent({
  model: 'claude-sonnet-4-20250514',
  tools: [qrcodeTool, githubTool, newsdataTool],
  systemPrompt: 'You are a versatile assistant with access to multiple tools.',
});

const result = await multiAgent.execute(
  'Create a QR code for https://github.com, fetch a README file, and search for AI news'
);
console.log(result.result);
```

### Streaming Story Writer

```typescript
import { createStreamingAgent } from 'openagentic';

const storyAgent = createStreamingAgent({
  model: 'claude-sonnet-4-20250514',
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

For S3 uploads:

```typescript
try {
  const url = await uploadImageToS3(buffer, filename);
  console.log('Upload successful:', url);
} catch (error) {
  console.error('Upload failed:', error.message);
  // Handle specific error cases
  if (error.message.includes('File size')) {
    console.log('File too large, try compressing');
  }
}
```

## Testing

Run the test suite:

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

Run examples:

```bash
npm run example:basic     # Basic agent examples
npm run example:streaming # Streaming agent examples
npm run example:s3        # S3 upload examples
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
│   │   ├── qrcode.ts            # QR code tool
│   │   ├── github.ts            # GitHub tool
│   │   └── newsdata.ts          # News search tool
│   ├── utils/
│   │   ├── index.ts             # Utility exports
│   │   └── s3.ts                # AWS S3 utilities
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

### ☁️ AWS S3 Integration
- **Complete file upload solution** with automatic organization
- **Security-first design** with environment variable configuration
- **Comprehensive error handling** and validation
- **File type detection** and content type management
- **Batch upload support** for multiple files

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
- AWS credentials (for S3 upload functionality)

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

**OpenAgentic** - Simplified AI agent orchestration with AWS S3 integration 🤖☁️✨