import { describe, it, expect, beforeEach } from '@jest/globals';
import { createAgent, createStreamingAgent, qrcodeTool } from '../src';
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
        tools: [qrcodeTool],
      });

      expect(agent).toBeDefined();
      expect(typeof agent.execute).toBe('function');
      
      // Should not throw when called with string
      expect(() => {
        const promise = agent.execute('test string');
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });

    it('should accept CoreMessage array input (new behavior)', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
      });

      const messages: CoreMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'Create a QR code for me' }
      ];

      expect(agent).toBeDefined();
      expect(typeof agent.execute).toBe('function');
      
      // Should not throw when called with message array
      expect(() => {
         const promise = agent.execute(messages);
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });

    it('should reject invalid input types', async () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
      });

      // Test invalid input types
      const result1 = await agent.execute(123 as any);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Input must be either a string or an array of messages');

       const result2 = await agent.execute(null as any);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Input must be either a string or an array of messages');
    });

    it('should handle empty message arrays', async () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
      });

      const emptyMessages: CoreMessage[] = [];

      // Should not throw when called with empty array
      const result = await agent.execute(emptyMessages);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty message array');
    });

    it('should handle messages with different content types', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
      });

      const messages: CoreMessage[] = [
        { role: 'user', content: 'String content' },
        { role: 'user', content: ['Array content'] },
        { role: 'assistant', content: 'Response content' }
      ];

      // Should not throw when called with mixed content types
      expect(() => {
        const promise = agent.execute(messages);
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });
  });

  describe('Streaming Agent', () => {
    it('should accept string input (original behavior)', () => {
      const agent = createStreamingAgent({
        model: 'claude-sonnet-4-20250514',
        tools: [qrcodeTool],
      });

      expect(agent).toBeDefined();
      expect(typeof agent.stream).toBe('function');
      
      // Should not throw when called with string
      expect(() => {
        const promise = agent.stream('test string');
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });

    it('should accept CoreMessage array input (new behavior)', () => {
      const agent = createStreamingAgent({
        model: 'claude-sonnet-4-20250514',
        tools: [qrcodeTool],
      });

      const messages: CoreMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'Create a QR code for me' }
      ];

      expect(agent).toBeDefined();
      expect(typeof agent.stream).toBe('function');
      
      // Should not throw when called with message array
      expect(() => {
        const promise = agent.stream(messages);
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });

    it('should reject invalid input types', async () => {
      const agent = createStreamingAgent({
        model: 'claude-sonnet-4-20250514',
        tools: [qrcodeTool],
      });

      // Test invalid input types
      try {
        await agent.stream(123 as any);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Input must be either a string or an array of messages');
      }
    });

    it('should handle complex message structures', () => {
      const agent = createStreamingAgent({
        model: 'claude-sonnet-4-20250514',
        tools: [qrcodeTool],
      });

      const complexMessages: CoreMessage[] = [
        { 
          role: 'system', 
          content: 'You are a helpful assistant' 
        },
        { 
          role: 'user', 
          content: 'Create a QR code for me' 
        },
        { 
          role: 'assistant', 
          content: 'I can help with QR code generation' 
        },
        { 
          role: 'tool',
          content: 'Tool result',
          toolCallId: 'test-call-id'
        },
        { 
          role: 'user', 
          content: 'Make it for https://example.com' 
        }
      ];

      // Should not throw when called with complex message structure
      expect(() => {
        const promise = agent.stream(complexMessages);
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });
  });

  describe('Message Conversion', () => {
    it('should handle system messages in message arrays', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
      });

      const messagesWithSystem: CoreMessage[] = [
        { role: 'system', content: 'Custom system prompt' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'Create a QR code for https://example.com' }
      ];

      // Should handle system messages without throwing
      expect(() => {
        const promise = agent.execute(messagesWithSystem);
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });

    it('should preserve conversation context', () => {
      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
        systemPrompt: 'You are a helpful assistant.',
      });

      const conversationHistory: CoreMessage[] = [
        { role: 'user', content: 'My name is Alice' },
        { role: 'assistant', content: 'Nice to meet you, Alice!' },
        { role: 'user', content: 'What was my name again?' }
      ];

      // Should maintain internal state correctly
      expect(() => {
        const promise = agent.execute(conversationHistory);
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();

      // Check that messages are being tracked
      const messages = agent.getMessages();
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should handle tool messages correctly', () => {
      const agent = createStreamingAgent({
        model: 'claude-sonnet-4-20250514',
        tools: [qrcodeTool],
      });

      const messagesWithTools: CoreMessage[] = [
        { role: 'user', content: 'Create a QR code for me' },
        { role: 'assistant', content: 'I\'ll create that QR code for you.' },
        { 
          role: 'tool', 
          content: '{"result": "qr_code_data"}',
          toolCallId: 'qr-123'
        },
        { role: 'assistant', content: 'Here is your QR code.' },
        { role: 'user', content: 'Can you make another one?' }
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
        tools: [qrcodeTool],
      });

      // These should compile without TypeScript errors
      const stringPromise = agent.execute('test');
      const messagesPromise = agent.execute([{ role: 'user', content: 'test' }]);

      expect(stringPromise).toBeDefined();
      expect(messagesPromise).toBeDefined();
    });

    it('should have proper streaming TypeScript overloads', () => {
      const agent = createStreamingAgent({
        model: 'claude-sonnet-4-20250514',
        tools: [qrcodeTool],
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
        { role: 'user' as const, content: 'Help me create a QR code' }
      ];

      // Convert to CoreMessage format
      const coreMessages: CoreMessage[] = aiSDKMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const agent = createAgent({
        model: 'gpt-4o-mini',
        tools: [qrcodeTool],
      });

      // Should work seamlessly with converted messages
      expect(() => {
        const promise = agent.execute(coreMessages);
        expect(promise).toBeInstanceOf(Promise);
      }).not.toThrow();
    });
  });
});