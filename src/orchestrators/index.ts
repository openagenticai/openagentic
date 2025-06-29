// =============================================================================
// ORCHESTRATOR EXPORTS
// =============================================================================

import { codeAssessmentOrchestrator } from './library/code-assessment';
import { enhancedImageGenerationOrchestrator } from './library/enhanced-image-generation';
import { flashHeadlinesOrchestrator } from './library/flash-headlines';
import { newsSpecialistOrchestrator } from './library/news-specialist';
import { videoCreatorOrchestrator } from './library/video-creator';

// Registry functions
export * from './registry';

// Prompt-based orchestrator utilities
export { PromptBasedOrchestratorClass, createPromptBasedOrchestrator } from './prompt-based';

// Custom logic orchestrator utilities  
export { CustomLogicOrchestratorClass, createCustomLogicOrchestrator } from './custom-logic';

// Multi-AI orchestrator utilities
export { MultiAIOrchestrator } from './multi-ai';

// Built-in orchestrators
export { videoCreatorOrchestrator } from './library/video-creator';
export { codeAssessmentOrchestrator } from './library/code-assessment';
export { enhancedImageGenerationOrchestrator } from './library/enhanced-image-generation';
export { newsSpecialistOrchestrator } from './library/news-specialist';
export { flashHeadlinesOrchestrator } from './library/flash-headlines';

export interface OrchestratorInfo {
  id: string;
  name: string;
  description: string;
  type: 'prompt-based' | 'custom-logic' | 'multi-ai';
  systemPrompt?: string;
  allowedTools?: string[];
}

export const orchestratorDescriptions: OrchestratorInfo[] = [videoCreatorOrchestrator, codeAssessmentOrchestrator, enhancedImageGenerationOrchestrator, newsSpecialistOrchestrator, flashHeadlinesOrchestrator].map(o => {
  return {
    id: o.id,
    name: o.name,
    description: o.description,
    type: o.type,
    systemPrompt: 'systemPrompt' in o ? o.systemPrompt : undefined,
    allowedTools: 'allowedTools' in o ? o.allowedTools : undefined,
  }
});

// Helper function to ensure all built-in orchestrators are loaded
export function loadBuiltInOrchestrators(): void {
  // Import orchestrators to trigger their registration
  require('./library/video-creator');
  require('./library/code-assessment');
  require('./library/enhanced-image-generation');
  require('./library/news-specialist');
  require('./library/flash-headlines');
  
  console.log('🎭 All built-in orchestrators loaded');
}