// Core exports
export { Orchestrator } from './core/orchestrator';
export type { StreamChunk } from './core/orchestrator';

// Tools
export * from './tools';

// Providers
export * from './providers';

// Types
export * from './types';

// Utils
export * from './utils';

// Errors
export * from './core/errors';

// Simplified factory functions
export function createOrchestrator(options: {
  model: string;
  tools?: any[];
  systemPrompt?: string;
  streaming?: boolean;
  maxIterations?: number;
  customLogic?: (input: string, context: any) => Promise<any>;
}) {
  const { Orchestrator } = require('./core/orchestrator');
  return new Orchestrator(options);
}

// Convenience factories for common patterns
export function createSimpleAgent(options: {
  model: string;
  tools?: any[];
  systemPrompt?: string;
}) {
  const { Orchestrator } = require('./core/orchestrator');
  return new Orchestrator({
    model: options.model,
    tools: options.tools,
    systemPrompt: options.systemPrompt,
    maxIterations: 5,
  });
}

export function createConversationalAgent(options: {
  model: string;
  tools?: any[];
  systemPrompt?: string;
}) {
  const { Orchestrator } = require('./core/orchestrator');
  return new Orchestrator({
    model: options.model,
    tools: options.tools,
    systemPrompt: options.systemPrompt || 'You are a helpful assistant that can use tools to help users. Maintain context from previous messages in this conversation.',
    maxIterations: 10,
  });
}

export function createStreamingAgent(options: {
  model: string;
  tools?: any[];
  systemPrompt?: string;
}) {
  const { Orchestrator } = require('./core/orchestrator');
  return new Orchestrator({
    model: options.model,
    tools: options.tools,
    systemPrompt: options.systemPrompt,
    streaming: true,
    maxIterations: 10,
  });
}

// Multi-model orchestration helper
export function createMultiModelAgent(models: string[], tools?: any[]) {
  const { Orchestrator } = require('./core/orchestrator');
  
  return {
    async executeWithAllModels(input: string) {
      const orchestrators = models.map(model => new Orchestrator({
        model,
        tools,
        maxIterations: 5,
      }));

      const results = await Promise.all(
        orchestrators.map(async (orchestrator, index) => {
          const result = await orchestrator.execute(input);
          return {
            model: models[index],
            result: result.result,
            success: result.success,
            error: result.error,
          };
        })
      );

      const successfulResults = results.filter(r => r.success);
      const consensus = successfulResults.length > 0 
        ? `Consensus from ${successfulResults.length} models: ${successfulResults[0].result}`
        : undefined;

      return { results, consensus };
    },

    async executeWithRefinement(input: string) {
      if (models.length < 2) {
        throw new Error('Need at least 2 models for refinement');
      }

      const firstOrchestrator = new Orchestrator({ model: models[0], tools, maxIterations: 5 });
      const secondOrchestrator = new Orchestrator({ model: models[1], tools, maxIterations: 5 });

      const initialResult = await firstOrchestrator.execute(input);
      
      if (!initialResult.success) {
        return initialResult;
      }

      const refinementPrompt = `Please review and improve the following response to "${input}":

${initialResult.result}

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

// Pipeline orchestration helper
export function createPipeline() {
  const steps: Array<{
    orchestrator: any;
    transform?: (input: string, previousResult?: any) => string;
  }> = [];

  return {
    addStep(model: string, transform?: (input: string, previousResult?: any) => string, tools?: any[]) {
      const { Orchestrator } = require('./core/orchestrator');
      const orchestrator = new Orchestrator({ model, tools, maxIterations: 5 });
      steps.push({ orchestrator, transform });
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