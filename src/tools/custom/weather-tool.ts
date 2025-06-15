import type { Tool } from '../../types';

export const weatherTool: Tool = {
  name: 'weather_lookup',
  description: 'Get weather information for a location',
  category: 'custom',
  version: '1.0.0',
  requiresAuth: false,
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or coordinates',
        required: true,
      },
      units: {
        type: 'string',
        description: 'Temperature units',
        required: false,
        enum: ['celsius', 'fahrenheit'],
      },
    },
    required: ['location'],
  },
  execute: async (params: any) => {
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
};