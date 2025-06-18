import { tool } from 'ai';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';
import { uploadImageToS3, generateImageFileName } from '../utils/s3';

// Supported DALL-E models with validation
const SUPPORTED_MODELS = [
  'dall-e-3',
  'dall-e-2',
] as const;

// Supported image sizes for each model
const MODEL_SIZES = {
  'dall-e-3': ['1024x1024', '1024x1792', '1792x1024'],
  'dall-e-2': ['256x256', '512x512', '1024x1024'],
} as const;

const rawOpenAIImageTool = tool({
  description: 'Generate high-quality images using OpenAI DALL-E models with automatic S3 upload and storage',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(4000)
      .describe('The text prompt to generate an image from (required, max 4000 characters)'),
    
    model: z.string()
      .optional()
      .default('dall-e-3')
      .describe('The DALL-E model to use (dall-e-3, dall-e-2, default: dall-e-3)'),
    
    size: z.string()
      .optional()
      .default('1024x1024')
      .describe('The size of the image - DALL-E 3: 1024x1024, 1024x1792, 1792x1024 | DALL-E 2: 256x256, 512x512, 1024x1024'),
    
    quality: z.string()
      .optional()
      .default('standard')
      .describe('The quality of the image (standard, hd) - DALL-E 3 only, default: standard'),
    
    style: z.string()
      .optional()
      .default('vivid')
      .describe('The style of the image (vivid, natural) - DALL-E 3 only, default: vivid'),
  }),
  
  execute: async ({ 
    prompt,
    model = 'dall-e-3',
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid'
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
    const validSizes = MODEL_SIZES[model as keyof typeof MODEL_SIZES] || MODEL_SIZES['dall-e-3'];
    if (!validSizes.includes(size as any)) {
      throw new Error(`Invalid size "${size}" for model "${model}". Supported sizes: ${validSizes.join(', ')}`);
    }

    // Validate quality parameter (only for DALL-E 3)
    if (quality !== 'standard' && quality !== 'hd') {
      throw new Error('Quality must be either "standard" or "hd"');
    }

    if (model === 'dall-e-2' && quality === 'hd') {
      console.warn('Quality parameter "hd" not supported for DALL-E 2, using "standard"');
      quality = 'standard';
    }

    // Validate style parameter (only for DALL-E 3)
    if (style !== 'vivid' && style !== 'natural') {
      throw new Error('Style must be either "vivid" or "natural"');
    }

    if (model === 'dall-e-2' && style === 'natural') {
      console.warn('Style parameter not supported for DALL-E 2, ignoring');
    }

    // Start logging
    console.log('🎨 OpenAI Image Generation Tool - Generation started:', {
      timestamp: new Date().toISOString(),
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      promptLength: prompt.length,
      model,
      size,
      quality,
      style,
    });

    try {
      // Initialize OpenAI client
      const openai = createOpenAI({
        apiKey,
      });

      // Prepare request body for OpenAI Images API
      const requestBody: any = {
        model,
        prompt: prompt.trim(),
        size,
        response_format: 'b64_json', // Get base64 for easier handling
        n: 1, // Generate one image
      };

      // Add DALL-E 3 specific parameters
      if (model === 'dall-e-3') {
        requestBody.quality = quality;
        requestBody.style = style;
      }

      // Make direct API call to OpenAI Images endpoint
      const response = await fetch('https://api.openai.com/v1/images/generations', {
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
        let errorMessage = `OpenAI Images API error: ${response.status} - ${response.statusText}`;
        
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

      // Parse response
      let imageData: any;
      try {
        imageData = await response.json();
      } catch (error) {
        throw new Error(`Failed to parse OpenAI Images API response: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Validate response structure
      if (!imageData || !imageData.data || !Array.isArray(imageData.data) || imageData.data.length === 0) {
        throw new Error('Invalid response structure from OpenAI Images API');
      }

      const generatedImage = imageData.data[0];
      if (!generatedImage.b64_json) {
        throw new Error('No base64 image data received from OpenAI Images API');
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(generatedImage.b64_json, 'base64');

      // Generate filename for S3 upload
      const fileName = generateImageFileName(prompt, 'png');

      // Upload to S3
      console.log('📤 Uploading generated image to S3...');
      const imageUrl = await uploadImageToS3(
        imageBuffer,
        fileName,
        'image/png',
        `DALL-E ${model} generated image: ${prompt.substring(0, 100)}`
      );

      // Log completion
      console.log('✅ OpenAI Image Generation Tool - Generation completed:', {
        model,
        size,
        quality,
        style,
        imageUrl,
        fileName,
        imageSize: imageBuffer.length,
        revisedPrompt: generatedImage.revised_prompt || null,
      });

      // Return structured result
      return {
        success: true,
        imageUrl,
        fileName,
        model,
        size,
        quality,
        style,
        originalPrompt: prompt.trim(),
        revisedPrompt: generatedImage.revised_prompt || null,
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
        quality,
        style,
        promptLength: prompt.length,
        error: error instanceof Error ? error.message : String(error),
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
      throw new Error(`OpenAI image generation failed: ${error instanceof Error ? error.message : String(error)}`);
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