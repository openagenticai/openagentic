import type { BaseOrchestrator, OrchestratorType } from '../types';

// =============================================================================
// ORCHESTRATOR REGISTRY
// =============================================================================

/**
 * Global registry for storing orchestrator instances
 */
const orchestratorRegistry = new Map<string, BaseOrchestrator>();

/**
 * Register an orchestrator in the global registry
 * @param orchestrator - The orchestrator to register
 * @throws {Error} If an orchestrator with the same ID already exists
 */
export function registerOrchestrator(orchestrator: BaseOrchestrator): void {
  if (!orchestrator || !orchestrator.id) {
    throw new Error('Orchestrator must have a valid ID');
  }

  if (orchestratorRegistry.has(orchestrator.id)) {
    throw new Error(`Orchestrator with ID "${orchestrator.id}" already exists`);
  }

  // Validate orchestrator structure
  validateOrchestrator(orchestrator);

  orchestratorRegistry.set(orchestrator.id, orchestrator);
  
  console.log(`🎭 Orchestrator registered: ${orchestrator.id} (${orchestrator.type})`);
}

/**
 * Get an orchestrator by ID
 * @param id - The orchestrator ID
 * @returns The orchestrator instance or undefined if not found
 */
export function getOrchestrator(id: string): BaseOrchestrator | undefined {
  if (!id || typeof id !== 'string') {
    return undefined;
  }

  return orchestratorRegistry.get(id);
}

/**
 * List all registered orchestrators
 * @returns Array of all registered orchestrators
 */
export function listOrchestrators(): BaseOrchestrator[] {
  return Array.from(orchestratorRegistry.values());
}

/**
 * Get orchestrators by type
 * @param type - The orchestrator type to filter by
 * @returns Array of orchestrators matching the type
 */
export function getOrchestratorsByType(type: OrchestratorType): BaseOrchestrator[] {
  return Array.from(orchestratorRegistry.values()).filter(o => o.type === type);
}

/**
 * Check if an orchestrator is registered
 * @param id - The orchestrator ID
 * @returns True if the orchestrator is registered
 */
export function hasOrchestrator(id: string): boolean {
  return orchestratorRegistry.has(id);
}

/**
 * Unregister an orchestrator
 * @param id - The orchestrator ID to remove
 * @returns True if the orchestrator was removed, false if it didn't exist
 */
export function unregisterOrchestrator(id: string): boolean {
  const removed = orchestratorRegistry.delete(id);
  
  if (removed) {
    console.log(`🎭 Orchestrator unregistered: ${id}`);
  }
  
  return removed;
}

/**
 * Clear all registered orchestrators
 */
export function clearOrchestratorRegistry(): void {
  const count = orchestratorRegistry.size;
  orchestratorRegistry.clear();
  
  console.log(`🎭 Orchestrator registry cleared: ${count} orchestrators removed`);
}

/**
 * Get registry statistics
 * @returns Object with registry statistics
 */
export function getRegistryStats(): {
  total: number;
  byType: Record<OrchestratorType, number>;
  orchestratorIds: string[];
} {
  const orchestrators = Array.from(orchestratorRegistry.values());
  
  const byType: Record<OrchestratorType, number> = {
    'prompt-based': 0,
    'custom-logic': 0,
  };

  orchestrators.forEach(o => {
    byType[o.type]++;
  });

  return {
    total: orchestrators.length,
    byType,
    orchestratorIds: orchestrators.map(o => o.id),
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate orchestrator structure and required methods
 * @param orchestrator - The orchestrator to validate
 * @throws {Error} If the orchestrator is invalid
 */
function validateOrchestrator(orchestrator: BaseOrchestrator): void {
  // Required properties
  if (!orchestrator.id || typeof orchestrator.id !== 'string') {
    throw new Error('Orchestrator must have a valid string ID');
  }

  if (!orchestrator.name || typeof orchestrator.name !== 'string') {
    throw new Error('Orchestrator must have a valid string name');
  }

  if (!orchestrator.description || typeof orchestrator.description !== 'string') {
    throw new Error('Orchestrator must have a valid string description');
  }

  if (!orchestrator.type || !['prompt-based', 'custom-logic'].includes(orchestrator.type)) {
    throw new Error('Orchestrator must have a valid type (prompt-based or custom-logic)');
  }

  // Required methods
  if (typeof orchestrator.execute !== 'function') {
    throw new Error('Orchestrator must implement execute method');
  }

  if (typeof orchestrator.getName !== 'function') {
    throw new Error('Orchestrator must implement getName method');
  }

  if (typeof orchestrator.getDescription !== 'function') {
    throw new Error('Orchestrator must implement getDescription method');
  }

  if (typeof orchestrator.getType !== 'function') {
    throw new Error('Orchestrator must implement getType method');
  }

  // Type-specific validation
  if (orchestrator.type === 'prompt-based') {
    const promptOrchestrator = orchestrator as any;
    if (!promptOrchestrator.systemPrompt || typeof promptOrchestrator.systemPrompt !== 'string') {
      throw new Error('Prompt-based orchestrator must have a valid systemPrompt property');
    }

    if (typeof promptOrchestrator.getSystemPrompt !== 'function') {
      throw new Error('Prompt-based orchestrator must implement getSystemPrompt method');
    }
  }

  if (orchestrator.type === 'custom-logic') {
    const customOrchestrator = orchestrator as any;
    if (typeof customOrchestrator.customLogic !== 'function') {
      throw new Error('Custom-logic orchestrator must implement customLogic method');
    }
  }

  // Optional method validation
  if (orchestrator.validate && typeof orchestrator.validate !== 'function') {
    throw new Error('Orchestrator validate property must be a function if provided');
  }

  if (orchestrator.initialize && typeof orchestrator.initialize !== 'function') {
    throw new Error('Orchestrator initialize property must be a function if provided');
  }

  if (orchestrator.cleanup && typeof orchestrator.cleanup !== 'function') {
    throw new Error('Orchestrator cleanup property must be a function if provided');
  }
}

/**
 * Resolve orchestrator from string ID or instance
 * @param orchestratorInput - String ID or orchestrator instance
 * @returns The orchestrator instance or undefined if not found
 */
export function resolveOrchestrator(orchestratorInput: string | BaseOrchestrator | undefined): BaseOrchestrator | undefined {
  if (!orchestratorInput) {
    return undefined;
  }

  if (typeof orchestratorInput === 'string') {
    return getOrchestrator(orchestratorInput);
  }

  if (typeof orchestratorInput === 'object' && orchestratorInput.id) {
    // Validate the orchestrator object
    try {
      validateOrchestrator(orchestratorInput);
      return orchestratorInput;
    } catch (error) {
      console.warn(`🎭 Invalid orchestrator object: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  return undefined;
}