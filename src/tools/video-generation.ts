import { tool } from 'ai';
import { z } from 'zod';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';
import { uploadVideoToS3, generateVideoFileName } from '../utils/s3';

// Supported Veo 2.0 models
const SUPPORTED_MODELS = [
  'veo-2.0-generate-001',
  'veo-2.0-preview-001',
] as const;

// Video generation status
type VideoStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface VideoGenerationResponse {
  name: string;
  metadata: {
    createTime: string;
    updateTime: string;
  };
  done: boolean;
  response?: {
    generatedVideos: Array<{
      videoUri: string;
      prompt: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
    details: any[];
  };
}

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
    });

    try {
      // Helper function to delay execution
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Initialize generation operations array
      const generationOperations: string[] = [];

      // Start video generation for each requested video
      console.log(`🎥 Starting generation of ${numberOfVideos} video(s)...`);
      
      for (let i = 0; i < numberOfVideos; i++) {
        console.log(`🎬 Initiating video ${i + 1}/${numberOfVideos}...`);
        
        // Prepare request body for Google Video Generation API
        const requestBody = {
          model: `models/${model}`,
          contents: [{
            parts: [{
              text: prompt.trim()
            }]
          }],
          generationConfig: {
            candidateCount: 1,
            maxOutputTokens: 1000,
            temperature: 0.7,
          }
        };

        // Make API request to start video generation
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        // Check if response is ok
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Google Video API error: ${response.status} - ${response.statusText}`;
          
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error && errorJson.error.message) {
              errorMessage = errorJson.error.message;
            }
          } catch {
            // Use default error message if parsing fails
          }

          throw new Error(errorMessage);
        }

        // Parse response to get operation name
        let operationData: VideoGenerationResponse;
        try {
          operationData = await response.json() as VideoGenerationResponse;
        } catch (error) {
          throw new Error(`Failed to parse Google Video API response: ${error instanceof Error ? error.message : String(error)}`);
        }

        if (!operationData.name) {
          throw new Error('No operation name received from Google Video API');
        }

        generationOperations.push(operationData.name);
        console.log(`✅ Video ${i + 1} generation started with operation: ${operationData.name}`);
      }

      // Polling function to check operation status
      const checkOperationStatus = async (operationName: string): Promise<VideoGenerationResponse> => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to check operation status: ${response.status} - ${response.statusText}`);
        }

        return await response.json() as VideoGenerationResponse;
      };

      // Poll for completion of all operations
      const startWaitTime = Date.now();
      const maxWaitMs = maxWaitTime * 1000;
      const completedOperations: VideoGenerationResponse[] = [];

      console.log(`⏳ Waiting for ${generationOperations.length} video(s) to complete...`);

      while (completedOperations.length < generationOperations.length) {
        const elapsedTime = Date.now() - startWaitTime;
        
        if (elapsedTime > maxWaitMs) {
          throw new Error(`Video generation timed out after ${maxWaitTime} seconds. ${completedOperations.length}/${generationOperations.length} videos completed.`);
        }

        // Check status of remaining operations
        for (let i = 0; i < generationOperations.length; i++) {
          if (completedOperations[i]) continue; // Already completed

          const operationName = generationOperations[i];
          if (!operationName) continue;

          try {
            const status = await checkOperationStatus(operationName);
            
            if (status.done) {
              if (status.error) {
                throw new Error(`Video ${i + 1} generation failed: ${status.error.message}`);
              }
              
              completedOperations[i] = status;
              console.log(`✅ Video ${i + 1} generation completed`);
            }
          } catch (error) {
            console.error(`❌ Error checking video ${i + 1} status:`, error);
            throw error;
          }
        }

        // If not all completed, wait before next check
        if (completedOperations.length < generationOperations.length) {
          console.log(`🎬 Waiting for completion... (${Math.round(elapsedTime / 1000)}s elapsed, ${completedOperations.filter(Boolean).length}/${generationOperations.length} completed)`);
          await delay(5000); // Check every 5 seconds
        }
      }

      // Download and process all generated videos
      console.log('📥 Downloading generated videos...');
      const videoBuffers: Buffer[] = [];
      const videoUrls: string[] = [];
      const generatedFileNames: string[] = [];

      for (let i = 0; i < completedOperations.length; i++) {
        const operation = completedOperations[i];
        if (!operation || !operation.response || !operation.response.generatedVideos) {
          throw new Error(`No video data in completed operation ${i + 1}`);
        }

        const generatedVideo = operation.response.generatedVideos[0];
        if (!generatedVideo || !generatedVideo.videoUri) {
          throw new Error(`No video URI in generated video ${i + 1}`);
        }

        console.log(`📥 Downloading video ${i + 1} from: ${generatedVideo.videoUri}`);

        // Download video from Google's temporary URL
        const videoResponse = await fetch(generatedVideo.videoUri);
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
          apiUsed: 'Gemini Veo 2.0',
          uploadedToS3: true,
        },
      };

    } catch (error) {
      console.error('❌ Video Generation Tool - Generation failed:', {
        model,
        numberOfVideos,
        maxWaitTime,
        promptLength: prompt.length,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
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
        
        // Operation errors
        if (error.message.includes('operation') || error.message.includes('tracking')) {
          throw new Error('Failed to track video generation progress. Please try again.');
        }
      }

      // Generic error fallback
      throw new Error(`Video generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'video_generation',
  name: 'Video Generation',
  useCases: [
    'Generate videos from text descriptions',
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