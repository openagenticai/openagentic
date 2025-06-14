import type { AIModel, Tool } from '../types';
import { SimpleOrchestrator } from './simple';
import { ConversationalOrchestrator } from './conversational';
import { TaskOrchestrator, type TaskStep } from './task';
import { builtInTools } from '../tools/built-in';

export function createResearchAssistant(model: AIModel): SimpleOrchestrator {
  const tools = [
    builtInTools.find(t => t.name === 'http_request')!,
    builtInTools.find(t => t.name === 'calculator')!,
  ];

  return new SimpleOrchestrator(
    model,
    tools,
    'You are a research assistant. Help users gather information, analyze data, and provide comprehensive reports. Use web requests to gather current information when needed.'
  );
}

export function createDataAnalyst(model: AIModel): SimpleOrchestrator {
  const tools = [
    builtInTools.find(t => t.name === 'calculator')!,
    builtInTools.find(t => t.name === 'timestamp')!,
  ];

  return new SimpleOrchestrator(
    model,
    tools,
    'You are a data analyst. Help users analyze data, perform calculations, and create insights. Be precise with numbers and show your work.'
  );
}

export function createAPIIntegrator(model: AIModel): SimpleOrchestrator {
  const tools = [
    builtInTools.find(t => t.name === 'http_request')!,
  ];

  return new SimpleOrchestrator(
    model,
    tools,
    'You are an API integration specialist. Help users connect to external services, test APIs, and integrate data from various sources.'
  );
}

export function createCustomerService(model: AIModel): ConversationalOrchestrator {
  return new ConversationalOrchestrator(
    model,
    [],
    'You are a helpful customer service assistant. Maintain a friendly, professional tone and help users with their questions and concerns.'
  );
}

export function createContentCreator(model: AIModel): TaskOrchestrator {
  const steps: TaskStep[] = [
    {
      name: 'Research',
      description: 'Research the topic and gather relevant information',
      tools: ['http_request'],
    },
    {
      name: 'Outline',
      description: 'Create a detailed outline for the content',
    },
    {
      name: 'Draft',
      description: 'Write the first draft of the content',
    },
    {
      name: 'Review',
      description: 'Review and refine the content for quality and accuracy',
    },
  ];

  return new TaskOrchestrator(
    model,
    builtInTools,
    steps,
    'You are a content creator. Create high-quality, engaging content following a systematic approach.'
  );
}

export function createProjectManager(model: AIModel): TaskOrchestrator {
  const steps: TaskStep[] = [
    {
      name: 'Requirements',
      description: 'Gather and analyze project requirements',
    },
    {
      name: 'Planning',
      description: 'Create a detailed project plan with milestones',
    },
    {
      name: 'Resource Allocation',
      description: 'Identify and allocate necessary resources',
    },
    {
      name: 'Timeline',
      description: 'Create a realistic timeline with dependencies',
      tools: ['timestamp'],
    },
    {
      name: 'Risk Assessment',
      description: 'Identify potential risks and mitigation strategies',
    },
  ];

  return new TaskOrchestrator(
    model,
    builtInTools,
    steps,
    'You are a project manager. Help users plan, organize, and manage projects effectively.'
  );
}