import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { cohere } from '@ai-sdk/cohere';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported Cohere models with validation
const SUPPORTED_MODELS = [
  'command-a-03-2025',
  'command-r-plus',
  'command-r',
  'command',
  'command-light'
] as const;

const rawCohereTool = tool({
  description: 'Generate high-quality text responses using Cohere AI models with advanced parameter control',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(100000)
      .describe('The text prompt to send to Cohere (required, max 100,000 characters)'),
    
    model: z.string()
      .optional()
      .default('command-r-plus')
      .describe('Cohere model to use (command-a-03-2025, command-r-plus, command-r, command, command-light)'),
    
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
      .max(500)
      .optional()
      .describe('Controls diversity by limiting token choices (1-500, optional)'),
    
    frequencyPenalty: z.number()
      .min(0)
      .max(1)
      .optional()
      .describe('Reduces repetition in the output (0-1, optional)'),
    
    presencePenalty: z.number()
      .min(0)
      .max(1)
      .optional()
      .describe('Encourages the model to talk about new topics (0-1, optional)'),
  }),
  
  execute: async ({ 
    prompt, 
    model = 'command-r-plus',
    maxTokens = 1000,
    temperature = 0.7,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty
  }) => {
    // Validate API key
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable is required');
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
    console.log('🌟 Cohere Tool - Generation started:', {
      model,
      promptLength: prompt.length,
      maxTokens,
      temperature,
      topP,
      topK,
      frequencyPenalty,
      presencePenalty,
    });

    try {
      // Prepare generation config
      const generateConfig: any = {
        model: cohere(model),
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
      if (topK !== undefined) {
        generateConfig.topK = topK;
      }
      if (frequencyPenalty !== undefined) {
        generateConfig.frequencyPenalty = frequencyPenalty;
      }
      if (presencePenalty !== undefined) {
        generateConfig.presencePenalty = presencePenalty;
      }

      // Generate text
      const { text, usage, finishReason } = await generateText(generateConfig);

      // Log completion
      console.log('✅ Cohere Tool - Generation completed:', {
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
          frequencyPenalty,
          presencePenalty,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          promptLength: prompt.length,
          responseLength: text.length,
          provider: 'cohere',
        },
      };

    } catch (error) {
      console.error('❌ Cohere Tool - Generation failed:', {
        model,
        promptLength: prompt.length,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Cohere API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Cohere API authentication failed. Please check your API key.');
        }
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error(`Token limit exceeded. Try reducing maxTokens or prompt length.`);
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Cohere model.`);
        }
        
        // Context length error
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Prompt is too long for the selected model. Please reduce the prompt length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to Cohere API. Please try again.');
        }
        
        // Content safety errors
        if (error.message.includes('safety') || error.message.includes('harmful') || error.message.includes('content policy')) {
          throw new Error('Request was rejected by Cohere content safety filters. Please modify your prompt.');
        }

        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Cohere service temporarily unavailable. Please try again later.');
        }
      }

      // Generic error fallback
      throw new Error(`Cohere text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Create tool details
const cohereToolDetails: ToolDetails = {
  toolId: 'cohere_ai_chat',
  name: 'Cohere AI Chat',
  useCases: [
    'Generate conversational responses with Cohere Command models',
    'Create high-quality text content with strong reasoning capabilities',
    'Build chatbots and AI assistants with enterprise-grade AI',
    'Generate business documents and professional communications',
    'Multilingual text generation and conversation',
    'Create detailed explanations and analysis',
    'Generate marketing copy and product descriptions',
    'Perform text summarization and information extraction',
    'Write technical documentation and guides'
  ],
  logo: 'https://www.openagentic.org/tools/cohere.svg',
};

// Export the complete tool
export const cohereTool = toOpenAgenticTool(rawCohereTool, cohereToolDetails); 