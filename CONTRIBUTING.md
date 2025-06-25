# Contributing to OpenAgentic

We welcome contributions to OpenAgentic! This guide will help you get started with contributing to the project.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **Package Manager**: npm, pnpm, yarn, or bun
- **Git**: For version control

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/openagentic.git
   cd openagentic
   ```

3. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   # or
   bun install
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Add your API keys for testing
   ```

5. **Build the project**:
   ```bash
   npm run build
   ```

6. **Run tests**:
   ```bash
   npm test
   ```

## 📁 Project Structure

```
openagentic/
├── src/                    # Source code
│   ├── tools/             # Built-in tools
│   ├── orchestrators/     # Orchestration logic
│   ├── providers/         # AI provider integrations
│   ├── utils/             # Utility functions
│   ├── types.ts           # TypeScript definitions
│   ├── orchestrator.ts    # Main orchestrator class
│   ├── streaming-orchestrator.ts  # Streaming orchestrator
│   └── index.ts           # Main entry point
├── tests/                 # Test files
├── examples/              # Example scripts and documentation
├── guides/                # Documentation guides
├── dist/                  # Built output (generated)
└── docs/                  # Additional documentation
```

## 🛠️ Development Scripts

```bash
# Development
npm run dev              # Watch mode for development
npm run build            # Build the project
npm run clean            # Clean build artifacts

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:tools       # Test individual tools
npm run test:orchestrators  # Test orchestrators

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run type-check       # Run TypeScript type checking

# Examples
npm run example:basic    # Run basic agent example
npm run example:streaming # Run streaming example
npm run example:tools    # Run tool creation example
```

## 🎯 Types of Contributions

### 🐛 Bug Reports

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the bug
- **Expected vs actual behavior**
- **Environment details** (Node.js version, OS, package manager)
- **Code examples** that demonstrate the issue
- **Error messages** (full stack traces if available)

### ✨ Feature Requests

For new features, please provide:

- **Use case description** - Why is this feature needed?
- **Proposed solution** - How should it work?
- **Alternative solutions** - Other approaches considered
- **Implementation details** - Technical considerations
- **Breaking changes** - Will this affect existing code?

### 🔧 Tool Contributions

OpenAgentic has an extensive tool ecosystem. To contribute a new tool:

1. **Create the tool file** in `src/tools/your-tool.ts`
2. **Follow the tool interface**:
   ```typescript
   import { z } from 'zod';
   import { toOpenAgenticTool } from './utils';

   export const yourTool = toOpenAgenticTool({
     toolId: 'your_tool_id',
     name: 'Your Tool Name',
     description: 'What your tool does',
     useCases: ['Use case 1', 'Use case 2'],
     logo: '🔧', // Emoji or icon
     parameters: z.object({
       // Define your parameters with Zod schema
       input: z.string().describe('Description of the input')
     }),
     execute: async ({ input }) => {
       // Your tool logic here
       return { result: 'Tool output' };
     }
   });
   ```

3. **Export your tool** in `src/tools/index.ts`
4. **Add example** in `examples/scripts/tool-testing.ts`
5. **Add tests** in `tests/your-tool.test.ts`
6. **Update documentation** if needed

### 🎭 Orchestrator Contributions

To add new orchestrators:

1. **Create orchestrator file** in `src/orchestrators/your-orchestrator.ts`
2. **Implement the interface**:
   ```typescript
   import type { BaseOrchestrator } from '../types';

   export class YourOrchestrator implements BaseOrchestrator {
     id = 'your-orchestrator';
     name = 'Your Orchestrator';
     description = 'What your orchestrator does';
     type = 'custom-logic' as const;

     async execute(input, context) {
       // Your orchestration logic
     }
   }
   ```

3. **Register the orchestrator** in `src/orchestrators/registry.ts`
4. **Add example** in `examples/scripts/orchestrator-testing.ts`
4. **Add comprehensive tests**
5. **Document usage examples**

## 📝 Code Style & Standards

### TypeScript Guidelines

- **Use strict types** - Avoid `any` when possible
- **Prefer interfaces** over type aliases for object shapes
- **Use Zod schemas** for runtime validation
- **Document complex types** with JSDoc comments
- **Export types** that may be useful to consumers

### Code Formatting

- **ESLint configuration** is enforced via `.eslintrc.js`
- **Automatic formatting** on save is recommended
- **No unused variables** or imports
- **Consistent naming** - camelCase for variables, PascalCase for classes
- **Clear function signatures** with return types

### Error Handling

- **Use proper error types** with meaningful messages
- **Validate inputs** using Zod schemas
- **Handle async errors** appropriately
- **Provide context** in error messages
- **Log errors** with appropriate levels

## 🧪 Testing Guidelines

### Test Structure

- **Unit tests** for individual functions and classes
- **Integration tests** for tool and orchestrator interactions
- **Example tests** to ensure examples work correctly

### Writing Tests

```typescript
import { describe, expect, test } from '@jest/globals';
import { yourFunction } from '../src/your-module';

describe('YourModule', () => {
  test('should handle basic functionality', async () => {
    const result = await yourFunction('test input');
    expect(result).toEqual('expected output');
  });

  test('should handle error cases', async () => {
    await expect(yourFunction('')).rejects.toThrow('Expected error message');
  });
});
```

### Test Coverage

- **Aim for 80%+ coverage** on new code
- **Test edge cases** and error conditions
- **Mock external dependencies** appropriately
- **Use descriptive test names** that explain the scenario

## 🔄 Pull Request Process

### Before Submitting

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Test thoroughly**:
   ```bash
   npm test
   npm run lint
   npm run type-check
   npm run build
   ```

4. **Update documentation** if needed

5. **Add/update tests** for your changes

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated and passing
- [ ] Documentation updated if needed
- [ ] No breaking changes (or clearly documented)
- [ ] Examples work with your changes
- [ ] Commit messages are clear and descriptive

### PR Description

Please include:

- **Summary** of changes made
- **Motivation** for the changes
- **Testing** details and coverage
- **Breaking changes** (if any)
- **Related issues** (if applicable)

## 🚦 CI/CD Process

Our GitHub Actions workflow automatically:

- **Runs tests** on multiple Node.js versions
- **Checks code quality** with ESLint
- **Validates TypeScript** compilation
- **Builds the package** successfully
- **Publishes releases** using Changesets

## 📦 Release Process

We use [Changesets](https://github.com/changesets/changesets) for version management:

1. **Add a changeset** for your PR:
   ```bash
   npx changeset add
   ```

2. **Select change type**: patch, minor, or major
3. **Describe your changes** in the changeset
4. **Commit the changeset** with your PR

## 🌍 Community Guidelines

### Code of Conduct

- **Be respectful** and inclusive
- **Provide constructive feedback**
- **Help newcomers** learn and contribute
- **Focus on the technology**, not personalities
- **Collaborate openly** and transparently

### Communication

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and community chat
- **Pull Requests** - Code review and collaboration

## 🏆 Recognition

Contributors are recognized in:

- **README contributors section** (if significant contributions)
- **Release notes** for their specific contributions
- **GitHub contributor graph** automatically

## 📚 Additional Resources

- [Vercel AI SDK Docs](https://ai-sdk.dev/docs/ai-sdk-ui)

## 🤝 Getting Help

If you need help:

1. **Check the documentation** and existing issues
2. **Search discussions** for similar questions
3. **Create a GitHub discussion** for questions
4. **Open an issue** for bugs or feature requests

---

**Thank you for contributing to OpenAgentic!** 🤖✨

Your contributions help make AI agent development more accessible and powerful for everyone.
