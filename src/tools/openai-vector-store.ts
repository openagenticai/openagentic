import { tool } from 'ai';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Vector store search filters schema
const FilterSchema: z.ZodType<any> = z.object({
  type: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'and', 'or']),
  key: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  filters: z.array(z.lazy((): z.ZodType<any> => FilterSchema)).optional()
});

const rawOpenAIVectorStoreTool = tool({
  description: 'Search through OpenAI vector stores for relevant document chunks using semantic search with optional metadata filtering',
  parameters: z.object({
    vectorStoreId: z.string()
      .min(1)
      .describe('The ID of the OpenAI vector store to search (required, format: vs_abc123)'),
    
    query: z.string()
      .min(1)
      .max(10000)
      .describe('The search query to find relevant documents (required, max 10,000 characters)'),
    
    maxNumResults: z.number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe('Maximum number of search results to return (1-50, default: 10)'),
    
    filters: FilterSchema.optional()
      .describe('Optional metadata filters to narrow search results (based on file attributes)'),
    
    rewriteQuery: z.boolean()
      .optional()
      .default(false)
      .describe('Whether to rewrite the natural language query for better vector search (default: false)'),
    
    rankingOptions: z.object({
      ranker: z.enum(['auto', 'default-2024-11-15']).optional().default('auto'),
      scoreThreshold: z.number().min(0).max(1).optional()
    }).optional()
      .describe('Optional ranking configuration to fine-tune search results')
  }),
  
  execute: async ({ 
    vectorStoreId, 
    query, 
    maxNumResults = 10,
    filters,
    rewriteQuery = false,
    rankingOptions
  }) => {
    // Validate API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // Validate inputs
    if (!vectorStoreId || vectorStoreId.trim().length === 0) {
      throw new Error('Vector store ID cannot be empty');
    }

    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (query.length > 10000) {
      throw new Error('Query exceeds maximum length of 10,000 characters');
    }

    if (!vectorStoreId.startsWith('vs_')) {
      console.warn('⚠️ Vector store ID should typically start with "vs_"');
    }

    // Start logging
    console.log('🔍 OpenAI Vector Store Tool - Search started:', {
      vectorStoreId,
      queryLength: query.length,
      maxNumResults,
      hasFilters: !!filters,
      rewriteQuery,
      hasRankingOptions: !!rankingOptions,
    });

    try {
      // Prepare the search request body
      const searchBody: any = {
        query: query.trim(),
        max_num_results: maxNumResults,
        rewrite_query: rewriteQuery
      };

      // Add optional parameters
      if (filters) {
        searchBody.filters = filters;
      }

      if (rankingOptions) {
        searchBody.ranking_options = rankingOptions;
      }

      // Make direct API call to vector store search endpoint
      // Note: We use fetch instead of the OpenAI SDK since vector store search 
      // is not yet available in the official SDK
      const response = await fetch(
        `https://api.openai.com/v1/vector_stores/${vectorStoreId}/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ OpenAI Vector Store API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });

        // Handle specific error types
        if (response.status === 401) {
          throw new Error('OpenAI API authentication failed. Please check your API key.');
        }
        
        if (response.status === 404) {
          throw new Error(`Vector store "${vectorStoreId}" not found. Please check the vector store ID.`);
        }
        
        if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
        }

        if (response.status === 400) {
          throw new Error(`Bad request to OpenAI Vector Store API: ${errorData}`);
        }

        throw new Error(`OpenAI Vector Store API error (${response.status}): ${response.statusText}`);
      }

      const searchResults = await response.json() as any;

      // Log completion
      console.log('✅ OpenAI Vector Store Tool - Search completed:', {
        vectorStoreId,
        resultsCount: searchResults.data?.length || 0,
        hasMore: searchResults.has_more || false,
        queryLength: query.length,
      });

      // Structure the response
      const results = searchResults.data || [];
      const processedResults = results.map((result: any) => ({
        fileId: result.file_id,
        filename: result.filename,
        score: result.score,
        attributes: result.attributes || {},
        content: result.content?.map((c: any) => c.text).join(' ') || ''
      }));

      return {
        success: true,
        query: searchResults.search_query || query,
        results: processedResults,
        totalResults: results.length,
        hasMore: searchResults.has_more || false,
        nextPage: searchResults.next_page || null,
        vectorStoreId,
        searchParameters: {
          maxNumResults,
          rewriteQuery,
          filtersApplied: !!filters,
          rankingOptionsApplied: !!rankingOptions
        },
        metadata: {
          searchedAt: new Date().toISOString(),
          queryLength: query.length,
          resultsReturned: results.length
        }
      };

    } catch (error) {
      console.error('❌ OpenAI Vector Store Tool - Search failed:', {
        vectorStoreId,
        queryLength: query.length,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle network and other errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error connecting to OpenAI API. Please check your internet connection.');
      }

      // Re-throw known errors
      if (error instanceof Error) {
        throw error;
      }

      // Generic error fallback
      throw new Error(`Vector store search failed: ${JSON.stringify(error)}`);
    }
  }
});

// Export the tool with metadata
export const openaiVectorStoreTool = toOpenAgenticTool(rawOpenAIVectorStoreTool, {
  toolId: 'openai_vector_store_search',
  name: 'OpenAI Vector Store Search',
  useCases: [
    'Search for relevant documents in OpenAI vector stores',
    'Retrieve contextual information for RAG applications',
    'Query knowledge bases with semantic search',
    'Filter documents by metadata attributes',
    'Build custom retrieval systems with OpenAI embeddings'
  ],
  logo: 'https://www.openagentic.org/tools/openai.svg'
});

export default openaiVectorStoreTool; 