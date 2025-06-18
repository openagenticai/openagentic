import { tool } from 'ai';
import { z } from 'zod';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';
import { uploadAudioToS3, generateAudioFileName } from '../utils/s3';

// Popular voice IDs for quick selection and fallbacks
const POPULAR_VOICES = {
  // Female voices
  'rachel': '21m00Tcm4TlvDq8ikWAM', // Professional female
  'bella': 'EXAVITQu4vr4xnSDxMaL', // Conversational female
  'elli': 'MF3mGyEYCl7XYWbV9V6O', // Young female
  'sarah': 'EXAVITQu4vr4xnSDxMaL', // Natural female
  
  // Male voices
  'adam': 'pNInz6obpgDQGcFmaJgB', // Professional male
  'charlie': 'IKne3meq5aSn9XLyUdCD', // Casual male
  'josh': 'TxGEqnHWrfWFTfGW9XjX', // Conversational male
  'sam': 'yoZ06aMxZJJ28mfd3POQ', // Narrative male
} as const;

// Voice preferences mapping
const VOICE_PREFERENCES = {
  female: {
    professional: ['rachel', 'sarah'],
    conversational: ['bella', 'elli'],
    narrative: ['rachel', 'sarah'],
    casual: ['bella', 'elli'],
  },
  male: {
    professional: ['adam', 'sam'],
    conversational: ['josh', 'charlie'],
    narrative: ['sam', 'adam'],
    casual: ['charlie', 'josh'],
  },
} as const;

// Supported models
const SUPPORTED_MODELS = [
  'eleven_multilingual_v2',
  'eleven_monolingual_v1',
  'eleven_turbo_v2',
  'eleven_turbo_v2_5',
] as const;

// Output formats
const OUTPUT_FORMATS = [
  'mp3_44100_128',
  'mp3_44100_64',
  'mp3_22050_32',
  'pcm_16000',
  'pcm_22050',
  'pcm_24000',
  'pcm_44100',
  'ulaw_8000',
] as const;

const rawElevenLabsTool = tool({
  description: 'Convert text to high-quality speech using ElevenLabs AI voice models with support for single voice and multi-voice dialogue',
  parameters: z.object({
    mode: z.enum(['speech', 'dialogue'])
      .optional()
      .default('speech')
      .describe('Mode: "speech" for single voice, "dialogue" for multi-voice conversation (default: speech)'),
    
    text: z.string()
      .optional()
      .describe('The text to convert to speech (required for speech mode, max 5000 characters)'),
    
    voice_id: z.string()
      .optional()
      .describe('The voice ID to use for speech mode (optional, auto-selected if not provided)'),
    
    dialogue_inputs: z.array(z.object({
      text: z.string()
        .min(1)
        .max(5000)
        .describe('The text for this dialogue segment'),
      voice_id: z.string()
        .optional()
        .describe('The voice ID for this dialogue segment (optional, auto-assigned if not provided)')
    }))
      .optional()
      .describe('Array of dialogue inputs with text and optional voice_id (required for dialogue mode)'),
    
    voice_preferences: z.object({
      gender: z.enum(['male', 'female']).optional(),
      style: z.enum(['conversational', 'professional', 'narrative', 'casual']).optional(),
      accent: z.enum(['american', 'british']).optional()
    })
      .optional()
      .describe('Preferences for automatic voice selection (gender, style, accent)'),
    
    model_id: z.string()
      .optional()
      .default('eleven_multilingual_v2')
      .describe('The ElevenLabs model to use (eleven_multilingual_v2, eleven_monolingual_v1, eleven_turbo_v2, eleven_turbo_v2_5)'),
    
    output_format: z.string()
      .optional()
      .default('mp3_44100_128')
      .describe('The output audio format (mp3_44100_128, mp3_44100_64, pcm_44100, etc.)'),
  }),
  
  execute: async ({ 
    mode = 'speech',
    text,
    voice_id,
    dialogue_inputs,
    voice_preferences,
    model_id = 'eleven_multilingual_v2',
    output_format = 'mp3_44100_128'
  }) => {
    // Validate API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required. Get your API key from https://elevenlabs.io/app/settings/api-keys');
    }

    // Validate mode-specific parameters
    if (mode === 'speech') {
      if (!text || text.trim().length === 0) {
        throw new Error('Text is required for speech mode and cannot be empty');
      }

      if (text.length > 5000) {
        throw new Error('Text exceeds maximum length of 5000 characters for speech mode');
      }
    } else if (mode === 'dialogue') {
      if (!dialogue_inputs || dialogue_inputs.length === 0) {
        throw new Error('dialogue_inputs array is required for dialogue mode and cannot be empty');
      }

      // Validate each dialogue input
      for (let i = 0; i < dialogue_inputs.length; i++) {
        const input = dialogue_inputs[i];
        if (!input || !input.text || input.text.trim().length === 0) {
          throw new Error(`Dialogue input ${i + 1} text cannot be empty`);
        }
        if (input.text.length > 5000) {
          throw new Error(`Dialogue input ${i + 1} text exceeds maximum length of 5000 characters`);
        }
      }
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model_id as any)) {
      console.warn(`Model "${model_id}" not in supported list, but proceeding anyway`);
    }

    // Validate output format
    if (!OUTPUT_FORMATS.includes(output_format as any)) {
      console.warn(`Output format "${output_format}" not in supported list, but proceeding anyway`);
    }

    // Helper function to select voice based on preferences
    const selectVoiceByPreferences = (preferences?: typeof voice_preferences): string => {
      if (!preferences) {
        return POPULAR_VOICES.rachel; // Default fallback
      }

      const { gender = 'female', style = 'conversational' } = preferences;
      const voiceOptions = VOICE_PREFERENCES[gender]?.[style] || VOICE_PREFERENCES.female.conversational;
      const selectedVoiceName = voiceOptions[0];
      return POPULAR_VOICES[selectedVoiceName as keyof typeof POPULAR_VOICES] || POPULAR_VOICES.rachel;
    };

    // Helper function to get voice name from ID
    const getVoiceName = (voiceId: string): string => {
      const entry = Object.entries(POPULAR_VOICES).find(([_, id]) => id === voiceId);
      return entry ? entry[0] : 'custom';
    };

    // Calculate total text length for logging
    const totalTextLength = mode === 'speech' 
      ? text?.length || 0 
      : dialogue_inputs?.reduce((acc, input) => acc + input.text.length, 0) || 0;

    // Start logging
    console.log('🎙️ ElevenLabs Tool - Generation started:', {
      timestamp: new Date().toISOString(),
      mode,
      textLength: totalTextLength,
      voiceCount: mode === 'dialogue' ? dialogue_inputs?.length || 0 : 1,
      voice_id: mode === 'speech' ? voice_id : 'multiple',
      voice_preferences,
      model_id,
      output_format,
      hasApiKey: !!apiKey,
    });

    try {
      // Initialize ElevenLabs client
      const client = new ElevenLabsClient({
        apiKey,
      });

      let audioBuffer: Buffer;
      let selectedVoices: Array<{ voice_id: string; voice_name: string }> = [];
      let autoVoiceSelection = false;

      if (mode === 'speech') {
        // Single voice speech generation
        const finalVoiceId = voice_id || selectVoiceByPreferences(voice_preferences);
        if (!voice_id) {
          autoVoiceSelection = true;
        }

        selectedVoices = [{ 
          voice_id: finalVoiceId, 
          voice_name: getVoiceName(finalVoiceId) 
        }];

        console.log('🎵 Generating speech with voice:', {
          voice_id: finalVoiceId,
          voice_name: getVoiceName(finalVoiceId),
          auto_selected: autoVoiceSelection,
        });

        // Generate speech
        const audioResponse = await client.textToSpeech.convert(finalVoiceId, {
          text: text!.trim(),
          modelId: model_id,
          outputFormat: output_format as any,
        });

        // Convert response to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of audioResponse) {
          chunks.push(Buffer.from(chunk));
        }
        audioBuffer = Buffer.concat(chunks);

      } else {
        // Multi-voice dialogue generation
        const processedInputs = dialogue_inputs!.map((input, index) => {
          const finalVoiceId = input.voice_id || selectVoiceByPreferences(voice_preferences);
          if (!input.voice_id) {
            autoVoiceSelection = true;
          }

          selectedVoices.push({
            voice_id: finalVoiceId,
            voice_name: getVoiceName(finalVoiceId),
          });

          return {
            text: input.text.trim(),
            voice_id: finalVoiceId,
          };
        });

        console.log('🎭 Generating dialogue with voices:', {
          voices: selectedVoices,
          segmentCount: processedInputs.length,
          auto_selected: autoVoiceSelection,
        });

        // Generate audio for each dialogue segment
        const audioSegments: Buffer[] = [];
        for (let i = 0; i < processedInputs.length; i++) {
          const segment = processedInputs[i];
          if (!segment) {
            throw new Error(`Dialogue segment ${i + 1} is undefined`);
          }
          
          console.log(`🎤 Generating segment ${i + 1}/${processedInputs.length}:`, {
            voice_id: segment.voice_id,
            voice_name: getVoiceName(segment.voice_id),
            textLength: segment.text.length,
          });

          const audioResponse = await client.textToSpeech.convert(segment.voice_id, {
            text: segment.text,
            modelId: model_id,
            outputFormat: output_format as any,
          });

          // Convert response to buffer
          const chunks: Buffer[] = [];
          for await (const chunk of audioResponse) {
            chunks.push(Buffer.from(chunk));
          }
          audioSegments.push(Buffer.concat(chunks));
        }

        // Concatenate all audio segments
        audioBuffer = Buffer.concat(audioSegments);
      }

      // Generate filename for S3 upload
      const description = mode === 'speech' 
        ? text!.substring(0, 50)
        : `dialogue_${dialogue_inputs!.length}_voices`;
      
      const fileName = generateAudioFileName(description, 'mp3');

      // Upload to S3
      console.log('📤 Uploading generated audio to S3...');
      const audioUrl = await uploadAudioToS3(
        audioBuffer,
        fileName,
        'audio/mpeg',
        `ElevenLabs ${mode} - ${description}`
      );

      // Log completion
      console.log('✅ ElevenLabs Tool - Generation completed:', {
        mode,
        audioUrl,
        fileName,
        audioSize: audioBuffer.length,
        voiceCount: selectedVoices.length,
        voice_names: selectedVoices.map(v => v.voice_name),
        auto_selected: autoVoiceSelection,
        model_id,
        output_format,
      });

      // Return structured result
      return {
        success: true,
        audioUrl,
        fileName,
        mode,
        voice_id: mode === 'speech' ? selectedVoices[0]?.voice_id : undefined,
        dialogue_voices: mode === 'dialogue' ? selectedVoices.map(v => v.voice_id) : undefined,
        voice_names: selectedVoices.map(v => v.voice_name),
        auto_selected: autoVoiceSelection,
        model_id,
        output_format,
        metadata: {
          uploadedAt: new Date().toISOString(),
          textLength: totalTextLength,
          fileSize: audioBuffer.length,
          voiceCount: selectedVoices.length,
          uploadedToS3: true,
        },
      };

    } catch (error) {
      console.error('❌ ElevenLabs Tool - Generation failed:', {
        mode,
        textLength: totalTextLength,
        model_id,
        output_format,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // API key errors
        if (error.message.includes('API key') || error.message.includes('401') || 
            error.message.includes('authentication') || error.message.includes('unauthorized')) {
          throw new Error('ElevenLabs API authentication failed. Please check your ELEVENLABS_API_KEY environment variable.');
        }
        
        // Rate limiting errors
        if (error.message.includes('rate limit') || error.message.includes('429') || 
            error.message.includes('quota') || error.message.includes('limit exceeded')) {
          throw new Error('ElevenLabs API rate limit or quota exceeded. Please try again later or upgrade your plan.');
        }
        
        // Voice not found errors
        if (error.message.includes('voice') && (error.message.includes('not found') || error.message.includes('invalid'))) {
          throw new Error('Voice not found. Please check the voice ID or try using voice preferences for auto-selection.');
        }
        
        // Text too long errors
        if (error.message.includes('text') && error.message.includes('too long')) {
          throw new Error('Text is too long for ElevenLabs API. Please reduce the text length and try again.');
        }
        
        // Model not found errors
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model_id}". Please use a supported ElevenLabs model.`);
        }
        
        // Audio generation errors
        if (error.message.includes('audio') || error.message.includes('synthesis')) {
          throw new Error('Audio generation failed. Please try again or try a different voice.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout') || 
            error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Network error connecting to ElevenLabs API. Please check your internet connection.');
        }
        
        // S3 upload errors
        if (error.message.includes('S3') || error.message.includes('upload')) {
          throw new Error('Failed to upload generated audio to S3. Please check your S3 configuration.');
        }
        
        // Audio stream processing errors
        if (error.message.includes('stream') || error.message.includes('buffer')) {
          throw new Error('Failed to process audio stream. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504') ||
            error.message.includes('service unavailable') || error.message.includes('server error')) {
          throw new Error('ElevenLabs service temporarily unavailable. Please try again later.');
        }
        
        // Invalid parameters errors
        if (error.message.includes('parameter') || error.message.includes('invalid request')) {
          throw new Error('Invalid parameters provided. Please check your input and try again.');
        }
        
        // Content policy errors
        if (error.message.includes('content') || error.message.includes('policy') || error.message.includes('inappropriate')) {
          throw new Error('Text content violates ElevenLabs content policy. Please modify your text.');
        }
      }

      // Generic error fallback
      throw new Error(`ElevenLabs TTS generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'elevenlabs_tts',
  name: 'ElevenLabs TTS',
  useCases: [
    'Convert blog posts and articles to natural speech',
    'Create podcast episodes from scripts',
    'Generate multi-voice dialogue conversations',
    'Create audiobook narration with different character voices',
    'Convert presentation slides to audio',
    'Generate voiceovers for video content',
    'Create audio content for accessibility',
    'Generate speech for language learning',
    'Create voice messages and announcements',
    'Generate audio summaries and reports',
    'Create interactive voice responses',
    'Generate character voices for storytelling',
  ],
  logo: 'https://www.openagentic.org/tools/elevenlabs.svg',
};

export const elevenlabsTool = toOpenAgenticTool(rawElevenLabsTool, toolDetails);