import { MultiAIOrchestrator, type ParallelAIResult, type ToolChainResult, type AnalysisAggregation } from './multi-ai';
import type { OrchestratorContext, CoreMessage, OpenAgenticTool } from '../types';
import { registerOrchestrator } from './registry';

/**
 * Code Assessment Orchestrator
 * 
 * Implements a sophisticated workflow for comprehensive code analysis:
 * 1. Fetch code from GitHub repository
 * 2. Parallel analysis with Claude (code quality) and Gemini (technical depth)
 * 3. GPT-4o synthesizes findings into executive summary
 * 4. Generate comprehensive markdown report
 * 5. Upload to S3 as professional HTML report
 */
export class CodeAssessmentOrchestrator extends MultiAIOrchestrator {
  
  constructor() {
    super(
      'code_assessment',
      'Code Assessment Expert',
      'Comprehensive code analysis using multi-AI orchestration. Fetches code from GitHub, performs parallel analysis with multiple AI models, and generates professional assessment reports with S3 delivery.'
    );
  }

  /**
   * Custom logic implementation for code assessment
   */
  async customLogic(input: string | CoreMessage[], context: OrchestratorContext): Promise<any> {
    console.log('🔍 Code Assessment Orchestrator - Starting comprehensive analysis');

    // Parse input to extract repository information
    const inputText = typeof input === 'string' ? input : 
                     input.map(m => m.content).join(' ');
    
    const repoInfo = this.parseRepositoryInfo(inputText);
    
    if (!repoInfo.owner || !repoInfo.repo) {
      throw new Error('Please provide repository information in the format: owner/repo or a GitHub URL');
    }

    try {
      // Step 1: Fetch code from GitHub
      console.log('📥 Step 1: Fetching code from GitHub repository');
      const codeData = await this.fetchRepositoryCode(repoInfo, context);

      // Step 2: Parallel analysis with multiple AI models
      console.log('🤖 Step 2: Performing parallel AI analysis');
      const analysisResults = await this.performParallelAnalysis(codeData, context);

      // Step 3: Synthesize findings with GPT-4o
      console.log('🧩 Step 3: Synthesizing findings with GPT-4o');
      const synthesis = await this.synthesizeFindings(analysisResults, codeData);

      // Step 4: Generate comprehensive report
      console.log('📄 Step 4: Generating comprehensive report');
      const report = await this.generateFinalReport(codeData, analysisResults, synthesis);

      // Step 5: Upload to S3
      console.log('📤 Step 5: Uploading report to S3');
      const reportUrl = await this.uploadResult(
        report.content,
        `code-assessment-${repoInfo.owner}-${repoInfo.repo}`,
        {
          title: `Code Assessment: ${repoInfo.owner}/${repoInfo.repo}`,
          description: `Comprehensive code analysis report for ${repoInfo.owner}/${repoInfo.repo}`,
          author: 'OpenAgentic Code Assessment Orchestrator',
          tags: ['code-assessment', 'github', 'analysis', repoInfo.owner, repoInfo.repo],
        }
      );

      console.log('✅ Code Assessment completed successfully');

      return {
        repository: `${repoInfo.owner}/${repoInfo.repo}`,
        reportUrl,
        summary: synthesis.executiveSummary,
        findings: {
          claudeAnalysis: analysisResults.claude,
          geminiAnalysis: analysisResults.gemini,
          gptSynthesis: synthesis.detailedFindings,
        },
        metrics: {
          filesAnalyzed: codeData.files.length,
          totalLines: codeData.totalLines,
          analysisModels: ['claude-sonnet-4-20250514', 'gemini-1.5-pro', 'gpt-4o'],
          reportLength: report.content.length,
        },
      };

    } catch (error) {
      console.error('❌ Code Assessment failed:', error);
      throw error;
    }
  }

  /**
   * Parse repository information from input
   */
  private parseRepositoryInfo(input: string): { owner: string; repo: string; path?: string } {
    // Match GitHub URL patterns
    const githubUrlMatch = input.match(/github\.com\/([^\/]+)\/([^\/\s]+)(?:\/(?:tree|blob)\/[^\/]+\/(.*))?/);
    if (githubUrlMatch) {
      return {
        owner: githubUrlMatch[1],
        repo: githubUrlMatch[2].replace(/\.git$/, ''),
        path: githubUrlMatch[3],
      };
    }

    // Match owner/repo pattern
    const ownerRepoMatch = input.match(/\b([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\b/);
    if (ownerRepoMatch) {
      return {
        owner: ownerRepoMatch[1],
        repo: ownerRepoMatch[2],
      };
    }

    // Try to extract from natural language
    const words = input.toLowerCase().split(/\s+/);
    const repoIndex = words.findIndex(word => word.includes('repository') || word.includes('repo'));
    if (repoIndex !== -1 && repoIndex < words.length - 1) {
      const repoCandidate = words[repoIndex + 1];
      const match = repoCandidate.match(/([^\/]+)\/([^\/]+)/);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }

    return { owner: '', repo: '' };
  }

  /**
   * Fetch repository code using GitHub tool
   */
  private async fetchRepositoryCode(
    repoInfo: { owner: string; repo: string; path?: string },
    context: OrchestratorContext
  ): Promise<{
    repository: string;
    files: Array<{ path: string; content: string; size: number; type: string }>;
    totalLines: number;
    structure: any;
  }> {
    const githubTool = context.tools.find(tool => tool.toolId === 'github_contents');
    if (!githubTool) {
      throw new Error('GitHub tool not available. Please ensure github_contents tool is included.');
    }

    console.log(`📂 Fetching code from ${repoInfo.owner}/${repoInfo.repo}`);

    // Start with repository root
    const rootResponse = await githubTool.execute({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path: repoInfo.path || '',
    });

    if (!rootResponse.success) {
      throw new Error(`Failed to fetch repository: ${rootResponse.error || 'Unknown error'}`);
    }

    const files: Array<{ path: string; content: string; size: number; type: string }> = [];
    let totalLines = 0;

    // Handle both file and directory responses
    if (rootResponse.type === 'file') {
      // Single file
      const content = rootResponse.file.content || '';
      const lines = content.split('\n').length;
      totalLines += lines;
      
      files.push({
        path: rootResponse.file.path,
        content: content,
        size: rootResponse.file.size,
        type: 'file',
      });
    } else if (rootResponse.type === 'directory') {
      // Directory - fetch key files
      const directory = rootResponse.directory;
      const importantFiles = directory.contents.filter((item: any) => 
        item.type === 'file' && this.isImportantFile(item.name)
      ).slice(0, 10); // Limit to 10 files to avoid rate limits

      console.log(`📁 Found ${directory.contents.length} items, fetching ${importantFiles.length} important files`);

      // Fetch each important file
      for (const file of importantFiles) {
        try {
          const fileResponse = await githubTool.execute({
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            path: file.path,
          });

          if (fileResponse.success && fileResponse.type === 'file') {
            const content = fileResponse.file.content || '';
            const lines = content.split('\n').length;
            totalLines += lines;

            files.push({
              path: file.path,
              content: content,
              size: file.size,
              type: 'file',
            });

            console.log(`📄 Fetched: ${file.path} (${lines} lines)`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch ${file.path}:`, error);
          // Continue with other files
        }
      }
    }

    console.log(`✅ Code fetching completed: ${files.length} files, ${totalLines} total lines`);

    return {
      repository: `${repoInfo.owner}/${repoInfo.repo}`,
      files,
      totalLines,
      structure: rootResponse.type === 'directory' ? rootResponse.directory : null,
    };
  }

  /**
   * Determine if a file is important for analysis
   */
  private isImportantFile(filename: string): boolean {
    const importantExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb'];
    const importantFiles = ['README.md', 'package.json', 'Dockerfile', 'docker-compose.yml', '.gitignore', 'requirements.txt', 'pom.xml', 'build.gradle'];
    
    return importantFiles.includes(filename) || 
           importantExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Perform parallel analysis with Claude and Gemini
   */
  private async performParallelAnalysis(
    codeData: { repository: string; files: any[]; totalLines: number },
    context: OrchestratorContext
  ): Promise<{ claude: ParallelAIResult; gemini: ParallelAIResult }> {
    
    // Prepare code summary for analysis
    const codeContext = this.prepareCodeContext(codeData);

    // Define analysis prompts
    const claudePrompt = `
Perform a comprehensive code quality analysis of this ${codeData.repository} repository:

${codeContext}

As an expert code reviewer, analyze:

1. **Code Quality & Architecture**
   - Overall code structure and organization
   - Design patterns and architectural decisions
   - Code maintainability and readability

2. **Best Practices & Standards**
   - Coding standards compliance
   - Error handling and logging
   - Security considerations

3. **Technical Debt & Issues**
   - Code smells and anti-patterns
   - Potential bugs or vulnerabilities
   - Performance concerns

4. **Documentation & Testing**
   - Code documentation quality
   - Test coverage and quality
   - API documentation

Provide specific examples and actionable recommendations for improvement.`;

    const geminiPrompt = `
Conduct a deep technical analysis of this ${codeData.repository} repository:

${codeContext}

As a technical architect, evaluate:

1. **Technical Architecture**
   - System design and component architecture
   - Data flow and integration patterns
   - Scalability and performance architecture

2. **Technology Stack Assessment**
   - Technology choices and their appropriateness
   - Dependencies and their management
   - Version compatibility and updates

3. **Implementation Quality**
   - Algorithm efficiency and optimization
   - Resource usage and memory management
   - Concurrency and threading considerations

4. **Operational Readiness**
   - Deployment and configuration management
   - Monitoring and observability
   - Error handling and recovery

Focus on technical depth and provide specific technical recommendations.`;

    console.log('🤖 Running parallel analysis with Claude and Gemini');

    try {
      // Execute both analyses in parallel
      const parallelResults = await this.runInParallel(
        claudePrompt,
        [
          'claude-sonnet-4-20250514',
          'gemini-1.5-pro'
        ],
        {
          temperature: 0.3, // Lower temperature for more focused analysis
          maxTokens: 3000,
          timeoutMs: 120000, // 2 minute timeout
          failFast: false, // Continue even if one fails
        }
      );

      // Extract results
      const claudeResult = parallelResults.find(r => r.provider === 'anthropic');
      const geminiResult = parallelResults.find(r => r.provider === 'google');

      if (!claudeResult?.success && !geminiResult?.success) {
        throw new Error('Both Claude and Gemini analyses failed');
      }

      // Handle partial failures
      const failureInfo = this.handlePartialFailures(parallelResults, {
        minimumSuccessRate: 0.5, // At least 50% success
        fallbackStrategy: 'continue',
      });

      console.log('📊 Parallel analysis results:', {
        claudeSuccess: claudeResult?.success || false,
        geminiSuccess: geminiResult?.success || false,
        recommendation: failureInfo.recommendation,
      });

      return {
        claude: claudeResult || { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic', success: false, error: 'Analysis failed', duration: 0 },
        gemini: geminiResult || { modelId: 'gemini-1.5-pro', provider: 'google', success: false, error: 'Analysis failed', duration: 0 },
      };

    } catch (error) {
      console.error('❌ Parallel analysis failed:', error);
      throw new Error(`Parallel analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Prepare code context for analysis
   */
  private prepareCodeContext(codeData: { repository: string; files: any[]; totalLines: number }): string {
    const filesSummary = codeData.files.map(file => `
**File: ${file.path}** (${file.size} bytes)
\`\`\`
${file.content.substring(0, 2000)}${file.content.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`
`).join('\n');

    return `
**Repository:** ${codeData.repository}
**Total Files Analyzed:** ${codeData.files.length}
**Total Lines of Code:** ${codeData.totalLines}

**File Structure and Key Files:**
${filesSummary}

**File Types Present:**
${[...new Set(codeData.files.map(f => f.path.split('.').pop()))].join(', ')}
`;
  }

  /**
   * Synthesize findings using GPT-4o
   */
  private async synthesizeFindings(
    analysisResults: { claude: ParallelAIResult; gemini: ParallelAIResult },
    codeData: { repository: string; files: any[]; totalLines: number }
  ): Promise<{ executiveSummary: string; detailedFindings: string; recommendations: string }> {
    
    console.log('🧩 Synthesizing findings with GPT-4o');

    // Prepare synthesis context
    const synthesisPrompt = `
Synthesize the following code analysis results for ${codeData.repository} into a comprehensive assessment:

## Claude Analysis (Code Quality Focus)
${analysisResults.claude.success ? analysisResults.claude.result : 'Analysis failed: ' + (analysisResults.claude.error || 'Unknown error')}

## Gemini Analysis (Technical Architecture Focus)  
${analysisResults.gemini.success ? analysisResults.gemini.result : 'Analysis failed: ' + (analysisResults.gemini.error || 'Unknown error')}

## Repository Context
- **Repository:** ${codeData.repository}
- **Files Analyzed:** ${codeData.files.length}
- **Total Lines:** ${codeData.totalLines}
- **Analysis Status:** Claude: ${analysisResults.claude.success ? 'Success' : 'Failed'}, Gemini: ${analysisResults.gemini.success ? 'Success' : 'Failed'}

Please provide:

1. **Executive Summary** (2-3 paragraphs)
   - Overall assessment of the codebase
   - Key strengths and areas for improvement
   - Business impact and risk assessment

2. **Detailed Findings** (comprehensive analysis)
   - Integrate insights from both analyses
   - Prioritize findings by importance
   - Provide specific examples and evidence
   - Resolve any conflicts between analyses

3. **Actionable Recommendations** (prioritized list)
   - Immediate actions (quick wins)
   - Medium-term improvements
   - Long-term strategic changes
   - Implementation guidance

Format the response as structured markdown with clear sections.`;

    try {
      const synthesis = await this.executeWithModel(
        synthesisPrompt,
        this.createModelInstance('gpt-4o', {
          temperature: 0.4,
          maxTokens: 4000,
        })
      );

      // Parse the structured response
      const content = synthesis.text;
      const sections = this.parseSynthesisResponse(content);

      console.log('✅ Synthesis completed', {
        executiveSummaryLength: sections.executiveSummary.length,
        detailedFindingsLength: sections.detailedFindings.length,
        recommendationsLength: sections.recommendations.length,
      });

      return sections;

    } catch (error) {
      console.error('❌ Synthesis failed:', error);
      
      // Fallback synthesis if GPT-4o fails
      return this.createFallbackSynthesis(analysisResults, codeData);
    }
  }

  /**
   * Parse GPT-4o synthesis response into structured sections
   */
  private parseSynthesisResponse(content: string): { executiveSummary: string; detailedFindings: string; recommendations: string } {
    const sections = {
      executiveSummary: '',
      detailedFindings: '',
      recommendations: '',
    };

    // Try to parse structured markdown sections
    const executiveSummaryMatch = content.match(/(?:^|\n)#+\s*Executive Summary.*?\n(.*?)(?=\n#+|\n\*\*|$)/is);
    const detailedFindingsMatch = content.match(/(?:^|\n)#+\s*Detailed Findings.*?\n(.*?)(?=\n#+|\n\*\*|$)/is);
    const recommendationsMatch = content.match(/(?:^|\n)#+\s*(?:Actionable )?Recommendations.*?\n(.*?)(?=\n#+|$)/is);

    sections.executiveSummary = executiveSummaryMatch?.[1]?.trim() || content.substring(0, 500) + '...';
    sections.detailedFindings = detailedFindingsMatch?.[1]?.trim() || content.substring(500, 2000) + '...';
    sections.recommendations = recommendationsMatch?.[1]?.trim() || content.substring(2000) || 'See detailed findings for recommendations.';

    return sections;
  }

  /**
   * Create fallback synthesis if GPT-4o fails
   */
  private createFallbackSynthesis(
    analysisResults: { claude: ParallelAIResult; gemini: ParallelAIResult },
    codeData: { repository: string; files: any[]; totalLines: number }
  ): { executiveSummary: string; detailedFindings: string; recommendations: string } {
    console.log('🔄 Creating fallback synthesis');

    const executiveSummary = `
Code assessment completed for ${codeData.repository} with ${codeData.files.length} files analyzed (${codeData.totalLines} lines of code).

Analysis Status: Claude analysis ${analysisResults.claude.success ? 'succeeded' : 'failed'}, Gemini analysis ${analysisResults.gemini.success ? 'succeeded' : 'failed'}.

${analysisResults.claude.success || analysisResults.gemini.success 
  ? 'Available analysis results provide insights into code quality and technical architecture.' 
  : 'Both primary analyses encountered issues. Manual review recommended.'}`;

    const detailedFindings = `
## Claude Analysis Results
${analysisResults.claude.success ? analysisResults.claude.result : `Failed: ${analysisResults.claude.error}`}

## Gemini Analysis Results  
${analysisResults.gemini.success ? analysisResults.gemini.result : `Failed: ${analysisResults.gemini.error}`}

## Repository Overview
- Repository: ${codeData.repository}
- Files Analyzed: ${codeData.files.length}
- Total Lines: ${codeData.totalLines}
- File Types: ${[...new Set(codeData.files.map(f => f.path.split('.').pop()))].join(', ')}`;

    const recommendations = `
## Immediate Actions
- Review the analysis results above for specific insights
- ${analysisResults.claude.success ? 'Address code quality issues identified by Claude' : 'Perform manual code quality review'}
- ${analysisResults.gemini.success ? 'Implement technical improvements suggested by Gemini' : 'Conduct technical architecture review'}

## Medium-term Improvements
- Establish code review processes
- Implement automated testing and CI/CD
- Set up code quality monitoring

## Long-term Strategy
- Regular code assessments and refactoring
- Technology stack evaluation and updates
- Team training and development`;

    return { executiveSummary, detailedFindings, recommendations };
  }

  /**
   * Generate final comprehensive report
   */
  private async generateFinalReport(
    codeData: { repository: string; files: any[]; totalLines: number },
    analysisResults: { claude: ParallelAIResult; gemini: ParallelAIResult },
    synthesis: { executiveSummary: string; detailedFindings: string; recommendations: string }
  ): Promise<{ content: string; metadata: any }> {
    
    console.log('📄 Generating final comprehensive report');

    const timestamp = new Date().toISOString();
    const analysisModels = [
      `Claude Sonnet 4 (${analysisResults.claude.success ? 'Success' : 'Failed'})`,
      `Gemini 1.5 Pro (${analysisResults.gemini.success ? 'Success' : 'Failed'})`,
      'GPT-4o (Synthesis)',
    ];

    const reportContent = `# Code Assessment Report: ${codeData.repository}

## Executive Summary

${synthesis.executiveSummary}

## Repository Overview

- **Repository:** ${codeData.repository}
- **Assessment Date:** ${new Date(timestamp).toLocaleDateString()}
- **Files Analyzed:** ${codeData.files.length}
- **Total Lines of Code:** ${codeData.totalLines.toLocaleString()}
- **Analysis Models:** ${analysisModels.join(', ')}

### Files Analyzed
${codeData.files.map(file => `- **${file.path}** (${file.size} bytes)`).join('\n')}

## Detailed Analysis Findings

${synthesis.detailedFindings}

## Actionable Recommendations

${synthesis.recommendations}

## Analysis Details

### Code Quality Analysis (Claude Sonnet 4)
**Status:** ${analysisResults.claude.success ? '✅ Success' : '❌ Failed'}
${analysisResults.claude.success ? `
**Duration:** ${analysisResults.claude.duration}ms
**Tokens Used:** ${analysisResults.claude.usage?.totalTokens || 'N/A'}

${analysisResults.claude.result}
` : `
**Error:** ${analysisResults.claude.error}
`}

### Technical Architecture Analysis (Gemini 1.5 Pro)
**Status:** ${analysisResults.gemini.success ? '✅ Success' : '❌ Failed'}
${analysisResults.gemini.success ? `
**Duration:** ${analysisResults.gemini.duration}ms
**Tokens Used:** ${analysisResults.gemini.usage?.totalTokens || 'N/A'}

${analysisResults.gemini.result}
` : `
**Error:** ${analysisResults.gemini.error}
`}

## Assessment Methodology

This assessment was conducted using OpenAgentic's multi-AI orchestrator with the following workflow:

1. **Code Extraction:** Repository content fetched using GitHub API
2. **Parallel Analysis:** Simultaneous analysis by Claude (code quality) and Gemini (technical architecture)
3. **Synthesis:** GPT-4o integrated findings into comprehensive assessment
4. **Report Generation:** Structured markdown report with actionable insights
5. **Delivery:** Professional HTML report uploaded to secure cloud storage

## Report Metadata

- **Generated By:** OpenAgentic Code Assessment Orchestrator
- **Report ID:** ${timestamp}
- **Assessment Type:** Comprehensive Multi-AI Analysis
- **Confidence Level:** ${analysisResults.claude.success && analysisResults.gemini.success ? 'High' : analysisResults.claude.success || analysisResults.gemini.success ? 'Medium' : 'Low'}

---

*This report was generated automatically using AI analysis. Results should be reviewed by qualified software engineers for implementation.*`;

    const metadata = {
      repository: codeData.repository,
      timestamp,
      filesAnalyzed: codeData.files.length,
      totalLines: codeData.totalLines,
      analysisStatus: {
        claude: analysisResults.claude.success,
        gemini: analysisResults.gemini.success,
      },
      reportLength: reportContent.length,
    };

    console.log('✅ Final report generated', {
      contentLength: reportContent.length,
      sections: ['Executive Summary', 'Repository Overview', 'Detailed Findings', 'Recommendations', 'Analysis Details'],
      metadata,
    });

    return { content: reportContent, metadata };
  }
}

// Create and register the orchestrator
export const codeAssessmentOrchestrator = new CodeAssessmentOrchestrator();
registerOrchestrator(codeAssessmentOrchestrator);

console.log('🔍 Code Assessment Orchestrator registered and ready');