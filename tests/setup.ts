// Test setup file for Jest
import '@jest/globals';

// Mock environment variables for tests
process.env.GITHUB_TOKEN = 'mock-github-token';
process.env.OPENAI_API_KEY = 'mock-openai-key';
process.env.ANTHROPIC_API_KEY = 'mock-anthropic-key';

// Suppress console.log in tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Reset console mocks for each test
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore original console methods after each test
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
}); 