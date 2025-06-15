import type { Tool, ToolContext, JSONSchema } from '../types';

// =============================================================================
// UTILITY TOOLS (No AI dependency)
// =============================================================================

// Self-contained HTTP request tool using fetch
export const httpTool: Tool = {
  name: 'http_request',
  description: 'Make HTTP requests to external APIs and services',
  category: 'utility',
  version: '1.0.0',
  parameters: {
    type: 'object',
    properties: {
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
    required: ['url'],
  },
  execute: async (params: any) => {
    const { url, method = 'GET', headers = {}, body } = params;
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
    
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OpenAgentic-HTTP-Tool/1.0',
        ...headers,
      },
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestInit);
      const contentType = response.headers.get('content-type') || '';
      
      let data: any;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/')) {
        data = await response.text();
      } else {
        data = await response.arrayBuffer();
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        contentType,
        url: response.url,
      };
    } catch (error) {
      throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

// Self-contained calculator tool with enhanced math functions
export const mathTool: Tool = {
  name: 'calculator',
  description: 'Perform mathematical calculations and evaluations',
  category: 'utility',
  version: '1.0.0',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g., "2 + 2", "Math.sqrt(16)", "Math.PI * 2")',
        required: true,
      },
    },
    required: ['expression'],
  },
  execute: async (params: any) => {
    const { expression } = params;
    
    // Enhanced safety check - allow more mathematical operations
    const safeExpression = expression.replace(
      /[^0-9+\-*/.()Math.sqrtpowabsfloorceilminmaxsincostandelogPIE ]/g, 
      ''
    );
    
    // Additional safety - prevent infinite loops and dangerous operations
    if (safeExpression.includes('while') || safeExpression.includes('for') || 
        safeExpression.includes('function') || safeExpression.includes('eval')) {
      throw new Error('Unsafe expression detected');
    }
    
    try {
      // Create a safe evaluation context
      const mathContext = {
        Math: {
          PI: Math.PI,
          E: Math.E,
          abs: Math.abs,
          acos: Math.acos,
          asin: Math.asin,
          atan: Math.atan,
          ceil: Math.ceil,
          cos: Math.cos,
          exp: Math.exp,
          floor: Math.floor,
          log: Math.log,
          max: Math.max,
          min: Math.min,
          pow: Math.pow,
          random: Math.random,
          round: Math.round,
          sin: Math.sin,
          sqrt: Math.sqrt,
          tan: Math.tan,
        }
      };
      
      const result = new Function('Math', `"use strict"; return ${safeExpression}`)(mathContext.Math);
      
      // Validate result
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid mathematical result');
      }
      
      return { 
        result, 
        expression: safeExpression,
        originalExpression: expression,
        type: 'number'
      };
    } catch (error) {
      throw new Error(`Invalid mathematical expression: ${expression}. ${error instanceof Error ? error.message : ''}`);
    }
  },
};

// Self-contained timestamp tool with timezone support
export const timeTool: Tool = {
  name: 'timestamp',
  description: 'Get current timestamp and date information with timezone support',
  category: 'utility',
  version: '1.0.0',
  parameters: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Format for the timestamp (iso, unix, human, custom)',
        required: false,
        enum: ['iso', 'unix', 'human', 'custom'],
      },
      timezone: {
        type: 'string',
        description: 'Timezone for the timestamp (e.g., "UTC", "America/New_York", "Europe/London")',
        required: false,
      },
      customFormat: {
        type: 'string',
        description: 'Custom date format string (used when format is "custom")',
        required: false,
      },
    },
  },
  execute: async (params: any) => {
    const { format = 'iso', timezone, customFormat } = params;
    const now = new Date();
    
    try {
      switch (format) {
        case 'unix':
          return { 
            timestamp: Math.floor(now.getTime() / 1000), 
            format: 'unix',
            milliseconds: now.getTime()
          };
          
        case 'human':
          const humanOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
          };
          
          if (timezone) humanOptions.timeZone = timezone;
          
          return { 
            timestamp: now.toLocaleString('en-US', humanOptions),
            format: 'human',
            timezone: timezone || 'local',
            iso: now.toISOString()
          };
          
        case 'custom':
          if (!customFormat) {
            throw new Error('Custom format string required when format is "custom"');
          }
          
          // Basic custom formatting (simplified implementation)
          let formatted = customFormat
            .replace('YYYY', now.getFullYear().toString())
            .replace('MM', (now.getMonth() + 1).toString().padStart(2, '0'))
            .replace('DD', now.getDate().toString().padStart(2, '0'))
            .replace('HH', now.getHours().toString().padStart(2, '0'))
            .replace('mm', now.getMinutes().toString().padStart(2, '0'))
            .replace('ss', now.getSeconds().toString().padStart(2, '0'));
            
          return {
            timestamp: formatted,
            format: 'custom',
            customFormat,
            iso: now.toISOString()
          };
          
        default: // iso
          return { 
            timestamp: timezone 
              ? new Date(now.toLocaleString('en-US', { timeZone: timezone })).toISOString()
              : now.toISOString(),
            format: 'iso',
            timezone: timezone || 'UTC',
            unix: Math.floor(now.getTime() / 1000)
          };
      }
    } catch (error) {
      throw new Error(`Timestamp generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

// =============================================================================
// AI TOOLS (Use @ai-sdk providers)
// =============================================================================

// Self-contained text generation tool using @ai-sdk
export const aiTextTool: Tool = {
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
          const apiKey = context?.apiKeys?.openai || process.env.OPENAI_API_KEY;
          if (!apiKey) throw new Error('OpenAI API key not found');
          provider = createOpenAI({ apiKey });
        } else if (model.includes('claude')) {
          const { createAnthropic } = await import('@ai-sdk/anthropic');
          const apiKey = context?.apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY;
          if (!apiKey) throw new Error('Anthropic API key not found');
          provider = createAnthropic({ apiKey });
        } else if (model.includes('gemini')) {
          const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
          const apiKey = context?.apiKeys?.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
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

// Self-contained image generation tool using @ai-sdk
export const aiImageTool: Tool = {
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
        const apiKey = context?.apiKeys?.openai || process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OpenAI API key not found');
        provider = createOpenAI({ apiKey });
      }

      // Try different import paths for image generation
      let generateImage;
      try {
        const ai = await import('ai');
        generateImage = ai.generateImage || ai.experimental_generateImage;
      } catch {
        try {
          const openai = await import('@ai-sdk/openai');
          generateImage = openai.generateImage;
        } catch {
          throw new Error('Image generation not available in current AI SDK version');
        }
      }

      if (!generateImage) {
        throw new Error('Image generation function not found');
      }

      const result = await generateImage({
        model: provider.image ? provider.image(model) : provider(model),
        prompt,
        size,
        ...(quality && { quality }),
      });

      return {
        url: result.image?.url || result.url,
        revisedPrompt: result.image?.revisedPrompt || result.revisedPrompt,
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

// Self-contained code generation tool using @ai-sdk
export const aiCodeTool: Tool = {
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
        const apiKey = context?.apiKeys?.openai || process.env.OPENAI_API_KEY;
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

// Self-contained translation tool using @ai-sdk
export const aiTranslateTool: Tool = {
  name: 'ai_translation',
  description: 'Translate text between languages using AI models',
  category: 'ai',
  version: '1.0.0',
  requiresAuth: true,
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to translate',
        required: true,
      },
      targetLanguage: {
        type: 'string',
        description: 'Target language (e.g., "Spanish", "French", "Japanese")',
        required: true,
      },
      sourceLanguage: {
        type: 'string',
        description: 'Source language (auto-detect if not specified)',
        required: false,
      },
      model: {
        type: 'string',
        description: 'Model to use for translation',
        required: false,
      },
    },
    required: ['text', 'targetLanguage'],
  },
  execute: async (params: any, context?: ToolContext) => {
    const { text, targetLanguage, sourceLanguage = 'auto-detect', model = 'gpt-4o-mini' } = params;
    
    try {
      let provider;
      if (context?.getModel) {
        provider = await context.getModel();
      } else {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const apiKey = context?.apiKeys?.openai || process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OpenAI API key not found');
        provider = createOpenAI({ apiKey });
      }

      const { generateText } = await import('ai');
      
      const prompt = sourceLanguage === 'auto-detect'
        ? `Translate the following text to ${targetLanguage}:\n\n${text}`
        : `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`;

      const result = await generateText({
        model: provider(model),
        prompt,
        temperature: 0.3,
        maxTokens: 1000,
      });

      return {
        translatedText: result.text.trim(),
        sourceLanguage: sourceLanguage,
        targetLanguage,
        originalText: text,
        model,
        usage: result.usage,
        translatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

// =============================================================================
// TOOL COLLECTIONS AND UTILITIES
// =============================================================================

// Categorized tool collections
export const utilityTools: Tool[] = [httpTool, mathTool, timeTool];
export const aiTools: Tool[] = [aiTextTool, aiImageTool, aiCodeTool, aiTranslateTool];
export const allTools: Tool[] = [...utilityTools, ...aiTools];

// Tool creation utility
export function createTool(config: {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any, context?: ToolContext) => Promise<any>;
  category?: 'utility' | 'ai' | 'custom';
  version?: string;
  requiresAuth?: boolean;
}): Tool {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: config.execute,
    category: config.category || 'custom',
    version: config.version || '1.0.0',
    requiresAuth: config.requiresAuth || false,
  };
}

// Tool validation utility
export function validateTool(tool: Tool): boolean {
  try {
    // Basic validation
    if (!tool.name || !tool.description || !tool.execute) {
      return false;
    }
    
    // Check parameters structure
    if (!tool.parameters || tool.parameters.type !== 'object') {
      return false;
    }
    
    // Validate required fields match parameters
    if (tool.parameters.required) {
      for (const required of tool.parameters.required) {
        if (!tool.parameters.properties[required]) {
          return false;
        }
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

// Tool registry for easy access
export class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void {
    if (!validateTool(tool)) {
      throw new Error(`Invalid tool: ${tool.name}`);
    }
    
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    
    this.tools.set(tool.name, tool);
  }
  
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  getByCategory(category: Tool['category']): Tool[] {
    return this.getAll().filter(tool => tool.category === category);
  }
  
  clear(): void {
    this.tools.clear();
  }
  
  has(name: string): boolean {
    return this.tools.has(name);
  }
}

// Export legacy names for backward compatibility
export { httpTool as httpRequestTool };
export { mathTool as calculatorTool };
export { timeTool as timestampTool };
export { aiTextTool as textGenerationTool };
export { aiImageTool as imageGenerationTool };
export { aiCodeTool as codeGenerationTool };