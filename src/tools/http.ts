import { tool } from 'ai';
import { z } from 'zod';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

const rawHttpTool = tool({
  description: 'Make HTTP requests to external APIs and services',
  parameters: z.object({
    url: z.string().describe('The URL to make the request to'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).optional().default('GET').describe('HTTP method'),
    headers: z.record(z.string()).optional().describe('HTTP headers to include in the request'),
    body: z.string().optional().describe('Request body (for POST, PUT, PATCH requests)'),
  }),
  execute: async ({ url, method = 'GET', headers = {}, body }) => {
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
});

const toolDetails: ToolDetails = {
    toolId: 'http',
    name: 'Http Requests',
    useCases: [],
    parameters: {},
    logo: '',
};

export const httpTool = toOpenAgenticTool(rawHttpTool, toolDetails);
