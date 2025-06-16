@ -0,0 +1,513 @@
# OpenAgentic Tool Creation Guide

## Overview

This guide explains how to create new tools for the OpenAgentic framework. Tools are self-contained components that extend AI agents with specific capabilities like calculations, HTTP requests, text-to-speech generation, and more.

## Tool Architecture

OpenAgentic tools follow a consistent structure that includes:

1. **Raw Tool Definition**: Using the AI SDK's `tool()` function
2. **Tool Details**: Metadata for identification and organization
3. **Tool Export**: Converting to OpenAgentic format using `toOpenAgenticTool()`

## Basic Structure

Every tool follows this pattern:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// 1. Define the raw tool
const rawMyTool = tool({
  description: 'Brief description of what the tool does',
  parameters: z.object({
    // Zod schema for parameters
  }),
  execute: async ({ ...params }) => {
    // Implementation logic
    return result;
  },
});

// 2. Define tool metadata
const toolDetails: ToolDetails = {
  toolId: 'my_tool',
  name: 'My Tool',
  useCases: [],
  parameters: {},
  logo: '',
};

// 3. Export the complete tool
export const myTool = toOpenAgenticTool(rawMyTool, toolDetails);
```

## Step-by-Step Guide

### 1. Set Up Imports

Every tool needs these standard imports:

```typescript
import { tool } from 'ai';            // AI SDK tool function
import { z } from 'zod';              // Schema validation
import type { ToolDetails } from '../types';  // Tool metadata type
import { toOpenAgenticTool } from './utils';  // Utility for tool conversion
```

### 2. Define Parameters Schema

Use Zod to define strongly-typed parameters:

```typescript
const parameters = z.object({
  // Required string parameter
  text: z.string().describe('Text to process'),
  
  // Optional enum parameter with default
  format: z.enum(['json', 'text', 'xml'])
    .optional()
    .default('json')
    .describe('Output format'),
  
  // Optional number with validation
  maxLength: z.number()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum length of output'),
  
  // Optional object parameter
  options: z.object({
    includeMetadata: z.boolean().optional(),
    customHeaders: z.record(z.string()).optional(),
  }).optional().describe('Additional options'),
});
```

### 3. Implement Execute Function

The execute function contains your tool's core logic:

```typescript
execute: async ({ text, format = 'json', maxLength, options }) => {
  try {
    // Input validation
    if (!text || text.trim().length === 0) {
      throw new Error('Text parameter is required and cannot be empty');
    }

    // Your implementation logic here
    const result = await processText(text, format, maxLength, options);

    // Return structured result
    return {
      success: true,
      data: result,
      format,
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Proper error handling
    throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
},
```

### 4. Define Tool Details

Provide metadata for tool identification:

```typescript
const toolDetails: ToolDetails = {
  toolId: 'unique_tool_id',           // Unique identifier
  name: 'Human Readable Name',        // Display name
  useCases: [],                       // Array of use case strings
  parameters: {},                     // Additional parameter info
  logo: '',                          // Logo URL or path
  internal?: boolean,                 // Optional: mark as internal tool
};
```

### 5. Export the Tool

Convert and export using the utility function:

```typescript
export const myTool = toOpenAgenticTool(rawMyTool, toolDetails);
```

## Complete Example: ElevenLabs TTS Tool

Here's a complete implementation of an ElevenLabs Text-to-Speech tool:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

const rawElevenLabsTTSTool = tool({
  description: 'Generate high-quality text-to-speech audio using ElevenLabs API',
  parameters: z.object({
    text: z.string()
      .min(1)
      .max(5000)
      .describe('Text to convert to speech (max 5000 characters)'),
    
    voiceId: z.string()
      .optional()
      .default('21m00Tcm4TlvDq8ikWAM')
      .describe('ElevenLabs voice ID (default: Rachel)'),
    
    modelId: z.string()
      .optional()
      .default('eleven_monolingual_v1')
      .describe('ElevenLabs model ID'),
    
    stability: z.number()
      .min(0)
      .max(1)
      .optional()
      .default(0.5)
      .describe('Voice stability (0-1, default: 0.5)'),
    
    similarityBoost: z.number()
      .min(0)
      .max(1)
      .optional()
      .default(0.5)
      .describe('Similarity boost (0-1, default: 0.5)'),
    
    style: z.number()
      .min(0)
      .max(1)
      .optional()
      .default(0)
      .describe('Style setting (0-1, default: 0)'),
    
    useSpeakerBoost: z.boolean()
      .optional()
      .default(true)
      .describe('Use speaker boost for better quality'),
  }),
  
  execute: async ({ 
    text, 
    voiceId = '21m00Tcm4TlvDq8ikWAM', 
    modelId = 'eleven_monolingual_v1',
    stability = 0.5,
    similarityBoost = 0.5,
    style = 0,
    useSpeakerBoost = true
  }) => {
    // Validate API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }

    // Validate text input
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (text.length > 5000) {
      throw new Error('Text exceeds maximum length of 5000 characters');
    }

    try {
      // Prepare request body
      const requestBody = {
        text: text.trim(),
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      };

      // Make API request
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      // Get audio data
      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      // Calculate audio duration estimate (rough approximation)
      const wordsPerMinute = 150;
      const wordCount = text.split(/\s+/).length;
      const estimatedDurationSeconds = Math.ceil((wordCount / wordsPerMinute) * 60);

      return {
        success: true,
        audioData: audioBase64,
        audioFormat: 'audio/mpeg',
        audioSize: audioBuffer.byteLength,
        estimatedDuration: estimatedDurationSeconds,
        text: text.trim(),
        voiceId,
        modelId,
        settings: {
          stability,
          similarityBoost,
          style,
          useSpeakerBoost,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'elevenlabs_tts',
  name: 'ElevenLabs TTS',
  useCases: [
    'Convert text to high-quality speech',
    'Generate voiceovers for content',
    'Create audio from written content',
    'Produce speech in multiple voices',
  ],
  parameters: {
    text: 'Text to convert to speech',
    voiceId: 'ElevenLabs voice identifier',
    modelId: 'TTS model to use',
    stability: 'Voice stability setting',
    similarityBoost: 'Voice similarity boost',
  },
  logo: 'https://elevenlabs.io/favicon.ico',
};

export const elevenLabsTTSTool = toOpenAgenticTool(rawElevenLabsTTSTool, toolDetails);
```

## Best Practices

### 1. Error Handling

Always implement comprehensive error handling:

```typescript
execute: async (params) => {
  try {
    // Validate inputs
    if (!params.requiredField) {
      throw new Error('Required field is missing');
    }

    // Your logic here
    const result = await performOperation(params);
    
    return result;
  } catch (error) {
    // Provide helpful error messages
    throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### 2. Input Validation

Use Zod schemas for runtime validation:

```typescript
parameters: z.object({
  email: z.string().email().describe('Valid email address'),
  age: z.number().int().min(0).max(120).describe('Age in years'),
  url: z.string().url().describe('Valid URL'),
  data: z.array(z.string()).min(1).describe('Non-empty array of strings'),
})
```

### 3. Environment Variables

Handle API keys and secrets securely:

```typescript
execute: async (params) => {
  const apiKey = process.env.SERVICE_API_KEY;
  if (!apiKey) {
    throw new Error('SERVICE_API_KEY environment variable is required');
  }
  
  // Use apiKey safely
}
```

### 4. Return Consistent Data

Structure your return values consistently:

```typescript
return {
  success: true,
  data: processedData,
  metadata: {
    processedAt: new Date().toISOString(),
    processingTime: Date.now() - startTime,
    version: '1.0.0',
  },
  // Additional relevant fields
};
```

### 5. Parameter Descriptions

Provide clear, helpful descriptions:

```typescript
parameters: z.object({
  query: z.string()
    .min(1)
    .max(500)
    .describe('Search query (1-500 characters, required)'),
  
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe('Maximum number of results to return (1-100, default: 10)'),
})
```

## Tool Categories

### Utility Tools
Self-contained tools that don't require AI:
- Calculator (mathematical operations)
- HTTP client (API requests)
- Timestamp (date/time operations)
- File operations
- Data transformations

### Service Integration Tools
Tools that integrate with external services:
- ElevenLabs TTS (text-to-speech)
- Weather APIs
- Database operations
- Cloud storage
- Email services

### AI-Powered Tools
Tools that use AI capabilities:
- Content generation
- Text analysis
- Image processing
- Translation services

## Testing Your Tool

Create a simple test to verify your tool works:

```typescript
// test-my-tool.ts
import { myTool } from './src/tools/my-tool';

async function testTool() {
  try {
    const result = await myTool.execute({
      text: 'Hello, world!',
      format: 'json',
    });
    
    console.log('✅ Tool test passed:', result);
  } catch (error) {
    console.error('❌ Tool test failed:', error);
  }
}

testTool();
```

## Using Your Tool

Once created, use your tool with an agent:

```typescript
import { createAgent } from 'openagentic';
import { myTool } from './src/tools/my-tool';

const agent = createAgent({
  model: 'gpt-4o-mini',
  tools: [myTool],
  systemPrompt: 'You have access to my custom tool.',
});

const result = await agent.execute('Use my tool to process some text');
```

## Adding to Tool Collections

To make your tool available as part of the framework:

1. Add it to `src/tools/index.ts`:

```typescript
export { myTool } from './my-tool';

// Add to collections
import { myTool } from './my-tool';
export const utilityTools = [httpTool, calculatorTool, timestampTool, myTool];
```

2. Update the main exports in `src/index.ts` if needed.

## Environment Setup

For tools requiring API keys, document the environment variables:

```bash
# .env file
ELEVENLABS_API_KEY=your_api_key_here
OTHER_SERVICE_KEY=another_key
```

And provide clear documentation:

```markdown
## Environment Variables

- `ELEVENLABS_API_KEY`: Required for TTS functionality. Get from [ElevenLabs](https://elevenlabs.io)
- `OTHER_SERVICE_KEY`: Required for other service integration
```

## Conclusion

Creating tools for OpenAgentic is straightforward once you understand the pattern:

1. Define parameters with Zod schemas
2. Implement the execute function with proper error handling
3. Add tool metadata
4. Export using `toOpenAgenticTool()`

The framework handles the rest, including parameter validation, error propagation, and integration with AI agents.

Start with simple tools and gradually add more complex functionality as needed. Remember to test thoroughly and provide clear documentation for other developers. 
