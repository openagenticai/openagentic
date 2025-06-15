import { Orchestrator } from '../core/orchestrator';
import type { AIModel, Tool, OrchestratorConfig } from '../types';

// Simple orchestrator that takes tools, model, and streaming options
export class SimpleOrchestrator extends Orchestrator {
  constructor(
    model: AIModel,
    tools: Tool[] = [],
    options: {
      systemPrompt?: string;
      streaming?: boolean;
      maxIterations?: number;
    } = {}
  ) {
    const config: OrchestratorConfig = {
      model,
      tools,
      systemPrompt: options.systemPrompt,
      maxIterations: options.maxIterations || 10,
      streaming: options.streaming || false,
      debug: false,
    };
    
    super(config);
  }

  // Factory method for easy creation
  static create(options: {
    provider: 'openai' | 'anthropic' | 'google' | 'google-vertex' | 'perplexity' | 'xai';
    model: string;
    apiKey?: string;
    baseURL?: string;
    project?: string;
    location?: string;
    tools?: Tool[];
    systemPrompt?: string;
    streaming?: boolean;
    maxIterations?: number;
  }): SimpleOrchestrator {
    const model: AIModel = {
      provider: options.provider,
      model: options.model,
      temperature: 0.7,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      project: options.project,
      location: options.location,
    };

    return new SimpleOrchestrator(model, options.tools || [], {
      systemPrompt: options.systemPrompt,
      streaming: options.streaming,
      maxIterations: options.maxIterations,
    });
  }
}

// Example of custom orchestration logic - multi-model orchestrator
export class MultiModelOrchestrator {
  private orchestrators: Orchestrator[] = [];

  constructor(models: AIModel[], tools: Tool[] = []) {
    this.orchestrators = models.map(model => new Orchestrator({
      model,
      tools,
      maxIterations: 5,
      streaming: false,
      debug: false,
    }));
  }

  // Execute with multiple models and combine results
  async executeWithAllModels(userMessage: string): Promise<{
    results: any[];
    consensus?: string;
  }> {
    const results = await Promise.all(
      this.orchestrators.map(async (orchestrator, index) => {
        const result = await orchestrator.execute(userMessage);
        return {
          modelIndex: index,
          result: result.result,
          success: result.success,
          error: result.error,
        };
      })
    );

    // Simple consensus logic - could be made more sophisticated
    const successfulResults = results.filter(r => r.success);
    const consensus = successfulResults.length > 0 
      ? `Consensus from ${successfulResults.length} models: ${successfulResults[0].result}`
      : undefined;

    return { results, consensus };
  }

  // Execute with the first model, then use the second model to refine
  async executeWithRefinement(userMessage: string): Promise<any> {
    if (this.orchestrators.length < 2) {
      throw new Error('Need at least 2 models for refinement');
    }

    // First model generates initial response
    const initialResult = await this.orchestrators[0].execute(userMessage);
    
    if (!initialResult.success) {
      return initialResult;
    }

    // Second model refines the response
    const refinementPrompt = `Please review and improve the following response to the query "${userMessage}":

${initialResult.result}

Provide an improved, more accurate, and comprehensive response.`;

    const refinedResult = await this.orchestrators[1].execute(refinementPrompt);
    
    return {
      success: true,
      result: refinedResult.result,
      original: initialResult.result,
      refined: refinedResult.result,
      iterations: initialResult.iterations + refinedResult.iterations,
    };
  }
}

// Pipeline orchestrator for sequential processing
export class PipelineOrchestrator {
  private steps: Array<{
    orchestrator: Orchestrator;
    transform?: (input: string, previousResult?: any) => string;
  }> = [];

  addStep(orchestrator: Orchestrator, transform?: (input: string, previousResult?: any) => string): this {
    this.steps.push({ orchestrator, transform });
    return this;
  }

  async execute(initialInput: string): Promise<{
    success: boolean;
    steps: any[];
    finalResult?: any;
    error?: string;
  }> {
    const stepResults: any[] = [];
    let currentInput = initialInput;
    let previousResult: any = null;

    try {
      for (const [index, step] of this.steps.entries()) {
        // Apply transformation if provided
        const input = step.transform 
          ? step.transform(currentInput, previousResult)
          : currentInput;

        const result = await step.orchestrator.execute(input);
        
        stepResults.push({
          stepIndex: index,
          input,
          result: result.result,
          success: result.success,
          error: result.error,
        });

        if (!result.success) {
          return {
            success: false,
            steps: stepResults,
            error: `Pipeline failed at step ${index}: ${result.error}`,
          };
        }

        currentInput = result.result || '';
        previousResult = result;
      }

      return {
        success: true,
        steps: stepResults,
        finalResult: stepResults[stepResults.length - 1]?.result,
      };
    } catch (error) {
      return {
        success: false,
        steps: stepResults,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export { Orchestrator };