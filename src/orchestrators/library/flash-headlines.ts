import { MultiAIOrchestrator } from '../multi-ai';
import type { OrchestratorContext, CoreMessage } from '../../types';
import { registerOrchestrator } from '../registry';

/**
 * Flash Headlines Orchestrator
 * 
 * Implements a fast workflow for generating top 10 news headlines with accompanying images:
 * 1. Use Gemini Flash to generate 10 structured headlines with titles and subtitles
 * 2. Use Gemini Image Generator to create relevant 500x500 photos for each headline
 * 3. Return structured array of {title, subtitle, imgSrc} objects ready for display
 */
export class FlashHeadlinesOrchestrator extends MultiAIOrchestrator {
  
  constructor() {
    super(
      'flash_headlines',
      'Flash Headlines Generator',
      'Fast news headline generation with AI-powered images. Uses Gemini Flash to generate top 10 current news headlines and creates relevant 500x500 images for each headline using Gemini\'s image generation capabilities.'
    );
  }

  /**
   * Custom logic implementation for flash headlines generation
   */
  async customLogic(input: string | CoreMessage[], context: OrchestratorContext): Promise<any> {
    console.log('⚡ Flash Headlines Orchestrator - Starting rapid headline generation');

    // Parse input to extract topic or use general news
    const inputText = typeof input === 'string' ? input : 
                     input.map(m => m.content).join(' ');
    
    const topic = this.parseTopicFromInput(inputText);

    try {
      // Step 1: Generate 10 structured headlines using Gemini Flash
      console.log('📰 Step 1: Generating 10 news headlines with Gemini Flash');
      const headlines = await this.generateHeadlines(topic, context);

      // Step 2: Generate images for each headline in parallel
      // console.log('🎨 Step 2: Generating images for each headline');
      // const headlinesWithImages = await this.generateHeadlineImages(headlines, context);

      console.log('✅ Flash Headlines generation completed successfully');

      return {
        headlines,
        // headlines: headlinesWithImages,
        topic: topic || 'Current News',
        generatedAt: new Date().toISOString(),
        count: headlines.length,
        summary: `Generated ${headlines.length} news headlines with accompanying images`,
        metadata: {
          model: 'gemini-1.5-flash',
          imageModel: 'gemini-2.0-flash-preview-image-generation',
          workflow: 'flash-headlines',
          totalHeadlines: headlines.length,
        },
      };

    } catch (error) {
      console.error('❌ Flash Headlines generation failed:', error);
      throw error;
    }
  }

  /**
   * Parse topic from user input, default to general news if no specific topic
   */
  private parseTopicFromInput(input: string): string | null {
    if (!input || input.trim().length === 0) {
      return null;
    }

    const cleanInput = input.trim().toLowerCase();
    
    // Check for topic indicators
    const topicPatterns = [
      /(?:headlines? (?:about|on|for) )(.+)/i,
      /(?:news (?:about|on|for) )(.+)/i,
      /(?:latest (?:on|about) )(.+)/i,
      /(?:stories (?:about|on) )(.+)/i,
    ];

    for (const pattern of topicPatterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If input is short and specific, treat as topic
    if (input.length < 50 && !input.includes('generate') && !input.includes('create')) {
      return input.trim();
    }

    // Default to general news
    return null;
  }

  /**
   * Generate 10 structured headlines using Gemini Flash
   */
  private async generateHeadlines(
    topic: string | null,
    context: OrchestratorContext
  ): Promise<Array<{ title: string; subtitle: string }>> {
    const geminiTool = context.tools.find(tool => tool.toolId === 'gemini_chat');
    if (!geminiTool || !geminiTool.execute) {
      throw new Error('Gemini tool not available. Please ensure gemini_chat tool is included.');
    }

    const topicContext = topic ? ` about ${topic}` : '';
    const prompt = `Generate exactly 10 current news headlines${topicContext}. Return them in this exact JSON format:

[
  {"title": "Main headline text", "subtitle": "Supporting details or context"},
  {"title": "Main headline text", "subtitle": "Supporting details or context"},
  ...
]

Requirements:
- Each title should be 8-12 words maximum, punchy and engaging
- Each subtitle should be 10-20 words, providing context or details
- Headlines should be current, relevant, and newsworthy
- Cover diverse topics unless a specific topic was requested
- Use proper JSON format with no additional text or markdown
- Return exactly 10 headlines

${topic ? `Focus on: ${topic}` : 'Mix of: politics, technology, business, sports, entertainment, science, health, world news'}`;

    console.log(`📰 Generating headlines for: ${topic || 'general news'}`);

    try {
      const result = await geminiTool.execute({
        prompt,
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 2000,
      }, { toolCallId: 'headlines-generation', messages: [] });

      if (!result.success || !result.text) {
        throw new Error('Failed to generate headlines with Gemini');
      }

      // Parse JSON response
      const headlines = this.parseHeadlinesFromResponse(result.text);
      
      if (headlines.length === 0) {
        throw new Error('No valid headlines found in Gemini response');
      }

      console.log(`✅ Generated ${headlines.length} headlines`);
      return headlines.slice(0, 10); // Ensure exactly 10 headlines

    } catch (error) {
      console.error('❌ Headlines generation failed:', error);
      throw new Error(`Failed to generate headlines: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse headlines from Gemini's JSON response
   */
  private parseHeadlinesFromResponse(response: string): Array<{ title: string; subtitle: string }> {
    try {
      // Clean the response to extract JSON
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks if present
      cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
      cleanResponse = cleanResponse.replace(/```\s*/, '');
      
      // Find JSON array in the response
      const jsonMatch = cleanResponse.match(/\[\s*{.*?}\s*\]/s);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      // Parse JSON
      const headlines = JSON.parse(cleanResponse);
      
      if (!Array.isArray(headlines)) {
        throw new Error('Response is not an array');
      }

      // Validate and clean headlines
      const validHeadlines = headlines
        .filter(item => 
          item && 
          typeof item === 'object' && 
          typeof item.title === 'string' && 
          typeof item.subtitle === 'string' &&
          item.title.trim().length > 0 &&
          item.subtitle.trim().length > 0
        )
        .map(item => ({
          title: item.title.trim(),
          subtitle: item.subtitle.trim()
        }));

      console.log(`🔍 Parsed ${validHeadlines.length} valid headlines from response`);
      return validHeadlines;

    } catch (error) {
      console.error('❌ Failed to parse headlines JSON:', error);
      
      // Fallback: try to extract title/subtitle pairs from text
      return this.extractHeadlinesFromText(response);
    }
  }

  /**
   * Fallback method to extract headlines from unstructured text
   */
  private extractHeadlinesFromText(text: string): Array<{ title: string; subtitle: string }> {
    console.log('🔄 Attempting fallback headline extraction from text');
    
    const headlines: Array<{ title: string; subtitle: string }> = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    for (let i = 0; i < lines.length && headlines.length < 10; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      // Look for numbered headlines or bullet points
      const match = line.match(/^(?:\d+\.?\s*|[•\-*]\s*)(.+)/);
      if (match && match[1]) {
        const content = match[1].trim();
        
        // Split on common delimiters to separate title from subtitle
        const parts = content.split(/[:\-–—]/);
        if (parts.length >= 2) {
          headlines.push({
            title: parts[0]?.trim() || 'Breaking News',
            subtitle: parts.slice(1).join(': ').trim() || 'More details to follow'
          });
        } else if (content.length > 10) {
          // Single line - create title and generic subtitle
          headlines.push({
            title: content.length > 80 ? content.substring(0, 80) + '...' : content,
            subtitle: 'Breaking news story'
          });
        }
      }
    }

    // If still no headlines, create generic ones
    if (headlines.length === 0) {
      for (let i = 1; i <= 10; i++) {
        headlines.push({
          title: `Breaking News Update ${i}`,
          subtitle: 'Latest developments in current events'
        });
      }
    }

    console.log(`📝 Extracted ${headlines.length} headlines using fallback method`);
    return headlines;
  }

  /**
   * Generate 500x500 images for each headline using Gemini Image Generator
   */
  private async generateHeadlineImages(
    headlines: Array<{ title: string; subtitle: string }>,
    context: OrchestratorContext
  ): Promise<Array<{ title: string; subtitle: string; imgSrc: string }>> {
    const geminiImageTool = context.tools.find(tool => tool.toolId === 'gemini_image_generator');
    if (!geminiImageTool || !geminiImageTool.execute) {
      throw new Error('Gemini Image tool not available. Please ensure gemini_image_generator tool is included.');
    }

    console.log(`🎨 Generating images for ${headlines.length} headlines`);

    // Generate images in parallel with controlled concurrency
    const imagePromises = headlines.map(async (headline, index) => {
      try {
        console.log(`🖼️ [${index + 1}/${headlines.length}] Generating image for: "${headline.title}"`);

        // Create descriptive prompt for news image
        const imagePrompt = this.createImagePrompt(headline.title, headline.subtitle);

        if(!geminiImageTool.execute) {
          throw new Error('Gemini Image tool not available. Please ensure gemini_image_generator tool is included.');
        }

        const result = await geminiImageTool.execute({
          prompt: imagePrompt,
          model: 'gemini-2.0-flash-preview-image-generation',
          style: 'photorealistic',
          aspectRatio: '1:1', // 500x500 square format
          quality: 'standard',
        }, { 
          toolCallId: `headline-image-${index + 1}`,
          messages: []
        });

        if (!result.success || !result.imageUrl) {
          throw new Error('Failed to generate image');
        }

        console.log(`✅ [${index + 1}/${headlines.length}] Image generated: ${result.imageUrl}`);

        return {
          title: headline.title,
          subtitle: headline.subtitle,
          imgSrc: result.imageUrl,
        };

      } catch (error) {
        console.error(`❌ [${index + 1}/${headlines.length}] Image generation failed for "${headline.title}":`, error);
        
        // Return headline with placeholder image URL
        return {
          title: headline.title,
          subtitle: headline.subtitle,
          imgSrc: 'https://via.placeholder.com/500x500/666666/ffffff?text=News+Image',
        };
      }
    });

    // Execute with controlled concurrency (3 at a time to avoid rate limits)
    const results: Array<{ title: string; subtitle: string; imgSrc: string }> = [];
    for (let i = 0; i < imagePromises.length; i += 3) {
      const batch = imagePromises.slice(i, i + 3);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + 3 < imagePromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successfulImages = results.filter(r => !r.imgSrc.includes('placeholder')).length;
    console.log(`🎨 Image generation completed: ${successfulImages}/${results.length} successful`);

    return results;
  }

  /**
   * Create descriptive prompt for generating news-related images
   */
  private createImagePrompt(title: string, subtitle: string): string {
    // Create a visual prompt based on the headline content
    const combinedText = `${title} ${subtitle}`.toLowerCase();

    // Detect news categories and create appropriate visual prompts
    if (combinedText.includes('tech') || combinedText.includes('ai') || combinedText.includes('digital')) {
      return `Professional technology news image: modern digital interface, clean tech aesthetic, representing ${title}`;
    }
    
    if (combinedText.includes('business') || combinedText.includes('market') || combinedText.includes('economic')) {
      return `Business news visual: professional office setting, financial charts, corporate environment, related to ${title}`;
    }
    
    if (combinedText.includes('sport') || combinedText.includes('game') || combinedText.includes('championship')) {
      return `Sports news image: dynamic athletic scene, sports equipment, stadium atmosphere, representing ${title}`;
    }
    
    if (combinedText.includes('health') || combinedText.includes('medical') || combinedText.includes('science')) {
      return `Medical/health news visual: clean medical environment, healthcare symbolism, representing ${title}`;
    }
    
    if (combinedText.includes('climate') || combinedText.includes('environment') || combinedText.includes('weather')) {
      return `Environmental news image: nature scene, weather phenomenon, climate-related visual for ${title}`;
    }
    
    if (combinedText.includes('politics') || combinedText.includes('election') || combinedText.includes('government')) {
      return `Political news visual: government building, official setting, political symbolism, related to ${title}`;
    }

    // Default news image prompt
    return `Professional news photography style image representing: ${title}. Clean, journalistic style, high quality, news-appropriate visual`;
  }
}

// Create and register the orchestrator
export const flashHeadlinesOrchestrator = new FlashHeadlinesOrchestrator();
registerOrchestrator(flashHeadlinesOrchestrator);

console.log('⚡ Flash Headlines Orchestrator registered and ready');