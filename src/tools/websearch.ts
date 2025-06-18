import { tool } from 'ai';
import { z } from 'zod';
import OpenAI from 'openai';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Web search model
const WEB_SEARCH_MODEL = 'gpt-4o-mini-search-preview';

const rawWebSearchTool = tool({
  description: 'Search the web for real-time information using OpenAI\'s web search model with current data access',
  parameters: z.object({
    query: z.string()
      .min(1)
      .max(2000)
      .describe('The search query to look up on the web (required, max 2000 characters)')
  }),
  
  execute: async ({ 
    query
  }) => {
    // Validate API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // Validate query
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (query.length > 2000) {
      throw new Error('Query exceeds maximum length of 2000 characters');
    }

    // Start logging
    console.log('🔍 Web Search Tool - Search started:', {
      timestamp: new Date().toISOString(),
      query: query.trim(),
      queryLength: query.length,
      model: WEB_SEARCH_MODEL,
    });

    try {
      // Initialize OpenAI client
      const client = new OpenAI({
        apiKey,
      });

      // Make web search request
      const response = await client.chat.completions.create({
        model: WEB_SEARCH_MODEL,
        messages: [
          {
            role: 'user',
            content: `Search the web for: ${query.trim()}`,
          },
        ],
      });

      // Extract result
      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No search results returned from OpenAI web search');
      }

      // Log completion
      console.log('✅ Web Search Tool - Search completed:', {
        query: query.trim(),
        model: WEB_SEARCH_MODEL,
        tokensUsed: response.usage?.total_tokens || 0,
        resultLength: result.length,
        finishReason: response.choices[0]?.finish_reason,
      });

      // Return structured result
      return {
        success: true,
        result,
        query: query.trim(),
        model: WEB_SEARCH_MODEL,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        metadata: {
          searchedAt: new Date().toISOString(),
          queryLength: query.length,
          resultLength: result.length,
          hasRealTimeData: true,
        },
      };

    } catch (error) {
      console.error('❌ Web Search Tool - Search failed:', {
        query: query.trim(),
        model: WEB_SEARCH_MODEL,
        error: error instanceof Error ? error.message : String(error),
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
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Web search model "${WEB_SEARCH_MODEL}" not available. Please try again later.`);
        }
        
        // Search failures (no results)
        if (error.message.includes('no results') || error.message.includes('not found')) {
          throw new Error('No search results found. Please try a different query or check your search terms.');
        }
        
        // Context length error
        if (error.message.includes('context length') || error.message.includes('too long')) {
          throw new Error('Query is too long for web search. Please reduce the query length.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to OpenAI API. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('OpenAI web search service temporarily unavailable. Please try again later.');
        }
        
        // Web search specific errors
        if (error.message.includes('search') && error.message.includes('unavailable')) {
          throw new Error('Web search functionality temporarily unavailable. Please try again later.');
        }
        
        // Invalid query errors
        if (error.message.includes('invalid query') || error.message.includes('malformed')) {
          throw new Error('Invalid search query format. Please rephrase your search query.');
        }
        
        // Content policy errors
        if (error.message.includes('content policy') || error.message.includes('safety')) {
          throw new Error('Search query violates content policy. Please modify your query.');
        }
      }

      // Generic error fallback
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'web_search',
  name: 'Web Search',
  useCases: [
    'Search for current news and events',
    'Find real-time information and data',
    'Research recent developments in any field',
    'Get up-to-date facts and statistics',
    'Find current stock prices and market data',
    'Search for weather information',
    'Find recent research and publications',
    'Get current sports scores and updates',
    'Search for trending topics',
    'Find real-time social media trends',
  ],
  logo: 'https://www.openagentic.org/tools/openai.svg',
};

export const websearchTool = toOpenAgenticTool(rawWebSearchTool, toolDetails);