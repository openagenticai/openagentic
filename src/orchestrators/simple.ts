import { Orchestrator } from '../core/orchestrator';
import { AIProvider } from '../core/ai-provider';
import { CostTracker } from '../core/cost-tracker';
import { ToolRegistry } from '../core/tool-registry';
import type { AIModel, Tool, OrchestratorConfig } from '../types';

export class SimpleOrchestrator extends Orchestrator {
  constructor(
    model: AIModel, 
    tools: Tool[] = [], 
    systemPrompt?: string,
    aiProvider?: AIProvider,
    costTracker?: CostTracker,
    toolRegistry?: ToolRegistry
  ) {
    const config: OrchestratorConfig = {
      model,
      tools,
      systemPrompt,
      maxIterations: 5,
      streaming: false,
      debug: false,
    };
    
    super(
      config,
      aiProvider || new AIProvider(model),
      costTracker || new CostTracker(),
      toolRegistry || new ToolRegistry(tools)
    );
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