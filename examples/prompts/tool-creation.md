# Tool Creation Prompt Example

Create a **Gemini Text-to-Speech Tool** for the OpenAgentic framework that converts text to high-quality speech using Google's Gemini 2.5 TTS models with natural dialogue capabilities and uploads the audio to S3.

## Requirements

1. **Use Google GenAI SDK** (`@google/genai` package) for speech generation
2. **Support both single-speaker and multi-speaker dialogue modes**
3. **Include 30+ prebuilt voice options** with intelligent voice selection
4. **Upload generated audio to S3** using the S3 utility functions
5. **Return S3 URL** instead of raw audio data for better performance
6. **Support WAV format** with proper PCM to WAV conversion
7. **Include style prompts** for tone, pace, and emotion control
8. **Add comprehensive error handling** and structured logging
9. **Follow OpenAgentic patterns** from existing tools
10. **Support the new Vercel AI tool format** (not the legacy OpenAgentic wrapper)

## Implementation Details

**File Location:** `src/tools/gemini-tts.ts`

**Dependencies:**
```bash
npm install @google/genai
```

**Environment Variable:** `GOOGLE_API_KEY`

### Key Features

- **Dual Mode Operation**: Single-speaker and multi-speaker dialogue
- **Rich Voice Selection**: 30+ prebuilt voices (Zephyr, Puck, Charon, Kore, etc.)
- **Style Control**: Natural language prompts for speaking style
- **Advanced Audio Processing**: PCM to WAV conversion with proper headers
- **S3 Integration**: Automatic upload with proper file naming
- **Model Selection**: Support for both flash and pro TTS models
- **Comprehensive Logging**: Structured logging with emojis and timing

### Parameters Schema

```typescript
z.object({
  text: z.string().describe("The text to convert to speech. For multi-speaker dialogue, include speaker names (e.g., 'Dr. Anya: Hello! Liam: How are you?')"),
  model: z.enum(['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts']).optional().describe("TTS model to use (default: flash for speed, pro for quality)"),
  voice_name: z.enum([
    'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 'Callirrhoe',
    // ... all 30+ voices
  ]).optional().describe("Voice to use for single-speaker speech generation"),
  style_prompt: z.string().optional().describe("Natural language prompt to control speaking style"),
  output_format: z.enum(['wav', 'mp3']).optional().describe("Audio output format"),
  is_dialogue: z.boolean().optional().describe("Enable multi-speaker dialogue mode"),
  speakers: z.array(z.object({
    name: z.string().describe("Speaker name (must match names in the text)"),
    voice: z.enum([/* all voice options */]).describe("Voice to use for this speaker")
  })).optional().describe("Array of speakers for multi-speaker dialogue"),
})
```

### Implementation Pattern

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { generateAudioFileName, uploadAudioToS3 } from '../s3';
import { ToolCommunication } from '@/lib/types';
import { toolsInfo } from '../constants/tools';

// WAV file creation function for PCM conversion
function createWavFile(pcmData: Buffer, channels = 1, sampleRate = 24000, bitsPerSample = 16): Buffer {
  // Implementation for creating proper WAV headers and combining with PCM data
}

export const geminiTtsTool = tool({
  description: "Generate high-quality text-to-speech audio using Google's Gemini 2.5 TTS models...",
  parameters: parametersSchema,
  execute: async ({ text, model, voice_name, style_prompt, output_format, apiKey, is_dialogue, speakers }) => {
    // Implementation with proper error handling, logging, and S3 integration
  },
});
```

### Key Implementation Details

#### 1. **Audio Processing Logic**
```typescript
// Gemini returns raw PCM data that needs WAV headers
const pcmBuffer = Buffer.from(audioData, 'base64');
const wavBuffer = createWavFile(pcmBuffer, 1, 24000, 16);
```

#### 2. **Dual Mode Configuration**
```typescript
let speechConfig: any;

if (is_dialogue && speakers && speakers.length > 0) {
  // Multi-speaker dialogue mode
  speechConfig = {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: speakers.map(speaker => ({
        speaker: speaker.name,
        voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker.voice } }
      }))
    }
  };
} else {
  // Single-speaker mode
  speechConfig = {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice_name } }
  };
}
```

#### 3. **Structured Logging Pattern**
```typescript
console.log('🎙️ Gemini TTS Tool Called:', {
  timestamp: new Date().toISOString(),
  textLength: text.length,
  model,
  voice_name,
  style_prompt,
  is_dialogue,
  speakers
});
```

#### 4. **Error Handling & Communication**
```typescript
// Success response
return ToolCommunication.toStructuredMessage(
  toolsInfo.geminiTts.id,
  text,
  {
    result: resultMessage,
    model,
    mode: is_dialogue ? 'multi-speaker' : 'single-speaker',
    audioUrl: audioS3Url,
    // ... additional metadata
  },
  endTime - startTime
);

// Error response
return ToolCommunication.toErrorMessage(
  toolsInfo.geminiTts.id,
  text,
  error instanceof Error ? error : new Error('Unknown error'),
  endTime - startTime
);
```

#### 5. **S3 Integration**
```typescript
const fileName = generateAudioFileName(
  `${voice_name}-${text.substring(0, 50)}`, 
  'wav'
);

const audioS3Url = await uploadAudioToS3(
  wavBuffer, 
  fileName, 
  'audio/wav', 
  `Gemini TTS audio: ${text.substring(0, 100)}`
);
```

### Advanced Features

#### **Style Prompt Integration**
```typescript
let prompt = text;
if (style_prompt) {
  prompt = `${style_prompt}: ${text}`;
}
```

#### **Multi-Speaker Dialogue Support**
- Parse speaker names from text format: `"Dr. Anya: Hello! Liam: How are you?"`
- Automatically assign voices to speakers
- Support voice rotation for natural conversations

#### **Voice Selection Options**
- 30+ prebuilt voices including: Zephyr, Puck, Charon, Kore, Fenrir, Leda, etc.
- Gender and style variety for natural dialogue
- Fallback voice selection logic

### Tool Registration

**Update `src/tools/index.ts`:**
```typescript
// Add to imports
import { geminiTtsTool } from './gemini-tts.js';

// Add to utilityTools array (since it generates content)
export const utilityTools = [
  // ... existing tools
  geminiTtsTool,
];
```

**Add to tool constants:**
```typescript
export const toolsInfo = {
  // ... existing tools
  geminiTts: {
    id: 'gemini_tts',
    name: 'Gemini Text-to-Speech',
    description: 'Convert text to natural speech using Google Gemini 2.5 TTS models',
    category: 'Content Creation',
    requiresApiKey: true,
    apiKeyEnvVar: 'GOOGLE_API_KEY',
  },
};
```

### Testing Scenarios

1. **Basic single-speaker speech** with default Kore voice
2. **Multi-speaker dialogue** with automatic voice assignment
3. **Style prompt variations** (cheerful, whisper, excited, professional)
4. **Different models** (flash vs pro quality comparison)
5. **Error handling** for missing API keys, invalid text, or network issues
6. **S3 upload verification** and proper file naming
7. **Audio format validation** and WAV header correctness
8. **Large text handling** and performance optimization

### Environment Setup

```bash
# Required environment variables
GOOGLE_API_KEY=your_google_api_key_here

# S3 configuration (if not already set)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=your_bucket_name
S3_REGION=your_region
```

### Performance Considerations

- **S3 Upload Strategy**: Audio files uploaded to S3 to avoid large response payloads
- **Memory Management**: Efficient buffer handling for audio conversion
- **Model Selection**: Flash model for speed, Pro model for quality
- **Timeout Handling**: Proper timeouts for both Gemini API and S3 uploads
- **Rate Limiting**: Respect API rate limits with proper error handling

### Integration Examples

#### Basic Usage
```typescript
const result = await geminiTtsTool.execute({
  text: "Hello, welcome to our presentation!",
  voice_name: "Kore",
  style_prompt: "Say cheerfully"
});
```

#### Multi-Speaker Dialogue
```typescript
const result = await geminiTtsTool.execute({
  text: "Dr. Anya: Welcome to the clinic! Patient: Thank you, I'm here for my appointment.",
  is_dialogue: true,
  speakers: [
    { name: "Dr. Anya", voice: "Kore" },
    { name: "Patient", voice: "Zephyr" }
  ]
});
```

## Key Patterns for OpenAgentic Tools

### 1. **Use Vercel AI Tool Format**
```typescript
import { tool } from 'ai';
// NOT the legacy toOpenAgenticTool wrapper
```

### 2. **Structured Error Handling**
```typescript
return ToolCommunication.toErrorMessage(toolId, input, error, duration);
```

### 3. **Comprehensive Logging**
```typescript
console.log('🎙️ Tool Called:', { timestamp, ...params });
console.log('✅ Tool Success:', { timestamp, duration, ...results });
console.error('❌ Tool Error:', { timestamp, duration, error });
```

### 4. **S3 Integration for Large Files**
- Upload media files (images, audio, video) to S3
- Return URLs instead of raw data
- Include proper metadata and file naming

### 5. **Performance Tracking**
```typescript
const startTime = Date.now();
// ... tool execution
const endTime = Date.now();
return { ...result, duration: endTime - startTime };
```

This tool creation example demonstrates the complete process of building a sophisticated OpenAgentic tool that integrates multiple technologies (AI models + cloud storage) while following all the framework's best practices. 
