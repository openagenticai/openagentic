import type { OrchestratorContext, OpenAgenticTool, AIModel } from '../types';
import { CustomLogicOrchestratorClass } from './custom-logic';
import { ProviderManager } from '../providers/manager';
import { generateText } from 'ai';
import { uploadHtmlToS3, generateHtmlFileName } from '../utils/s3';

/**
 * Result from parallel AI execution
 */
export interface ParallelAIResult {
  modelId: string;
  provider: string;
  success: boolean;
  result?: string;
  error?: string;
  duration: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Result from tool chain execution
 */
export interface ToolChainResult {
  step: number;
  toolId: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

/**
 * Analysis aggregation result
 */
export interface AnalysisAggregation {
  primaryAnalysis: string;
  supportingAnalyses: string[];
  synthesis: string;
  confidence: number;
  sources: string[];
}

/**
 * Advanced helper class for multi-AI orchestrators
 * Provides sophisticated patterns for complex AI workflows
 */
export abstract class MultiAIOrchestrator extends CustomLogicOrchestratorClass {
  
  constructor(id: string, name: string, description: string) {
    super(id, name, description);
  }

  // =============================================================================
  // PARALLEL AI EXECUTION METHODS
  // =============================================================================

  /**
   * Execute multiple AI models in parallel with the same prompt
   * @param prompt - The prompt to send to all models
   * @param models - Array of model identifiers or configurations
   * @param options - Execution options
   * @returns Array of results from all models
   */
  protected async runInParallel(
    prompt: string,
    models: (string | AIModel)[],
    options: {
      temperature?: number;
      maxTokens?: number;
      timeoutMs?: number;
      failFast?: boolean; // If true, throws on first failure
      retryCount?: number;
    } = {}
  ): Promise<ParallelAIResult[]> {
    console.log(`🚀 Running ${models.length} AI models in parallel`, {
      models: models.map(m => typeof m === 'string' ? m : `${m.provider}/${m.model}`),
      promptLength: prompt.length,
      options,
    });

    const {
      temperature = 0.7,
      maxTokens = 2000,
      timeoutMs = 60000,
      failFast = false,
      retryCount = 0,
    } = options;

    const executeWithTimeout = async (modelConfig: string | AIModel, index: number): Promise<ParallelAIResult> => {
      const startTime = Date.now();
      let modelId: string = 'unknown';
      let provider: string = 'unknown';

      try {
        // Create model configuration
        const model = ProviderManager.createModel(modelConfig);
        modelId = model.model;
        provider = model.provider;

        console.log(`🤖 [${index + 1}/${models.length}] Starting: ${provider}/${modelId}`);

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
        });

        // Create AI execution promise
        const executionPromise = this.executeWithModel(prompt, model, {
          temperature,
          maxTokens,
        });

        // Race between execution and timeout
        const result = await Promise.race([executionPromise, timeoutPromise]);
        const duration = Date.now() - startTime;

        console.log(`✅ [${index + 1}/${models.length}] Completed: ${provider}/${modelId} (${duration}ms)`);

        return {
          modelId,
          provider,
          success: true,
          result: result.text,
          duration,
          usage: result.usage,
        };

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        console.error(`❌ [${index + 1}/${models.length}] Failed: ${provider}/${modelId} (${duration}ms) - ${errorMessage}`);

        // Retry logic
        if (retryCount > 0) {
          console.log(`🔄 Retrying ${provider}/${modelId} (${retryCount} attempts remaining)`);
          const retryResults = await this.runInParallel(prompt, [modelConfig], {
            ...options,
            retryCount: retryCount - 1,
          });
          return retryResults[0] || {
            modelId,
            provider,
            success: false,
            error: 'Retry failed - no results returned',
            duration: Date.now() - startTime,
          };
        }

        const result: ParallelAIResult = {
          modelId,
          provider,
          success: false,
          error: errorMessage,
          duration,
        };

        if (failFast) {
          throw error;
        }

        return result;
      }
    };

    try {
      // Execute all models in parallel
      const results = await Promise.all(
        models.map((model, index) => executeWithTimeout(model, index))
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      console.log(`🎯 Parallel execution completed: ${successful} successful, ${failed} failed`, {
        totalDuration: Math.max(...results.map(r => r.duration)),
        averageDuration: Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length),
        successRate: `${Math.round((successful / results.length) * 100)}%`,
      });

      return results;

    } catch (error) {
      console.error(`❌ Parallel execution failed completely:`, {
        error: error instanceof Error ? error.message : String(error),
        modelsAttempted: models.length,
      });
      throw error;
    }
  }

  /**
   * Consolidate results from parallel AI execution
   * @param results - Array of ParallelAIResult
   * @param strategy - Consolidation strategy
   * @returns Consolidated result
   */
  protected override consolidateResults(
    results: ParallelAIResult[],
    strategy: 'best' | 'consensus' | 'weighted' | 'all' = 'best'
  ): string {
    console.log(`📊 Consolidating ${results.length} parallel results using '${strategy}' strategy`);

    const successfulResults = results.filter(r => r.success && r.result);
    
    if (successfulResults.length === 0) {
      throw new Error('No successful results to consolidate');
    }

    switch (strategy) {
      case 'best':
        // Return the result from the fastest successful model
        const fastest = successfulResults.reduce((prev, current) => 
          prev.duration < current.duration ? prev : current
        );
        console.log(`🏆 Selected best result from ${fastest.provider}/${fastest.modelId} (${fastest.duration}ms)`);
        return fastest.result!;

      case 'consensus':
        // Simple consensus: return the most common result
        const resultCounts = new Map<string, number>();
        successfulResults.forEach(r => {
          const result = r.result!;
          resultCounts.set(result, (resultCounts.get(result) || 0) + 1);
        });
        
        const consensusEntry = Array.from(resultCounts.entries())
          .sort(([,a], [,b]) => b - a)[0];
        
        if (!consensusEntry) {
          throw new Error('No consensus result found');
        }
        
        const [consensusResult] = consensusEntry;
        
        console.log(`🤝 Consensus result selected (${resultCounts.get(consensusResult)} votes)`);
        return consensusResult;

      case 'weighted':
        // Weight by model performance (inverse of duration)
        const weightedResults = successfulResults.map(r => ({
          result: r.result!,
          weight: 1 / (r.duration / 1000), // Inverse of duration in seconds
          model: `${r.provider}/${r.modelId}`,
        }));

        const totalWeight = weightedResults.reduce((sum, w) => sum + w.weight, 0);
        const bestWeighted = weightedResults.reduce((prev, current) => 
          prev.weight > current.weight ? prev : current
        );

        console.log(`⚖️ Weighted result selected from ${bestWeighted.model} (weight: ${bestWeighted.weight.toFixed(2)})`);
        return bestWeighted.result;

      case 'all':
        // Return all results with attribution
        const allResults = successfulResults.map((r, index) => 
          `**${r.provider}/${r.modelId}** (${r.duration}ms):\n${r.result}`
        ).join('\n\n---\n\n');
        
        console.log(`📚 All results consolidated (${successfulResults.length} models)`);
        return allResults;

      default:
        throw new Error(`Unknown consolidation strategy: ${strategy}`);
    }
  }

  // =============================================================================
  // MODEL SWITCHING AND EXECUTION UTILITIES
  // =============================================================================

  /**
   * Create a model instance with specific configuration
   * @param modelConfig - Model identifier or full configuration
   * @param overrides - Parameter overrides
   * @returns Configured AIModel
   */
  protected createModelInstance(
    modelConfig: string | AIModel,
    overrides: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    } = {}
  ): AIModel {
    const baseModel = ProviderManager.createModel(modelConfig);
    
    return {
      ...baseModel,
      temperature: overrides.temperature ?? baseModel.temperature,
      maxTokens: overrides.maxTokens ?? baseModel.maxTokens,
      topP: overrides.topP ?? baseModel.topP,
    };
  }

  /**
   * Execute a prompt with a specific model
   * @param prompt - The prompt to execute
   * @param model - Model configuration
   * @param options - Execution options
   * @returns Generation result
   */
  protected async executeWithModel(
    prompt: string,
    model: AIModel,
    options: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    } = {}
  ): Promise<{
    text: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    finishReason?: string;
  }> {
    const finalModel = this.createModelInstance(model, options);
    const provider = await ProviderManager.createProvider(finalModel);

    const result = await generateText({
      model: provider(finalModel.model),
      prompt: prompt.trim(),
      temperature: finalModel.temperature,
      maxTokens: finalModel.maxTokens,
      topP: finalModel.topP,
    });

    return {
      text: result.text || '',
      usage: result.usage ? {
        promptTokens: result.usage.promptTokens || 0,
        completionTokens: result.usage.completionTokens || 0,
        totalTokens: result.usage.totalTokens || 0,
      } : undefined,
      finishReason: result.finishReason,
    };
  }

  // =============================================================================
  // RESULT AGGREGATION PATTERNS
  // =============================================================================

  /**
   * Merge multiple analyses into a comprehensive report
   * @param analyses - Array of analysis results
   * @param prompt - Optional merging prompt
   * @returns Merged analysis
   */
  protected async mergeAnalysis(
    analyses: Array<{
      source: string;
      content: string;
      confidence?: number;
      metadata?: any;
    }>,
    prompt?: string
  ): Promise<AnalysisAggregation> {
    console.log(`🔄 Merging ${analyses.length} analyses`);

    if (analyses.length === 0) {
      throw new Error('No analyses to merge');
    }

    if (analyses.length === 1) {
      const singleAnalysis = analyses[0];
      if (!singleAnalysis) {
        throw new Error('Invalid analysis data');
      }
      return {
        primaryAnalysis: singleAnalysis.content,
        supportingAnalyses: [],
        synthesis: singleAnalysis.content,
        confidence: singleAnalysis.confidence || 0.8,
        sources: [singleAnalysis.source],
      };
    }

    // Sort by confidence if available
    const sortedAnalyses = analyses.sort((a, b) => 
      (b.confidence || 0.5) - (a.confidence || 0.5)
    );

    const primaryAnalysis = sortedAnalyses[0];
    const supportingAnalyses = sortedAnalyses.slice(1);

    if (!primaryAnalysis) {
      throw new Error('No primary analysis found');
    }

    // Create synthesis prompt
    const synthesisPrompt = prompt || `
Synthesize the following analyses into a comprehensive, coherent report:

PRIMARY ANALYSIS (${primaryAnalysis.source}):
${primaryAnalysis.content}

SUPPORTING ANALYSES:
${supportingAnalyses.map((a, i) => `${i + 1}. ${a.source}:\n${a.content}`).join('\n\n')}

Create a synthesis that:
1. Integrates the key insights from all analyses
2. Resolves any conflicts or contradictions
3. Provides a unified perspective
4. Maintains accuracy and depth`;

    try {
      const synthesis = await this.callAIModel(synthesisPrompt, 'gpt-4o');
      
      const result: AnalysisAggregation = {
        primaryAnalysis: primaryAnalysis.content,
        supportingAnalyses: supportingAnalyses.map(a => a.content),
        synthesis,
        confidence: analyses.reduce((sum, a) => sum + (a.confidence || 0.5), 0) / analyses.length,
        sources: analyses.map(a => a.source),
      };

      console.log(`✅ Analysis merge completed`, {
        sourcesCount: result.sources.length,
        synthesisLength: result.synthesis.length,
        averageConfidence: Math.round(result.confidence * 100) + '%',
      });

      return result;

    } catch (error) {
      console.error(`❌ Analysis merge failed:`, error);
      throw error;
    }
  }

  /**
   * Synthesize findings from multiple sources
   * @param findings - Array of findings with metadata
   * @param options - Synthesis options
   * @returns Synthesized findings
   */
  protected async synthesizeFindings(
    findings: Array<{
      title: string;
      content: string;
      source: string;
      importance?: number;
      tags?: string[];
    }>,
    options: {
      maxLength?: number;
      focusAreas?: string[];
      style?: 'technical' | 'executive' | 'detailed';
    } = {}
  ): Promise<string> {
    console.log(`🧩 Synthesizing ${findings.length} findings`, {
      options,
      findingsSources: findings.map(f => f.source),
    });

    const {
      maxLength = 2000,
      focusAreas = [],
      style = 'detailed',
    } = options;

    // Sort by importance if provided
    const sortedFindings = findings.sort((a, b) => 
      (b.importance || 0.5) - (a.importance || 0.5)
    );

    // Filter by focus areas if specified
    const filteredFindings = focusAreas.length > 0 
      ? sortedFindings.filter(f => 
          focusAreas.some(area => 
            f.title.toLowerCase().includes(area.toLowerCase()) ||
            f.content.toLowerCase().includes(area.toLowerCase()) ||
            (f.tags && f.tags.some(tag => tag.toLowerCase().includes(area.toLowerCase())))
          )
        )
      : sortedFindings;

    const synthesisPrompt = `
Synthesize the following findings into a ${style} summary of approximately ${maxLength} characters:

${focusAreas.length > 0 ? `Focus Areas: ${focusAreas.join(', ')}\n` : ''}

FINDINGS:
${filteredFindings.map((f, i) => `
${i + 1}. **${f.title}** (Source: ${f.source})
${f.content}
${f.tags ? `Tags: ${f.tags.join(', ')}` : ''}
`).join('\n')}

Create a synthesis that:
${style === 'executive' ? '- Focuses on key insights and recommendations for decision-makers' : ''}
${style === 'technical' ? '- Emphasizes technical details and implementation considerations' : ''}
${style === 'detailed' ? '- Provides comprehensive coverage with supporting details' : ''}
- Organizes information logically
- Highlights the most important insights
- Provides actionable conclusions`;

    try {
      const synthesis = await this.callAIModel(synthesisPrompt, 'claude-sonnet-4-20250514');
      
      console.log(`✅ Findings synthesis completed`, {
        originalCount: findings.length,
        filteredCount: filteredFindings.length,
        synthesisLength: synthesis.length,
        style,
      });

      return synthesis;

    } catch (error) {
      console.error(`❌ Findings synthesis failed:`, error);
      throw error;
    }
  }

  // =============================================================================
  // TOOL INTEGRATION HELPERS
  // =============================================================================

  /**
   * Execute a chain of tools sequentially, passing results between them
   * @param toolChain - Array of tool configurations
   * @param context - Orchestrator context
   * @returns Array of tool chain results
   */
  protected async executeToolChain(
    toolChain: Array<{
      tool: OpenAgenticTool;
      parameters: any | ((previousResults: ToolChainResult[]) => any);
      onSuccess?: (result: any, step: number) => void;
      onError?: (error: Error, step: number) => boolean; // Return true to continue chain
    }>,
    context: OrchestratorContext
  ): Promise<ToolChainResult[]> {
    console.log(`⛓️ Executing tool chain with ${toolChain.length} steps`);

    const results: ToolChainResult[] = [];

    for (let i = 0; i < toolChain.length; i++) {
      const stepConfig = toolChain[i];
      if (!stepConfig) {
        throw new Error(`Invalid tool chain configuration at step ${i + 1}`);
      }
      
      const { tool, parameters, onSuccess, onError } = stepConfig;
      const startTime = Date.now();

      try {
        console.log(`🔗 [${i + 1}/${toolChain.length}] Executing: ${tool.toolId}`);

        // Resolve parameters (can be a function of previous results)
        const resolvedParameters = typeof parameters === 'function' 
          ? parameters(results) 
          : parameters;

        console.log(`🔗 [${i + 1}/${toolChain.length}] Parameters resolved:`, {
          toolId: tool.toolId,
          parametersType: typeof parameters,
          resolvedParams: this.sanitizeDataForLogging(resolvedParameters),
        });

        // Execute the tool - use executeTool helper from base class
        const result = await this.executeTool(tool, resolvedParameters, context);
        const duration = Date.now() - startTime;

        const stepResult: ToolChainResult = {
          step: i + 1,
          toolId: tool.toolId,
          success: true,
          result,
          duration,
        };

        results.push(stepResult);

        console.log(`✅ [${i + 1}/${toolChain.length}] Completed: ${tool.toolId} (${duration}ms)`);

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result, i + 1);
        }

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error(`❌ [${i + 1}/${toolChain.length}] Failed: ${tool.toolId} (${duration}ms) - ${errorMessage}`);

        const stepResult: ToolChainResult = {
          step: i + 1,
          toolId: tool.toolId,
          success: false,
          error: errorMessage,
          duration,
        };

        results.push(stepResult);

        // Call error callback if provided
        const shouldContinue = onError ? onError(error as Error, i + 1) : false;

        if (!shouldContinue) {
          console.error(`⛓️ Tool chain stopped at step ${i + 1} due to error`);
          break;
        } else {
          console.log(`⛓️ Tool chain continuing despite error at step ${i + 1}`);
        }
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    console.log(`⛓️ Tool chain completed: ${successful} successful, ${failed} failed`, {
      totalSteps: results.length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      successRate: `${Math.round((successful / results.length) * 100)}%`,
    });

    return results;
  }

  /**
   * Upload result to S3 as HTML report
   * @param content - Content to upload
   * @param filename - Filename (without extension)
   * @param metadata - Additional metadata
   * @returns S3 URL
   */
  protected async uploadResult(
    content: string,
    filename: string,
    metadata: {
      title?: string;
      description?: string;
      author?: string;
      tags?: string[];
    } = {}
  ): Promise<string> {
    console.log(`📤 Uploading result to S3: ${filename}`);

    try {
      // Generate unique filename
      const htmlFilename = generateHtmlFileName(filename, 'html');

      // Format content as HTML if it's not already
      const htmlContent = this.formatReport(content, {
        title: metadata.title || filename,
        description: metadata.description,
        author: metadata.author,
        tags: metadata.tags,
      });

      // Upload to S3
      const s3Url = await uploadHtmlToS3(
        htmlContent,
        htmlFilename,
        'text/html',
        metadata.description || `Generated report: ${filename}`
      );

      console.log(`✅ Result uploaded to S3: ${s3Url}`, {
        filename: htmlFilename,
        contentLength: htmlContent.length,
        metadata,
      });

      return s3Url;

    } catch (error) {
      console.error(`❌ S3 upload failed:`, {
        filename,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Format content as a professional HTML report
   * @param content - Report content (supports Markdown)
   * @param options - Formatting options
   * @returns Formatted HTML
   */
  protected formatReport(
    content: string,
    options: {
      title?: string;
      description?: string;
      author?: string;
      tags?: string[];
      style?: 'professional' | 'minimal' | 'detailed';
    } = {}
  ): string {
    const {
      title = 'OpenAgentic Report',
      description = 'Generated analysis report',
      author = 'OpenAgentic MultiAI Orchestrator',
      tags = [],
      style = 'professional',
    } = options;

    // Convert simple markdown-like formatting to HTML
    let htmlContent = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Wrap content in paragraphs
    if (!htmlContent.startsWith('<')) {
      htmlContent = `<p>${htmlContent}</p>`;
    }

    const timestamp = new Date().toISOString();
    const styleClass = `report-${style}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <meta name="author" content="${author}">
    ${tags.length > 0 ? `<meta name="keywords" content="${tags.join(', ')}">` : ''}
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        
        .report-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 40px;
            margin: 20px 0;
        }
        
        .report-header {
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .report-title {
            color: #007bff;
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: 600;
        }
        
        .report-meta {
            color: #666;
            font-size: 0.9em;
            margin: 10px 0;
        }
        
        .report-content {
            margin: 30px 0;
        }
        
        .report-content h1 {
            color: #007bff;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        
        .report-content h2 {
            color: #495057;
            margin-top: 30px;
        }
        
        .report-content h3 {
            color: #6c757d;
        }
        
        .report-content code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        
        .report-content strong {
            color: #007bff;
        }
        
        .report-footer {
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
            margin-top: 40px;
            color: #6c757d;
            font-size: 0.85em;
        }
        
        .tags {
            margin: 15px 0;
        }
        
        .tag {
            display: inline-block;
            background: #e9ecef;
            color: #495057;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            margin: 2px 5px 2px 0;
        }
        
        /* Style variations */
        .report-minimal {
            background: white;
            padding: 20px;
            box-shadow: none;
            border: 1px solid #e9ecef;
        }
        
        .report-minimal .report-title {
            font-size: 2em;
        }
        
        .report-detailed .report-content {
            font-size: 1.1em;
        }
        
        .report-detailed .report-content h1,
        .report-detailed .report-content h2,
        .report-detailed .report-content h3 {
            margin-top: 40px;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .report-container {
                padding: 20px;
            }
            
            .report-title {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="report-container ${styleClass}">
        <header class="report-header">
            <h1 class="report-title">${title}</h1>
            <div class="report-meta">
                <strong>Generated:</strong> ${new Date(timestamp).toLocaleString()}<br>
                <strong>Author:</strong> ${author}<br>
                <strong>Description:</strong> ${description}
            </div>
            ${tags.length > 0 ? `
            <div class="tags">
                ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>` : ''}
        </header>
        
        <main class="report-content">
            ${htmlContent}
        </main>
        
        <footer class="report-footer">
            <p>Generated by OpenAgentic MultiAI Orchestrator • <a href="https://openagentic.org" target="_blank">openagentic.org</a></p>
            <p>Report ID: ${timestamp} • Style: ${style}</p>
        </footer>
    </div>
</body>
</html>`;
  }

  // =============================================================================
  // ERROR HANDLING HELPERS
  // =============================================================================

  /**
   * Handle partial failures in multi-AI operations
   * @param results - Array of results with success/failure status
   * @param options - Recovery options
   * @returns Recovery strategy result
   */
  protected handlePartialFailures<T extends { success: boolean; error?: string }>(
    results: T[],
    options: {
      minimumSuccessRate?: number; // 0.0 to 1.0
      fallbackStrategy?: 'continue' | 'retry' | 'abort';
      maxRetries?: number;
    } = {}
  ): {
    shouldContinue: boolean;
    successfulResults: T[];
    failedResults: T[];
    recommendation: string;
  } {
    const {
      minimumSuccessRate = 0.5,
      fallbackStrategy = 'continue',
      maxRetries = 1,
    } = options;

    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const actualSuccessRate = successfulResults.length / results.length;

    console.log(`🛡️ Handling partial failures`, {
      total: results.length,
      successful: successfulResults.length,
      failed: failedResults.length,
      successRate: `${Math.round(actualSuccessRate * 100)}%`,
      minimumRequired: `${Math.round(minimumSuccessRate * 100)}%`,
      strategy: fallbackStrategy,
    });

    const shouldContinue = actualSuccessRate >= minimumSuccessRate;
    
    let recommendation: string;
    
    if (shouldContinue) {
      recommendation = `Operation can continue. Success rate ${Math.round(actualSuccessRate * 100)}% meets minimum requirement of ${Math.round(minimumSuccessRate * 100)}%.`;
    } else {
      switch (fallbackStrategy) {
        case 'retry':
          recommendation = `Success rate ${Math.round(actualSuccessRate * 100)}% below minimum. Recommend retry with ${maxRetries} attempts.`;
          break;
        case 'abort':
          recommendation = `Success rate ${Math.round(actualSuccessRate * 100)}% below minimum. Recommend aborting operation.`;
          break;
        case 'continue':
        default:
          recommendation = `Success rate ${Math.round(actualSuccessRate * 100)}% below minimum, but continuing with available results.`;
          break;
      }
    }

    return {
      shouldContinue,
      successfulResults,
      failedResults,
      recommendation,
    };
  }

  /**
   * Sanitize sensitive data for logging
   * @param data - Data to sanitize
   * @returns Sanitized data
   */
  private sanitizeDataForLogging(data: any): any {
    if (typeof data === 'string') {
      const sanitized = data.length > 300 ? `${data.substring(0, 300)}...` : data;
      return sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
                    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
                    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
                    .replace(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^\s\]},]+/gi, '[REDACTED]');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      const sensitiveFields = ['password', 'apiKey', 'token', 'secret', 'key', 'auth', 'authorization'];
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      });
      return sanitized;
    }
    
    return data;
  }
}