import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported Anthropic Claude models with validation
const SUPPORTED_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514', 
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest'
] as const;

const rawAnthropicTool = tool({
  description: 'Generate high-quality text responses using Anthropic Claude models with advanced parameter control',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(200000)
      .describe('The text prompt to send to Claude (required, max 200,000 characters)'),
    
    model: z.string()
      .optional()
      .default('claude-sonnet-4-20250514')
      .describe('Claude model to use (claude-opus-4-20250514, claude-sonnet-4-20250514, claude-3-7-sonnet-latest, claude-3-5-sonnet-latest, claude-3-5-haiku-latest)'),
    
    maxTokens: z.number()
      .int()
      .min(1)
      .max(4096)
      .optional()
      .default(1000)
      .describe('Maximum number of tokens to generate (1-4096, default: 1000)'),
    
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
  }),
  
  execute: async ({ 
    prompt, 
    model = 'claude-sonnet-4-20250514',
    maxTokens = 1000,
    temperature = 0.7,
    topP,
    topK
  }) => {
    // Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
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

    // Start logging
    console.log('🤖 Anthropic Tool - Generation started:', {
      model,
      promptLength: prompt.length,
      maxTokens,
      temperature,
      topP,
      topK,
    });

    try {
      // Initialize Anthropic client
      const anthropic = createAnthropic({
        apiKey,
      });

      // Prepare generation config
      const generateConfig: any = {
        model: anthropic(model),
        prompt: prompt.trim(),
        maxTokens,
        temperature,
      };

      // Add optional parameters only if provided
      if (topP !== undefined) {
        generateConfig.topP = topP;
      }
      if (topK !== undefined) {
        generateConfig.topK = topK;
      }

      // Generate text
      const { text, usage, finishReason } = await generateText(generateConfig);

      // Log completion
      console.log('✅ Anthropic Tool - Generation completed:', {
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
          topK,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          promptLength: prompt.length,
          responseLength: text.length,
        },
      };

    } catch (error) {
      console.error('❌ Anthropic Tool - Generation failed:', {
        model,
        promptLength: prompt.length,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Overloaded error (server capacity issues)
        if (error.message.includes('Overloaded') || error.message.includes('overloaded') || error.message.includes('529')) {
          throw new Error('Anthropic API is currently overloaded. Please try again in a few moments.');
        }
        
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Anthropic API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Anthropic API authentication failed. Please check your API key.');
        }
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error(`Token limit exceeded. Try reducing maxTokens or prompt length.`);
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Claude model.`);
        }
        
        // Context length error (specific to Claude)
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Prompt is too long for the selected Claude model. Please reduce the prompt length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to Anthropic API. Please try again.');
        }
        
        // Claude-specific safety errors
        if (error.message.includes('safety') || error.message.includes('harmful')) {
          throw new Error('Request was rejected by Claude safety filters. Please modify your prompt.');
        }

        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Anthropic service temporarily unavailable. Please try again later.');
        }
      }

      // Generic error fallback
      throw new Error(`Anthropic text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'anthropic_chat',
  name: 'Anthropic Claude Chat',
  useCases: [
    'Generate thoughtful and nuanced creative content',
    'Provide detailed analysis and explanations',
    'Write technical documentation with clarity',
    'Create research summaries and reports',
    'Generate code with comprehensive comments',
    'Perform complex reasoning tasks',
    'Write professional emails and communications',
    'Create educational content and tutorials',
    'Generate marketing copy with brand voice',
    'Conduct thorough text analysis and critique',
    'Write structured articles and blog posts',
    'Provide ethical AI assistance and guidance',
  ],
  logo: 'https://www.openagentic.org/tools/anthropic.svg',
};

export const anthropicTool = toOpenAgenticTool(rawAnthropicTool, toolDetails);