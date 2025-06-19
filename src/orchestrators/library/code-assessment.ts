import { MultiAIOrchestrator, type ParallelAIResult, type ToolChainResult, type AnalysisAggregation } from '../multi-ai';
import type { OrchestratorContext, CoreMessage, OpenAgenticTool } from '../../types';
import { registerOrchestrator } from '../registry';

const FILE_LIMIT = 50;

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
    
    const repoInfo = this.parseRepositoryInfo(inputText, context.orchestratorParams);
    
    if (!repoInfo.owner || !repoInfo.repo) {
      throw new Error('Please provide repository information in the format: owner/repo or a GitHub URL');
    }

    try {
      // Step 1: Fetch code from GitHub
      console.log('📥 Step 1: Fetching code from GitHub repository');
      if (repoInfo.additionalPaths && repoInfo.additionalPaths.length > 0) {
        console.log(`📁 Custom directories requested: ${repoInfo.additionalPaths.join(', ')}`);
      }
      const codeData = await this.fetchRepositoryCode(repoInfo, context);

      // Step 2: Parallel analysis with multiple AI models
      console.log('🤖 Step 2: Performing parallel AI analysis');
      const analysisResults = await this.performParallelAnalysis(codeData, context);

      // Step 3: Synthesize findings with GPT-4o
      console.log('🧩 Step 3: Synthesizing findings with GPT-4o');
      const synthesis = await this.synthesizeAnalysisFindings(analysisResults, codeData);

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
   * Parse repository information and additional directory paths from input and orchestratorParams
   */
  private parseRepositoryInfo(input: string, orchestratorParams?: Record<string, any>): { owner: string; repo: string; path?: string; additionalPaths: string[] } {
    let owner = '';
    let repo = '';
    let path: string | undefined;
    const additionalPaths: string[] = [];

    // Match GitHub URL patterns
    const githubUrlMatch = input.match(/github\.com\/([^\/]+)\/([^\/\s]+)(?:\/(?:tree|blob)\/[^\/]+\/(.*))?/);
    if (githubUrlMatch && githubUrlMatch[1] && githubUrlMatch[2]) {
      owner = githubUrlMatch[1];
      repo = githubUrlMatch[2].replace(/\.git$/, '');
      path = githubUrlMatch[3];
    } else {
      // Match owner/repo pattern
      const ownerRepoMatch = input.match(/\b([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\b/);
      if (ownerRepoMatch && ownerRepoMatch[1] && ownerRepoMatch[2]) {
        owner = ownerRepoMatch[1];
        repo = ownerRepoMatch[2];
      } else {
        // Try to extract from natural language
        const words = input.toLowerCase().split(/\s+/);
        const repoIndex = words.findIndex(word => word.includes('repository') || word.includes('repo'));
        if (repoIndex !== -1 && repoIndex < words.length - 1) {
          const repoCandidate = words[repoIndex + 1];
          if (repoCandidate) {
            const match = repoCandidate.match(/([^\/]+)\/([^\/]+)/);
            if (match && match[1] && match[2]) {
              owner = match[1];
              repo = match[2];
            }
          }
        }
      }
    }

    // Check orchestratorParams first for additionalPaths
    if (orchestratorParams?.additionalPaths && Array.isArray(orchestratorParams.additionalPaths)) {
      // Use paths from orchestratorParams if provided
      const paramPaths = orchestratorParams.additionalPaths
        .filter((path: any) => typeof path === 'string' && path.length > 0)
        .map((path: string) => path.replace(/\/$/, '').replace(/\/\*$/, ''));
      
      additionalPaths.push(...paramPaths);
      console.log(`📁 Using additionalPaths from orchestratorParams: ${paramPaths.join(', ')}`);
    }

    // Remove duplicates and clean up paths
    const uniquePaths = Array.from(new Set(additionalPaths))
      .filter(path => path.length > 0 && !path.includes('github.com'));

    console.log(`📋 Parsed repository: ${owner}/${repo}`);
    if (uniquePaths.length > 0) {
      const source = orchestratorParams?.additionalPaths ? 'orchestratorParams' : 'text parsing';
      console.log(`📁 Additional paths to assess (from ${source}): ${uniquePaths.join(', ')}`);
    }

    return { owner, repo, path, additionalPaths: uniquePaths };
  }

  /**
   * Fetch repository code using GitHub tool
   */
  private async fetchRepositoryCode(
    repoInfo: { owner: string; repo: string; path?: string; additionalPaths?: string[] },
    context: OrchestratorContext
  ): Promise<{
    repository: string;
    files: Array<{ path: string; content: string; size: number; type: string }>;
    totalLines: number;
    structure: any;
  }> {
    const githubTool = context.tools.find(tool => tool.toolId === 'github_contents');
    if (!githubTool || !githubTool.execute) {
      throw new Error('GitHub tool not available. Please ensure github_contents tool is included.');
    }

    console.log(`📂 Fetching code from ${repoInfo.owner}/${repoInfo.repo}`);

    // Start with repository root
    const rootResponse = await githubTool.execute({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path: repoInfo.path || '',
    }, { toolCallId: 'github-root', messages: [] });

    if (!rootResponse.success) {
      throw new Error(`Failed to fetch repository: ${rootResponse.error || 'Unknown error'}`);
    }

    // Use systematic repository exploration with optional additional paths
    console.log('🔍 Exploring repository structure to find source code...');
    const files = await this.exploreRepositoryStructure(repoInfo, githubTool);
    
    // Calculate total lines
    let totalLines = files.reduce((total, file) => total + file.content.split('\n').length, 0);

    console.log(`✅ Code fetching completed: ${files.length} files, ${totalLines} total lines`);

    return {
      repository: `${repoInfo.owner}/${repoInfo.repo}`,
      files,
      totalLines,
      structure: rootResponse.type === 'directory' ? rootResponse.directory : null,
    };
  }

  /**
   * Explore specific repository directories for source code
   */
  private async exploreRepositoryStructure(
    repoInfo: { owner: string; repo: string; path?: string; additionalPaths?: string[] },
    githubTool: OpenAgenticTool
  ): Promise<Array<{ path: string; content: string; size: number; type: string }>> {
    const files: Array<{ path: string; content: string; size: number; type: string }> = [];
    
    // Default target directories to explore
    const defaultPaths = [
      '',                          // Root directory (for config files)
      // 'src/components',            // Main components
      // 'src/components/__tests__'   // Component tests
    ];

    // Combine default paths with any additional paths provided
    const targetPaths = [...defaultPaths];
    
    if (repoInfo.additionalPaths && repoInfo.additionalPaths.length > 0) {
      // Add additional paths, avoiding duplicates
      for (const additionalPath of repoInfo.additionalPaths) {
        if (!targetPaths.includes(additionalPath)) {
          targetPaths.push(additionalPath);
        }
      }
      console.log(`📂 Assessing ${targetPaths.length} directories (${repoInfo.additionalPaths.length} additional)`);
    } else {
      console.log(`📂 Assessing ${targetPaths.length} default directories`);
    }

    // Root directory files to always include
    const rootFiles = ['package.json', 'tsconfig.json', 'eslint.config.js', 'next.config.js', 'vite.config.ts', 'README.md'];

    /**
     * Check if a file is a source code file we want to analyze
     */
    const isSourceFile = (filename: string, dirPath: string): boolean => {
      // Always include root config files
      if (dirPath === '' && rootFiles.includes(filename)) return true;
      
      // Include source code files
      const ext = filename.split('.').pop()?.toLowerCase();
      return ['.js', '.ts', '.jsx', '.tsx', '.vue'].includes(`.${ext}`);
    };

    /**
     * Explore a specific directory and collect files
     */
    const exploreDirectory = async (dirPath: string): Promise<void> => {
      try {
        if (!githubTool.execute) {
          console.warn(`⚠️ GitHub tool execute method not available for ${dirPath}`);
          return;
        }

        console.log(`📁 Exploring: ${dirPath || 'root'}`);

        const response = await githubTool.execute({
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          path: dirPath,
        }, { toolCallId: `github-explore-${dirPath || 'root'}`, messages: [] });

        if (!response.success) {
          console.log(`⚠️ Directory not found: ${dirPath}`);
          return;
        }

        if (response.type === 'directory') {
          const directory = response.directory;
          console.log(`📂 Found ${directory.contents.length} items in ${dirPath || 'root'}`);

          // Filter for source files
          const sourceFiles = directory.contents.filter((item: any) => 
            item.type === 'file' && isSourceFile(item.name, dirPath)
          );

          console.log(`📄 Found ${sourceFiles.length} source files in ${dirPath || 'root'}`);

          // Fetch content for each source file
          for (const file of sourceFiles) {
            if (files.length >= FILE_LIMIT) {
              console.log(`🛑 Reached file limit (${files.length} files)`);
              break;
            }

            try {
              if (!githubTool.execute) {
                console.warn(`⚠️ GitHub tool execute method not available for ${file.path}`);
                continue;
              }

              const fileResponse = await githubTool.execute({
                owner: repoInfo.owner,
                repo: repoInfo.repo,
                path: file.path,
              }, { toolCallId: `github-file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`, messages: [] });

              if (fileResponse.success && fileResponse.type === 'file') {
                const content = fileResponse.file.content || '';
                files.push({
                  path: file.path,
                  content: content,
                  size: file.size,
                  type: 'file',
                });
                console.log(`📄 Fetched: ${file.path} (${content.split('\n').length} lines)`);
              }
            } catch (error) {
              console.warn(`⚠️ Failed to fetch ${file.path}:`, error);
            }
          }

        } else if (response.type === 'file' && isSourceFile(response.file.name || '', dirPath)) {
          // Single file case
          const content = response.file.content || '';
          files.push({
            path: response.file.path,
            content: content,
            size: response.file.size,
            type: 'file',
          });
          console.log(`📄 Fetched: ${response.file.path} (${content.split('\n').length} lines)`);
        }

      } catch (error) {
        console.warn(`⚠️ Failed to explore ${dirPath}:`, error);
      }
    };

    // Explore each target directory
    for (const dirPath of targetPaths) {
      if (files.length >= FILE_LIMIT) {
        console.log(`🛑 Reached file limit (${files.length} files), stopping exploration`);
        break;
      }

      await exploreDirectory(dirPath);
    }

    console.log(`✅ Exploration completed: ${files.length} files from ${targetPaths.length} directories`);
    console.log(`📂 Assessed directories: ${targetPaths.join(', ')}`);
    
    // Dynamic file categorization based on paths
    const fileDistribution: Record<string, number> = {};
    for (const file of files) {
      if (!file.path.includes('/')) {
        fileDistribution['root'] = (fileDistribution['root'] || 0) + 1;
      } else {
        const pathParts = file.path.split('/');
        const topDir = pathParts[0];
        if (topDir) {
          const category = file.path.includes('/__tests__/') || file.path.includes('/test/') ? 
            `${topDir}/tests` : topDir;
          fileDistribution[category] = (fileDistribution[category] || 0) + 1;
        }
      }
    }
    
    console.log(`📊 Files by directory:`, fileDistribution);

    return files;
  }

  /**
   * Perform specialized parallel analysis with Claude and Gemini
   */
  private async performParallelAnalysis(
    codeData: { repository: string; files: any[]; totalLines: number },
    context: OrchestratorContext
  ): Promise<{ claude: ParallelAIResult; gemini: ParallelAIResult }> {
    
    // Prepare code summary for analysis
    const codeContext = this.prepareCodeContext(codeData);

    // Define specialized analysis prompts based on reference implementation
    const claudePrompt = `
You are a Security & Architecture Expert analyzing the ${codeData.repository} repository.

${codeContext}

**CRITICAL REQUIREMENT: Provide CONCRETE code examples and SPECIFIC fixes for every finding.**

Analyze the repository with focus on:

🔒 **SECURITY ANALYSIS** (with exact code fixes):
- Input validation vulnerabilities → Show sanitization code
- Authentication/authorization flaws → Show secure implementations  
- Sensitive data handling → Show proper encryption/clearing code
- Dependency security → Show specific update commands
- XSS/CSRF/Injection vulnerabilities → Show prevention code

🏗️ **ARCHITECTURE & CODE QUALITY** (with refactoring examples):
- Design patterns and architectural decisions → Show better patterns
- Code organization and maintainability → Show restructuring examples
- Error handling and logging → Show proper implementations
- Code smells and anti-patterns → Show refactored versions

**OUTPUT FORMAT:**
For each issue, provide:
1. **File & Line Numbers**: Exact location (e.g., "src/components/Button.tsx:42-45")
2. **Current Code**: Exact problematic code snippet
3. **Issue**: Clear explanation of the problem
4. **Fix**: Exact replacement code with implementation details
5. **Impact**: Security/performance/maintainability benefits

**EXAMPLE FORMAT:**

📁 src/components/UserInput.tsx:15-20
❌ VULNERABLE CODE:
\`\`\`javascript
const handleInput = (input) => {
  database.query("SELECT * FROM users WHERE name = '" + input + "'");
}
\`\`\`

🔧 SECURE FIX:
(wrap in language-specific markdown codeblock:)
const handleInput = (input) => {
  // Use parameterized queries to prevent SQL injection
  const sanitizedInput = validator.escape(input);
  database.query("SELECT * FROM users WHERE name = ?", [sanitizedInput]);
}


💡 IMPACT: Prevents SQL injection attacks, improves data validation

Focus on actionable, copy-paste ready solutions with clear security and architectural improvements.`;

    const geminiPrompt = `
You are a Performance & Quality Expert analyzing the ${codeData.repository} repository.

${codeContext}

**CRITICAL REQUIREMENT: Provide CONCRETE code examples and MEASURABLE improvements for every finding.**

Analyze the repository with focus on:

⚡ **PERFORMANCE OPTIMIZATION** (with specific implementations):
- React performance issues → Show memoization implementations
- Bundle optimization → Show specific import improvements
- Database query optimization → Show efficient query patterns
- Memory leaks → Show cleanup implementations
- Rendering optimization → Show lazy loading/virtualization code

📋 **CODE QUALITY & TESTING** (with example implementations):
- Code duplication → Show DRY refactoring examples
- Type safety improvements → Show TypeScript enhancements
- Test coverage gaps → Show actual test implementations
- Documentation quality → Show JSDoc/README improvements
- Build process optimization → Show configuration improvements

**OUTPUT FORMAT:**
For each optimization, provide:
1. **File & Line Numbers**: Exact location with context
2. **Current Implementation**: Show existing code
3. **Performance Issue**: Quantify the problem (bundle size, render time, etc.)
4. **Optimized Implementation**: Show improved code with explanations
5. **Measurable Impact**: Specific performance gains (% improvement, bundle reduction, etc.)

**EXAMPLE FORMAT:**

📁 src/components/ProductList.tsx:25-35
⚠️ PERFORMANCE ISSUE:
(wrap in language-specific markdown codeblock:)
const ProductList = ({ products, onSelect }) => {
  return products.map(product => (
    <ProductCard 
      key={product.id} 
      product={product} 
      onSelect={() => onSelect(product)}
    />
  ));
};

🚀 OPTIMIZED IMPLEMENTATION:
(wrap in language-specific markdown codeblock:)
const ProductList = React.memo(({ products, onSelect }) => {
  const handleSelect = useCallback((product) => {
    onSelect(product);
  }, [onSelect]);

  return products.map(product => (
    <ProductCard 
      key={product.id} 
      product={product} 
      onSelect={handleSelect}
    />
  ));
});

📈 MEASURABLE IMPACT: Reduces re-renders by ~60%, improves list performance for 1000+ items

Focus on implementations that provide measurable performance improvements and code quality enhancements.`;

    console.log('🤖 Running specialized parallel analysis with Claude (Security/Architecture) and Gemini (Performance/Quality)');

    try {
      // Execute both analyses in parallel with different specialized prompts
      const claudePromise = this.runInParallel(claudePrompt, ['claude-sonnet-4-20250514'], {
        temperature: 0.2,
        maxTokens: 4000,
        timeoutMs: 150000,
      });

      const geminiPromise = this.runInParallel(geminiPrompt, ['gemini-1.5-pro'], {
        temperature: 0.2,
        maxTokens: 4000,
        timeoutMs: 150000,
      });

      // Wait for both analyses to complete
      const [claudeResults, geminiResults] = await Promise.all([claudePromise, geminiPromise]);

      // Extract individual results
      const claudeResult = claudeResults[0] || { modelId: 'claude-sonnet-4-20250514', provider: 'anthropic', success: false, error: 'Analysis failed', duration: 0 };
      const geminiResult = geminiResults[0] || { modelId: 'gemini-1.5-pro', provider: 'google', success: false, error: 'Analysis failed', duration: 0 };

      if (!claudeResult?.success && !geminiResult?.success) {
        throw new Error('Both Claude and Gemini analyses failed');
      }

      console.log('📊 Specialized parallel analysis results:', {
        claudeSuccess: claudeResult?.success || false,
        geminiSuccess: geminiResult?.success || false,
        analysisTypes: 'Claude: Security/Architecture, Gemini: Performance/Quality',
      });

      return {
        claude: claudeResult,
        gemini: geminiResult,
      };

    } catch (error) {
      console.error('❌ Specialized parallel analysis failed:', error);
      throw new Error(`Specialized parallel analysis failed: ${error instanceof Error ? error.message : String(error)}`);
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
${Array.from(new Set(codeData.files.map(f => f.path.split('.').pop()))).join(', ')}
`;
  }

  /**
   * Synthesize findings using GPT-4o
   */
  private async synthesizeAnalysisFindings(
    analysisResults: { claude: ParallelAIResult; gemini: ParallelAIResult },
    codeData: { repository: string; files: any[]; totalLines: number }
  ): Promise<{ executiveSummary: string; detailedFindings: string; recommendations: string }> {
    
    console.log('🧩 Synthesizing findings with GPT-4o');

    // Prepare enhanced synthesis context
    const synthesisPrompt = `
Synthesize the following specialized code analysis results for ${codeData.repository} into a comprehensive, actionable assessment:

## Claude Analysis (Security & Architecture Expert)
${analysisResults.claude.success ? analysisResults.claude.result : 'Analysis failed: ' + (analysisResults.claude.error || 'Unknown error')}

## Gemini Analysis (Performance & Quality Expert)  
${analysisResults.gemini.success ? analysisResults.gemini.result : 'Analysis failed: ' + (analysisResults.gemini.error || 'Unknown error')}

## Repository Context
- **Repository:** ${codeData.repository}
- **Files Analyzed:** ${codeData.files.length}
- **Total Lines:** ${codeData.totalLines}
- **Analysis Status:** Claude: ${analysisResults.claude.success ? 'Success' : 'Failed'}, Gemini: ${analysisResults.gemini.success ? 'Success' : 'Failed'}

**SYNTHESIS REQUIREMENTS:**

1. **Executive Summary** (2-3 paragraphs)
   - Overall grade/assessment of the codebase
   - Key strengths and critical areas for improvement
   - Business impact and risk assessment with specific examples
   - Security and performance implications

2. **Detailed Findings** (organized by category)
   - **Security Issues**: Preserve ALL concrete examples from Claude's analysis with file paths and fixes
   - **Performance Issues**: Preserve ALL concrete examples from Gemini's analysis with measurable impacts
   - **Code Quality**: Integrate architectural and quality insights from both analyses
   - **Testing & Documentation**: Coverage gaps and improvement recommendations
   - Prioritize findings by severity and implementation effort

3. **Actionable Recommendations** (prioritized implementation roadmap)
   - **Immediate Actions (Quick Wins)**: Copy-paste ready fixes with specific code examples
   - **Medium-term Improvements**: Architectural changes with implementation guidance
   - **Long-term Strategic Changes**: Technology stack and process improvements
   - **Implementation Guidance**: Step-by-step instructions for each recommendation

**CRITICAL REQUIREMENTS:**
- Preserve ALL concrete code examples, file paths, and specific fixes from both analyses
- Maintain the actionable, copy-paste ready nature of all recommendations
- Include measurable impact estimates where provided
- Resolve any conflicts between analyses while preserving technical details
- Format as structured markdown with clear section headers
- **ESSENTIAL: Use proper markdown code blocks for ALL code examples**

**MISSING CRITICAL ANALYSIS AREAS:**
If either analysis failed, note what critical areas couldn't be assessed and recommend manual review for:
- Component implementation quality (if React/Vue project)
- Test coverage and quality (if test files missing)
- Security vulnerability patterns (if security analysis failed)
- Performance optimization opportunities (if performance analysis failed)

Format the response as comprehensive, structured markdown optimized for developer implementation.`;

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
    const executiveSummaryMatch = content.match(/(?:^|\n)#+\s*Executive Summary.*?\n(.*?)(?=\n#+|\n\*\*|$)/i);
    const detailedFindingsMatch = content.match(/(?:^|\n)#+\s*Detailed Findings.*?\n(.*?)(?=\n#+|\n\*\*|$)/i);
    const recommendationsMatch = content.match(/(?:^|\n)#+\s*(?:Actionable )?Recommendations.*?\n(.*?)(?=\n#+|$)/i);

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
- File Types: ${Array.from(new Set(codeData.files.map(f => f.path.split('.').pop()))).join(', ')}`;

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