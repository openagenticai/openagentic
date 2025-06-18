import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported xAI Grok models with validation
const SUPPORTED_MODELS = [
  'grok-3',
  'grok-3-fast',
  'grok-3-mini',
  'grok-3-mini-fast',
] as const;

const rawGrokTool = tool({
  description: 'Generate high-quality text responses using xAI Grok models with enhanced reasoning capabilities',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(200000)
      .describe('The prompt to send to Grok (required, max 200,000 characters)'),
    
    model: z.string()
      .optional()
      .default('grok-3')
      .describe('Grok model to use (grok-3, grok-3-fast, grok-3-mini, grok-3-mini-fast)'),
    
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
    
    reasoningEffort: z.enum(['low', 'medium', 'high'])
      .optional()
      .default('medium')
      .describe('Reasoning effort for reasoning models (low, medium, high, default: medium)'),
  }),
  
  execute: async ({ 
    prompt, 
    model = 'grok-3',
    maxTokens = 1000,
    temperature = 0.7,
    reasoningEffort = 'medium'
  }) => {
    // Validate API key
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error('XAI_API_KEY environment variable is required');
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
    console.log('🤖 Grok Tool - Generation started:', {
      model,
      promptLength: prompt.length,
      maxTokens,
      temperature,
      reasoningEffort,
    });

    try {
      // Initialize xAI client
      const xai = createXai({
        apiKey,
      });

      // Prepare generation config
      const generateConfig: any = {
        model: xai(model),
        prompt: prompt.trim(),
        maxTokens,
        temperature,
      };

      // Add reasoning effort for applicable models
      if (reasoningEffort && (model.includes('grok-3') || model.includes('reasoning'))) {
        generateConfig.reasoningEffort = reasoningEffort;
      }

      // Generate text
      const { text, usage, finishReason } = await generateText(generateConfig);

      // Log completion
      console.log('✅ Grok Tool - Generation completed:', {
        model,
        tokensUsed: usage?.totalTokens || 0,
        responseLength: text.length,
        finishReason,
        reasoningEffort,
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
          reasoningEffort,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          promptLength: prompt.length,
          responseLength: text.length,
        },
      };

    } catch (error) {
      console.error('❌ Grok Tool - Generation failed:', {
        model,
        promptLength: prompt.length,
        reasoningEffort,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('xAI API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('xAI API authentication failed. Please check your API key.');
        }
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error(`Token limit exceeded. Try reducing maxTokens or prompt length.`);
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Grok model.`);
        }
        
        // Context length error
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Prompt is too long for the selected Grok model. Please reduce the prompt length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to xAI API. Please try again.');
        }
        
        // xAI service errors
        if (error.message.includes('service') || error.message.includes('unavailable')) {
          throw new Error('xAI service temporarily unavailable. Please try again later.');
        }
        
        // Reasoning effort errors
        if (error.message.includes('reasoning') || error.message.includes('effort')) {
          throw new Error('Invalid reasoning effort parameter. Please use low, medium, or high.');
        }
      }

      // Generic error fallback
      throw new Error(`Grok text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'grok_chat',
  name: 'xAI Grok Chat',
  useCases: [
    'Generate creative content and stories',
    'Answer questions with real-time information',
    'Provide analysis with enhanced reasoning',
    'Generate code with advanced understanding',
    'Summarize complex information',
    'Engage in conversational AI interactions',
    'Solve problems with step-by-step reasoning',
    'Create content with factual accuracy',
    'Generate explanations and tutorials',
    'Assist with research and analysis',
  ],
  logo: 'https://www.openagentic.org/tools/grok.svg',
};

export const grokTool = toOpenAgenticTool(rawGrokTool, toolDetails);