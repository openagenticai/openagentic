// =============================================================================
// ORCHESTRATOR EXPORTS
// =============================================================================

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
export { newsSpecialistOrchestrator } from './library/news-specialist';
export { flashHeadlinesOrchestrator } from './library/flash-headlines';

// Helper function to ensure all built-in orchestrators are loaded
export function loadBuiltInOrchestrators(): void {
  // Import orchestrators to trigger their registration
  require('./library/video-creator');
  require('./library/code-assessment');
  require('./library/news-specialist');
  require('./library/flash-headlines');
  
  console.log('🎭 All built-in orchestrators loaded');
}