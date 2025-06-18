import { tool } from 'ai';
import { z } from 'zod';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported Meta Llama models with validation
const SUPPORTED_MODELS = [
  'Llama-4-Maverick-17B-128E-Instruct-FP8',
  'Llama-4-Scout-17B-16E-Instruct-FP8',
  'Llama-3.3-70B-Instruct',
  'Llama-3.3-8B-Instruct',
  'Cerebras-Llama-4-Maverick-17B-128E-Instruct',
  'Cerebras-Llama-4-Scout-17B-16E-Instruct',
  'Groq-Llama-4-Maverick-17B-128E-Instruct',
] as const;

// Zod schema for response validation
const LlamaResponseSchema = z.object({
  id: z.string().optional(),
  completion_message: z.object({
    role: z.string(),
    stop_reason: z.string().optional(),
    content: z.object({
      type: z.string(),
      text: z.string()
    })
  }),
  metrics: z.array(z.object({
    metric: z.string(),
    value: z.number(),
    unit: z.string()
  })).optional()
}).passthrough();

const rawLlamaTool = tool({
  description: 'Generate high-quality text responses using Meta Llama models with chat completions format',
  parameters: z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']).describe('The role of the message sender'),
      content: z.string().min(1).describe('The content of the message')
    }))
      .min(1)
      .describe('Array of messages in conversation format'),
    
    model: z.string()
      .optional()
      .default('Llama-4-Maverick-17B-128E-Instruct-FP8')
      .describe('Llama model to use'),
    
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
    
    frequencyPenalty: z.number()
      .min(-2)
      .max(2)
      .optional()
      .describe('Penalizes frequent tokens (-2 to 2, optional)'),
    
    presencePenalty: z.number()
      .min(-2)
      .max(2)
      .optional()
      .describe('Penalizes repeated tokens (-2 to 2, optional)'),
  }),
  
  execute: async ({ 
    messages,
    model = 'Llama-4-Maverick-17B-128E-Instruct-FP8',
    maxTokens = 1000,
    temperature = 0.7,
    topP,
    frequencyPenalty,
    presencePenalty
  }) => {
    // Validate API key
    const apiKey = process.env.LLAMA_API_KEY;
    if (!apiKey) {
      throw new Error('LLAMA_API_KEY environment variable is required');
    }

    // Validate messages
    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    // Validate each message
    for (const message of messages) {
      if (!message.content || message.content.trim().length === 0) {
        throw new Error('Message content cannot be empty');
      }
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      console.warn(`Model "${model}" not in supported list, but proceeding anyway`);
    }

    // Start logging
    console.log('🦙 Llama Tool - Generation started:', {
      model,
      messagesCount: messages.length,
      lastMessage: messages[messages.length - 1]?.content.substring(0, 100) + '...',
      maxTokens,
      temperature,
      topP,
      frequencyPenalty,
      presencePenalty,
    });

    try {
      // Prepare request body
      const requestBody: any = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      // Add optional parameters only if provided
      if (topP !== undefined) {
        requestBody.top_p = topP;
      }
      if (frequencyPenalty !== undefined) {
        requestBody.frequency_penalty = frequencyPenalty;
      }
      if (presencePenalty !== undefined) {
        requestBody.presence_penalty = presencePenalty;
      }

      // Make API request using fetch
      const response = await fetch("https://api.llama.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Llama API error: ${response.status} - ${response.statusText}`;
        
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
      let responseData;
      try {
        responseData = await response.json();
      } catch (error) {
        throw new Error(`Failed to parse Llama API response: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Validate response with Zod schema
      let validatedData: z.infer<typeof LlamaResponseSchema>;
      try {
        validatedData = LlamaResponseSchema.parse(responseData);
      } catch (error) {
        console.warn('⚠️ Response validation failed, proceeding with raw data:', error);
        validatedData = responseData as z.infer<typeof LlamaResponseSchema>;
      }

      // Extract text content from Llama API format
      const text = validatedData.completion_message.content.text;
      const finishReason = validatedData.completion_message.stop_reason || '';
      if (!text) {
        throw new Error('No content received from Llama API');
      }

      // Parse usage information from Llama metrics format
      const promptTokensMetric = validatedData.metrics?.find(m => m.metric === 'num_prompt_tokens');
      const completionTokensMetric = validatedData.metrics?.find(m => m.metric === 'num_completion_tokens');
      const totalTokensMetric = validatedData.metrics?.find(m => m.metric === 'num_total_tokens');
      
      const usage = {
        promptTokens: promptTokensMetric?.value || 0,
        completionTokens: completionTokensMetric?.value || 0,
        totalTokens: totalTokensMetric?.value || 0,
      };

      // Log completion
      console.log('✅ Llama Tool - Generation completed:', {
        model,
        tokensUsed: usage.totalTokens,
        responseLength: text.length,
        finishReason,
        messagesCount: messages.length,
      });

      // Return structured result
      return {
        success: true,
        text,
        model,
        usage,
        finishReason,
        parameters: {
          temperature,
          maxTokens,
          topP,
          frequencyPenalty,
          presencePenalty,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          messagesCount: messages.length,
          responseLength: text.length,
        },
      };

    } catch (error) {
      console.error('❌ Llama Tool - Generation failed:', {
        model,
        messagesCount: messages.length,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Llama API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Llama API authentication failed. Please check your API key.');
        }
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error(`Token limit exceeded. Try reducing maxTokens or message length.`);
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Llama model.`);
        }
        
        // Context length error
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Messages are too long for the selected Llama model. Please reduce the message length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout') || 
            error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Network error connecting to Llama API. Please try again.');
        }
        
        // JSON parsing errors
        if (error.message.includes('parse') || error.message.includes('JSON')) {
          throw new Error('Failed to parse Llama API response. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Llama service temporarily unavailable. Please try again later.');
        }
      }

      // Generic error fallback
      throw new Error(`Llama text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'llama_chat',
  name: 'Meta Llama Chat',
  useCases: [
    'Generate creative content and stories',
    'Engage in multi-turn conversations',
    'Answer questions with contextual understanding',
    'Generate code and technical documentation',
    'Summarize text and information',
    'Provide writing assistance and editing',
    'Create educational content and explanations',
    'Generate marketing copy and descriptions',
    'Assist with brainstorming and ideation',
    'Support multilingual text generation',
  ],
  logo: 'https://www.openagentic.org/tools/llama.svg',
};

export const llamaTool = toOpenAgenticTool(rawLlamaTool, toolDetails);