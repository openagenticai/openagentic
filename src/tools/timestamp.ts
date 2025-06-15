import type { Tool } from '../types';

export const timestampTool: Tool = {
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