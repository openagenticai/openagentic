import { Orchestrator } from '../core/orchestrator';
import type { AIModel, Tool } from '../types';

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
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      project: options.project,
      location: options.location,
    };

    return new TaskOrchestrator(
      model,
      options.tools || [],
      options.steps || [],
      options.systemPrompt,
      options.streaming || false
    );
  }
}