import type { Tool } from '../types';

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