import type { AIModel, Message } from '../types';
import { ProviderError } from './errors';
import { providerConfigs } from '../providers';

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
  constructor(private model: AIModel) {}

  public async complete(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    try {
      return await this.completeRequest(messages, tools, streaming);
    } catch (error) {
      throw new ProviderError(
        `Failed to complete request with ${this.model.provider}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async completeRequest(
    messages: Message[],
    tools?: any[],
    streaming = false
  ): Promise<AIResponse> {
    // Check browser environment for Node.js-only providers
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      throw new ProviderError('AI providers not available in browser environment');
    }

    try {
      // Import AI SDK functions
      const { generateText } = await import('ai');
      
      // Create the appropriate provider
      const provider = await this.createProvider();
      
      // Execute with the provider
      return await this.executeWithProvider(provider, messages, tools, streaming, generateText);
    } catch (error) {
      throw new ProviderError(`AI SDK error: ${error}`);
    }
  }

  private async createProvider(): Promise<any> {
    const apiKey = this.model.apiKey || '';
    
    switch (this.model.provider) {
      case 'openai': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        return createOpenAI({
          baseURL: this.model.baseURL,
          apiKey,
        });
      }
      
      case 'anthropic': {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        return createAnthropic({ apiKey });
      }
      
      case 'google': {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        return createGoogleGenerativeAI({ apiKey });
      }
      
      case 'google-vertex': {
        const { createVertex } = await import('@ai-sdk/google-vertex');
        return createVertex({
          project: this.model.project || '',
          location: this.model.location || '',
        });
      }
      
      case 'perplexity': {
        const { createPerplexity } = await import('@ai-sdk/perplexity');
        return createPerplexity({ apiKey });
      }
      
      case 'xai': {
        const { createXai } = await import('@ai-sdk/xai');
        return createXai({ apiKey });
      }
      
      case 'custom':
        throw new ProviderError('Custom provider not yet implemented');
        
      default:
        throw new ProviderError(`Unsupported provider: ${this.model.provider}`);
    }
  }

  private async executeWithProvider(
    provider: any,
    messages: Message[],
    tools: any[] | undefined,
    streaming: boolean,
    generateText: any
  ): Promise<AIResponse> {
    // Transform messages for AI SDK format
    const coreMessages = this.transformMessages(messages);
    const systemMessage = messages.find(m => m.role === 'system')?.content;

    // Generate response using AI SDK
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
      } : {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  private transformMessages(messages: Message[]): any[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => {
        if (m.role === 'user') {
          return { role: 'user' as const, content: m.content };
        } else if (m.role === 'assistant') {
          return { role: 'assistant' as const, content: m.content };
        } else if (m.role === 'tool') {
          return { 
            role: 'tool' as const, 
            content: [{ 
              type: 'tool-result' as const, 
              toolCallId: m.toolCallId || '', 
              toolName: 'unknown',
              result: m.content 
            }] 
          };
        }
        return { role: 'user' as const, content: m.content };
      });
  }

  // Calculate cost based on token usage
  public calculateCost(inputTokens: number, outputTokens: number): number {
    try {
      const { calculateCost } = require('../providers');
      return calculateCost(
        this.model.provider,
        this.model.model,
        inputTokens,
        outputTokens
      );
    } catch (error) {
      // Fall back to approximation if specific pricing not available
      const avgInputCost = 0.01 / 1000; // Average input cost per token
      const avgOutputCost = 0.02 / 1000; // Average output cost per token
      return (inputTokens * avgInputCost) + (outputTokens * avgOutputCost);
    }
  }

  // Get model metadata if available
  public getModelInfo(): any {
    try {
      const { getModelInfo } = require('../providers');
      return getModelInfo(this.model.provider, this.model.model);
    } catch (error) {
      return null;
    }
  }
}