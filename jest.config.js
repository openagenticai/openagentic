module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Handle ES module imports that don't work with Jest
  moduleNameMapper: {
    '^@octokit/rest$': '<rootDir>/tests/__mocks__/@octokit/rest.js'
  },
  // Transform ES modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(@octokit)/)'
  ],
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};