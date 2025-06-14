import type { AIModel, Message } from '../types';
import { ProviderError } from './errors';

interface AIResponse {
  content?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIProvider {
  private model: AIModel;

  constructor(model: AIModel) {
    this.model = model;
  }

  public async complete(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    try {
      switch (this.model.provider) {
        case 'openai':
          return await this.completeOpenAI(messages, tools, streaming);
        case 'anthropic':
          return await this.completeAnthropic(messages, tools, streaming);
        case 'google':
          return await this.completeGoogle(messages, tools, streaming);
        case 'google-vertex':
          return await this.completeGoogleVertex(messages, tools, streaming);
        case 'perplexity':
          return await this.completePerplexity(messages, tools, streaming);
        case 'xai':
          return await this.completeXai(messages, tools, streaming);
        case 'custom':
          return await this.completeCustom(messages, tools, streaming);
        default:
          throw new ProviderError(`Unsupported provider: ${this.model.provider}`);
      }
    } catch (error) {
      throw new ProviderError(
        `Failed to complete request with ${this.model.provider}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async completeOpenAI(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    if (typeof globalThis.window !== 'undefined') {
      throw new ProviderError('OpenAI provider not available in browser environment');
    }

    try {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const { generateText } = await import('ai');

      const openai = createOpenAI({
        baseURL: this.model.baseURL,
        apiKey: this.model.apiKey || '',
      });

      const anthropic = createAnthropic({
        apiKey: this.model.apiKey || '',
      });

      const google = createGoogleGenerativeAI({
        apiKey: this.model.apiKey || '',
      });

      const googleVertex = createVertex({
        project: this.model.project || '',
        location: this.model.location || '',
      });

      const perplexity = createPerplexity({
        apiKey: this.model.apiKey || '',
      });

      const xai = createXai({
        apiKey: this.model.apiKey || '',
      });

      const provider = this.model.provider === 'openai' ? openai :
                      this.model.provider === 'anthropic' ? anthropic :
                      this.model.provider === 'google' ? google :
                      this.model.provider === 'google-vertex' ? googleVertex :
                      this.model.provider === 'perplexity' ? perplexity :
                      this.model.provider === 'xai' ? xai : openai;

      const coreMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => {
          if (m.role === 'user') {
            return { role: 'user' as const, content: m.content };
          } else if (m.role === 'assistant') {
            return { role: 'assistant' as const, content: m.content };
          } else if (m.role === 'tool') {
            return { role: 'tool' as const, content: [{ type: 'text' as const, text: m.content }], toolCallId: m.toolCallId || '' };
          }
          return { role: 'user' as const, content: m.content };
        });

      const systemMessage = messages.find(m => m.role === 'system')?.content;

      const result = await generateText({
        model: provider(this.model.model),
        messages: coreMessages,
        system: systemMessage,
        temperature: this.model.temperature,
        maxTokens: this.model.maxTokens,
        topP: this.model.topP,
      });

      return {
        content: result.text,
        usage: result.usage ? {
          prompt_tokens: result.usage.promptTokens,
          completion_tokens: result.usage.completionTokens,
          total_tokens: result.usage.totalTokens,
        } : undefined,
      };
    } catch (error) {
      throw new ProviderError(`AI SDK error: ${error}`);
    }
  }

  private async completeAnthropic(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    return this.completeOpenAI(messages, tools, streaming);
  }

  private async completeGoogle(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    return this.completeOpenAI(messages, tools, streaming);
  }

  private async completeGoogleVertex(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    return this.completeOpenAI(messages, tools, streaming);
  }

  private async completePerplexity(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    return this.completeOpenAI(messages, tools, streaming);
  }

  private async completeXai(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    return this.completeOpenAI(messages, tools, streaming);
  }

  private async completeCustom(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    throw new ProviderError('Custom provider not yet implemented');
  }
}