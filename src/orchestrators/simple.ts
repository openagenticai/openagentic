import { Orchestrator } from '../core/orchestrator';
import type { AIModel, Tool, OrchestratorConfig } from '../types';

export class SimpleOrchestrator extends Orchestrator {
  constructor(model: AIModel, tools: Tool[] = [], systemPrompt?: string) {
    const config: OrchestratorConfig = {
      model,
      tools,
      systemPrompt,
      maxIterations: 5,
      streaming: false,
      debug: false,
    };
    
    super(config);
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

    return new SimpleOrchestrator(
      model,
      options.tools || [],
      options.systemPrompt
    );
  }
}