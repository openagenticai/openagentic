import { tool, type GeneratedFile } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { ToolDetails, CoreMessage } from '../types';
import { toOpenAgenticTool } from './utils';
import { uploadImageToS3, generateImageFileName } from '../utils/s3';

interface GeminiImageFile extends GeneratedFile {
  base64Data: string;
  name: string;
}

// Supported Gemini models with image generation capabilities
const SUPPORTED_MODELS = [
  'gemini-2.0-flash-preview-image-generation',
  // 'gemini-2.0-flash-thinking-exp',
] as const;

// Supported image styles for Gemini
const IMAGE_STYLES = [
  'photorealistic',
  'artistic',
  'cartoon',
  'sketch',
  'digital-art',
  'oil-painting',
  'watercolor',
  'minimalist',
  'abstract',
  'cinematic',
] as const;

const rawGeminiImageTool = tool({
  description: 'Generate high-quality images using Google Gemini models with automatic S3 upload and storage. Supports both text prompts and messages with images for reference-based generation.',
  parameters: z.object({
    // Support either a string prompt OR message array
    prompt: z.string()
      .min(1)
      .max(4000)
      .optional()
      .describe('The text prompt to generate an image from (max 4000 characters). Use this OR messages, not both.'),
    
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant', 'tool']),
      content: z.union([
        z.string(),
        z.array(z.object({
          type: z.string(),
          text: z.string().optional(),
          image: z.union([z.string(), z.any()]).optional(),
          mimeType: z.string().optional(),
        }))
      ]),
    })).optional()
      .describe('Array of messages that may contain text and images. Use this OR prompt, not both.'),
    
    model: z.string()
      .optional()
      .default('gemini-2.0-flash-preview-image-generation')
      .describe('The Gemini model to use (gemini-2.0-flash-preview-image-generation)'),
    
    style: z.enum(IMAGE_STYLES)
      .optional()
      .describe('The style of the image (photorealistic, artistic, cartoon, sketch, digital-art, oil-painting, watercolor, minimalist, abstract, cinematic)'),
    
    aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4'])
      .optional()
      .default('1:1')
      .describe('The aspect ratio of the image (default: 1:1)'),
    
    quality: z.enum(['standard', 'high'])
      .optional()
      .default('standard')
      .describe('The quality of the image generation (standard, high)'),
  }),
  
  execute: async ({ 
    prompt,
    messages,
    model = 'gemini-2.0-flash-preview-image-generation',
    style,
    aspectRatio = '1:1',
    quality = 'standard'
  }) => {
    // Validate API key
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    // Validate input - must have either prompt or messages, but not both
    if (!prompt && !messages) {
      throw new Error('Either prompt (string) or messages (array) must be provided');
    }

    if (prompt && messages) {
      throw new Error('Cannot provide both prompt and messages. Use either prompt (for text-only) or messages (for text + images)');
    }

    // Basic validation for prompt
    if (prompt) {
      if (prompt.trim().length === 0) {
        throw new Error('Prompt cannot be empty');
      }
      if (prompt.length > 4000) {
        throw new Error('Prompt exceeds maximum length of 4000 characters');
      }
    }

    // Basic validation for messages
    if (messages) {
      if (messages.length === 0) {
        throw new Error('Messages array cannot be empty');
      }
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      throw new Error(`Model "${model}" not in supported list. Supported models: ${SUPPORTED_MODELS.join(', ')}`);
    }

    // Count images in messages for logging
    const imageCount = messages ? countImagesInMessages(messages as CoreMessage[]) : 0;
    const promptText = prompt || extractTextFromMessages(messages as CoreMessage[]);

    // Start logging
    console.log('🎨 Gemini Image Generation Tool - Generation started:', {
      timestamp: new Date().toISOString(),
      inputType: prompt ? 'string_prompt' : 'message_array',
      prompt: promptText.substring(0, 100) + (promptText.length > 100 ? '...' : ''),
      promptLength: promptText.length,
      referenceImagesCount: imageCount,
      model,
      style,
      aspectRatio,
      quality,
    });

    try {
      // Initialize Google AI client
      const google = createGoogleGenerativeAI({
        apiKey,
      });

      // Build generation configuration
      let generateConfig: any = {
        model: google(model),
        providerOptions: {
          google: { 
            responseModalities: ['TEXT', 'IMAGE'],
          },
        },
      };

      if (prompt) {
        // Simple prompt case - enhance with style and quality guidance
        let enhancedPrompt = prompt.trim();
        if (style) {
          enhancedPrompt = `Create a ${style} style image: ${enhancedPrompt}`;
        }
        if (aspectRatio !== '1:1') {
          enhancedPrompt += ` (aspect ratio: ${aspectRatio})`;
        }
        if (quality === 'high') {
          enhancedPrompt += ' (high quality, detailed)';
        }

        generateConfig.prompt = enhancedPrompt;
      } else {
        generateConfig.messages = messages;
      }

      console.log('🤖 Calling Gemini for image generation...');

      // Generate image using Gemini with image output modality
      const result = await generateText(generateConfig);

      // Check if we have generated files
      if (!result.files || result.files.length === 0) {
        throw new Error('No files were generated by Gemini. The model may not have produced an image.');
      }

      // Find the first image file
      const imageFile = result.files.find(file => 
        file.mimeType && file.mimeType.startsWith('image/')
      ) as GeminiImageFile;

      if (!imageFile) {
        throw new Error('No image file found in Gemini response. Only non-image files were generated.');
      }

      if (!imageFile.base64Data) {
        throw new Error('No base64 data found in generated image file');
      }

      // Convert response to buffer
      const imageBuffer = Buffer.from(imageFile.base64Data, 'base64');

      if (imageBuffer.length === 0) {
        throw new Error('Downloaded image buffer is empty');
      }

      // Determine file extension from MIME type
      const extension = imageFile.mimeType === 'image/jpeg' ? 'jpg' : 
                       imageFile.mimeType === 'image/png' ? 'png' : 
                       imageFile.mimeType === 'image/webp' ? 'webp' : 
                       'jpg'; // Default fallback

      // Generate filename for S3 upload
      const fileName = generateImageFileName(promptText, extension);

      // Upload to S3
      console.log('📤 Uploading generated image to S3...');
      const imageUrl = await uploadImageToS3(
        imageBuffer,
        fileName,
        imageFile.mimeType || 'image/jpeg',
        `Gemini ${model} generated image`
      );

      // Log completion
      console.log('✅ Gemini Image Generation Tool - Generation completed:', {
        model,
        style,
        aspectRatio,
        quality,
        imageUrl,
        fileName,
        imageSize: imageBuffer.length,
        mimeType: imageFile.mimeType,
        originalName: imageFile.name,
        inputType: prompt ? 'string_prompt' : 'message_array',
        referenceImagesUsed: imageCount,
      });

      // Return structured result
      return {
        success: true,
        imageUrl,
        fileName,
        model,
        style,
        aspectRatio,
        quality,
        originalPrompt: promptText,
        inputType: prompt ? 'string_prompt' : 'message_array',
        referenceImagesCount: imageCount,
        generatedText: result.text || null,
        metadata: {
          generatedAt: new Date().toISOString(),
          promptLength: promptText.length,
          fileSize: imageBuffer.length,
          mimeType: imageFile.mimeType,
          originalFileName: imageFile.name,
          uploadedToS3: true,
          referenceImagesUsed: imageCount,
        },
      };

    } catch (error) {
      console.error('❌ Gemini Image Generation Tool - Generation failed:', {
        model,
        style,
        aspectRatio,
        quality,
        promptLength: promptText.length,
        inputType: prompt ? 'string_prompt' : 'message_array',
        referenceImagesCount: imageCount,
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
          throw new Error(`Invalid model "${model}". Please use a supported Gemini model with image generation capabilities.`);
        }
        
        // Content policy violation
        if (error.message.includes('content policy') || error.message.includes('safety') || 
            error.message.includes('blocked') || error.message.includes('filtered')) {
          throw new Error('Image generation request violates Google content policy or safety filters. Please modify your prompt.');
        }
        
        // Prompt too long error
        if (error.message.includes('prompt') && error.message.includes('too long')) {
          throw new Error('Prompt is too long. Please reduce the prompt length and try again.');
        }
        
        // Image generation specific errors
        if (error.message.includes('No files were generated') || error.message.includes('No image file found')) {
          throw new Error('Gemini did not generate an image. Try rephrasing your prompt or adding more descriptive details.');
        }
        
        // Download errors
        if (error.message.includes('download') || error.message.includes('fetch') || 
            error.message.includes('download URL')) {
          throw new Error('Failed to download generated image from Gemini. Please try again.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout') || 
            error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Network error connecting to Google API. Please check your internet connection.');
        }
        
        // S3 upload errors
        if (error.message.includes('S3') || error.message.includes('upload')) {
          throw new Error('Failed to upload generated image to S3. Please check your S3 configuration.');
        }
        
        // Buffer processing errors
        if (error.message.includes('buffer') || error.message.includes('empty')) {
          throw new Error('Failed to process generated image data. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504') ||
            error.message.includes('service unavailable') || error.message.includes('server error')) {
          throw new Error('Google Gemini service temporarily unavailable. Please try again later.');
        }
        
        // Image modality errors
        if (error.message.includes('modality') || error.message.includes('responseModalities')) {
          throw new Error('Image generation modality not supported by this Gemini model. Please try a different model.');
        }
      }

      // Generic error fallback
      throw new Error(`Gemini image generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Helper function to count images in messages
function countImagesInMessages(messages: CoreMessage[]): number {
  let imageCount = 0;
  
  for (const message of messages) {
    if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'image') {
          imageCount++;
        }
      }
    }
  }
  
  return imageCount;
}

// Helper function to extract text from messages for logging
function extractTextFromMessages(messages: CoreMessage[]): string {
  const textParts: string[] = [];

  for (const message of messages) {
    if (typeof message.content === 'string') {
      if (message.content.trim()) {
        textParts.push(message.content.trim());
      }
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'text' && part.text?.trim()) {
          textParts.push(part.text.trim());
        }
      }
    }
  }

  return textParts.join(' ');
}

const toolDetails: ToolDetails = {
  toolId: 'gemini_image_generator',
  name: 'Gemini Image Generator',
  useCases: [
    'Generate photorealistic images from text descriptions using Gemini',
    'Create artistic illustrations and digital art with AI',
    'Generate concept art for creative projects',
    'Create custom artwork for presentations and documents',
    'Generate images in various artistic styles (cartoon, sketch, oil-painting)',
    'Create marketing visuals and social media content',
    'Generate educational and explanatory images',
    'Create abstract and minimalist artwork',
    'Generate cinematic and dramatic imagery',
    'Create watercolor and traditional art style images',
    'Generate images with specific aspect ratios for different use cases',
    'Create high-quality detailed images for professional use',
    'Generate images using reference images for style and composition guidance',
    'Create variations and modifications of existing images',
  ],
  logo: 'https://www.openagentic.org/tools/gemini.svg',
};

export const geminiImageTool = toOpenAgenticTool(rawGeminiImageTool, toolDetails);