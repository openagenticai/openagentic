import type { Tool, ToolContext } from '../../types';

export const codeGenerationTool: Tool = {
  name: 'ai_code_generation',
  description: 'Generate code using AI models optimized for programming',
  category: 'ai',
  version: '1.0.0',
  requiresAuth: true,
  parameters: {
    type: 'object',
    properties: {
      task: {
        type: 'string',
        description: 'Description of the code to generate',
        required: true,
      },
      language: {
        type: 'string',
        description: 'Programming language',
        required: false,
        enum: ['typescript', 'javascript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'],
      },
      model: {
        type: 'string',
        description: 'Model to use for code generation',
        required: false,
      },
      style: {
        type: 'string',
        description: 'Code style preference',
        required: false,
        enum: ['clean', 'commented', 'production', 'tutorial'],
      },
    },
    required: ['task'],
  },
  execute: async (params: any, context?: ToolContext) => {
    const { task, language = 'typescript', model = 'gpt-4o', style = 'clean' } = params;
    
    try {
      // Use context if available
      let provider;
      if (context?.getModel) {
        provider = await context.getModel();
      } else {
        // Auto-detect provider (prefer OpenAI for code generation)
        const { createOpenAI } = await import('@ai-sdk/openai');
        const apiKey = context?.apiKeys?.openai ?? process.env.OPENAI_API_KEY; // Fix: Use nullish coalescing
        if (!apiKey) throw new Error('OpenAI API key not found');
        provider = createOpenAI({ apiKey });
      }

      const { generateText } = await import('ai');
      
      // Build optimized prompt based on style
      let systemPrompt = `You are an expert ${language} programmer. `;
      let taskPrompt = task;
      
      switch (style) {
        case 'commented':
          systemPrompt += 'Provide well-commented code with explanations.';
          break;
        case 'production':
          systemPrompt += 'Write production-ready code with error handling and best practices.';
          break;
        case 'tutorial':
          systemPrompt += 'Write educational code with step-by-step explanations.';
          break;
        default: // clean
          systemPrompt += 'Write clean, efficient code following best practices.';
      }
      
      const prompt = `${systemPrompt}\n\nTask: ${taskPrompt}\n\nGenerate ${language} code for this task:`;

      const result = await generateText({
        model: provider(model),
        prompt,
        temperature: 0.2, // Lower temperature for more consistent code
        maxTokens: 2000,
      });

      // Extract code from response (basic cleanup)
      let code = result.text;
      const codeBlockRegex = new RegExp(`\`\`\`${language}?\\n([\\s\\S]*?)\`\`\``, 'i');
      const match = code.match(codeBlockRegex);
      if (match) {
        code = match[1].trim();
      }

      return {
        code,
        language,
        task,
        style,
        model,
        rawResponse: result.text,
        usage: result.usage,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Code generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};