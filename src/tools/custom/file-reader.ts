import { tool } from 'ai';
import { z } from 'zod';

export const fileReaderTool = tool({
  description: 'Read the contents of a text file',
  parameters: z.object({
    filepath: z.string().describe('Path to the file to read'),
    encoding: z.enum(['utf8', 'ascii', 'base64']).optional().default('utf8').describe('File encoding'),
  }),
  execute: async ({ filepath, encoding = 'utf8' }) => {    
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
});