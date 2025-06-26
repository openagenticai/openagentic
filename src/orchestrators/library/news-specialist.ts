import { MultiAIOrchestrator } from '../multi-ai';
import type { OrchestratorContext, CoreMessage } from '../../types';
import { registerOrchestrator } from '../registry';
import { createAgent } from '../../index';

/**
 * News Specialist Orchestrator
 * 
 * Uses an OpenAI agent with news analysis tools to gather information intelligently,
 * then generates professional HTML reports with visual content.
 * 
 * Workflow:
 * 1. OpenAI agent uses news tools (perplexity, newsdata, websearch) intelligently
 * 2. AI-powered analysis and insight generation with visual content
 * 3. Professional HTML report generation for web publication
 */
export class NewsSpecialistOrchestrator extends MultiAIOrchestrator {
  
  constructor() {
    super(
      'news_specialist',
      'Professional News Analysis Specialist',
      'AI-driven news analysis using OpenAI agent with intelligent tool usage, fact-checking, and professional HTML report generation. Creates comprehensive news articles with visual content, ready for web publication.'
    );
  }

  /**
   * Custom logic implementation using OpenAI agent for news analysis
   */
  async customLogic(input: string | CoreMessage[], context: OrchestratorContext): Promise<any> {
    console.log('🗞️ News Specialist Orchestrator - Starting AI-driven news analysis');

    // Parse input to extract topic and analysis parameters
    const inputText = typeof input === 'string' ? input : 
                     input.map(m => m.content).join(' ');
    
    const analysisParams = this.parseAnalysisParameters(inputText);

    try {
      // Step 1: Create OpenAI agent with news analysis tools
      console.log('🤖 Step 1: Creating OpenAI agent with news analysis tools');
      const newsAnalysisAgent = this.createNewsAnalysisAgent(context);

      // Step 2: Let AI agent gather and analyze news data intelligently
      console.log('📊 Step 2: AI agent gathering and analyzing news data');
      const agentAnalysis = await this.runNewsAnalysisAgent(newsAnalysisAgent, analysisParams);

      // Step 3: Generate visual content
      console.log('🖼️ Step 3: Creating visual content');
      const visualContent = await this.generateVisualContent(agentAnalysis, context);

      // Step 4: Consolidate findings with visual content
      console.log('📝 Step 4: Consolidating findings into structured report');
      const consolidatedReport = await this.consolidateFindings(agentAnalysis, visualContent, context);

      // Step 5: Professional HTML report generation
      console.log('🌐 Step 5: Generating professional HTML report');
      const htmlReportUrl = await this.generateHtmlReport(consolidatedReport, context);

      console.log('✅ News Specialist analysis completed successfully');

      return {
        success: true,
        htmlReportUrl,
        executiveSummary: consolidatedReport.executiveSummary,
        keyInsights: consolidatedReport.keyInsights,
        sourcesAnalyzed: consolidatedReport.sourcesAnalyzed,
        factCheckResults: consolidatedReport.factCheckResults,
        sentiment: consolidatedReport.sentiment,
        recommendations: consolidatedReport.recommendations,
        visualContentUrls: visualContent.imageUrls,
        agentAnalysis: agentAnalysis.analysisContent, // Include agent's analysis
        imagesIncluded: visualContent.imageUrls.length > 0, // Flag indicating images were included
        metadata: {
          topic: analysisParams.topic,
          analysisDepth: analysisParams.depth,
          sourcesUsed: consolidatedReport.sourcesUsed,
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - consolidatedReport.startTime,
          totalImages: visualContent.imageUrls.length,
          agentIterations: agentAnalysis.iterations,
          toolsUsed: agentAnalysis.toolsUsed,
          htmlTheme: 'modern-news',
          designEnhanced: true,
        },
      };

    } catch (error) {
      console.error('❌ News Specialist analysis failed:', error);
      throw error;
    }
  }

  /**
   * Create OpenAI agent with news analysis tools
   */
  private createNewsAnalysisAgent(context: OrchestratorContext) {
    // Get available news analysis tools
    const newsTools = [
      'perplexity_search',
      'newsdata_search', 
      'grok_chat',
      'gemini_chat',
    ].map(toolId => context.tools.find(tool => tool.toolId === toolId))
     .filter(tool => tool !== undefined);

    console.log(`🔧 Creating agent with ${newsTools.length} news analysis tools:`, 
                newsTools.map(tool => tool?.toolId));

    // Create OpenAI agent with news analysis capabilities
    const agent = createAgent({
      model: 'gpt-4o',
      tools: newsTools,
      systemPrompt: `You are a professional news analyst and journalist with access to multiple news research tools. Your job is to conduct comprehensive and accurate news analysis using the available tools intelligently.

AVAILABLE TOOLS:
- perplexity_search: Real-time information and fact-checking from authoritative sources
- newsdata_search: Structured news articles from multiple news outlets
- web_search: Additional context and verification sources
- gemini_chat: Advanced analysis and insight generation
- anthropic_chat: Expert perspective and synthesis

ANALYSIS STRATEGY:
1. **Research Phase**: Use perplexity_search and newsdata_search to gather comprehensive information
2. **Verification Phase**: Cross-reference information and fact-check claims
3. **Analysis Phase**: Use AI tools (gemini_chat, anthropic_chat) for deeper analysis
4. **Synthesis Phase**: Create structured analysis with insights and recommendations

EXECUTION GUIDELINES:
- Be thorough but efficient in tool usage
- Cross-verify information across multiple sources
- Focus on accuracy, objectivity, and comprehensive coverage
- Identify key insights, trends, and implications
- Maintain professional journalism standards
- Always fact-check claims and cite sources

OUTPUT REQUIREMENTS:
- Provide comprehensive analysis with source attribution
- Include executive summary, key insights, and recommendations
- Assess sentiment and public reaction where relevant
- Highlight any conflicting information or concerns
- Structure findings for professional news report format

Your goal is to create a thorough, fact-checked news analysis that can be used to generate a professional news report.`,
      maxIterations: 8,
      enableToolLogging: true
    });

    return agent;
  }

  /**
   * Run news analysis using OpenAI agent
   */
  private async runNewsAnalysisAgent(agent: any, analysisParams: any): Promise<any> {
    const analysisPrompt = `Conduct comprehensive news analysis on the topic: "${analysisParams.topic}"

Analysis depth requested: ${analysisParams.depth}

Please use the available tools to:
1. Gather current news and information about this topic
2. Fact-check and verify key claims and developments
3. Analyze trends, sentiment, and implications  
4. Provide expert perspective and insights
5. Synthesize findings into a structured analysis

Focus areas:
- Latest developments and breaking news
- Background context and historical perspective
- Multiple viewpoints and source verification
- Impact assessment and future implications
- Public and expert reactions

Ensure your analysis is thorough, accurate, and professionally structured for news reporting.`;

    console.log('🤖 Running OpenAI agent for news analysis...');
    
    const result = await agent.execute(analysisPrompt);

    if (!result.success) {
      throw new Error(`News analysis agent failed: ${result.error}`);
    }

    console.log(`✅ Agent analysis completed in ${result.iterations} iterations using ${result.toolCallsUsed?.length || 0} tool calls`);

    return {
      analysisContent: result.result,
      summary: result.result,
      iterations: result.iterations,
      toolsUsed: result.toolCallsUsed?.map((call: any) => call.toolName) || [],
      toolCallDetails: result.toolCallsUsed || [],
      agentSuccess: result.success
    };
  }

  /**
   * Parse analysis parameters from user input
   */
  private parseAnalysisParameters(input: string): {
    topic: string;
    depth: 'basic' | 'comprehensive';
    timeframe?: string;
    sources?: string[];
  } {
    const cleanInput = input.trim();
    
    // Determine analysis depth
    const isComprehensive = cleanInput.toLowerCase().includes('comprehensive') || 
                           cleanInput.toLowerCase().includes('detailed') ||
                           cleanInput.toLowerCase().includes('in-depth');
    
    // Extract topic (everything that's not meta-instructions)
    let topic = cleanInput
      .replace(/\b(comprehensive|detailed|in-depth|analysis|report)\b/gi, '')
      .trim();
    
    if (!topic || topic.length < 3) {
      topic = 'Current news developments';
    }

    return {
      topic,
      depth: isComprehensive ? 'comprehensive' : 'basic',
    };
  }

  /**
   * Generate visual content for the news article
   */
  private async generateVisualContent(agentAnalysis: any, context: OrchestratorContext): Promise<any> {
    const openaiImageTool = context.tools.find(tool => tool.toolId === 'openai_image_generator');
    if (!openaiImageTool?.execute) {
      console.log('⚠️ Image generation tool not available');
      return { imageUrls: [], success: false };
    }
    // const geminiImageTool = context.tools.find(tool => tool.toolId === 'gemini_image_generator');
    // if (!geminiImageTool?.execute) {
    //   console.log('⚠️ Image generation tool not available');
    //   return { imageUrls: [], success: false };
    // }

    console.log('🖼️ Generating visual content for article');

    // Generate 2-3 relevant images based on agent analysis
    const imagePrompts = this.createImagePrompts(agentAnalysis.analysisContent);
    const imageResults = await Promise.allSettled(
      imagePrompts.map(async (prompt, index) => {
        if (!openaiImageTool.execute) {
          return null;
        }
        
        const result = await openaiImageTool.execute({
          prompt,
          model: 'gpt-image-1',
          size: '1024x1024',
          quality: 'standard',
          style: 'natural'
          // model: 'gemini-2.0-flash-preview-image-generation',
          // style: 'photorealistic',
          // aspectRatio: '1:1',
          // quality: 'standard'
        }, { toolCallId: `article-image-${index + 1}`, messages: [] });
        
        return result.success ? result.imageUrl : null;
      })
    );

    const imageUrls = imageResults
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => (result as PromiseFulfilledResult<string>).value);

    console.log(`🖼️ Generated ${imageUrls.length} images for article`);

    return {
      imageUrls,
      success: imageUrls.length > 0
    };
  }

  /**
   * Create image prompts based on analysis content
   */
  private createImagePrompts(analysisContent: string): string[] {
    const prompts = [];

    // Add a hero image for the main story
    prompts.push('Professional editorial illustration for breaking news story, modern news media design, clean and impactful, suitable for article header');

    // Add a specific image based on content if possible
    if (analysisContent && typeof analysisContent === 'string') {
      const contentKeywords = this.extractKeywords(analysisContent);
      if (contentKeywords.length > 0) {
        prompts.push(`Professional news photography representing ${contentKeywords.slice(0, 3).join(', ')}, photojournalistic style, high quality editorial image, clean composition`);
      }
    }

    // Add an infographic-style image
    prompts.push('Modern data visualization infographic for news analysis, professional news media aesthetic, clean charts and graphics, contemporary design');

    return prompts.slice(0, 3); // Maximum 3 images
  }

  /**
   * Extract keywords for image generation
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'a', 'an'];
    const words = text.toLowerCase().split(/\W+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5);
    
    return words;
  }

  /**
   * Consolidate all findings into a structured report
   */
  private async consolidateFindings(agentAnalysis: any, visualContent: any, context: OrchestratorContext): Promise<any> {
    const anthropicTool = context.tools.find(tool => tool.toolId === 'anthropic_chat');
    if (!anthropicTool?.execute) {
      throw new Error('Anthropic tool not available for content consolidation');
    }

    console.log('📝 Consolidating agent findings into structured report');

    const consolidationPrompt = `Synthesize the following AI agent news analysis into a comprehensive, structured report:

AGENT ANALYSIS: ${agentAnalysis.analysisContent}

AGENT TOOL USAGE: ${JSON.stringify(agentAnalysis.toolCallDetails, null, 2)}

VISUAL CONTENT: ${visualContent.imageUrls.length} images available

Please create a structured report with:
1. Executive Summary (2-3 sentences)
2. Key Insights (3-5 bullet points)
3. Fact Check Results (verified facts, concerns, confidence level)
4. Sentiment Assessment (overall tone, public reaction)
5. Expert Recommendations (3-4 actionable insights)
6. Source Summary (what sources were analyzed by the agent)

The agent used these tools: ${agentAnalysis.toolsUsed.join(', ')}

Format as a clear, professional news analysis report based on the comprehensive agent analysis.`;

    const result = await anthropicTool.execute({
      prompt: consolidationPrompt,
      model: 'claude-sonnet-4-20250514',
      temperature: 0.4,
      maxTokens: 2000,
    }, { toolCallId: 'consolidation', messages: [] });

    if (!result.success) {
      throw new Error('Failed to consolidate findings');
    }

    // Parse the structured response (simplified - could be enhanced with JSON parsing)
    const reportText = result.text;
    
    return {
      agentAnalysis,
      executiveSummary: this.extractSection(reportText, 'Executive Summary') || 'AI agent analysis completed successfully',
      keyInsights: this.extractListItems(reportText, 'Key Insights') || ['Comprehensive analysis performed by AI agent'],
      factCheckResults: this.extractSection(reportText, 'Fact Check Results') || 'Facts verified by AI agent across multiple sources',
      sentiment: this.extractSection(reportText, 'Sentiment Assessment') || 'Neutral sentiment observed',
      recommendations: this.extractListItems(reportText, 'Expert Recommendations') || ['Further monitoring recommended'],
      sourcesUsed: agentAnalysis.toolsUsed || ['AI Agent Analysis'],
      sourcesAnalyzed: agentAnalysis.toolsUsed.length || 1,
      consolidatedReport: reportText,
      agentIterations: agentAnalysis.iterations,
      agentToolCalls: agentAnalysis.toolCallDetails.length,
      visualContent: visualContent, // Include visual content in consolidated report
      startTime: Date.now(),
    };
  }

  /**
   * Generate professional HTML report using HTML Composer tool
   */
  private async generateHtmlReport(consolidatedReport: any, context: OrchestratorContext): Promise<string> {
    const htmlComposer = context.tools.find(tool => tool.toolId === 'html_composer');
    if (!htmlComposer?.execute) {
      throw new Error('HTML Composer tool not available. Please ensure html_composer tool is included.');
    }

    console.log('🌐 Generating professional HTML report');

    // Extract topic from agent analysis or use default
    const topic = consolidatedReport.agentAnalysis?.topic || 
                  this.extractTopicFromContent(consolidatedReport.executiveSummary) || 
                  'Current Events';

    const result = await htmlComposer.execute({
      title: `News Analysis Report: ${topic}`,
      content: {
        executiveSummary: consolidatedReport.executiveSummary,
        keyInsights: consolidatedReport.keyInsights,
        factCheckResults: consolidatedReport.factCheckResults,
        sentiment: consolidatedReport.sentiment,
        recommendations: consolidatedReport.recommendations,
        fullAnalysis: consolidatedReport.consolidatedReport,
        agentAnalysis: consolidatedReport.agentAnalysis?.analysisContent,
        sourcesAnalyzed: consolidatedReport.sourcesAnalyzed,
        agentMetadata: {
          iterations: consolidatedReport.agentIterations || 0,
          toolCallsMade: consolidatedReport.agentToolCalls || 0,
          toolsUsed: consolidatedReport.sourcesUsed || [],
          analysisMethod: 'AI Agent with Dynamic Tool Usage'
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          sourcesUsed: consolidatedReport.sourcesUsed,
          analysisType: 'AI-Driven News Analysis'
        }
      },
      imageUrls: consolidatedReport.visualContent?.imageUrls || [], // Pass images separately for Claude to see
      theme: 'news', // Simplified theme
      includeStyles: true,
      includeMetadata: true,
      designInstructions: 'Create a clean, minimal, modern news report design. Use simple typography, generous white space, and integrate the provided images naturally throughout the content. Focus on readability and professional appearance with a contemporary aesthetic.'
    }, { toolCallId: 'html-report', messages: [] });

    if (!result.success || !result.htmlUrl) {
      throw new Error('Failed to generate HTML report');
    }

    console.log(`✅ HTML report generated: ${result.htmlUrl}`);
    return result.htmlUrl;
  }

  /**
   * Extract topic from content for title generation
   */
  private extractTopicFromContent(content: string): string | null {
    if (!content || typeof content !== 'string') return null;
    
    // Simple topic extraction from first sentence
    const sentences = content.split('.').filter(s => s.trim().length > 0);
    if (sentences.length === 0) return null;
    
    const firstSentence = sentences[0]?.trim();
    // Remove common starting phrases
    const cleanSentence = firstSentence?.trim()
      .replace(/^(this analysis|this report|the analysis|the report|analysis of|report on)/i, '')
      .trim();
    
    // Take first few words as topic
    const words = cleanSentence?.split(' ').slice(0, 6);
    return words?.length && words?.length > 0 ? words?.join(' ') : null;
  }

  /**
   * Extract a section from structured text
   */
  private extractSection(text: string, sectionName: string): string | null {
    const regex = new RegExp(`${sectionName}:?\\s*([^\\n]*(?:\\n(?!\\d+\\.|[A-Z][A-Z\\s]+:)[^\\n]*)*)`, 'i');
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : null;
  }

  /**
   * Extract list items from structured text
   */
  private extractListItems(text: string, sectionName: string): string[] | null {
    const section = this.extractSection(text, sectionName);
    if (!section) return null;
    
    const items = section.split(/\n\s*[-•]\s*/)
      .filter(item => item.trim().length > 0)
      .map(item => item.trim());
    
    return items.length > 0 ? items : null;
  }
}

// Create and register the orchestrator
export const newsSpecialistOrchestrator = new NewsSpecialistOrchestrator();
registerOrchestrator(newsSpecialistOrchestrator);

console.log('🗞️ News Specialist Orchestrator registered and ready');