import { tool } from 'ai';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';
import { uploadVideoToS3, generateVideoFileName } from '../utils/s3';

// Supported Veo 2.0 models
const SUPPORTED_MODELS = [
  'veo-2.0-generate-001',
  'veo-2.0-preview-001',
] as const;

const rawVideoGenerationTool = tool({
  description: 'Generate high-quality videos using Google Gemini Veo 2.0 model with automatic S3 upload and storage',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(2000)
      .describe('Text description of the video to generate (required, max 2000 characters)'),
    
    numberOfVideos: z.number()
      .int()
      .min(1)
      .max(4)
      .optional()
      .default(1)
      .describe('Number of videos to generate (1-4, default: 1)'),
    
    maxWaitTime: z.number()
      .int()
      .min(30)
      .max(600)
      .optional()
      .default(300)
      .describe('Maximum wait time in seconds for video generation (30-600, default: 300)'),
    
    model: z.string()
      .optional()
      .default('veo-2.0-generate-001')
      .describe('The Gemini Veo model to use (veo-2.0-generate-001, veo-2.0-preview-001)'),
  }),
  
  execute: async ({ 
    prompt,
    numberOfVideos = 1,
    maxWaitTime = 300,
    model = 'veo-2.0-generate-001'
  }) => {
    // Validate API key
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (prompt.length > 2000) {
      throw new Error('Prompt exceeds maximum length of 2000 characters');
    }

    // Validate parameters
    if (numberOfVideos < 1 || numberOfVideos > 4) {
      throw new Error('numberOfVideos must be between 1 and 4');
    }

    if (maxWaitTime < 30 || maxWaitTime > 600) {
      throw new Error('maxWaitTime must be between 30 and 600 seconds');
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      console.warn(`Model "${model}" not in supported list, but proceeding anyway`);
    }

    // Start logging
    console.log('🎬 Video Generation Tool - Generation started:', {
      timestamp: new Date().toISOString(),
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      promptLength: prompt.length,
      numberOfVideos,
      maxWaitTime,
      model,
      usingSDK: 'GoogleGenAI SDK',
    });

    try {
      // Helper function to delay execution
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Initialize GoogleGenAI client
      console.log('🔧 Initializing GoogleGenAI SDK client...');
      const ai = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey
      });

      console.log(`🎥 Starting generation of ${numberOfVideos} video(s) using SDK...`);
      
      // Start video generation using SDK
      let operation = await ai.models.generateVideos({
        model: model,
        prompt: prompt.trim(),
        config: {
          numberOfVideos,
        },
      });

      if (!operation) {
        throw new Error('No operation returned from GoogleGenAI SDK');
      }

      console.log(`✅ Video generation operation started with SDK: ${operation.name || 'operation-id'}`);

      // Polling for completion using SDK
      const startWaitTime = Date.now();
      const maxWaitMs = maxWaitTime * 1000;

      console.log(`⏳ Waiting for ${numberOfVideos} video(s) to complete using SDK polling...`);

      while (!operation.done) {
        const elapsedTime = Date.now() - startWaitTime;
        
        if (elapsedTime > maxWaitMs) {
          throw new Error(`Video generation timed out after ${maxWaitTime} seconds. Operation may still be running.`);
        }

        console.log(`🎬 Waiting for completion... (${Math.round(elapsedTime / 1000)}s elapsed)`);
        await delay(5000); // Check every 5 seconds
        
        try {
          operation = await ai.operations.getVideosOperation({ operation });
        } catch (pollError) {
          console.error('🎬 Error polling operation status with SDK:', pollError);
          if (elapsedTime > maxWaitMs * 0.8) {
            throw pollError;
          }
          // Continue polling if we haven't reached 80% of max wait time
          continue;
        }
      }

      // Check for operation errors
      if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error'}`);
      }

      // Process generated videos
      const videos = operation.response?.generatedVideos;
      if (!videos || videos.length === 0) {
        throw new Error('No videos were generated');
      }

      console.log(`✅ ${videos.length} video(s) generation completed with SDK`);

      // Download and process all generated videos
      console.log('📥 Downloading generated videos...');
      const videoBuffers: Buffer[] = [];
      const videoUrls: string[] = [];
      const generatedFileNames: string[] = [];

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const videoUri = video.video?.uri; // SDK response structure

        if (!videoUri) {
          throw new Error(`No video URI in generated video ${i + 1}`);
        }

        console.log(`📥 Downloading video ${i + 1} from SDK response: ${videoUri}`);

        // Download video from Google's temporary URL
        const videoResponse = await fetch(videoUri);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video ${i + 1}: ${videoResponse.status} - ${videoResponse.statusText}`);
        }

        // Convert to buffer
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        videoBuffers.push(videoBuffer);

        // Generate filename for S3 upload
        const videoNumber = numberOfVideos > 1 ? `_${i + 1}` : '';
        const fileName = generateVideoFileName(`${prompt.substring(0, 50)}${videoNumber}`, 'mp4');
        generatedFileNames.push(fileName);

        // Upload to S3
        console.log(`📤 Uploading video ${i + 1} to S3: ${fileName}`);
        const s3Url = await uploadVideoToS3(
          videoBuffer,
          fileName,
          'video/mp4',
          `Gemini Veo 2.0 generated video: ${prompt.substring(0, 100)}`
        );

        videoUrls.push(s3Url);
        console.log(`✅ Video ${i + 1} uploaded to S3: ${s3Url}`);
      }

      // Calculate total generation time
      const totalDuration = Date.now() - startWaitTime;

      // Log completion
      console.log('✅ Video Generation Tool - Generation completed:', {
        model,
        numberOfVideos,
        videoUrls,
        fileNames: generatedFileNames,
        fileSizes: videoBuffers.map(buf => buf.length),
        generationTime: Math.round(totalDuration / 1000),
        maxWaitTime,
        sdkUsed: 'GoogleGenAI SDK',
      });

      // Return structured result
      return {
        success: true,
        videoUrls,
        fileNames: generatedFileNames,
        videosGenerated: numberOfVideos,
        model,
        prompt: prompt.trim(),
        metadata: {
          uploadedAt: new Date().toISOString(),
          promptLength: prompt.length,
          generationTime: Math.round(totalDuration / 1000),
          fileSizes: videoBuffers.map(buf => buf.length),
          apiUsed: 'GoogleGenAI SDK',
          uploadedToS3: true,
        },
      };

    } catch (error) {
      console.error('❌ Video Generation Tool - Generation failed:', {
        model,
        numberOfVideos,
        maxWaitTime,
        promptLength: prompt.length,
        sdkUsed: 'GoogleGenAI SDK',
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // SDK initialization errors
        if (error.message.includes('GoogleGenAI') || error.message.includes('SDK')) {
          throw new Error('Failed to initialize GoogleGenAI SDK. Please check your API key and configuration.');
        }

        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429') || 
            error.message.includes('quota') || error.message.includes('limit exceeded')) {
          throw new Error('Google API rate limit or quota exceeded. Please try again later.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication') || 
            error.message.includes('unauthorized')) {
          throw new Error('Google API authentication failed. Please check your GOOGLE_API_KEY environment variable.');
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Veo model.`);
        }
        
        // Prompt validation errors
        if (error.message.includes('prompt') || error.message.includes('content policy')) {
          throw new Error('Video generation prompt violates content policy. Please modify your prompt.');
        }
        
        // Timeout errors
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          throw new Error(`Video generation timed out after ${maxWaitTime} seconds. Try increasing maxWaitTime or simplifying the prompt.`);
        }
        
        // Video generation failures
        if (error.message.includes('generation failed') || error.message.includes('video failed')) {
          throw new Error('Video generation failed. Please try again with a different prompt or model.');
        }
        
        // SDK operation errors
        if (error.message.includes('operation') || error.message.includes('generateVideos')) {
          throw new Error('Failed to start video generation operation with SDK. Please try again.');
        }
        
        // SDK polling errors
        if (error.message.includes('getVideosOperation') || error.message.includes('polling')) {
          throw new Error('Failed to track video generation progress with SDK. Please try again.');
        }
        
        // Download errors
        if (error.message.includes('download') || error.message.includes('video URI')) {
          throw new Error('Failed to download generated video. Please try again.');
        }
        
        // S3 upload errors
        if (error.message.includes('S3') || error.message.includes('upload')) {
          throw new Error('Failed to upload generated video to S3. Please check your S3 configuration.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('ECONNREFUSED') || 
            error.message.includes('ETIMEDOUT')) {
          throw new Error('Network error connecting to Google API. Please check your internet connection.');
        }
        
        // Video processing errors
        if (error.message.includes('buffer') || error.message.includes('video processing')) {
          throw new Error('Failed to process generated video. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504') ||
            error.message.includes('service unavailable') || error.message.includes('server error')) {
          throw new Error('Google Video API temporarily unavailable. Please try again later.');
        }
        
        // Video too complex errors
        if (error.message.includes('too complex') || error.message.includes('cannot generate')) {
          throw new Error('Video prompt is too complex for generation. Please simplify your description.');
        }
      }

      // Generic error fallback
      throw new Error(`Video generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'video_generator',
  name: 'Video Generator',
  useCases: [
    'Generate videos from text descriptions using Veo 2.0',
    'Create animated content for social media',
    'Generate promotional videos for products',
    'Create educational video content',
    'Generate concept videos for presentations',
    'Create time-lapse style videos',
    'Generate nature and landscape videos',
    'Create abstract and artistic video content',
    'Generate videos for marketing campaigns',
    'Create visual storytelling content',
    'Generate background videos for websites',
    'Create video prototypes and mockups',
  ],
  logo: 'https://www.openagentic.org/tools/gemini.svg',
};

export const videoGenerationTool = toOpenAgenticTool(rawVideoGenerationTool, toolDetails);