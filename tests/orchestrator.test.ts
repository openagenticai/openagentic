import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createAgent, createStreamingAgent, calculatorTool, httpTool, timestampTool } from '../src';
import type { AIModel } from '../src/types';

// Mock the AI SDK modules
jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => jest.fn()),
}));

describe('OpenAgentic Simplified API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAgent', () => {
    it('should create an agent with string model', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
        systemPrompt: 'You are a helpful assistant.',
      });

      expect(agent).toBeDefined();
      expect(typeof agent.execute).toBe('function');
      expect(typeof agent.addTool).toBe('function');
      expect(typeof agent.removeTool).toBe('function');
    });

    it('should create an agent with AIModel object', () => {
      const model: AIModel = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.5,
      };

      const agent = createAgent({
        model,
        tools: [calculatorTool, httpTool],
      });

      expect(agent).toBeDefined();
      expect(agent.getAllTools()).toHaveLength(2);
    });

    it('should handle no tools provided', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
      });

      expect(agent).toBeDefined();
      expect(agent.getAllTools()).toHaveLength(0);
    });

    it('should support custom logic', () => {
      const customLogic = jest.fn().mockResolvedValue({ content: 'custom response' });
      
      const agent = createAgent({
        model: 'gpt-4o-mini',
        customLogic,
      });

      expect(agent).toBeDefined();
    });

    it('should support maxIterations configuration', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        maxIterations: 5,
      });

      expect(agent).toBeDefined();
    });
  });

  describe('createStreamingAgent', () => {
    it('should create a streaming agent with string model', () => {
      const agent = createStreamingAgent({
        model: 'claude-4-sonnet-20250514',
        tools: [timestampTool],
        systemPrompt: 'You are a streaming assistant.',
      });

      expect(agent).toBeDefined();
      expect(typeof agent.stream).toBe('function');
      expect(typeof agent.addTool).toBe('function');
      expect(typeof agent.removeTool).toBe('function');
    });

    it('should create a streaming agent with AIModel object', () => {
      const model: AIModel = {
        provider: 'anthropic',
        model: 'claude-4-sonnet-20250514',
        temperature: 0.8,
        maxTokens: 2000,
      };

      const agent = createStreamingAgent({
        model,
        tools: [calculatorTool, timestampTool],
      });

      expect(agent).toBeDefined();
      expect(agent.getAllTools()).toHaveLength(2);
    });

    it('should handle no tools provided', () => {
      const agent = createStreamingAgent({
        model: 'gemini-1.5-pro',
      });

      expect(agent).toBeDefined();
      expect(agent.getAllTools()).toHaveLength(0);
    });

    it('should support maxIterations configuration', () => {
      const agent = createStreamingAgent({
        model: 'grok-beta',
        maxIterations: 15,
      });

      expect(agent).toBeDefined();
    });
  });

  describe('Tool Management', () => {
    it('should add and remove tools correctly', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      expect(agent.getAllTools()).toHaveLength(1);
      
      agent.addTool(httpTool);
      expect(agent.getAllTools()).toHaveLength(2);
      
      agent.removeTool('calculator');
      expect(agent.getAllTools()).toHaveLength(1);
      expect(agent.getTool('calculator')).toBeUndefined();
      expect(agent.getTool('http_request')).toBeDefined();
    });

    it('should prevent duplicate tool registration', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      expect(() => {
        agent.addTool(calculatorTool);
      }).toThrow('Tool already exists: calculator');
    });

    it('should get tools by category', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool, httpTool, timestampTool],
      });

      const utilityTools = agent.getToolsByCategory('utility');
      expect(utilityTools).toHaveLength(3);
      expect(utilityTools.every(tool => tool.category === 'utility')).toBe(true);
    });
  });

  describe('Model Management', () => {
    it('should switch models correctly', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
      });

      expect(() => {
        agent.switchModel('claude-4-sonnet-20250514');
      }).not.toThrow();

      const modelInfo = agent.getModelInfo();
      expect(modelInfo.provider).toBe('anthropic');
    });

    it('should get model information', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
      });

      const modelInfo = agent.getModelInfo();
      expect(modelInfo).toBeDefined();
      expect(modelInfo.provider).toBe('openai');
    });
  });

  describe('Message Management', () => {
    it('should manage messages correctly', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        systemPrompt: 'You are helpful.',
      });

      // Should start with system message
      expect(agent.getMessages()).toHaveLength(1);
      expect(agent.getMessages()[0].role).toBe('system');

      // Add a user message
      agent.addMessage({ role: 'user', content: 'Hello' });
      expect(agent.getMessages()).toHaveLength(2);

      // Reset should keep system message
      agent.reset();
      expect(agent.getMessages()).toHaveLength(1);
      expect(agent.getMessages()[0].role).toBe('system');

      // Clear should remove all messages
      agent.clear();
      expect(agent.getMessages()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tool structure', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
      });

      expect(() => {
        agent.addTool({
          name: 'invalid',
          description: 'Invalid tool',
          // Missing parameters and execute
        } as any);
      }).toThrow('Invalid tool: missing required properties');
    });

    it('should handle invalid tool parameters', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
      });

      expect(() => {
        agent.addTool({
          name: 'invalid',
          description: 'Invalid tool',
          parameters: { type: 'string' }, // Invalid parameters structure
          execute: async () => ({}),
        } as any);
      }).toThrow('Invalid tool parameters for invalid');
    });
  });

  describe('Tool Execution', () => {
    it('should execute calculator tool correctly', async () => {
      const result = await calculatorTool.execute({ expression: '2 + 2' });
      expect(result.result).toBe(4);
      expect(result.expression).toBe('2 + 2');
    });

    it('should handle calculator tool errors', async () => {
      await expect(calculatorTool.execute({ expression: 'invalid_expression' }))
        .rejects.toThrow('Invalid mathematical expression');
    });

    it('should execute timestamp tool correctly', async () => {
      const result = await timestampTool.execute({ format: 'unix' });
      expect(typeof result.timestamp).toBe('number');
      expect(result.format).toBe('unix');
    });

    it('should execute timestamp tool with custom format', async () => {
      const result = await timestampTool.execute({ 
        format: 'custom', 
        customFormat: 'YYYY-MM-DD' 
      });
      expect(typeof result.timestamp).toBe('string');
      expect(result.customFormat).toBe('YYYY-MM-DD');
      expect(/\d{4}-\d{2}-\d{2}/.test(result.timestamp)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle agent creation with all supported models', () => {
      const models = [
        'gpt-4o-mini',
        'claude-4-sonnet-20250514',
        'gemini-1.5-pro',
        'grok-beta',
      ];

      models.forEach(model => {
        expect(() => {
          const agent = createAgent({ model });
          expect(agent).toBeDefined();
        }).not.toThrow();
      });
    });

    it('should handle streaming agent creation with all supported models', () => {
      const models = [
        'gpt-4o-mini',
        'claude-4-sonnet-20250514',
        'gemini-1.5-pro',
        'grok-beta',
      ];

      models.forEach(model => {
        expect(() => {
          const agent = createStreamingAgent({ model });
          expect(agent).toBeDefined();
        }).not.toThrow();
      });
    });
  });
});