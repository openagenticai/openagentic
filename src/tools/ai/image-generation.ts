import type { Tool, ToolContext } from '../../types';

export const imageGenerationTool: Tool = {
  name: 'ai_image_generation',
  description: 'Generate images using AI models via @ai-sdk',
  category: 'ai',
  version: '1.0.0',
  requiresAuth: true,
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The prompt to generate an image from',
        required: true,
      },
      model: {
        type: 'string',
        description: 'Model to use (e.g., "dall-e-3", "dall-e-2")',
        required: false,
      },
      size: {
        type: 'string',
        description: 'Image size',
        required: false,
        enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
      },
      quality: {
        type: 'string',
        description: 'Image quality (for DALL-E 3)',
        required: false,
        enum: ['standard', 'hd'],
      },
    },
    required: ['prompt'],
  },
  execute: async (params: any, context?: ToolContext) => {
    const { prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard' } = params;
    
    try {
      // Use context if available, otherwise fall back to environment
      let provider;
      if (context?.getModel) {
        provider = await context.getModel('openai');
      } else {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const apiKey = context?.apiKeys?.openai ?? process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OpenAI API key not found');
        provider = createOpenAI({ apiKey });
      }

      // Fix: Improved generateImage import handling
      let generateImage;
      try {
        const { experimental_generateImage } = await import('ai');
        generateImage = experimental_generateImage;
      } catch {
        try {
          const aiModule = await import('ai');
          generateImage = (aiModule as any).generateImage;
        } catch {
          throw new Error('Image generation not available. Please update your AI SDK version.');
        }
      }

      if (!generateImage) {
        throw new Error('Image generation function not found');
      }

      const result = await generateImage({
        model: provider.image ? provider.image(model) : provider(model),
        prompt,
        size,
        // Fix: Conditional spreading with explicit undefined check
        ...(quality !== undefined && { quality }),
      });

      return {
        url: result.image?.url ?? result.url,
        revisedPrompt: result.image?.revisedPrompt ?? result.revisedPrompt,
        model,
        size,
        quality,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};