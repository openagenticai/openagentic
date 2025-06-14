import { z } from 'zod';

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeToolName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

export function validateApiKey(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.length > 0;
}