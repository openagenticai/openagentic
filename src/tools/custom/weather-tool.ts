import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  name: 'weather_lookup',
  description: 'Get weather information for a location',
  parameters: z.object({
    location: z.string().describe('City name or coordinates'),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius').describe('Temperature units'),
  }),
  execute: async ({ location, units = 'celsius' }) => {
    const { location, units = 'celsius' } = params;
    
    // Simulate weather API call (self-contained)
    // In real implementation, you would call an actual weather API
    const weatherData = {
      location,
      temperature: units === 'celsius' ? 22 : 72,
      condition: 'partly cloudy',
      humidity: 65,
      windSpeed: 10,
      units,
      timestamp: new Date().toISOString(),
    };
    
    return weatherData;
  },
});