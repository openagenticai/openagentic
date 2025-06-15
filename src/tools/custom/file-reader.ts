import type { Tool } from '../../types';

export const fileReaderTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a text file',
  category: 'custom',
  version: '1.0.0',
  requiresAuth: false,
  parameters: {
    type: 'object',
    properties: {
      filepath: {
        type: 'string',
        description: 'Path to the file to read',
        required: true,
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf8)',
        required: false,
        enum: ['utf8', 'ascii', 'base64'],
      },
    },
    required: ['filepath'],
  },
  execute: async (params: any) => {
    const { filepath, encoding = 'utf8' } = params;
    
    try {
      // Use dynamic import for Node.js fs module
      const fs = await import('fs/promises');
      const content = await fs.readFile(filepath, encoding as any);
      
      return {
        success: true,
        content,
        size: content.length,
        filepath,
        encoding,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        filepath,
        encoding,
      };
    }
  },
};