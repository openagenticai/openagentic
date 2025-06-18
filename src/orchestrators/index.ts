// =============================================================================
// ORCHESTRATOR EXPORTS
// =============================================================================

// Registry functions
export * from './registry';

// Prompt-based orchestrator utilities
export { PromptBasedOrchestratorClass, createPromptBasedOrchestrator } from './prompt-based';

// Built-in orchestrators
export { videoCreatorOrchestrator } from './video-creator';

// Helper function to ensure all built-in orchestrators are loaded
export function loadBuiltInOrchestrators(): void {
  // Import orchestrators to trigger their registration
  require('./video-creator');
  
  console.log('🎭 All built-in orchestrators loaded');
}