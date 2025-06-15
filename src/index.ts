// =============================================================================
// MAIN EXPORTS
// =============================================================================

// Core exports - two distinct orchestrator classes
export { Orchestrator } from './orchestrator';
export { StreamingOrchestrator } from './streaming-orchestrator';

// Tools
export * from './tools';

// Provider management
export { ProviderManager } from './providers/manager';

// Types
export * from './types';

// =============================================================================
// SIMPLIFIED FACTORY FUNCTIONS - FIXED NULL HANDLING
// =============================================================================

import { Orchestrator } from './orchestrator';
import { StreamingOrchestrator } from './streaming-orchestrator';
import type { Tool, AIModel } from './types';

export function createAgent(options: {
  model: string | AIModel;
  tools?: Tool[];
  systemPrompt?: string;
  maxIterations?: number;
  customLogic?: (input: string, context: any) => Promise<any>;
}) {
  return new Orchestrator({
    model: options.model,
    tools: options.tools || [], // Fix: Always provide array
    systemPrompt: options.systemPrompt,
    maxIterations: options.maxIterations || 10,
    customLogic: options.customLogic,
  });
}

export function createStreamingAgent(options: {
  model: string | AIModel;
  tools?: Tool[];
  systemPrompt?: string;
  maxIterations?: number;
}) {
  return new StreamingOrchestrator({
    model: options.model,
    tools: options.tools || [], // Fix: Always provide array
    systemPrompt: options.systemPrompt,
    maxIterations: options.maxIterations || 10,
  });
}

// =============================================================================
// ADDITIONAL FACTORY FUNCTIONS
// =============================================================================

export function createSimpleAgent(options: {
  model: string | AIModel;
  tools?: Tool[];
  systemPrompt?: string;
}) {
  return new Orchestrator({
    model: options.model,
    tools: options.tools || [], // Fix: Always provide array
    systemPrompt: options.systemPrompt,
    maxIterations: 5,
  });
}

export function createConversationalAgent(options: {
  model: string | AIModel;
  tools?: Tool[];
  systemPrompt?: string;
}) {
  return new Orchestrator({
    model: options.model,
    tools: options.tools || [], // Fix: Always provide array
    systemPrompt: options.systemPrompt || 'You are a helpful assistant that can use tools to help users. Maintain context from previous messages in this conversation.',
    maxIterations: 10,
  });
}

// Fix createMultiModelAgent
export function createMultiModelAgent(models: (string | AIModel)[], tools?: Tool[]) {
  return {
    async executeWithAllModels(input: string) {
      const orchestrators = models.map(model => new Orchestrator({
        model,
        tools: tools || [], // Fix: Always provide array
        maxIterations: 5,
      }));

      const results = await Promise.all(
        orchestrators.map(async (orchestrator, index) => {
          const result = await orchestrator.execute(input);
          return {
            model: typeof models[index] === 'string' ? models[index] : (models[index] as AIModel).model,
            result: result.result,
            success: result.success,
            error: result.error,
          };
        })
      );

      const successfulResults = results.filter(r => r.success);
      const consensus = successfulResults.length > 0 && successfulResults[0]?.result // Fix: Add null check
        ? `Consensus from ${successfulResults.length} models: ${successfulResults[0].result}`
        : undefined;

      return { results, consensus };
    },

    async executeWithRefinement(input: string) {
      if (models.length < 2) {
        throw new Error('Need at least 2 models for refinement');
      }

      const firstOrchestrator = new Orchestrator({ 
        model: models[0], 
        tools: tools || [], // Fix: Always provide array
        maxIterations: 5 
      });
      const secondOrchestrator = new Orchestrator({ 
        model: models[1], 
        tools: tools || [], // Fix: Always provide array
        maxIterations: 5 
      });

      const initialResult = await firstOrchestrator.execute(input);
      
      if (!initialResult.success) {
        return initialResult;
      }

      const refinementPrompt = `Please review and improve the following response to "${input}":

${initialResult.result || ''} // Fix: Handle undefined

Provide an improved, more accurate, and comprehensive response.`;

      const refinedResult = await secondOrchestrator.execute(refinementPrompt);
      
      return {
        success: true,
        result: refinedResult.result,
        original: initialResult.result,
        refined: refinedResult.result,
        models: [models[0], models[1]],
      };
    }
  };
}

// Fix createPipeline
export function createPipeline() {
  const steps: Array<{
    orchestrator: Orchestrator;
    transform?: (input: string, previousResult?: any) => string;
  }> = [];

  return {
    addStep(model: string | AIModel, transform?: (input: string, previousResult?: any) => string, tools?: Tool[]) {
      const orchestrator = new Orchestrator({ 
        model, 
        tools: tools || [], // Fix: Always provide array
        maxIterations: 5 
      });
      
      // Fix: Conditional spreading
      const step: any = { orchestrator };
      if (transform !== undefined) {
        step.transform = transform;
      }
      
      steps.push(step);
      return this;
    },

    async execute(initialInput: string) {
      const stepResults: any[] = [];
      let currentInput = initialInput;
      let previousResult: any = null;

      try {
        for (const [index, step] of steps.entries()) {
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
  };
}