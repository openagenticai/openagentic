export class OpenAgenticError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAgenticError';
  }
}

export class OrchestratorError extends OpenAgenticError {
  constructor(message: string) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

export class ProviderError extends OpenAgenticError {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ToolError extends OpenAgenticError {
  constructor(message: string) {
    super(message);
    this.name = 'ToolError';
  }
}

export class BudgetExceededError extends OpenAgenticError {
  constructor(
    public resourceType: 'cost' | 'tokens' | 'tool_calls',
    public currentValue: number,
    public limit: number
  ) {
    super(`Budget exceeded: ${resourceType} limit of ${limit} exceeded (current: ${currentValue})`);
    this.name = 'BudgetExceededError';
  }
}

export class MaxIterationsError extends OpenAgenticError {
  constructor(maxIterations: number) {
    super(`Maximum iterations reached: ${maxIterations}`);
    this.name = 'MaxIterationsError';
  }
}

export class ValidationError extends OpenAgenticError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}