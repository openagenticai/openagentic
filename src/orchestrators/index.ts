import { Orchestrator } from '../core/orchestrator';
import type { AIModel, Tool } from '../types';

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
    super(
      model,
      tools,
      options.systemPrompt,
      options.streaming || false
    );
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
    };
    
    // Only add optional properties if they are defined
    if (options.apiKey !== undefined) model.apiKey = options.apiKey;
    if (options.baseURL !== undefined) model.baseURL = options.baseURL;
    if (options.project !== undefined) model.project = options.project;
    if (options.location !== undefined) model.location = options.location;

    return new SimpleOrchestrator(model, options.tools || [], {
      systemPrompt: options.systemPrompt,
      streaming: options.streaming,
      maxIterations: options.maxIterations,
    });
  }
}

// Conversational orchestrator with conversation history
export class ConversationalOrchestrator extends Orchestrator {
  private conversationHistory: any[] = [];

  constructor(
    model: AIModel,
    tools: Tool[] = [],
    systemPrompt?: string,
    streaming = false
  ) {
    super(
      model,
      tools,
      systemPrompt || 'You are a helpful assistant that can use tools to help users. Maintain context from previous messages in this conversation.',
      streaming
    );
  }

  public async continueConversation(userMessage: string): Promise<any> {
    // Add user message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Execute with current conversation context
    const result = await this.execute(userMessage);

    // Add assistant response to conversation history
    if (result.success && result.result) {
      this.conversationHistory.push({
        role: 'assistant',
        content: result.result,
      });
    }

    return result;
  }

  public getConversationHistory(): any[] {
    return [...this.conversationHistory];
  }

  public clearConversation(): void {
    this.conversationHistory = [];
    this.reset();
  }

  public static create(options: {
    provider: 'openai' | 'anthropic' | 'google' | 'google-vertex' | 'perplexity' | 'xai';
    model: string;
    apiKey?: string;
    baseURL?: string;
    project?: string;
    location?: string;
    tools?: Tool[];
    systemPrompt?: string;
    streaming?: boolean;
  }): ConversationalOrchestrator {
    const model: AIModel = {
      provider: options.provider,
      model: options.model,
      temperature: 0.7,
    };
    
    if (options.apiKey !== undefined) model.apiKey = options.apiKey;
    if (options.baseURL !== undefined) model.baseURL = options.baseURL;
    if (options.project !== undefined) model.project = options.project;
    if (options.location !== undefined) model.location = options.location;

    return new ConversationalOrchestrator(
      model,
      options.tools || [],
      options.systemPrompt,
      options.streaming || false
    );
  }
}

// Task orchestrator with step-by-step execution
export interface TaskStep {
  name: string;
  description: string;
  tools?: string[];
  maxIterations?: number;
}

export class TaskOrchestrator extends Orchestrator {
  private steps: TaskStep[];
  private currentStep = 0;
  private stepResults: any[] = [];

  constructor(
    model: AIModel,
    tools: Tool[] = [],
    steps: TaskStep[] = [],
    systemPrompt?: string,
    streaming = false
  ) {
    super(
      model,
      tools,
      systemPrompt || 'You are a task-oriented assistant. Complete each task step systematically.',
      streaming
    );
    this.steps = steps;
  }

  public async executeTask(taskDescription: string): Promise<any> {
    const fullPrompt = this.buildTaskPrompt(taskDescription);
    const result = await this.execute(fullPrompt);
    
    if (result.success) {
      this.stepResults.push(result.result);
    }
    
    return {
      ...result,
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      stepResults: [...this.stepResults],
    };
  }

  public async executeNextStep(): Promise<any> {
    if (this.currentStep >= this.steps.length) {
      return {
        success: false,
        error: 'All steps completed',
        currentStep: this.currentStep,
        totalSteps: this.steps.length,
        stepResults: [...this.stepResults],
      };
    }

    const step = this.steps[this.currentStep];
    if (!step) {
      return {
        success: false,
        error: 'Step not found',
        currentStep: this.currentStep,
        totalSteps: this.steps.length,
        stepResults: [...this.stepResults],
      };
    }

    const stepPrompt = this.buildStepPrompt(step);
    const result = await this.execute(stepPrompt);
    
    if (result.success) {
      this.stepResults.push(result.result);
      this.currentStep++;
    }
    
    return {
      ...result,
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      stepResults: [...this.stepResults],
      completedStep: step,
    };
  }

  public getProgress(): {
    currentStep: number;
    totalSteps: number;
    completed: boolean;
    stepResults: any[];
  } {
    return {
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      completed: this.currentStep >= this.steps.length,
      stepResults: [...this.stepResults],
    };
  }

  private buildTaskPrompt(taskDescription: string): string {
    let prompt = `Task: ${taskDescription}\n\n`;
    
    if (this.steps.length > 0) {
      prompt += 'Please complete this task following these steps:\n';
      this.steps.forEach((step, index) => {
        prompt += `${index + 1}. ${step.name}: ${step.description}\n`;
      });
      prompt += '\n';
    }
    
    if (this.stepResults.length > 0) {
      prompt += 'Previous step results:\n';
      this.stepResults.forEach((result, index) => {
        prompt += `Step ${index + 1}: ${result}\n`;
      });
      prompt += '\n';
    }
    
    return prompt;
  }

  private buildStepPrompt(step: TaskStep): string {
    let prompt = `Current Step: ${step.name}\n`;
    prompt += `Description: ${step.description}\n\n`;
    
    if (step.tools && step.tools.length > 0) {
      prompt += `Recommended tools for this step: ${step.tools.join(', ')}\n\n`;
    }
    
    if (this.stepResults.length > 0) {
      prompt += 'Previous step results for context:\n';
      this.stepResults.forEach((result, index) => {
        prompt += `Step ${index + 1}: ${result}\n`;
      });
      prompt += '\n';
    }
    
    prompt += 'Please complete this step.';
    return prompt;
  }

  public static create(options: {
    provider: 'openai' | 'anthropic' | 'google' | 'google-vertex' | 'perplexity' | 'xai';
    model: string;
    apiKey?: string;
    baseURL?: string;
    project?: string;
    location?: string;
    tools?: Tool[];
    steps?: TaskStep[];
    systemPrompt?: string;
    streaming?: boolean;
  }): TaskOrchestrator {
    const model: AIModel = {
      provider: options.provider,
      model: options.model,
      temperature: 0.7,
    };
    
    if (options.apiKey !== undefined) model.apiKey = options.apiKey;
    if (options.baseURL !== undefined) model.baseURL = options.baseURL;
    if (options.project !== undefined) model.project = options.project;
    if (options.location !== undefined) model.location = options.location;

    return new TaskOrchestrator(
      model,
      options.tools || [],
      options.steps || [],
      options.systemPrompt,
      options.streaming || false
    );
  }
}

// Example of custom orchestration logic - multi-model orchestrator
export class MultiModelOrchestrator {
  private orchestrators: Orchestrator[] = [];

  constructor(models: AIModel[], tools: Tool[] = []) {
    this.orchestrators = models.map(model => new Orchestrator(
      model,
      tools,
      undefined,
      false
    ));
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