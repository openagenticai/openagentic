import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported OpenAI models with validation
const SUPPORTED_MODELS = [
  'gpt-4o',
  'gpt-4o-mini', 
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo'
] as const;

const rawOpenAITool = tool({
  description: 'Generate high-quality text responses using OpenAI GPT models with advanced parameter control',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(50000)
      .describe('The text prompt to send to OpenAI (required, max 50,000 characters)'),
    
    model: z.string()
      .optional()
      .default('gpt-4o-mini')
      .describe('OpenAI model to use (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo)'),
    
    maxTokens: z.number()
      .int()
      .min(1)
      .max(4096)
      .optional()
      .default(1000)
      .describe('Maximum number of tokens to generate (1-4096, default: 1000)'),
    
    temperature: z.number()
      .min(0)
      .max(2)
      .optional()
      .default(0.7)
      .describe('Controls randomness - lower values are more focused (0-2, default: 0.7)'),
    
    topP: z.number()
      .min(0)
      .max(1)
      .optional()
      .describe('Controls diversity via nucleus sampling (0-1, optional)'),
    
    presencePenalty: z.number()
      .min(-2)
      .max(2)
      .optional()
      .describe('Penalizes repeated tokens (-2 to 2, optional)'),
    
    frequencyPenalty: z.number()
      .min(-2)
      .max(2)
      .optional()
      .describe('Penalizes frequent tokens (-2 to 2, optional)'),
  }),
  
  execute: async ({ 
    prompt, 
    model = 'gpt-4o-mini',
    maxTokens = 1000,
    temperature = 0.7,
    topP,
    presencePenalty,
    frequencyPenalty
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

    if (prompt.length > 50000) {
      throw new Error('Prompt exceeds maximum length of 50,000 characters');
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      throw new Error(`Model "${model}" not in supported list`);
    }

    // Start logging
    console.log('🤖 OpenAI Tool - Generation started:', {
      model,
      promptLength: prompt.length,
      maxTokens,
      temperature,
      topP,
      presencePenalty,
      frequencyPenalty,
    });

    try {
      // Initialize OpenAI client
      const openai = createOpenAI({
        apiKey,
      });

      // Prepare generation config
      const generateConfig: any = {
        model: openai(model),
        prompt: prompt.trim(),
        maxTokens,
        temperature,
      };

      // Add optional parameters only if provided
      if (topP !== undefined) {
        generateConfig.topP = topP;
      }
      if (presencePenalty !== undefined) {
        generateConfig.presencePenalty = presencePenalty;
      }
      if (frequencyPenalty !== undefined) {
        generateConfig.frequencyPenalty = frequencyPenalty;
      }

      // Generate text
      const { text, usage, finishReason } = await generateText(generateConfig);

      // Log completion
      console.log('✅ OpenAI Tool - Generation completed:', {
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
          presencePenalty,
          frequencyPenalty,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          promptLength: prompt.length,
          responseLength: text.length,
        },
      };

    } catch (error) {
      console.error('❌ OpenAI Tool - Generation failed:', {
        model,
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
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error(`Token limit exceeded. Try reducing maxTokens or prompt length.`);
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported OpenAI model.`);
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to OpenAI API. Please try again.');
        }
      }

      // Generic error fallback
      throw new Error(`OpenAI text generation failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'openai_text_generation',
  name: 'OpenAI Text Generation',
  useCases: [
    'Generate creative content and stories',
    'Answer questions and provide explanations',
    'Summarize text and documents',
    'Write code and technical documentation',
    'Translate text between languages',
    'Proofread and edit content',
    'Generate marketing copy and descriptions',
    'Create blog posts and articles',
    'Brainstorm ideas and concepts',
    'Generate product descriptions',
    'Write emails and communications',
  ],
  logo: 'https://www.openagentic.org/tools/openai.svg',
};

export const openaiTool = toOpenAgenticTool(rawOpenAITool, toolDetails);