import { tool } from 'ai';
import { z } from 'zod';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// NewsData IO API response interface
interface NewsDataIOResponse {
  status: string;
  totalResults: number;
  results: Array<{
    article_id: string;
    title: string;
    link: string;
    description: string;
    pubDate: string;
    source_id: string;
    source_priority: number;
    source_url: string;
    source_icon: string;
    language: string;
    country: string[];
    category: string[];
    ai_tag?: string;
    sentiment?: string;
    sentiment_stats?: string;
    ai_region?: string;
    ai_org?: string;
    duplicate?: boolean;
  }>;
  nextPage?: string;
}

const rawNewsDataTool = tool({
  description: 'Search for latest news articles using NewsData IO API with comprehensive filtering and formatting options',
  parameters: z.object({
    query: z.string()
      .min(3)
      .max(512)
      .describe('News search query (e.g., "AI technology", "climate change", "economy") - minimum 3 characters'),
    
    country: z.string()
      .optional()
      .describe('Country code (e.g., "us", "uk", "in", "au") - optional'),
    
    category: z.string()
      .optional()
      .describe('News category (business, science, technology, sports, health, entertainment, politics) - optional'),
    
    language: z.string()
      .optional()
      .default('en')
      .describe('Language code (e.g., "en", "es", "fr", "de") - optional, defaults to English'),
  }),
  
  execute: async ({ 
    query,
    country,
    category,
    language = 'en'
  }) => {
    // Validate API key
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) {
      throw new Error('NEWSDATA_API_KEY environment variable is required');
    }

    // Validate and clean query
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    const cleanQuery = query.trim();

    if (cleanQuery.length < 3) {
      throw new Error('Query must be at least 3 characters long');
    }

    if (cleanQuery.length > 512) {
      throw new Error('Query exceeds maximum length of 512 characters');
    }

    // Check for problematic generic queries
    const problematicPatterns = [
      /^(weekly|daily|monthly|news|summary|update)$/i,
      /^(latest|recent|new|current)$/i,
      /^(general|today|yesterday)$/i,
      /^(trending|popular|hot)$/i,
      /^(breaking|live)$/i
    ];

    const isProblematicQuery = problematicPatterns.some(pattern => pattern.test(cleanQuery));

    if (isProblematicQuery) {
      const suggestions = [
        "Try a more specific topic like 'AI technology news' or 'climate change updates'",
        "Include specific keywords like 'Tesla earnings' or 'cryptocurrency market'",
        "Add a subject area like 'health technology' or 'renewable energy'",
        "Use specific company names like 'Apple iPhone' or 'Microsoft Azure'",
        "Include location context like 'California wildfires' or 'UK elections'"
      ];
      const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
      throw new Error(`Query "${cleanQuery}" may be too generic for NewsData IO. ${randomSuggestion}`);
    }

    // Start logging
    console.log('📰 NewsData Tool - Search started:', {
      query: cleanQuery,
      queryLength: cleanQuery.length,
      country,
      category,
      language,
      hasApiKey: !!apiKey,
    });

    try {
      // Prepare API request
      const baseUrl = 'https://newsdata.io/api/1/latest';
      const params = new URLSearchParams({
        apikey: apiKey,
        q: cleanQuery,
        size: '10', // Limit results to prevent large responses
      });

      // Add optional filters
      if (country) {
        params.append('country', country);
      }
      if (language) {
        params.append('language', language);
      }
      if (category) {
        params.append('category', category);
      }

      // Make API request
      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OpenAgentic/1.0',
        },
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `NewsData IO API error: ${response.status} - ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.results && errorJson.results.message) {
            errorMessage = errorJson.results.message;
          } else if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch {
          // Use default error message if parsing fails
        }

        // Handle specific HTTP errors
        if (response.status === 401) {
          throw new Error('NewsData IO authentication failed. Please check your API key.');
        } else if (response.status === 403) {
          throw new Error('NewsData IO access forbidden. Please check your API key permissions.');
        } else if (response.status === 429) {
          throw new Error('NewsData IO API rate limit exceeded. Please try again later.');
        } else if (response.status === 500) {
          throw new Error('NewsData IO server error. Please try again later.');
        }

        throw new Error(errorMessage);
      }

      // Parse response
      let data: NewsDataIOResponse;
      try {
        data = await response.json() as NewsDataIOResponse;
      } catch (error) {
        throw new Error(`Failed to parse NewsData IO response: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      }

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from NewsData IO API');
      }

      if (data.status !== 'success') {
        throw new Error(`NewsData IO API returned error status: ${data.status}`);
      }

      // Check if we have results
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('No results array in NewsData IO response');
      }

      if (data.results.length === 0) {
        const suggestions = [
          "Try using different keywords or phrases",
          "Remove or change country/category filters",
          "Use broader terms instead of very specific ones",
          "Check spelling and try alternative terms",
          "Try searching in a different language"
        ];
        const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        
        return {
          success: true,
          query: cleanQuery,
          summary: `No news articles found for "${cleanQuery}". ${randomSuggestion}`,
          articles: [],
          totalResults: 0,
          filters: {
            country,
            category,
            language,
          },
          metadata: {
            searchedAt: new Date().toISOString(),
            resultsCount: 0,
            hasMoreResults: false,
            suggestion: randomSuggestion,
          },
        };
      }

      // Format articles for better readability
      const formattedArticles = data.results.slice(0, 10).map((article, index) => ({
        rank: index + 1,
        title: article.title || 'No title available',
        description: article.description || 'No description available',
        source: article.source_id || 'Unknown source',
        publishedAt: article.pubDate || 'Unknown date',
        url: article.link || '',
        country: article.country?.join(', ') || 'Unknown',
        category: article.category?.join(', ') || 'General',
        sentiment: article.sentiment || null,
        aiTag: article.ai_tag || null,
      }));

      // Create formatted summary
      const summary = `Found ${data.totalResults} news articles for "${cleanQuery}". Here are the top ${formattedArticles.length} most recent articles:

${formattedArticles.map(article => 
  `**${article.rank}. ${article.title}** (${article.source})
  ${article.description}
  Published: ${new Date(article.publishedAt).toLocaleString()}
  Categories: ${article.category}
  ${article.sentiment ? `Sentiment: ${article.sentiment}` : ''}
  [Read more](${article.url})`
).join('\n\n')}`;

      // Log completion
      console.log('✅ NewsData Tool - Search completed:', {
        query: cleanQuery,
        totalResults: data.totalResults,
        resultsReturned: formattedArticles.length,
        country,
        category,
        language,
        hasMoreResults: data.totalResults > formattedArticles.length,
      });

      // Return structured result
      return {
        success: true,
        query: cleanQuery,
        summary,
        articles: formattedArticles,
        totalResults: data.totalResults,
        filters: {
          country,
          category,
          language,
        },
        metadata: {
          searchedAt: new Date().toISOString(),
          resultsCount: formattedArticles.length,
          hasMoreResults: data.totalResults > formattedArticles.length,
          nextPage: data.nextPage || null,
        },
      };

    } catch (error) {
      console.error('❌ NewsData Tool - Search failed:', {
        query: cleanQuery,
        country,
        category,
        language,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // API key errors
        if (error.message.includes('API key') || error.message.includes('authentication')) {
          throw new Error('NewsData IO API key is invalid or missing. Please check your NEWSDATA_API_KEY environment variable.');
        }
        
        // Rate limiting errors
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('NewsData IO API rate limit exceeded. Please try again in a few minutes.');
        }
        
        // Query validation errors
        if (error.message.includes('too generic') || error.message.includes('problematic')) {
          throw error; // Re-throw validation errors as-is
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout') || 
            error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Network error connecting to NewsData IO API. Please check your internet connection.');
        }
        
        // JSON parsing errors
        if (error.message.includes('parse') || error.message.includes('JSON')) {
          throw new Error('Failed to parse NewsData IO API response. The service may be experiencing issues.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('NewsData IO service temporarily unavailable. Please try again later.');
        }
      }

      // Generic error fallback
      throw new Error(`NewsData IO search failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'newsdata_search',
  name: 'NewsData IO Search',
  useCases: [
    'Search for latest news articles on any topic',
    'Filter news by country and region',
    'Find news in specific categories (tech, business, sports)',
    'Get recent news updates and breaking stories',
    'Research current events and trends',
    'Monitor news coverage of specific topics',
    'Access international news sources',
    'Track news sentiment and AI-tagged articles',
    'Find news in multiple languages',
    'Get formatted news summaries with links',
  ],
  logo: 'https://www.openagentic.org/tools/newsdata.svg',
};

export const newsdataTool = toOpenAgenticTool(rawNewsDataTool, toolDetails);