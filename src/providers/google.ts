import type { AIModel } from '../types';

export function createGoogleModel(options: {
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}): AIModel {
  return {
    provider: 'google',
    model: options.model,
    apiKey: options.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP,
  };
}

export function createGoogleVertexModel(options: {
  model: string;
  project: string;
  location?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}): AIModel {
  return {
    provider: 'google-vertex',
    model: options.model,
    project: options.project,
    location: options.location || 'us-central1',
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    topP: options.topP,
  };
}

export const googleModels = {
  gemini25ProPreview: (apiKey?: string) => createGoogleModel({
    model: 'gemini-2.5-pro-preview-06-05',
    ...(apiKey !== undefined && { apiKey }),
  }),
  gemini25FlashPreview: (apiKey?: string) => createGoogleModel({
    model: 'gemini-2.5-flash-preview-05-20',
    ...(apiKey !== undefined && { apiKey }),
  }),
  gemini15Pro: (apiKey?: string) => createGoogleModel({
    model: 'gemini-1.5-pro',
    ...(apiKey !== undefined && { apiKey }),
  }),
  gemini15Flash: (apiKey?: string) => createGoogleModel({
    model: 'gemini-1.5-flash',
    ...(apiKey !== undefined && { apiKey }),
  }),
};

export const googleVertexModels = {
  gemini25ProPreview: (project: string, location?: string) => createGoogleVertexModel({
    model: 'gemini-2.5-pro-preview-06-05',
    project,
    ...(location !== undefined && { location }),
  }),
  gemini25FlashPreview: (project: string, location?: string) => createGoogleVertexModel({
    model: 'gemini-2.5-flash-preview-05-20',
    project,
    ...(location !== undefined && { location }),
  }),
  gemini15Pro: (project: string, location?: string) => createGoogleVertexModel({
    model: 'gemini-1.5-pro',
    project,
    ...(location !== undefined && { location }),
  }),
  gemini15Flash: (project: string, location?: string) => createGoogleVertexModel({
    model: 'gemini-1.5-flash',
    project,
    ...(location !== undefined && { location }),
  }),
};