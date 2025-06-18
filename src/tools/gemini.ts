import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported Google Gemini models with validation
const SUPPORTED_MODELS = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  // 'gemini-2.5-pro',
  // 'gemini-2.5-flash', 
  // 'gemini-2.5-flash-lite-preview-06-17',
] as const;

const rawGeminiTool = tool({
  description: 'Generate high-quality text responses using Google Gemini models with multimodal capabilities',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(200000)
      .describe('The text prompt to send to Gemini (required, max 200,000 characters)'),
    
    model: z.string()
      .optional()
      .default('gemini-1.5-pro')
      .describe('Gemini model to use (gemini-1.5-pro, gemini-1.5-flash)'),
      // .describe('Gemini model to use (gemini-1.5-pro, gemini-1.5-flash, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite-preview-06-17)'),
    
    maxTokens: z.number()
      .int()
      .min(1)
      .max(8192)
      .optional()
      .default(1000)
      .describe('Maximum number of tokens to generate (1-8192, default: 1000)'),
    
    temperature: z.number()
      .min(0)
      .max(1)
      .optional()
      .default(0.7)
      .describe('Controls randomness - lower values are more focused (0-1, default: 0.7)'),
    
    topP: z.number()
      .min(0)
      .max(1)
      .optional()
      .describe('Controls diversity via nucleus sampling (0-1, optional)'),
    
    topK: z.number()
      .int()
      .min(1)
      .max(40)
      .optional()
      .describe('Controls diversity by limiting token choices (1-40, optional)'),
    
    imageUrls: z.array(z.string().url())
      .optional()
      .default([])
      .describe('Array of image URLs for multimodal analysis (optional)'),
  }),
  
  execute: async ({ 
    prompt, 
    model = 'gemini-2.5-pro',
    maxTokens = 1000,
    temperature = 0.7,
    topP,
    topK,
    imageUrls = []
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

    if (prompt.length > 200000) {
      throw new Error('Prompt exceeds maximum length of 200,000 characters');
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      throw new Error(`Model "${model}" not in supported list`);
    }

    // Validate image URLs
    if (imageUrls.length > 0) {
      for (const url of imageUrls) {
        try {
          new URL(url);
        } catch {
          throw new Error(`Invalid image URL: ${url}`);
        }
      }
    }

    // Start logging
    console.log('🤖 Gemini Tool - Generation started:', {
      model,
      promptLength: prompt.length,
      maxTokens,
      temperature,
      topP,
      topK,
      imageCount: imageUrls.length,
      hasImages: imageUrls.length > 0,
    });

    try {
      // Initialize Google client
      const google = createGoogleGenerativeAI({
        apiKey,
      });

      // Prepare generation config
      const generateConfig: any = {
        model: google(model),
        maxTokens: Math.min(maxTokens, 4000), // Reduce maxTokens to avoid the empty response bug
        temperature,
      };

      // Add optional parameters only if provided
      if (topP !== undefined) {
        generateConfig.topP = topP;
      }
      if (topK !== undefined) {
        generateConfig.topK = topK;
      }

      // Handle multimodal vs text-only requests
      if (imageUrls.length > 0) {
        // Use messages format for multimodal
        const content: any[] = [
          { type: 'text', text: prompt.trim() }
        ];

        // Add images to content
        for (const imageUrl of imageUrls) {
          content.push({
            type: 'image',
            image: imageUrl
          });
        }

        generateConfig.messages = [
          {
            role: 'user',
            content
          }
        ];
      } else {
        // Use prompt format for text-only
        generateConfig.prompt = prompt.trim();
      }

      // Generate text
      const { text, usage, finishReason } = await generateText(generateConfig);

      // Check for empty response
      if (!text || text.trim().length === 0) {
        throw new Error(`Gemini model returned empty response. FinishReason: ${finishReason}. This may indicate insufficient maxTokens, content filtering, or model issues.`);
      }

      // Log completion
      console.log('✅ Gemini Tool - Generation completed:', {
        model,
        tokensUsed: usage?.totalTokens || 0,
        responseLength: text.length,
        finishReason,
        imageCount: imageUrls.length,
      });

      // Return structured result
      return {
        success: true,
        text,
        model,
        usage: {
          promptTokens: usage?.promptTokens || 0,
          completionTokens: usage?.completionTokens || 0,
          totalTokens: usage?.totalTokens || 0,
        },
        finishReason,
        parameters: {
          temperature,
          maxTokens,
          topP,
          topK,
        },
        multimodal: {
          imageCount: imageUrls.length,
          hasImages: imageUrls.length > 0,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          promptLength: prompt.length,
          responseLength: text.length,
        },
      };

    } catch (error) {
      console.error('❌ Gemini Tool - Generation failed:', {
        model,
        promptLength: prompt.length,
        imageCount: imageUrls.length,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Google API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Google API authentication failed. Please check your API key.');
        }
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error(`Token limit exceeded. Try reducing maxTokens or prompt length.`);
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Gemini model.`);
        }
        
        // Image processing errors
        if (error.message.includes('image') || error.message.includes('multimodal')) {
          throw new Error('Image processing failed. Please check image URLs and try again.');
        }
        
        // Context length error
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Prompt is too long for the selected Gemini model. Please reduce the prompt length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to Google API. Please try again.');
        }
        
        // Safety filter errors
        if (error.message.includes('safety') || error.message.includes('blocked')) {
          throw new Error('Request was blocked by Google safety filters. Please modify your prompt.');
        }
      }

      // Generic error fallback
      throw new Error(`Gemini text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'gemini_chat',
  name: 'Google Gemini Chat',
  useCases: [
    'Generate creative content and stories',
    'Answer questions with multimodal understanding',
    'Analyze images and visual content',
    'Summarize text and visual documents',
    'Write code with contextual understanding',
    'Translate text between languages',
    'Generate descriptions of images',
    'Create content from visual inputs',
    'Multimodal reasoning and analysis',
    'Visual question answering',
  ],
  logo: 'https://www.openagentic.org/tools/gemini.svg',
};

export const geminiTool = toOpenAgenticTool(rawGeminiTool, toolDetails);