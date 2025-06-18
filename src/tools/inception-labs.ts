import { tool } from 'ai';
import { z } from 'zod';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported Inception Labs Mercury models with validation
const SUPPORTED_MODELS = [
  'mercury-coder',
] as const;

const rawInceptionLabsTool = tool({
  description: 'Generate high-quality code and technical content using Inception Labs Mercury Coder model with specialized coding capabilities',
  parameters: z.object({
    prompt: z.string()
      .min(1)
      .max(100000)
      .describe('The text prompt to send to Mercury Coder (required, max 100,000 characters)'),
    
    model: z.string()
      .optional()
      .default('mercury-coder')
      .describe('Mercury model to use (mercury-coder)'),
    
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
    
    stop: z.array(z.string())
      .optional()
      .describe('Array of stop sequences to halt generation (optional)'),
  }),
  
  execute: async ({ 
    prompt, 
    model = 'mercury-coder',
    maxTokens = 1000,
    temperature = 0.7,
    topP,
    stop
  }) => {
    // Validate API key
    const apiKey = process.env.INCEPTION_API_KEY;
    if (!apiKey) {
      throw new Error('INCEPTION_API_KEY environment variable is required');
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
    console.log('🔬 Inception Labs Tool - Generation started:', {
      model,
      promptLength: prompt.length,
      maxTokens,
      temperature,
      topP,
      stop: stop?.length || 0,
    });

    try {
      // Prepare request body for Inception Labs API
      const requestBody: any = {
        model,
        messages: [
          { role: 'user', content: prompt.trim() }
        ],
        max_tokens: maxTokens,
        temperature,
      };

      // Add optional parameters only if provided
      if (topP !== undefined) {
        requestBody.top_p = topP;
      }
      if (stop !== undefined && stop.length > 0) {
        requestBody.stop = stop;
      }

      // Make API request using fetch
      const response = await fetch('https://api.inceptionlabs.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Inception Labs API error: ${response.status} - ${response.statusText}`;
        
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
      let responseData: any;
      try {
        responseData = await response.json();
      } catch (error) {
        throw new Error(`Failed to parse Inception Labs API response: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      }

      // Validate response structure
      if (!responseData || !responseData.choices || !Array.isArray(responseData.choices) || responseData.choices.length === 0) {
        throw new Error('Invalid response structure from Inception Labs API');
      }

      // Extract text content
      const choice = responseData.choices[0];
      const text = choice?.message?.content || '';
      
      if (!text) {
        throw new Error('No content received from Inception Labs API');
      }

      // Extract usage information
      const usage = responseData.usage || {};
      const finishReason = choice?.finish_reason || 'unknown';

      // Log completion
      console.log('✅ Inception Labs Tool - Generation completed:', {
        model,
        tokensUsed: usage.total_tokens || 0,
        responseLength: text.length,
        finishReason,
      });

      // Return structured result
      return {
        success: true,
        text,
        model,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        finishReason,
        parameters: {
          temperature,
          maxTokens,
          topP,
          stop,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          promptLength: prompt.length,
          responseLength: text.length,
        },
      };

    } catch (error) {
      console.error('❌ Inception Labs Tool - Generation failed:', {
        model,
        promptLength: prompt.length,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Inception Labs API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Inception Labs API authentication failed. Please check your INCEPTION_API_KEY.');
        }
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error(`Token limit exceeded. Try reducing maxTokens or prompt length.`);
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Mercury model.`);
        }
        
        // Context length error
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Prompt is too long for the selected Mercury model. Please reduce the prompt length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout') || 
            error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Network error connecting to Inception Labs API. Please check your internet connection.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504') ||
            error.message.includes('service unavailable') || error.message.includes('server error')) {
          throw new Error('Inception Labs service temporarily unavailable. Please try again later.');
        }
        
        // API overload errors
        if (error.message.includes('overload') || error.message.includes('capacity')) {
          throw new Error('Inception Labs API is currently overloaded. Please try again in a few moments.');
        }
        
        // Invalid request errors
        if (error.message.includes('invalid request') || error.message.includes('bad request')) {
          throw new Error('Invalid request format. Please check your parameters and try again.');
        }
        
        // Content policy errors
        if (error.message.includes('content policy') || error.message.includes('safety')) {
          throw new Error('Request was rejected by content policy filters. Please modify your prompt.');
        }
      }

      // Generic error fallback
      throw new Error(`Inception Labs text generation failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'inception_labs',
  name: 'Inception Labs Mercury',
  useCases: [
    'Generate high-quality code with advanced understanding',
    'Provide detailed technical explanations and documentation',
    'Analyze and optimize existing code structures',
    'Create comprehensive software architecture plans',
    'Perform thorough code reviews with detailed feedback',
    'Solve complex programming problems step-by-step',
    'Generate API documentation and technical guides',
    'Create educational programming content and tutorials',
    'Assist with algorithm design and optimization',
    'Provide debugging assistance and error resolution',
    'Generate test cases and quality assurance strategies',
    'Create technical specifications and requirements',
  ],
  logo: '🔬',
};

export const inceptionLabsTool = toOpenAgenticTool(rawInceptionLabsTool, toolDetails);