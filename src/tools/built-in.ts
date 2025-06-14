import type { Tool } from '../types';

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
  costEstimate: 0.001,
};

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
  costEstimate: 0,
};

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
  costEstimate: 0,
};

export const builtInTools: Tool[] = [
  httpRequestTool,
  calculatorTool,
  timestampTool,
];