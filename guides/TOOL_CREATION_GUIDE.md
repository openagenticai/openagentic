# OpenAgentic Tool Creation Guide

## Overview

This guide explains how to create new tools for the OpenAgentic framework. Tools are self-contained components that extend AI agents with specific capabilities like QR code generation, GitHub repository access, news search, and more.

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
  logo: '',                          // Logo URL or path
  internal?: boolean,                 // Optional: mark as internal tool
};
```

### 5. Export the Tool

Convert and export using the utility function:

```typescript
export const myTool = toOpenAgenticTool(rawMyTool, toolDetails);
```

## Complete Example: QR Code Tool

Here's a complete implementation of a QR code generation tool:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import * as QRCode from 'qrcode';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Error correction levels for QR codes
const ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const;

const rawQRCodeTool = tool({
  description: 'Generate QR codes with customizable appearance and error correction levels for various use cases',
  parameters: z.object({
    text: z.string()
      .min(1)
      .max(4000)
      .describe('The text to encode in the QR code (required, max 4000 characters)'),
    
    size: z.number()
      .int()
      .min(100)
      .max(2000)
      .optional()
      .default(512)
      .describe('The size of the QR code in pixels (default: 512, min: 100, max: 2000)'),
      
    errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H'])
      .optional()
      .default('M')
      .describe('Error correction level (L=Low ~7%, M=Medium ~15%, Q=Quartile ~25%, H=High ~30%, default: M)'),
      
    darkColor: z.string()
      .optional()
      .default('#000000')
      .describe('Color of dark modules in hex format (default: #000000)'),
      
    lightColor: z.string()
      .optional()
      .default('#FFFFFF')
      .describe('Color of light modules in hex format (default: #FFFFFF)')
  }),
  
  execute: async ({ 
    text,
    size = 512,
    errorCorrectionLevel = 'M',
    darkColor = '#000000',
    lightColor = '#FFFFFF'
  }) => {
    // Validate text input
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (text.length > 4000) {
      throw new Error('Text exceeds maximum length of 4000 characters');
    }

    // Validate size
    if (size < 100) {
      throw new Error('Size must be at least 100 pixels');
    }

    if (size > 2000) {
      throw new Error('Size cannot exceed 2000 pixels');
    }

    // Validate colors (basic hex validation)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (!hexColorRegex.test(darkColor)) {
      throw new Error(`Invalid dark color format: ${darkColor}. Please use hex format like #000000`);
    }

    if (!hexColorRegex.test(lightColor)) {
      throw new Error(`Invalid light color format: ${lightColor}. Please use hex format like #FFFFFF`);
    }

    // Validate error correction level
    if (!ERROR_CORRECTION_LEVELS.includes(errorCorrectionLevel)) {
      throw new Error(`Invalid error correction level: ${errorCorrectionLevel}. Must be one of: L, M, Q, H`);
    }

    // Start logging
    console.log('📱 QR Code Tool - Generation started:', {
      textLength: text.length,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      size,
      errorCorrectionLevel,
      darkColor,
      lightColor,
    });

    try {
      // Generate QR code buffer
      const qrCodeBuffer = await QRCode.toBuffer(text, {
        type: 'png',
        width: size,
        errorCorrectionLevel,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        margin: 2, // Add small margin around QR code
      });

      // Convert buffer to base64 data URL
      const qrCodeDataUrl = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;

      // Log completion
      console.log('✅ QR Code Tool - Generation completed:', {
        textLength: text.length,
        size,
        errorCorrectionLevel,
        bufferSize: qrCodeBuffer.length,
        hasCustomColors: darkColor !== '#000000' || lightColor !== '#FFFFFF',
        dataUrlLength: qrCodeDataUrl.length,
      });

      // Return structured result
      return {
        success: true,
        qrCodeDataUrl,
        encodedText: text,
        size,
        errorCorrectionLevel,
        darkColor,
        lightColor,
        metadata: {
          generatedAt: new Date().toISOString(),
          textLength: text.length,
          bufferSize: qrCodeBuffer.length,
          dimensions: `${size}x${size}`,
          hasCustomColors: darkColor !== '#000000' || lightColor !== '#FFFFFF',
        },
      };

    } catch (error) {
      console.error('❌ QR Code Tool - Generation failed:', {
        textLength: text.length,
        size,
        errorCorrectionLevel,
        darkColor,
        lightColor,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Text too complex for error correction level
        if (error.message.includes('too big') || error.message.includes('capacity')) {
          throw new Error(`Text is too complex for error correction level ${errorCorrectionLevel}. Try using a higher error correction level (Q or H) or reduce the text length.`);
        }
        
        // Invalid data errors
        if (error.message.includes('invalid') || error.message.includes('malformed')) {
          throw new Error('Text contains invalid characters for QR code generation. Please check your input.');
        }
        
        // Buffer generation errors
        if (error.message.includes('buffer') || error.message.includes('memory')) {
          throw new Error('Failed to generate QR code buffer. The requested size may be too large.');
        }
        
        // Color format errors
        if (error.message.includes('color') || error.message.includes('hex')) {
          throw new Error('Invalid color format. Please use hex colors like #000000 or #FFFFFF.');
        }
        
        // Size errors
        if (error.message.includes('size') || error.message.includes('width')) {
          throw new Error(`Invalid size parameter: ${size}. Size must be between 100 and 2000 pixels.`);
        }
        
        // Encoding errors
        if (error.message.includes('encoding') || error.message.includes('base64')) {
          throw new Error('Failed to encode QR code image. Please try again.');
        }
      }

      // Generic error fallback
      throw new Error(`QR code generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'qr_code_generator',
  name: 'QR Code Generator',
  useCases: [
    'Generate QR codes for website URLs',
    'Create QR codes for contact information (vCard)',
    'Generate WiFi network sharing QR codes',
    'Create QR codes for text messages',
    'Generate QR codes for social media profiles',
    'Create custom-colored QR codes for branding',
    'Generate QR codes for app download links',
    'Create QR codes for payment information',
    'Generate QR codes for event tickets',
    'Create QR codes for location coordinates',
  ],
  logo: 'https://www.openagentic.org/tools/qrcode.svg',
};

export const qrcodeTool = toOpenAgenticTool(rawQRCodeTool, toolDetails);
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
- QR Code generator (visual encoding)
- GitHub repository access (code retrieval)
- News search (information gathering)
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
export const utilityTools = [qrcodeTool, githubTool, newsdataTool, myTool];
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