import { tool } from 'ai';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';
import { uploadAudioToS3, generateAudioFileName } from '../utils/s3';

// Supported Gemini TTS models
const SUPPORTED_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
] as const;

// Supported output formats
const OUTPUT_FORMATS = ['wav', 'mp3'] as const;

// Complete list of Gemini TTS voices (30+ voices)
const GEMINI_VOICES = [
  // Popular voices
  'Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir', 'Leda', 'Orus', 'Aoede',
  
  // Extended voice library
  'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 
  'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar', 
  'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi', 
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
] as const;

/**
 * Create WAV file from PCM data with proper headers
 * Gemini returns raw 24kHz, 16-bit, mono PCM data that needs WAV headers
 */
function createWavFile(pcmData: Buffer, channels = 1, sampleRate = 24000, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  // Create WAV header (44 bytes)
  const header = Buffer.alloc(44);
  let offset = 0;

  // RIFF chunk descriptor
  header.write('RIFF', offset); offset += 4;
  header.writeUInt32LE(fileSize, offset); offset += 4;
  header.write('WAVE', offset); offset += 4;

  // fmt sub-chunk
  header.write('fmt ', offset); offset += 4;
  header.writeUInt32LE(16, offset); offset += 4; // Sub-chunk size
  header.writeUInt16LE(1, offset); offset += 2;  // Audio format (PCM)
  header.writeUInt16LE(channels, offset); offset += 2;
  header.writeUInt32LE(sampleRate, offset); offset += 4;
  header.writeUInt32LE(byteRate, offset); offset += 4;
  header.writeUInt16LE(blockAlign, offset); offset += 2;
  header.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data sub-chunk
  header.write('data', offset); offset += 4;
  header.writeUInt32LE(dataSize, offset);

  // Combine header and PCM data
  return Buffer.concat([header, pcmData]);
}

const rawGeminiTTSTool = tool({
  description: 'Generate high-quality text-to-speech audio using Google Gemini 2.5 TTS models with support for single-speaker and multi-speaker dialogue',
  parameters: z.object({
    text: z.string()
      .min(1)
      .max(5000)
      .describe('The text to convert to speech. For multi-speaker dialogue, include speaker names (e.g., "Dr. Anya: Hello! Liam: How are you?")'),
    
    model: z.enum(SUPPORTED_MODELS)
      .optional()
      .default('gemini-2.5-flash-preview-tts')
      .describe('Gemini TTS model to use (flash for speed, pro for quality, default: flash)'),
    
    voice_name: z.enum(GEMINI_VOICES)
      .optional()
      .default('Kore')
      .describe('Voice to use for single-speaker speech generation (default: Kore)'),
    
    style_prompt: z.string()
      .optional()
      .describe('Natural language prompt to control speaking style (e.g., "speak cheerfully", "whisper softly", "excited tone")'),
    
    output_format: z.enum(OUTPUT_FORMATS)
      .optional()
      .default('wav')
      .describe('Audio output format (default: wav)'),
    
    is_dialogue: z.boolean()
      .optional()
      .default(false)
      .describe('Enable multi-speaker dialogue mode (default: false)'),
    
    speakers: z.array(z.object({
      name: z.string().describe('Speaker name (must match names used in the text)'),
      voice: z.enum(GEMINI_VOICES).describe('Voice to use for this speaker')
    }))
      .optional()
      .describe('Array of speakers for multi-speaker dialogue mode'),
  }),
  
  execute: async ({ 
    text,
    model = 'gemini-2.5-flash-preview-tts',
    voice_name = 'Kore',
    style_prompt,
    output_format = 'wav',
    is_dialogue = false,
    speakers
  }) => {
    // Validate API key
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required for Gemini TTS');
    }

    // Validate text input
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required and cannot be empty');
    }

    if (text.length > 5000) {
      throw new Error('Text exceeds maximum length of 5000 characters');
    }

    // Validate dialogue mode parameters
    if (is_dialogue) {
      if (!speakers || speakers.length === 0) {
        throw new Error('Speakers array is required and cannot be empty for dialogue mode');
      }

      if (speakers.length > 10) {
        throw new Error('Maximum of 10 speakers allowed for dialogue mode');
      }

      // Validate speaker names exist in text
      for (const speaker of speakers) {
        if (!text.includes(speaker.name + ':')) {
          console.warn(`⚠️ Speaker "${speaker.name}" not found in text. Expected format: "${speaker.name}: [speech]"`);
        }
      }
    }

    // Start logging
    console.log('🎙️ Gemini TTS Tool - Generation started:', {
      timestamp: new Date().toISOString(),
      textLength: text.length,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      model,
      voice_name: is_dialogue ? 'multiple' : voice_name,
      style_prompt,
      output_format,
      is_dialogue,
      speakerCount: is_dialogue ? speakers?.length || 0 : 1,
      usingSDK: 'GoogleGenAI SDK',
    });

    try {
      // Initialize GoogleGenAI client (new SDK)
      console.log('🔧 Initializing GoogleGenAI SDK client...');
      const ai = new GoogleGenAI({
        apiKey: apiKey
      });

      // Prepare the text with style prompt if provided
      let finalText = text.trim();
      if (style_prompt) {
        finalText = `${style_prompt}: ${finalText}`;
      }

      // Configure speech generation parameters
      let speechConfig: any;

      if (is_dialogue && speakers && speakers.length > 0) {
        // Multi-speaker dialogue mode
        console.log('🎭 Configuring multi-speaker dialogue mode...');
        speechConfig = {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakers.map(speaker => ({
              speaker: speaker.name,
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: speaker.voice
                }
              }
            }))
          }
        };
      } else {
        // Single-speaker mode
        console.log('🎤 Configuring single-speaker mode...');
        speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice_name
            }
          }
        };
      }

      // Generate audio using GoogleGenAI SDK
      console.log('🔄 Generating audio with Gemini using SDK...');
      
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ 
          parts: [{ text: finalText }] 
        }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: speechConfig
        }
      });

      // Extract audio data from SDK response
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!audioData) {
        throw new Error('No audio data received from Gemini TTS API via SDK');
      }

      // Convert base64 PCM data to buffer
      console.log('🔄 Converting PCM to WAV format...');
      const pcmBuffer = Buffer.from(audioData, 'base64');
      
      // Convert PCM to WAV with proper headers
      const wavBuffer = createWavFile(pcmBuffer, 1, 24000, 16);

      // Generate filename for S3 upload
      const voiceInfo = is_dialogue ? `${speakers?.length || 0}_voices` : voice_name;
      const description = `${voiceInfo}_${text.substring(0, 50).replace(/[^\w\s]/g, '')}`;
      const fileName = generateAudioFileName(description, 'wav');

      // Upload to S3
      console.log('📤 Uploading generated audio to S3...');
      const audioUrl = await uploadAudioToS3(
        wavBuffer,
        fileName,
        'audio/wav',
        `Gemini TTS ${is_dialogue ? 'dialogue' : 'speech'}: ${text.substring(0, 100)}`
      );

      // Calculate audio duration estimate (rough approximation)
      const wordsPerMinute = 150;
      const wordCount = text.split(/\s+/).length;
      const estimatedDurationSeconds = Math.ceil((wordCount / wordsPerMinute) * 60);

      // Log completion
      console.log('✅ Gemini TTS Tool - Generation completed:', {
        model,
        mode: is_dialogue ? 'multi-speaker' : 'single-speaker',
        audioUrl,
        fileName,
        audioSize: wavBuffer.length,
        estimatedDuration: estimatedDurationSeconds,
        voiceCount: is_dialogue ? speakers?.length || 0 : 1,
        style_prompt: style_prompt || 'none',
        sdkUsed: 'GoogleGenAI SDK',
      });

      // Return structured result
      return {
        success: true,
        audioUrl,
        fileName,
        mode: is_dialogue ? 'multi-speaker' : 'single-speaker',
        voice_name: is_dialogue ? undefined : voice_name,
        speakers: is_dialogue ? speakers?.map(s => ({ name: s.name, voice: s.voice })) : undefined,
        style_prompt,
        model,
        output_format,
        metadata: {
          uploadedAt: new Date().toISOString(),
          textLength: text.length,
          fileSize: wavBuffer.length,
          voiceCount: is_dialogue ? speakers?.length || 0 : 1,
          estimatedDuration: estimatedDurationSeconds,
          uploadedToS3: true,
          audioFormat: 'wav',
          sampleRate: 24000,
          channels: 1,
          bitsPerSample: 16,
          apiUsed: 'GoogleGenAI SDK',
        },
      };

    } catch (error) {
      console.error('❌ Gemini TTS Tool - Generation failed:', {
        model,
        textLength: text.length,
        is_dialogue,
        speakerCount: is_dialogue ? speakers?.length || 0 : 1,
        sdkUsed: 'GoogleGenAI SDK',
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // SDK-specific errors
        if (error.message.includes('GoogleGenAI') || error.message.includes('SDK')) {
          throw new Error('Failed to initialize GoogleGenAI SDK. Please check your API key and configuration.');
        }

        // API key errors
        if (error.message.includes('API key') || error.message.includes('401') || 
            error.message.includes('authentication') || error.message.includes('unauthorized')) {
          throw new Error('Google API authentication failed. Please check your GOOGLE_API_KEY environment variable.');
        }
        
        // Rate limiting errors
        if (error.message.includes('rate limit') || error.message.includes('429') || 
            error.message.includes('quota') || error.message.includes('limit exceeded')) {
          throw new Error('Google API rate limit or quota exceeded. Please try again later or upgrade your plan.');
        }
        
        // Model not found errors
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Gemini TTS model.`);
        }
        
        // Voice not found errors
        if (error.message.includes('voice') && (error.message.includes('not found') || error.message.includes('invalid'))) {
          throw new Error('Voice not found. Please check the voice name or try using a different voice from the supported list.');
        }
        
        // Text too long errors
        if (error.message.includes('text') && error.message.includes('too long')) {
          throw new Error('Text is too long for Gemini TTS API. Please reduce the text length and try again.');
        }
        
        // Audio generation errors
        if (error.message.includes('audio') || error.message.includes('speech') || error.message.includes('TTS')) {
          throw new Error('Audio generation failed. Please try again or try a different voice/model.');
        }
        
        // Multi-speaker specific errors
        if (error.message.includes('speaker') || error.message.includes('dialogue')) {
          throw new Error('Multi-speaker dialogue generation failed. Please check speaker names and text format.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout') || 
            error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Network error connecting to Google API. Please check your internet connection.');
        }
        
        // S3 upload errors
        if (error.message.includes('S3') || error.message.includes('upload')) {
          throw new Error('Failed to upload generated audio to S3. Please check your S3 configuration.');
        }
        
        // Audio processing errors
        if (error.message.includes('PCM') || error.message.includes('WAV') || error.message.includes('audio format')) {
          throw new Error('Failed to process audio data. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504') ||
            error.message.includes('service unavailable') || error.message.includes('server error')) {
          throw new Error('Google TTS service temporarily unavailable. Please try again later.');
        }
        
        // Content policy errors
        if (error.message.includes('content') || error.message.includes('policy') || 
            error.message.includes('inappropriate') || error.message.includes('safety')) {
          throw new Error('Text content violates Google content policy. Please modify your text.');
        }
      }

      // Generic error fallback
      throw new Error(`Gemini TTS generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'gemini_tts',
  name: 'Gemini TTS',
  useCases: [
    'Generate natural speech from text with 30+ voice options',
    'Create multi-speaker dialogue conversations',
    'Convert articles and documents to audio with style control',
    'Generate audiobook narration with character voices',
    'Create podcast-style content with multiple speakers',
    'Generate voice content with emotion and tone control',
    'Create accessibility audio for visual content',
    'Generate language learning pronunciation examples',
    'Create interactive voice responses and announcements',
    'Generate high-quality voiceovers for presentations',
    'Create natural dialogue for chatbots and virtual assistants',
    'Generate speech with specific speaking styles and emotions',
  ],
  logo: 'https://www.openagentic.org/tools/gemini.svg',
};

export const geminiTtsTool = toOpenAgenticTool(rawGeminiTTSTool, toolDetails);