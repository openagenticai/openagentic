import type { Tool, ToolContext } from '../../types';

export const textGenerationTool: Tool = {
  name: 'ai_text_generation',
  description: 'Generate text using AI models via @ai-sdk',
  category: 'ai',
  version: '1.0.0',
  requiresAuth: true,
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt to generate text from',
        required: true,
      },
      model: {
        type: 'string',
        description: 'Model to use (e.g., "gpt-4o", "claude-4-sonnet-20250514", "gemini-1.5-pro")',
        required: false,
      },
      maxTokens: {
        type: 'number',
        description: 'Maximum tokens to generate (default: 1000)',
        required: false,
      },
      temperature: {
        type: 'number',
        description: 'Temperature for generation (0.0 to 2.0, default: 0.7)',
        required: false,
      },
    },
    required: ['prompt'],
  },
  execute: async (params: any, context?: ToolContext) => {
    const { prompt, model = 'gpt-4o-mini', maxTokens = 1000, temperature = 0.7 } = params;
    
    try {
      // Use context if available, otherwise fall back to direct import
      let provider;
      if (context?.getModel) {
        provider = await context.getModel();
      } else {
        // Auto-detect provider based on model name
        if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) {
          const { createOpenAI } = await import('@ai-sdk/openai');
          const apiKey = context?.apiKeys?.openai ?? process.env.OPENAI_API_KEY; // Fix: Use nullish coalescing
          if (!apiKey) throw new Error('OpenAI API key not found');
          provider = createOpenAI({ apiKey });
        } else if (model.includes('claude')) {
          const { createAnthropic } = await import('@ai-sdk/anthropic');
          const apiKey = context?.apiKeys?.anthropic ?? process.env.ANTHROPIC_API_KEY;
          if (!apiKey) throw new Error('Anthropic API key not found');
          provider = createAnthropic({ apiKey });
        } else if (model.includes('gemini')) {
          const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
          const apiKey = context?.apiKeys?.google ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
          if (!apiKey) throw new Error('Google API key not found');
          provider = createGoogleGenerativeAI({ apiKey });
        } else {
          throw new Error(`Unsupported model: ${model}`);
        }
      }

      const { generateText } = await import('ai');
      
      const result = await generateText({
        model: provider(model),
        prompt,
        maxTokens,
        temperature,
      });

      return {
        text: result.text,
        usage: result.usage,
        model,
        finishReason: result.finishReason,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};