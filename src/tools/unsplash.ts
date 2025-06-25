import { tool } from 'ai';
import { z } from 'zod';
import { createApi } from 'unsplash-js';
import { toOpenAgenticTool } from './utils';

const rawUnsplashTool = tool({
  description: 'Search for high-quality free photos from Unsplash by keyword or query. Returns photo URLs and metadata including photographer attribution.',
  parameters: z.object({
    query: z.string()
      .min(1)
      .max(100)
      .describe('Search query for photos (e.g., "nature", "cats", "sunset", "technology") - required, max 100 characters'),
    
    count: z.number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .default(1)
      .describe('Number of photos to return (1-10, default: 1)'),
    
    orientation: z.enum(['landscape', 'portrait', 'squarish'])
      .optional()
      .describe('Filter by photo orientation - landscape, portrait, or squarish (optional)'),
      
    color: z.enum(['black_and_white', 'black', 'white', 'yellow', 'orange', 'red', 'purple', 'magenta', 'green', 'teal', 'blue'])
      .optional()
      .describe('Filter results by color (optional)'),
  }),
  
  execute: async ({ query, count = 1, orientation, color }) => {
    // Validate API key
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      throw new Error('UNSPLASH_ACCESS_KEY environment variable is required');
    }

    // Validate query
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (query.length > 100) {
      throw new Error('Search query exceeds maximum length of 100 characters');
    }

    // Start logging
    console.log('📷 Unsplash Image Search Tool - Search started:', {
      timestamp: new Date().toISOString(),
      query: query.trim(),
      count,
      orientation,
      color,
    });

    try {
      // Create Unsplash API instance
      const unsplash = createApi({
        accessKey,
      });

      // Build search parameters
      const searchParams: any = {
        query: query.trim(),
        perPage: count,
      };

      if (orientation) {
        searchParams.orientation = orientation;
      }

      if (color) {
        searchParams.color = color;
      }

      // Perform search
      const result = await unsplash.search.getPhotos(searchParams);

      // Handle API errors
      if (result.errors) {
        console.error('❌ Unsplash API Error:', result.errors);
        throw new Error(`Unsplash API error: ${result.errors.join(', ')}`);
      }

      // Check if we have results
      if (!result.response || !result.response.results || result.response.results.length === 0) {
        console.log('⚠️ No photos found for query:', query);
        return {
          success: true,
          query: query.trim(),
          totalResults: 0,
          photos: [],
          message: `No photos found for query: "${query}". Try a different search term.`,
        };
      }

      const { results, total } = result.response;

      // Process the photos to extract useful information
      const photos = results.map((photo: any) => ({
        id: photo.id,
        description: photo.description || photo.alt_description || 'No description available',
        photographer: {
          name: photo.user.name,
          username: photo.user.username,
          profile: photo.user.links.html,
        },
        urls: {
          raw: photo.urls.raw,
          full: photo.urls.full,
          regular: photo.urls.regular,
          small: photo.urls.small,
          thumb: photo.urls.thumb,
        },
        links: {
          html: photo.links.html,
          download: photo.links.download_location,
        },
        dimensions: {
          width: photo.width,
          height: photo.height,
        },
        color: photo.color,
        likes: photo.likes,
        createdAt: photo.created_at,
      }));

      // Log completion
      console.log('✅ Unsplash Image Search Tool - Search completed:', {
        query: query.trim(),
        resultsFound: photos.length,
        totalAvailable: total,
      });

      // Return structured result
      return {
        success: true,
        query: query.trim(),
        totalResults: total,
        returnedCount: photos.length,
        photos,
        attribution: {
          note: 'Photos must be attributed to photographers and Unsplash according to the Unsplash License',
          unsplashLink: 'https://unsplash.com',
          licenseLink: 'https://unsplash.com/license',
        },
      };

    } catch (error) {
      console.error('❌ Unsplash Image Search Tool - Search failed:', {
        query: query.trim(),
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Unsplash API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Unsplash API authentication failed. Please check your access key.');
        }
        
        // Invalid query error
        if (error.message.includes('400') || error.message.includes('bad request')) {
          throw new Error('Invalid search query. Please try a different search term.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Unsplash service temporarily unavailable. Please try again later.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout') || 
            error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Network error connecting to Unsplash API. Please try again.');
        }
      }

      // Generic error fallback
      throw new Error(`Unsplash image search failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
  },
});

/**
 * Unsplash Image Search Tool
 * 
 * Searches for high-quality free photos from Unsplash using keywords.
 * Returns photo URLs, photographer attribution, and metadata.
 * 
 * Features:
 * - Search by keyword/query
 * - Filter by orientation (landscape, portrait, squarish) 
 * - Filter by color
 * - Configurable result count (1-10 photos)
 * - Proper photographer attribution
 * - Multiple image sizes available
 * 
 * Requirements:
 * - UNSPLASH_ACCESS_KEY environment variable
 * - Photos must be attributed according to Unsplash License
 * 
 * @example
 * ```typescript
 * // Search for nature photos
 * const result = await unsplashTool.execute({
 *   query: "nature landscape",
 *   count: 3,
 *   orientation: "landscape"
 * });
 * 
 * // Use the regular size URL for display
 * const imageUrl = result.photos[0].urls.regular;
 * ```
 */
export const unsplashTool = toOpenAgenticTool(rawUnsplashTool, {
  toolId: 'unsplash_search',
  name: 'Unsplash Image Search',
  useCases: [
    'Finding stock photos for projects',
    'Getting royalty-free images by keyword',
    'Discovering photos by specific photographers',
    'Finding images with specific orientations or colors',
    'Getting properly attributed photos for content',
  ],
  logo: '📷',
}); 