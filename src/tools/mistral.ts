import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { mistral } from '@ai-sdk/mistral';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported Mistral models with validation
const SUPPORTED_MODELS = [
  'mistral-small-latest',
  'mistral-medium-latest', 
  'mistral-large-latest',
  'open-mistral-7b',
  'open-mixtral-8x7b',
  'open-mixtral-8x22b',
  'codestral-latest'
] as const;

const rawMistralTool = tool({
  description: 'Generate high-quality text responses using Mistral AI models with advanced parameter control',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(100000)
      .describe('The text prompt to send to Mistral (required, max 100,000 characters)'),
    
    model: z.string()
      .optional()
      .default('mistral-small-latest')
      .describe('Mistral model to use (mistral-small-latest, mistral-medium-latest, mistral-large-latest, open-mistral-7b, open-mixtral-8x7b, open-mixtral-8x22b, codestral-latest)'),
    
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
    
    randomSeed: z.number()
      .int()
      .optional()
      .describe('Random seed for reproducible outputs (optional)'),
  }),
  
  execute: async ({ 
    prompt, 
    model = 'mistral-small-latest',
    maxTokens = 1000,
    temperature = 0.7,
    topP,
    randomSeed
  }) => {
    // Validate API key
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (prompt.length > 100000) {
      throw new Error('Prompt exceeds maximum length of 100,000 characters');
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      throw new Error(`Model "${model}" not in supported list`);
    }

    // Start logging
    console.log('🔮 Mistral Tool - Generation started:', {
      model,
      promptLength: prompt.length,
      maxTokens,
      temperature,
      topP,
      randomSeed,
    });

    try {
      // Prepare generation config
      const generateConfig: any = {
        model: mistral(model),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt.trim(),
              },
            ],
          },
        ],
        maxTokens,
        temperature,
      };

      // Add optional parameters only if provided
      if (topP !== undefined) {
        generateConfig.topP = topP;
      }
      if (randomSeed !== undefined) {
        generateConfig.seed = randomSeed;
      }

      // Generate text
      const { text, usage, finishReason } = await generateText(generateConfig);

      // Log completion
      console.log('✅ Mistral Tool - Generation completed:', {
        model,
        tokensUsed: usage?.totalTokens || 0,
        responseLength: text.length,
        finishReason,
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
          randomSeed,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          promptLength: prompt.length,
          responseLength: text.length,
          provider: 'mistral',
        },
      };

    } catch (error) {
      console.error('❌ Mistral Tool - Generation failed:', {
        model,
        promptLength: prompt.length,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Mistral API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Mistral API authentication failed. Please check your API key.');
        }
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error(`Token limit exceeded. Try reducing maxTokens or prompt length.`);
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Mistral model.`);
        }
        
        // Context length error
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Prompt is too long for the selected model. Please reduce the prompt length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to Mistral API. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Mistral service temporarily unavailable. Please try again later.');
        }
      }

      // Generic error fallback
      throw new Error(`Mistral text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Create tool details
const mistralToolDetails: ToolDetails = {
  toolId: 'mistral_ai_chat',
  name: 'Mistral AI Chat',
  useCases: [
    'Generate conversational responses with Mistral AI models',
    'Create high-quality text content using advanced language models',
    'Build chatbots and AI assistants with Mistral capabilities',
    'Generate code with Codestral specialized model',
    'Multilingual text generation and conversation'
  ],
  logo: 'https://www.openagentic.org/tools/mistral.svg',
};

// Export the complete tool
export const mistralTool = toOpenAgenticTool(rawMistralTool, mistralToolDetails); 