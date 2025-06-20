import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { ToolDetails } from '../types';
import { getAnthropicModelInstance, toOpenAgenticTool } from './utils';
import { uploadHtmlToS3, generateHtmlFileName } from '../utils/s3';

// Supported Claude models for HTML composition
const SUPPORTED_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-latest',
] as const;

// Supported visual themes
const THEMES = ['news', 'business', 'tech', 'general'] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get theme-specific styling descriptions
 */
function getThemeStyles(theme: string): string {
  const styles = {
    news: 'Clean journalism style with serif headlines, blue accents, structured layout like major news websites',
    business: 'Corporate professional design with blue/gray palette, sans-serif fonts, executive report aesthetics',
    tech: 'Modern tech aesthetic with clean lines, tech blue/green colors, monospace code elements, startup feel',
    general: 'Versatile professional design with balanced colors, readable typography, adaptable to any content'
  };
  
  return styles[theme as keyof typeof styles] || styles.general;
}

/**
 * Generate meta tags section for SEO and social sharing
 */
function getMetaTagsSection(title: string): string {
  return `
**META TAGS AND SEO (if includeMetadata is true):**
- Complete meta tags including title, description, keywords
- Open Graph tags for social sharing
- Twitter Card meta tags
- Structured data (JSON-LD) for search engines
- Viewport meta tag for mobile
- Character encoding and language tags
- Cache control and HTTP headers simulation
- Generator and author meta tags
- Document title: "${title}"`;
}

/**
 * Create comprehensive HTML generation prompt for Claude
 */
function createHtmlGenerationPrompt(
  title: string,
  content: string,
  theme: string,
  includeStyles: boolean,
  includeMetadata: boolean
): string {
  const themeStyles = getThemeStyles(theme);
  const metaTagsSection = includeMetadata ? getMetaTagsSection(title) : '';
  
  return `You are an expert web developer specializing in creating professional, accessible HTML reports. Generate a complete, production-ready HTML document with the following requirements:

**CRITICAL: YOU MUST INCLUDE ALL THE PROVIDED CONTENT IN THE HTML BODY**

**CONTENT TO FORMAT:**
Title: ${title}
Content: ${content}

**DESIGN REQUIREMENTS:**
- Theme: ${theme} (${themeStyles})
- Include embedded CSS: ${includeStyles}
- Include meta tags: ${includeMetadata}
- Optimized for iframe display and S3 hosting
- Mobile-responsive design
- Print-friendly styles
- Accessibility (WCAG 2.1 AA compliance)

**HTML STRUCTURE REQUIREMENTS:**
1. **Complete HTML5 document** with proper DOCTYPE
2. **Semantic markup**: header, main, article, section, aside, footer
3. **Responsive grid/flexbox layout**
4. **Modern typography** with web-safe font stacks
5. **Professional color scheme** matching the theme
6. **Interactive elements**: smooth scrolling, hover states
7. **Clean, readable formatting** optimized for reports

**CONTENT FORMATTING INSTRUCTIONS:**
- Take the provided content and format it into the HTML body
- Create appropriate headings hierarchy (h1 for title, h2/h3 for sections)
- If content is JSON, parse it and format appropriately
- If content is text, break it into logical paragraphs and sections
- Format lists, quotes, and data appropriately
- Add timestamps and metadata where relevant
- Include source attribution if present in content
- Make the content readable and well-structured

**CSS REQUIREMENTS (if includeStyles is true):**
- Embedded CSS in <style> tags (no external stylesheets)
- Mobile-first responsive design with breakpoints
- Professional typography (proper line-height, spacing, hierarchy)
- Theme-appropriate color palette
- Print styles (@media print)
- Smooth transitions and hover effects
- Consistent spacing using a modular scale

**ACCESSIBILITY FEATURES:**
- Proper heading hierarchy
- Alt text for any images
- ARIA labels where needed
- High contrast ratios
- Keyboard navigation support
- Screen reader optimization

**IFRAME OPTIMIZATION:**
- No external dependencies
- Self-contained HTML document
- Proper viewport meta tag
- CSP-friendly inline styles only
- Fast loading and rendering

${metaTagsSection}

**EXAMPLE STRUCTURE:**
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        /* Your embedded CSS here */
    </style>
</head>
<body>
    <header>
        <h1>${title}</h1>
    </header>
    <main>
        <article>
            <!-- FORMAT THE PROVIDED CONTENT HERE -->
            <!-- Convert the content parameter into well-structured HTML -->
        </article>
    </main>
    <footer>
        <p>Generated on [timestamp]</p>
    </footer>
</body>
</html>

**OUTPUT FORMAT:**
Return ONLY the complete HTML document, starting with <!DOCTYPE html> and ending with </html>. 
Do not include any explanatory text, markdown formatting, or code blocks.
The HTML should be production-ready and immediately usable.
MOST IMPORTANTLY: Include ALL the provided content in the body section, properly formatted.

**QUALITY STANDARDS:**
- Professional business document appearance
- Clean, modern design aesthetic
- Excellent readability and typography
- Consistent spacing and alignment
- Mobile-responsive behavior
- Print-optimized layouts
- Fast loading performance
- ALL PROVIDED CONTENT MUST BE VISIBLE IN THE HTML

Generate the complete HTML document now, ensuring you include all the provided content:`;
}

/**
 * Extract and validate HTML content from Claude's response
 */
function extractAndValidateHtml(response: string): string | null {
  try {
    // Remove any markdown code blocks if present
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/```html\s*/, '').replace(/```\s*$/, '');
    cleanResponse = cleanResponse.replace(/```\s*/, '');
    
    // Ensure we have a complete HTML document
    if (!cleanResponse.includes('<!DOCTYPE html>') || !cleanResponse.includes('</html>')) {
      // Try to find HTML content within the response
      const htmlMatch = cleanResponse.match(/<!DOCTYPE html>.*?<\/html>/s);
      if (htmlMatch) {
        cleanResponse = htmlMatch[0];
      } else {
        return null;
      }
    }

    // Basic HTML validation
    const requiredTags = ['<html', '</html>', '<head', '</head>', '<body', '</body>'];
    const hasAllRequiredTags = requiredTags.every(tag => cleanResponse.includes(tag));
    
    if (!hasAllRequiredTags) {
      console.warn('⚠️ Generated HTML missing required tags');
      return null;
    }

    // Check for minimum content
    if (cleanResponse.length < 500) {
      console.warn('⚠️ Generated HTML content too short');
      return null;
    }

    return cleanResponse;

  } catch (error) {
    console.error('❌ HTML validation failed:', error);
    return null;
  }
}

// =============================================================================
// MAIN TOOL DEFINITION
// =============================================================================

const rawHtmlComposerTool = tool({
  description: 'Generate professional HTML reports with modern styling using Claude, optimized for iframe display and S3 hosting',
  parameters: z.object({
    title: z.string()
      .min(1)
      .max(200)
      .describe('Main report title (required, max 200 characters)'),
    
    content: z.any()
      .describe('Structured content data - can be articles, insights, data objects, or any content to be formatted into HTML'),
    
    theme: z.enum(THEMES)
      .optional()
      .default('general')
      .describe('Visual theme for the report (news, business, tech, general)'),
    
    includeStyles: z.boolean()
      .optional()
      .default(true)
      .describe('Whether to include embedded CSS styles (default: true)'),
    
    includeMetadata: z.boolean()
      .optional()
      .default(true)
      .describe('Whether to include meta tags and structured data (default: true)'),
    
    model: z.string()
      .optional()
      .default('claude-sonnet-4-20250514')
      .describe('Claude model to use for HTML generation'),
  }),
  
  execute: async ({ 
    title,
    content,
    theme = 'general',
    includeStyles = true,
    includeMetadata = true,
    model = 'claude-sonnet-4-20250514'
  }) => {
    // Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    // Validate inputs
    if (!title || title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }

    if (title.length > 200) {
      throw new Error('Title exceeds maximum length of 200 characters');
    }

    if (!content) {
      throw new Error('Content cannot be empty or null');
    }

    // Validate model
    if (!SUPPORTED_MODELS.includes(model as any)) {
      throw new Error(`Model "${model}" not in supported list`);
    }

    // Start logging
    console.log('📄 HTML Composer Tool - Generation started:', {
      timestamp: new Date().toISOString(),
      title: title.trim(),
      titleLength: title.length,
      theme,
      includeStyles,
      includeMetadata,
      model,
      contentType: typeof content,
      contentSize: typeof content === 'string' ? content.length : JSON.stringify(content).length,
    });

    try {
      // Initialize Claude client
      const anthropic = createAnthropic({
        apiKey,
      });

      // Prepare content for Claude
      const contentText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      
      // Create comprehensive HTML generation prompt
      const htmlPrompt = createHtmlGenerationPrompt(
        title.trim(),
        contentText,
        theme,
        includeStyles,
        includeMetadata
      );

      console.log('🤖 Generating HTML with Claude...');

      // Generate HTML using Claude
      const result = await generateText({
        model: anthropic(model),
        prompt: htmlPrompt,
        maxTokens: 4000,
        temperature: 0.3, // Lower temperature for consistent, structured output
      });

      if (!result.text || result.text.trim().length === 0) {
        throw new Error('Claude returned empty HTML content');
      }

      // Extract and validate HTML content
      const htmlContent = extractAndValidateHtml(result.text);
      
      if (!htmlContent) {
        throw new Error('No valid HTML content found in Claude response');
      }

      // Generate filename for S3 upload
      const fileName = generateHtmlFileName(title, 'html');

      // Upload to S3
      console.log('📤 Uploading HTML report to S3...');
      const htmlUrl = await uploadHtmlToS3(
        htmlContent,
        fileName,
        'text/html',
        `Claude-generated HTML report: ${title.trim()}`
      );

      // Log completion
      console.log('✅ HTML Composer Tool - Generation completed:', {
        title: title.trim(),
        theme,
        model,
        htmlUrl,
        fileName,
        htmlSize: htmlContent.length,
        tokensUsed: result.usage?.totalTokens || 0,
      });

      // Return structured result
      return {
        success: true,
        htmlUrl,
        fileName,
        htmlContent,
        fileSize: Buffer.from(htmlContent, 'utf-8').length,
        uploadedAt: new Date().toISOString(),
        theme,
        model,
        metadata: {
          generatedAt: new Date().toISOString(),
          titleLength: title.length,
          contentSize: contentText.length,
          htmlSize: htmlContent.length,
          tokensUsed: result.usage?.totalTokens || 0,
          uploadedToS3: true,
          includeStyles,
          includeMetadata,
        },
      };

    } catch (error) {
      console.error('❌ HTML Composer Tool - Generation failed:', {
        title: title.trim(),
        theme,
        model,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Rate limiting error
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Claude API rate limit exceeded. Please try again in a moment.');
        }
        
        // Authentication error
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error('Claude API authentication failed. Please check your ANTHROPIC_API_KEY.');
        }
        
        // Token limit error
        if (error.message.includes('token') && error.message.includes('limit')) {
          throw new Error('Content is too large for Claude to process. Please reduce the content size.');
        }
        
        // Invalid model error
        if (error.message.includes('model') && error.message.includes('not found')) {
          throw new Error(`Invalid model "${model}". Please use a supported Claude model.`);
        }
        
        // Content policy errors
        if (error.message.includes('content policy') || error.message.includes('safety')) {
          throw new Error('Content violates Claude content policy. Please modify your content.');
        }
        
        // HTML validation errors
        if (error.message.includes('HTML') || error.message.includes('html')) {
          throw new Error('Generated HTML content is invalid. Please try again with different content.');
        }
        
        // S3 upload errors
        if (error.message.includes('S3') || error.message.includes('upload')) {
          throw new Error('Failed to upload HTML report to S3. Please check your S3 configuration.');
        }
        
        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error connecting to Claude API. Please try again.');
        }
        
        // Service availability errors
        if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Claude service temporarily unavailable. Please try again later.');
        }
      }

      // Generic error fallback
      throw new Error(`HTML composition failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});

const toolDetails: ToolDetails = {
  toolId: 'html_composer',
  name: 'HTML Report Composer',
  useCases: [
    'Generate professional HTML reports from structured data',
    'Create responsive web pages for news articles and insights',
    'Convert research data into formatted HTML presentations',
    'Build iframe-ready content for web embedding',
    'Generate business reports with professional styling',
    'Create tech documentation with modern design',
    'Format survey results and analytics into readable reports',
    'Build newsletter content with responsive design',
    'Generate portfolio pages and case studies',
    'Create educational content with proper formatting',
    'Build landing pages with structured content',
    'Generate print-friendly report documents',
  ],
  logo: 'https://www.openagentic.org/tools/anthropic.svg',
};

export const htmlComposerTool = toOpenAgenticTool(rawHtmlComposerTool, toolDetails);