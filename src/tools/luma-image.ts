import { tool } from 'ai';
import { z } from 'zod';
import { experimental_generateImage as generateImage } from 'ai';
import { luma } from '@ai-sdk/luma';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';
import { generateImageFileName, uploadImageToS3 } from '../utils/s3';

// Supported Luma models
const SUPPORTED_MODELS = [
  'photon-1',
] as const;

// Supported aspect ratios
const SUPPORTED_ASPECT_RATIOS = [
  '1:1',
  '16:9', 
  '9:16',
  '4:3',
  '3:4',
  '21:9',
  '9:21',
] as const;

const rawLumaImageTool = tool({
  description: 'Generate high-quality images using Luma\'s photorealistic AI image generation models',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(2000)
      .describe('The text prompt to generate an image from (required, max 2000 characters)'),
    
    model: z.enum(SUPPORTED_MODELS)
      .optional()
      .default('photon-1')
      .describe('Luma model to use (photon-1)'),
    
    aspectRatio: z.enum(SUPPORTED_ASPECT_RATIOS)
      .optional()
      .default('16:9')
      .describe('Aspect ratio for the generated image (1:1, 16:9, 9:16, 4:3, 3:4, 21:9, 9:21)'),
    
    seed: z.number()
      .int()
      .min(0)
      .max(2147483647)
      .optional()
      .describe('Random seed for reproducible generation (0-2147483647, optional)'),
  }),
  
  execute: async ({ 
    prompt,
    model = 'photon-1',
    aspectRatio = '16:9',
    seed
  }) => {
    // Validate API key
    const apiKey = process.env.LUMA_API_KEY;
    if (!apiKey) {
      throw new Error('LUMA_API_KEY environment variable is required');
    }

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (prompt.length > 2000) {
      throw new Error('Prompt exceeds maximum length of 2000 characters');
    }

    const startTime = Date.now();

    // Start logging
    console.log('🎨 Luma Image Tool - Generation started:', {
      timestamp: new Date().toISOString(),
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      promptLength: prompt.length,
      model,
      aspectRatio,
      seed,
      hasApiKey: !!apiKey,
    });

    try {
      // Prepare generation config
      const generateConfig: any = {
        model: luma.image(model),
        prompt: prompt.trim(),
        aspectRatio,
      };

      // Add seed if provided
      if (seed !== undefined) {
        generateConfig.seed = seed;
      }

      // Generate image
      const { image } = await generateImage(generateConfig);

      if (!image) {
        throw new Error('No image generated from Luma');
      }

      const imageData = (image as any).uint8ArrayData;
      const imageBuffer = Buffer.from(imageData);

      // Generate filename and upload to S3
      const fileName = generateImageFileName(prompt, 'png');
      const imageS3Url = await uploadImageToS3(
        imageBuffer, 
        fileName, 
        image.mimeType, 
        `Luma generated image`
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Log completion
      console.log('✅ Luma Image Tool - Generation completed:', {
        timestamp: new Date().toISOString(),
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        model,
        aspectRatio,
        fileName,
        imageSize: imageBuffer.length,
      });

      // Return structured result
      return {
        success: true,
        message: 'Image generated successfully with Luma',
        data: {
          imageUrl: imageS3Url,
          fileName,
          model,
          aspectRatio,
          prompt: prompt.trim(),
          seed,
          generatedAt: new Date().toISOString(),
        },
        metadata: {
          promptLength: prompt.length,
          imageSize: imageBuffer.length,
          duration,
          provider: 'luma',
          uploadedToS3: true,
        },
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error('❌ Luma Image Tool - Generation failed:', {
        timestamp: new Date().toISOString(),
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        model,
        aspectRatio,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication') || error.message.includes('unauthorized')) {
          throw new Error('Luma API authentication failed. Please check your LUMA_API_KEY.');
        }
        
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Luma API rate limit exceeded. Please try again in a moment.');
        }
        
        // Content policy error
        if (error.message.includes('content policy') || error.message.includes('safety') || error.message.includes('inappropriate')) {
          throw new Error('Prompt violates Luma content policy. Please modify your prompt.');
        }
        
        // Model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Luma model.`);
        }
        
        // Quota/billing error
        if (error.message.includes('quota') || error.message.includes('billing') || error.message.includes('credits')) {
          throw new Error('Luma API quota exceeded or billing issue. Please check your account.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
          throw new Error('Network error connecting to Luma API. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Luma service temporarily unavailable. Please try again later.');
        }
        
        // S3 upload errors
        if (error.message.includes('S3') || error.message.includes('upload')) {
          throw new Error(`Image generated but S3 upload failed: ${error.message}`);
        }
        
        // Invalid parameters
        if (error.message.includes('aspect ratio') || error.message.includes('aspectRatio')) {
          throw new Error(`Invalid aspect ratio "${aspectRatio}". Please use: ${SUPPORTED_ASPECT_RATIOS.join(', ')}`);
        }
        
        if (error.message.includes('seed')) {
          throw new Error('Invalid seed value. Please use a number between 0 and 2147483647.');
        }
      }

      // Generic error fallback
      throw new Error(`Luma image generation failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'luma_image_generation',
  name: 'Luma Image Generation',
  useCases: [
    'Generate photorealistic images from text prompts',
    'Create high-quality marketing visuals',
    'Generate concept art and illustrations',
    'Create social media content images',
    'Generate product mockups and designs',
    'Create artistic and creative visuals',
    'Generate landscape and scenery images',
    'Create character and portrait images',
    'Generate architectural visualizations',
    'Create abstract and artistic compositions',
  ],
  logo: 'https://www.openagentic.org/tools/luma.svg',
};

export const lumaImageTool = toOpenAgenticTool(rawLumaImageTool, toolDetails); 