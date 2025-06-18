# OpenAgentic Examples

This directory contains example scripts and documentation for the OpenAgentic framework.

## 📁 Directory Structure

```
examples/
├── scripts/           # Executable example scripts
│   ├── basic-agent.ts
│   ├── streaming-agent.ts
│   ├── tool-testing.ts
│   └── ...
├── prompts/           # Example prompts and templates
│   └── tool-creation.md
└── README.md         # This file
```

## 🚀 Running Examples

### Basic Agent Examples

```bash
# Basic agent with calculator tool
npm run example:basic

# Streaming agent with real-time responses
npm run example:streaming

# Message array support examples
npm run example:messages
```

### Tool Examples

```bash
# Test individual tools
npm run example:tools

# OpenAI text generation tool
npm run example:openai

# S3 file upload examples
npm run example:s3

# Streaming with onFinish callbacks
npm run example:streaming-callback
```

### Advanced Examples

```bash
# Enhanced logging and debugging
npm run example:logging

# Comprehensive tool testing suite
npm run test:tools

# Test specific tool
npm run test:tools -- --tool calculator
npm run test:tools -- --tool anthropic_chat

# List all available tools
npm run test:tools -- --list
```

## 📊 Tool Testing

The comprehensive tool testing script validates all 14 OpenAgentic tools:

### AI Chat Tools (7 tools)
- `openai_text_generation` - OpenAI GPT models
- `anthropic_chat` - Anthropic Claude models  
- `gemini_chat` - Google Gemini models
- `grok_chat` - xAI Grok models
- `llama_chat` - Meta Llama models
- `perplexity_search` - Perplexity AI search
- `web_search` - OpenAI web search

### Utility Tools (7 tools)
- `calculator` - Mathematical calculations
- `github_contents` - GitHub repository access
- `newsdata_search` - News search with filtering
- `qr_code_generator` - QR code generation
- `openai_image_generator` - DALL-E image generation
- `elevenlabs_tts` - Text-to-speech conversion
- `video_generator` - Google Veo video generation

## 🔧 Environment Setup

Create a `.env` file with your API keys:

```bash
# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
XAI_API_KEY=your_xai_key
LLAMA_API_KEY=your_llama_key
PERPLEXITY_API_KEY=your_perplexity_key

# Utility Services
NEWSDATA_API_KEY=your_newsdata_key
GITHUB_TOKEN=your_github_token
ELEVENLABS_API_KEY=your_elevenlabs_key

# S3 Storage (for media generation tools)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

See `.env.example` for complete setup instructions.

## 📚 Example Categories

### 1. **Agent Creation & Management**
- Creating standard and streaming agents
- Model switching and configuration
- Tool management (add, remove, list)
- Message handling and conversation state

### 2. **Tool Usage & Integration**
- Individual tool examples
- Multi-tool orchestration
- Custom tool creation patterns
- Error handling and validation

### 3. **Advanced Features**
- Logging and debugging configurations
- Message array support (AI SDK compatible)
- Streaming with callbacks and event handling
- Performance monitoring and statistics

### 4. **File Generation & Storage**
- Image generation with DALL-E
- Audio generation with ElevenLabs
- Video generation with Google Veo
- S3 upload and storage management

## 🎯 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Add your API keys to .env
   ```

3. **Run basic example:**
   ```bash
   npm run example:basic
   ```

4. **Test all tools:**
   ```bash
   npm run test:tools
   ```

## 💡 Tips

- Start with `npm run example:basic` to understand core concepts
- Use `npm run test:tools -- --list` to see all available tools
- Check the console output for detailed logging and debugging info
- Most examples work with basic API keys, but some require S3 setup
- Use streaming examples to see real-time AI responses

## 📖 Documentation

For detailed documentation, see:
- [Tool Creation Guide](prompts/tool-creation.md)
- [OpenAgentic Framework Documentation](../guides/OPENAGENTIC.md)
- [Tool Testing Guide](../guides/TOOL_CREATION_GUIDE.md)

---

**Happy building with OpenAgentic!** 🤖✨