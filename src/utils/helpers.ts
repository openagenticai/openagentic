export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const attempt = async (): Promise<void> => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          setTimeout(attempt, delayMs * attempts);
        }
      }
    };

    attempt();
  });
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  }
  return `${(tokens / 1000).toFixed(1)}K tokens`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}