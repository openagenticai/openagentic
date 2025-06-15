import type { Tool } from '../types';

// Self-contained HTTP request tool using fetch
export const httpRequestTool: Tool = {
  name: 'http_request',
  description: 'Make HTTP requests to external APIs',
  parameters: {
    url: {
      type: 'string',
      description: 'The URL to make the request to',
      required: true,
    },
    method: {
      type: 'string',
      description: 'HTTP method (GET, POST, PUT, DELETE, etc.)',
      required: false,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    },
    headers: {
      type: 'object',
      description: 'HTTP headers to include in the request',
      required: false,
    },
    body: {
      type: 'string',
      description: 'Request body (for POST, PUT, PATCH requests)',
      required: false,
    },
  },
  execute: async (params: any) => {
    const { url, method = 'GET', headers = {}, body } = params;
    
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);
    const data = await response.text();
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: (() => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      })(),
    };
  },
};

// Self-contained calculator tool
export const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Perform mathematical calculations',
  parameters: {
    expression: {
      type: 'string',
      description: 'Mathematical expression to evaluate (e.g., "2 + 2", "Math.sqrt(16)")',
      required: true,
    },
  },
  execute: async (params: any) => {
    const { expression } = params;
    
    // Basic safety check - only allow safe mathematical operations
    const safeExpression = expression.replace(/[^0-9+\-*/.()Math.sqrtpowabsfloorceilminmax ]/g, '');
    
    try {
      // Using Function constructor for safe evaluation
      const result = new Function('Math', `return ${safeExpression}`)(Math);
      return { result, expression: safeExpression };
    } catch (error) {
      throw new Error(`Invalid mathematical expression: ${expression}`);
    }
  },
};

// Self-contained timestamp tool
export const timestampTool: Tool = {
  name: 'timestamp',
  description: 'Get current timestamp and date information',
  parameters: {
    format: {
      type: 'string',
      description: 'Format for the timestamp (iso, unix, human)',
      required: false,
      enum: ['iso', 'unix', 'human'],
    },
    timezone: {
      type: 'string',
      description: 'Timezone for the timestamp (e.g., "UTC", "America/New_York")',
      required: false,
    },
  },
  execute: async (params: any) => {
    const { format = 'iso', timezone } = params;
    const now = new Date();
    
    switch (format) {
      case 'unix':
        return { timestamp: Math.floor(now.getTime() / 1000), format: 'unix' };
      case 'human':
        return { 
          timestamp: timezone 
            ? now.toLocaleString('en-US', { timeZone: timezone })
            : now.toLocaleString(),
          format: 'human',
          timezone: timezone || 'local'
        };
      default: // iso
        return { 
          timestamp: timezone 
            ? new Date(now.toLocaleString('en-US', { timeZone: timezone })).toISOString()
            : now.toISOString(),
          format: 'iso',
          timezone: timezone || 'UTC'
        };
    }
  },
};

// Self-contained text generation tool using @ai-sdk
export const textGenerationTool: Tool = {
  name: 'text_generation',
  description: 'Generate text using AI models via @ai-sdk',
  parameters: {
    prompt: {
      type: 'string',
      description: 'The prompt to generate text from',
      required: true,
    },
    model: {
      type: 'string',
      description: 'Model to use (e.g., "gpt-4o", "claude-4-sonnet")',
      required: false,
    },
    maxTokens: {
      type: 'number',
      description: 'Maximum tokens to generate',
      required: false,
    },
  },
  execute: async (params: any) => {
    const { prompt, model = 'gpt-4o-mini', maxTokens = 1000 } = params;
    
    try {
      // Dynamic import to avoid dependency issues
      const { generateText } = await import('ai');
      
      // Determine provider based on model name
      let provider;
      if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const config: any = {};
        if (process.env.OPENAI_API_KEY) config.apiKey = process.env.OPENAI_API_KEY;
        provider = createOpenAI(config);
      } else if (model.includes('claude')) {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const config: any = {};
        if (process.env.ANTHROPIC_API_KEY) config.apiKey = process.env.ANTHROPIC_API_KEY;
        provider = createAnthropic(config);
      } else if (model.includes('gemini')) {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const config: any = {};
        if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) config.apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        provider = createGoogleGenerativeAI(config);
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      const result = await generateText({
        model: provider(model),
        prompt,
        maxTokens,
      });

      return {
        text: result.text,
        usage: result.usage,
        model,
      };
    } catch (error) {
      throw new Error(`Text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

// Self-contained image generation tool using @ai-sdk (updated for new API)
export const imageGenerationTool: Tool = {
  name: 'image_generation',
  description: 'Generate images using AI models via @ai-sdk',
  parameters: {
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
      description: 'Image size (e.g., "1024x1024", "512x512")',
      required: false,
      enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
    },
  },
  execute: async (params: any) => {
    const { prompt, model = 'dall-e-3', size = '1024x1024' } = params;
    
    try {
      // Try the new API first, fall back to legacy if needed
      let generateImage;
      try {
        const ai = await import('ai');
        generateImage = ai.generateImage || ai.experimental_generateImage;
      } catch {
        // Fallback for different AI SDK versions
        const openai = await import('@ai-sdk/openai');
        generateImage = openai.generateImage;
      }

      if (!generateImage) {
        throw new Error('Image generation not available in this AI SDK version');
      }

      const { createOpenAI } = await import('@ai-sdk/openai');
      const config: any = {};
      if (process.env.OPENAI_API_KEY) config.apiKey = process.env.OPENAI_API_KEY;
      const provider = createOpenAI(config);

      const result = await generateImage({
        model: provider.image ? provider.image(model) : provider(model),
        prompt,
        size,
      });

      return {
        url: result.image?.url || result.url,
        revisedPrompt: result.image?.revisedPrompt || result.revisedPrompt,
        model,
        size,
      };
    } catch (error) {
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

// Self-contained code generation tool using @ai-sdk
export const codeGenerationTool: Tool = {
  name: 'code_generation',
  description: 'Generate code using AI models optimized for programming',
  parameters: {
    task: {
      type: 'string',
      description: 'Description of the code to generate',
      required: true,
    },
    language: {
      type: 'string',
      description: 'Programming language (e.g., "typescript", "python", "javascript")',
      required: false,
    },
    model: {
      type: 'string',
      description: 'Model to use for code generation',
      required: false,
    },
  },
  execute: async (params: any) => {
    const { task, language = 'typescript', model = 'gpt-4o' } = params;
    
    try {
      const { generateText } = await import('ai');
      const { createOpenAI } = await import('@ai-sdk/openai');
      
      const config: any = {};
      if (process.env.OPENAI_API_KEY) config.apiKey = process.env.OPENAI_API_KEY;
      const provider = createOpenAI(config);

      const prompt = `Generate ${language} code for the following task: ${task}

Please provide clean, well-commented code that follows best practices for ${language}.`;

      const result = await generateText({
        model: provider(model),
        prompt,
        temperature: 0.2, // Lower temperature for more consistent code
      });

      return {
        code: result.text,
        language,
        task,
        model,
      };
    } catch (error) {
      throw new Error(`Code generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

// Collection of all built-in tools
export const allTools: Tool[] = [
  httpRequestTool,
  calculatorTool,
  timestampTool,
  textGenerationTool,
  imageGenerationTool,
  codeGenerationTool,
];

// Tool creation utilities
export function createTool(config: {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any> | any;
}): Tool {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: config.execute,
  };
}

// Export commonly used tools
export { httpRequestTool as httpTool };
export { calculatorTool as mathTool };
export { timestampTool as timeTool };
export { textGenerationTool as aiTextTool };
export { imageGenerationTool as aiImageTool };
export { codeGenerationTool as aiCodeTool };