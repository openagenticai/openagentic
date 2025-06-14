import { Orchestrator } from '../core/orchestrator';
import type { AIModel, Tool, OrchestratorConfig, Message } from '../types';

export class ConversationalOrchestrator extends Orchestrator {
  private conversationHistory: Message[] = [];

  constructor(model: AIModel, tools: Tool[] = [], systemPrompt?: string) {
    const config: OrchestratorConfig = {
      model,
      tools,
      systemPrompt: systemPrompt || 'You are a helpful assistant that can use tools to help users. Maintain context from previous messages in this conversation.',
      maxIterations: 10,
      streaming: false,
      debug: false,
    };
    
    super(config);
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

  public getConversationHistory(): Message[] {
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
  }): ConversationalOrchestrator {
    const model: AIModel = {
      provider: options.provider,
      model: options.model,
      temperature: 0.7,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      project: options.project,
      location: options.location,
    };

    return new ConversationalOrchestrator(
      model,
      options.tools || [],
      options.systemPrompt
    );
  }
}