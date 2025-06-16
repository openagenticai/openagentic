// =============================================================================
// MAIN TOOL EXPORTS
// =============================================================================

// Import all individual tools
export { httpTool } from './http';
export { calculatorTool } from './calculator';
export { timestampTool } from './timestamp';

// Tool utilities
export { toOpenAgenticTool } from './utils';

// =============================================================================
// TOOL COLLECTIONS
// =============================================================================

import { httpTool } from './http';
import { calculatorTool } from './calculator';
import { timestampTool } from './timestamp';

// Categorized tool collections
export const utilityTools = [httpTool, calculatorTool, timestampTool];
export const allTools = [...utilityTools];
