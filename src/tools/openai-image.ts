import { tool, experimental_generateImage as generateImage} from 'ai';
import { z } from 'zod';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';
import { uploadImageToS3, generateImageFileName } from '../utils/s3';
import { openai } from '@ai-sdk/openai';

// Supported models with validation
const SUPPORTED_MODELS = [
  'dall-e-3',
  'dall-e-2',
  'gpt-image-1',
] as const;

// Supported image sizes for each model
const MODEL_SIZES = {
  'dall-e-3': ['1024x1024', '1024x1792', '1792x1024'],
  'dall-e-2': ['256x256', '512x512', '1024x1024'],
  'gpt-image-1': ['1024x1024', '1536x1024', '1024x1536'],
} as const;

const MODEL_QUALITY = {
  'dall-e-3': 'standard',
  'dall-e-2': 'standard',
  'gpt-image-1': 'high',
} as const;

const rawOpenAIImageTool = tool({
  description: 'Generate images using OpenAI models with automatic S3 upload and storage',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(4000)
      .describe('The text prompt to generate an image from (required, max 4000 characters)'),
    
    model: z.string()
      .optional()
      .default('gpt-image-1')
      .describe('The model to use (dall-e-3, dall-e-2, gpt-image-1, default: gpt-image-1)'),
    
    size: z.string()
      .optional()
      .default('1024x1024')
      .describe('The size of the image - DALL-E 3: 1024x1024, 1024x1792, 1792x1024 | DALL-E 2: 256x256, 512x512, 1024x1024 | GPT-Image-1: 1024x1024, 1536x1024, 1024x1536'),
    
    // quality: z.string()
    //   .optional()
    //   .default('standard')
    //   .describe('The quality of the image (auto, high, standard, hd) - DALL-E 3 only, default: high'),
    
    // style: z.string()
    //   .optional()
    //   .default('vivid')
    //   .describe('The style of the image (vivid, natural) - DALL-E 3 only, default: vivid'),
  }),
  
  execute: async ({ 
    prompt,
    model = 'gpt-image-1',
    size = '1024x1024',
    // quality = 'high',
    // style = 'vivid'
  }) => {
    // Validate API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (prompt.length > 4000) {
      throw new Error('Prompt exceeds maximum length of 4000 characters');
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      throw new Error(`Model "${model}" not in supported list`);
    }

    // Validate size for model
    const validSizes = MODEL_SIZES[model as keyof typeof MODEL_SIZES] || MODEL_SIZES['gpt-image-1'];
    if (!validSizes.includes(size as any)) {
      throw new Error(`Invalid size "${size}" for model "${model}". Supported sizes: ${validSizes.join(', ')}`);
    }


    // Validate style parameter (only for DALL-E 3)
    // if (style !== 'vivid' && style !== 'natural') {
    //   throw new Error('Style must be either "vivid" or "natural"');
    // }

    // if (model === 'dall-e-2' && style === 'natural') {
    //   console.warn('Style parameter not supported for DALL-E 2, ignoring');
    // }

    // Start logging
    console.log('🎨 OpenAI Image Generation Tool - Generation started:', {
      timestamp: new Date().toISOString(),
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      promptLength: prompt.length,
      model,
      size,
      quality: MODEL_QUALITY[model as keyof typeof MODEL_QUALITY],
      // style,
    });

    try {

   

      const { image } = await generateImage({
        model: openai.image(model),
        prompt: prompt.trim(),
        providerOptions: {
          openai: { quality: MODEL_QUALITY[model as keyof typeof MODEL_QUALITY] },
        },
        size: size as `${number}x${number}`,
        n: 1, // Generate one image
      });

      

      

      // Validate response structure
      if (!image) {
        throw new Error('Invalid response structure from OpenAI Images API');
      }

      const generatedImageBase64 = image.base64;
      if (!generatedImageBase64) {
        throw new Error('No base64 image data received from OpenAI Images API');
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(generatedImageBase64, 'base64');

      // Generate filename for S3 upload
      const fileName = generateImageFileName(prompt, 'png');

      // Upload to S3
      console.log('📤 Uploading generated image to S3...');
      const imageUrl = await uploadImageToS3(
        imageBuffer,
        fileName,
        'image/png',
        `OpenAI ${model} generated image`
      );

      // Log completion
      console.log('✅ OpenAI Image Generation Tool - Generation completed:', {
        model,
        size,
        quality: MODEL_QUALITY[model as keyof typeof MODEL_QUALITY],
        imageUrl,
        fileName,
        imageSize: imageBuffer.length,
      });

      // Return structured result
      return {
        success: true,
        imageUrl,
        fileName,
        model,
        size,
        quality: MODEL_QUALITY[model as keyof typeof MODEL_QUALITY],
        originalPrompt: prompt.trim(),
        metadata: {
          generatedAt: new Date().toISOString(),
          promptLength: prompt.length,
          fileSize: imageBuffer.length,
          uploadedToS3: true,
        },
      };

    } catch (error) {
      console.error('❌ OpenAI Image Generation Tool - Generation failed:', {
        model,
        size,
        quality: MODEL_QUALITY[model as keyof typeof MODEL_QUALITY],
        promptLength: prompt.length,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('OpenAI API authentication failed. Please check your API key.');
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported DALL-E model.`);
        }
        
        // Content policy violation
        if (error.message.includes('content policy') || error.message.includes('safety')) {
          throw new Error('Image generation request violates OpenAI content policy. Please modify your prompt.');
        }
        
        // Prompt too long error
        if (error.message.includes('prompt') && error.message.includes('too long')) {
          throw new Error('Prompt is too long. Please reduce the prompt length and try again.');
        }
        
        // Image size errors
        if (error.message.includes('size') || error.message.includes('dimensions')) {
          throw new Error(`Invalid image size "${size}" for model "${model}". Please use a supported size.`);
        }
        
        // Quality/style parameter errors
        if (error.message.includes('quality') || error.message.includes('style')) {
          throw new Error('Invalid quality or style parameter. Please check the supported values for your model.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout') || 
            error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Network error connecting to OpenAI API. Please try again.');
        }
        
        // S3 upload errors
        if (error.message.includes('S3') || error.message.includes('upload')) {
          throw new Error('Failed to upload generated image to S3. Please check your S3 configuration.');
        }
        
        // Base64 conversion errors
        if (error.message.includes('base64') || error.message.includes('buffer')) {
          throw new Error('Failed to process generated image data. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('OpenAI service temporarily unavailable. Please try again later.');
        }
      }

      // Generic error fallback
      throw new Error(`OpenAI image generation failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'openai_image_generator',
  name: 'OpenAI Image Generator',
  useCases: [
    'Generate photorealistic images from text descriptions',
    'Create artistic illustrations and digital art',
    'Design logos and brand imagery',
    'Generate product mockups and prototypes',
    'Create concept art for creative projects',
    'Generate marketing visuals and advertisements',
    'Create custom artwork for presentations',
    'Generate book covers and poster designs',
    'Create social media content and graphics',
    'Generate architectural and interior design concepts',
    'Create character designs and illustrations',
    'Generate landscape and nature imagery',
  ],
  logo: 'https://www.openagentic.org/tools/openai.svg',
};

export const openaiImageTool = toOpenAgenticTool(rawOpenAIImageTool, toolDetails);