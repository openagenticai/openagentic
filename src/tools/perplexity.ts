import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { createPerplexity } from '@ai-sdk/perplexity';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Supported Perplexity models with validation
const SUPPORTED_MODELS = [
  'sonar-pro',
  'sonar',
  'sonar-deep-research',
] as const;

const rawPerplexityTool = tool({
  description: 'Search the web with AI-powered intelligence using Perplexity AI models for real-time information and citations',
  parameters: z.object({
    query: z.string()
      .min(1)
      .max(2000)
      .describe('The search query to research using Perplexity AI (required, max 2000 characters)'),
    
    model: z.string()
      .optional()
      .default('sonar-pro')
      .describe('Perplexity model to use (sonar-pro, sonar, sonar-deep-research)'),
  }),
  
  execute: async ({ 
    query, 
    model = 'sonar-pro'
  }) => {
    // Validate API key
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable is required');
    }

    // Validate query
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (query.length > 2000) {
      throw new Error('Query exceeds maximum length of 2000 characters');
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      console.warn(`Model "${model}" not in supported list, but proceeding anyway`);
    }

    // Start logging
    console.log('🧠 Perplexity Tool - Search started:', {
      model,
      queryLength: query.length,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
    });

    try {
      // Initialize Perplexity client
      const perplexity = createPerplexity({
        apiKey,
      });

      // Prepare generation config
      const generateConfig: any = {
        model: perplexity(model),
        prompt: query.trim(),
      };

      // Generate text (search response)
      const { text, usage, finishReason } = await generateText(generateConfig);

      // Detect if response contains citations
      const hasCitations = text.includes('[') && text.includes(']');
      
      // Log completion
      console.log('✅ Perplexity Tool - Search completed:', {
        model,
        tokensUsed: usage?.totalTokens || 0,
        responseLength: text.length,
        finishReason,
        hasCitations,
      });

      // Return structured result
      return {
        success: true,
        text,
        model,
        query: query.trim(),
        usage: {
          promptTokens: usage?.promptTokens || 0,
          completionTokens: usage?.completionTokens || 0,
          totalTokens: usage?.totalTokens || 0,
        },
        finishReason,
        metadata: {
          searchedAt: new Date().toISOString(),
          queryLength: query.length,
          responseLength: text.length,
          hasCitations,
        },
      };

    } catch (error) {
      console.error('❌ Perplexity Tool - Search failed:', {
        model,
        queryLength: query.length,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Perplexity API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Perplexity API authentication failed. Please check your API key.');
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Perplexity model.`);
        }
        
        // Search failure (no results)
        if (error.message.includes('no results') || error.message.includes('not found')) {
          throw new Error('No search results found. Please try a different query or check your search terms.');
        }
        
        // Context length error
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Query is too long for the selected Perplexity model. Please reduce the query length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to Perplexity API. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Perplexity service temporarily unavailable. Please try again later.');
        }
        
        // Search capacity errors
        if (error.message.includes('capacity') || error.message.includes('overloaded')) {
          throw new Error('Perplexity search capacity exceeded. Please try again in a few minutes.');
        }
        
        // Invalid query errors
        if (error.message.includes('invalid query') || error.message.includes('malformed')) {
          throw new Error('Invalid search query format. Please rephrase your search query.');
        }
      }

      // Generic error fallback
      throw new Error(`Perplexity search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'perplexity_search',
  name: 'Perplexity AI Search',
  useCases: [
    'Search the web with AI-powered intelligence',
    'Get real-time information with citations',
    'Research current events and breaking news',
    'Find accurate answers to complex questions',
    'Conduct academic and professional research',
    'Verify facts and gather supporting evidence',
    'Search for specific information with context',
    'Get comprehensive answers with source links',
    'Research technical topics with expert sources',
    'Find recent developments and trends',
  ],
  logo: 'https://www.openagentic.org/tools/perplexity.svg',
};

export const perplexityTool = toOpenAgenticTool(rawPerplexityTool, toolDetails);