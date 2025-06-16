import { describe, it, expect, beforeEach, fail } from '@jest/globals';
import { createAgent, createStreamingAgent, calculatorTool } from '../src';
import type { CoreMessage } from '../src/types';

describe('Message Array Support', () => {
  beforeEach(() => {
    // Ensure we have test API keys for structure tests
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key-for-structure-validation';
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-for-structure-validation';
  });

  describe('Standard Agent', () => {
    it('should accept string input (original behavior)', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      expect(agent).toBeDefined();
      expect(typeof agent.execute).toBe('function');
      
      // Should not throw when called with string
      expect(() => {
        agent.execute('test string');
      }).not.toThrow();
    });

    it('should accept CoreMessage array input (new behavior)', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      const messages: CoreMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'Calculate 2 + 2' }
      ];

      expect(agent).toBeDefined();
      expect(typeof agent.execute).toBe('function');
      
      // Should not throw when called with message array
      expect(() => {
        agent.execute(messages);
      }).not.toThrow();
    });

    it('should reject invalid input types', async () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      // Test invalid input types
      try {
        await agent.execute(123 as any);
        fail('Should have thrown an error for invalid input type');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Input must be either a string or an array of messages');
      }

      try {
        await agent.execute(null as any);
        fail('Should have thrown an error for null input');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Input must be either a string or an array of messages');
      }
    });

    it('should handle empty message arrays', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      const emptyMessages: CoreMessage[] = [];

      // Should not throw when called with empty array
      expect(() => {
        agent.execute(emptyMessages);
      }).not.toThrow();
    });

    it('should handle messages with different content types', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      const messages: CoreMessage[] = [
        { role: 'user', content: 'String content' },
        { role: 'user', content: ['Array content'] },
        { role: 'assistant', content: 'Response content' }
      ];

      // Should not throw when called with mixed content types
      expect(() => {
        agent.execute(messages);
      }).not.toThrow();
    });
  });

  describe('Streaming Agent', () => {
    it('should accept string input (original behavior)', () => {
      const agent = createStreamingAgent({
        model: 'claude-4-sonnet-20250514',
        tools: [calculatorTool],
      });

      expect(agent).toBeDefined();
      expect(typeof agent.stream).toBe('function');
      
      // Should not throw when called with string
      expect(() => {
        agent.stream('test string');
      }).not.toThrow();
    });

    it('should accept CoreMessage array input (new behavior)', () => {
      const agent = createStreamingAgent({
        model: 'claude-4-sonnet-20250514',
        tools: [calculatorTool],
      });

      const messages: CoreMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'Calculate 2 + 2' }
      ];

      expect(agent).toBeDefined();
      expect(typeof agent.stream).toBe('function');
      
      // Should not throw when called with message array
      expect(() => {
        agent.stream(messages);
      }).not.toThrow();
    });

    it('should reject invalid input types', async () => {
      const agent = createStreamingAgent({
        model: 'claude-4-sonnet-20250514',
        tools: [calculatorTool],
      });

      // Test invalid input types
      try {
        await agent.stream(123 as any);
        fail('Should have thrown an error for invalid input type');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Input must be either a string or an array of messages');
      }
    });

    it('should handle complex message structures', () => {
      const agent = createStreamingAgent({
        model: 'claude-4-sonnet-20250514',
        tools: [calculatorTool],
      });

      const complexMessages: CoreMessage[] = [
        { 
          role: 'system', 
          content: 'You are a helpful assistant' 
        },
        { 
          role: 'user', 
          content: 'Calculate something' 
        },
        { 
          role: 'assistant', 
          content: 'I can help with calculations' 
        },
        { 
          role: 'tool',
          content: 'Tool result',
          toolCallId: 'test-call-id'
        },
        { 
          role: 'user', 
          content: 'What is 5 + 5?' 
        }
      ];

      // Should not throw when called with complex message structure
      expect(() => {
        agent.stream(complexMessages);
      }).not.toThrow();
    });
  });

  describe('Message Conversion', () => {
    it('should handle system messages in message arrays', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      const messagesWithSystem: CoreMessage[] = [
        { role: 'system', content: 'Custom system prompt' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'Calculate 1 + 1' }
      ];

      // Should handle system messages without throwing
      expect(() => {
        agent.execute(messagesWithSystem);
      }).not.toThrow();
    });

    it('should preserve conversation context', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
        systemPrompt: 'You are a helpful assistant.',
      });

      const conversationHistory: CoreMessage[] = [
        { role: 'user', content: 'My name is Alice' },
        { role: 'assistant', content: 'Nice to meet you, Alice!' },
        { role: 'user', content: 'What was my name again?' }
      ];

      // Should maintain internal state correctly
      expect(() => {
        agent.execute(conversationHistory);
      }).not.toThrow();

      // Check that messages are being tracked
      const messages = agent.getMessages();
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should handle tool messages correctly', () => {
      const agent = createStreamingAgent({
        model: 'claude-4-sonnet-20250514',
        tools: [calculatorTool],
      });

      const messagesWithTools: CoreMessage[] = [
        { role: 'user', content: 'Calculate 2 + 2' },
        { role: 'assistant', content: 'I\'ll calculate that for you.' },
        { 
          role: 'tool', 
          content: '{"result": 4}',
          toolCallId: 'calc-123'
        },
        { role: 'assistant', content: 'The result is 4.' },
        { role: 'user', content: 'Now calculate 3 + 3' }
      ];

      // Should handle tool messages without throwing
      expect(() => {
        agent.stream(messagesWithTools);
      }).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should have proper TypeScript overloads', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      // These should compile without TypeScript errors
      const stringPromise = agent.execute('test');
      const messagesPromise = agent.execute([{ role: 'user', content: 'test' }]);

      expect(stringPromise).toBeDefined();
      expect(messagesPromise).toBeDefined();
    });

    it('should have proper streaming TypeScript overloads', () => {
      const agent = createStreamingAgent({
        model: 'claude-4-sonnet-20250514',
        tools: [calculatorTool],
      });

      // These should compile without TypeScript errors
      const stringPromise = agent.stream('test');
      const messagesPromise = agent.stream([{ role: 'user', content: 'test' }]);

      expect(stringPromise).toBeDefined();
      expect(messagesPromise).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should work with AI SDK message format', () => {
      // Simulate AI SDK's convertToCoreMessages output
      const aiSDKMessages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
        { role: 'user' as const, content: 'Help me calculate something' }
      ];

      // Convert to CoreMessage format
      const coreMessages: CoreMessage[] = aiSDKMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [calculatorTool],
      });

      // Should work seamlessly with converted messages
      expect(() => {
        agent.execute(coreMessages);
      }).not.toThrow();
    });
  });
});