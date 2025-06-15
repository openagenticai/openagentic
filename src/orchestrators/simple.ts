import { Orchestrator } from '../core/orchestrator';
import type { AIModel, Tool } from '../types';

export class SimpleOrchestrator extends Orchestrator {
  constructor(
    model: AIModel,
    tools: Tool[] = [],
    systemPrompt?: string,
    streaming = false
  ) {
    super(model, tools, systemPrompt, streaming);
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
      options.systemPrompt,
      options.streaming || false
    );
  }
}