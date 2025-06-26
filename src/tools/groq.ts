import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported Groq models with validation
const SUPPORTED_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma-7b-it',
  'gemma2-9b-it',
] as const;

const rawGroqTool = tool({
  description: 'Generate high-quality text responses using Groq\'s fast inference with Llama and other open-source models',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(100000)
      .describe('The text prompt to send to Groq (required, max 100,000 characters)'),
    
    model: z.string()
      .optional()
      .default('llama-3.3-70b-versatile')
      .describe('Groq model to use (llama-3.3-70b-versatile, llama-3.1-70b-versatile, llama-3.1-8b-instant, llama3-70b-8192, llama3-8b-8192, mixtral-8x7b-32768, gemma-7b-it, gemma2-9b-it)'),
    
    maxTokens: z.number()
      .int()
      .min(1)
      .max(8192)
      .optional()
      .default(1000)
      .describe('Maximum number of tokens to generate (1-8192, default: 1000)'),
    
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
    model = 'llama-3.3-70b-versatile',
    maxTokens = 1000,
    temperature = 0.7,
    topP,
    presencePenalty,
    frequencyPenalty
  }) => {
    // Validate API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
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
    console.log('🚀 Groq Tool - Generation started:', {
      model,
      promptLength: prompt.length,
      maxTokens,
      temperature,
      topP,
      presencePenalty,
      frequencyPenality: frequencyPenalty,
    });

    try {
      // Initialize Groq client
      const groqClient = createGroq({
        apiKey,
      });

      // Prepare generation config
      const generateConfig: any = {
        model: groqClient(model),
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
      console.log('✅ Groq Tool - Generation completed:', {
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
          provider: 'groq',
        },
      };

    } catch (error) {
      console.error('❌ Groq Tool - Generation failed:', {
        model,
        promptLength: prompt.length,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Groq API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Groq API authentication failed. Please check your API key.');
        }
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error(`Token limit exceeded. Try reducing maxTokens or prompt length.`);
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Groq model.`);
        }
        
        // Context length error
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Prompt is too long for the selected model. Please reduce the prompt length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to Groq API. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Groq service temporarily unavailable. Please try again later.');
        }
        
        // Content policy errors
        if (error.message.includes('content policy') || error.message.includes('safety')) {
          throw new Error('Prompt violates content policy. Please modify your prompt.');
        }
        
        // Quota errors
        if (error.message.includes('quota') || error.message.includes('credits')) {
          throw new Error('Groq API quota exceeded. Please check your account limits.');
        }
      }

      // Generic error fallback
      throw new Error(`Groq text generation failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'groq_chat',
  name: 'Groq Chat',
  useCases: [
    'Fast text generation with Llama models',
    'Quick conversational AI responses',
    'Rapid content creation and editing',
    'High-speed code generation',
    'Fast creative writing assistance',
    'Quick question answering',
    'Rapid text summarization',
    'Fast translation tasks',
    'Quick brainstorming sessions',
    'High-performance AI reasoning',
  ],
  logo: 'https://www.openagentic.org/tools/groq.svg',
};

export const groqTool = toOpenAgenticTool(rawGroqTool, toolDetails); 