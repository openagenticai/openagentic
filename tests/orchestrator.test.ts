import { describe, it, expect } from '@jest/globals';
import { createAgent, createStreamingAgent, qrcodeTool, githubTool } from '../src';
import type { AIModel } from '../src/types';

describe('OpenAgentic Simplified API', () => {
  describe('Smoke Tests', () => {
    it('should export main factory functions', () => {
      expect(createAgent).toBeDefined();
      expect(typeof createAgent).toBe('function');
      expect(createStreamingAgent).toBeDefined();
      expect(typeof createStreamingAgent).toBe('function');
    });

    it('should export utility tools', () => {
      expect(qrcodeTool).toBeDefined();
      expect(qrcodeTool.toolId).toBe('qr_code_generator');
      expect(qrcodeTool.description).toBeDefined();
      expect(qrcodeTool.execute).toBeDefined();
      
      expect(githubTool).toBeDefined();
      expect(githubTool.toolId).toBe('github_contents');
      expect(githubTool.description).toBeDefined();
      expect(githubTool.execute).toBeDefined();
    });

    it('should create an agent instance', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
        systemPrompt: 'You are a helpful assistant.',
      });

      expect(agent).toBeDefined();
      expect(typeof agent.execute).toBe('function');
      expect(typeof agent.addTool).toBe('function');
      expect(typeof agent.removeTool).toBe('function');
      expect(typeof agent.getAllTools).toBe('function');
      expect(typeof agent.getModelInfo).toBe('function');
    });

    it('should create a streaming agent instance', () => {
      const agent = createStreamingAgent({
        model: 'claude-sonnet-4-20250514',
        tools: [qrcodeTool],
        systemPrompt: 'You are a streaming assistant.',
      });

      expect(agent).toBeDefined();
      expect(typeof agent.stream).toBe('function');
      expect(typeof agent.addTool).toBe('function');
      expect(typeof agent.removeTool).toBe('function');
      expect(typeof agent.getAllTools).toBe('function');
      expect(typeof agent.getModelInfo).toBe('function');
    });

    it('should handle AIModel objects', () => {
      const model: AIModel = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.5,
        maxTokens: 1000,
      };

      const agent = createAgent({ model });
      expect(agent).toBeDefined();
      
      const modelInfo = agent.getModelInfo();
      expect(modelInfo.provider).toBe('openai');
      expect(modelInfo.model).toBe('gpt-4o-mini');
    });

    it('should manage tools correctly', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
      });

      expect(agent.getAllTools()).toHaveLength(1);
      
      agent.addTool(githubTool);
      expect(agent.getAllTools()).toHaveLength(2);
      
      const retrievedTool = agent.getTool('qr_code_generator');
      expect(retrievedTool).toBeDefined();
      expect(retrievedTool?.toolId).toBe('qr_code_generator');
      
      agent.removeTool('qr_code_generator');
      expect(agent.getAllTools()).toHaveLength(1);
      expect(agent.getTool('qr_code_generator')).toBeUndefined();
    });

    it('should prevent duplicate tool registration', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
      });

      expect(() => {
        agent.addTool(qrcodeTool);
      }).toThrow('Tool with name qr_code_generator already exists');
    });

    it('should switch models', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
      });

      expect(() => {
        agent.switchModel('claude-sonnet-4-20250514');
      }).not.toThrow();

      const modelInfo = agent.getModelInfo();
      expect(modelInfo.provider).toBe('anthropic');
    });

    it('should manage messages', () => {
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

    it('should verify tool structure', () => {
      // Test that tools have the expected structure
      expect(qrcodeTool.toolId).toBe('qr_code_generator');
      expect(qrcodeTool.description).toBeDefined();
      expect(qrcodeTool.execute).toBeDefined();
      expect(typeof qrcodeTool.execute).toBe('function');
      
      expect(githubTool.toolId).toBe('github_contents');
      expect(githubTool.description).toBeDefined();
      expect(githubTool.execute).toBeDefined();
      expect(typeof githubTool.execute).toBe('function');
    });
  });
});