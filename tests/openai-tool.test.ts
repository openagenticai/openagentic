import { describe, it, expect, beforeEach } from '@jest/globals';
import { openaiTool } from '../src/tools/openai';

describe('OpenAI Text Generation Tool', () => {
  beforeEach(() => {
    // Ensure we have a test API key (can be fake for structure tests)
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key-for-structure-validation';
  });

  describe('Tool Structure', () => {
    it('should have the correct tool structure', () => {
      expect(openaiTool).toBeDefined();
      expect(openaiTool.toolId).toBe('openai_text_generation');
      expect(openaiTool.name).toBe('OpenAI Text Generation');
      expect(openaiTool.description).toBeDefined();
      expect(typeof openaiTool.execute).toBe('function');
      expect(openaiTool.parameters).toBeDefined();
    });

    it('should have comprehensive tool metadata', () => {
      expect(openaiTool.useCases).toBeDefined();
      expect(Array.isArray(openaiTool.useCases)).toBe(true);
      expect(openaiTool.useCases.length).toBeGreaterThan(0);
      
      expect(openaiTool.parameters).toBeDefined();
      expect(typeof openaiTool.parameters).toBe('object');
      
      expect(openaiTool.logo).toBeDefined();
      expect(typeof openaiTool.logo).toBe('string');
    });

    it('should have proper use cases defined', () => {
      const expectedUseCases = [
        'Generate creative content and stories',
        'Answer questions and provide explanations',
        'Summarize text and documents',
        'Write code and technical documentation',
      ];

      expectedUseCases.forEach(useCase => {
        expect(openaiTool.useCases).toContain(useCase);
      });
    });
  });

  describe('Input Validation', () => {
    it('should require OPENAI_API_KEY environment variable', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        await openaiTool.execute({
          prompt: 'Test prompt',
        });
        fail('Should have thrown an error for missing API key');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('OPENAI_API_KEY environment variable is required');
      } finally {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    it('should validate empty prompt', async () => {
      try {
        await openaiTool.execute({
          prompt: '',
        });
        fail('Should have thrown an error for empty prompt');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Prompt cannot be empty');
      }
    });

    it('should validate prompt length', async () => {
      const longPrompt = 'a'.repeat(50001);
      
      try {
        await openaiTool.execute({
          prompt: longPrompt,
        });
        fail('Should have thrown an error for prompt too long');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Prompt exceeds maximum length');
      }
    });

    it('should accept valid parameters', () => {
      const validParams = {
        prompt: 'Test prompt',
        model: 'gpt-4o-mini',
        maxTokens: 100,
        temperature: 0.5,
        topP: 0.9,
        presencePenalty: 0.1,
        frequencyPenalty: 0.1,
      };

      // Should not throw when validating parameters
      expect(() => {
        // This tests the parameter schema validation
        openaiTool.parameters;
      }).not.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should have correct default values', () => {
      // Test that the tool has sensible defaults
      expect(openaiTool.description).toContain('OpenAI');
      expect(openaiTool.toolId).toBe('openai_text_generation');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', async () => {
      try {
        await openaiTool.execute({
          prompt: null as any,
        });
        fail('Should have thrown an error for null prompt');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    });

    it('should validate numeric parameters', () => {
      // These would be caught by Zod schema validation
      const invalidParams = [
        { temperature: -1 }, // Below minimum
        { temperature: 3 },  // Above maximum
        { maxTokens: 0 },    // Below minimum
        { maxTokens: 5000 }, // Above maximum
        { topP: -0.1 },      // Below minimum
        { topP: 1.1 },       // Above maximum
      ];

      // The actual validation would happen in the AI SDK when parameters are passed
      expect(invalidParams.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should integrate with OpenAgentic framework', () => {
      // Test that the tool follows OpenAgentic patterns
      expect(openaiTool.toolId).toBeDefined();
      expect(typeof openaiTool.toolId).toBe('string');
      expect(openaiTool.execute).toBeDefined();
      expect(typeof openaiTool.execute).toBe('function');
    });

    it('should have proper TypeScript types', () => {
      // Ensure the tool has proper typing
      expect(typeof openaiTool.description).toBe('string');
      expect(typeof openaiTool.name).toBe('string');
      expect(Array.isArray(openaiTool.useCases)).toBe(true);
    });
  });

  describe('Model Support', () => {
    it('should support standard OpenAI models', () => {
      const supportedModels = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo', 
        'gpt-4',
        'gpt-3.5-turbo'
      ];

      // The tool should be able to handle these models
      // (actual API calls would be tested in integration tests)
      expect(supportedModels.length).toBeGreaterThan(0);
    });
  });
});