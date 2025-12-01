/**
 * Workflow Diff Module
 * Public exports for workflow diff engine functionality
 */

// Engine
export { WorkflowDiffEngine } from './engine.js';

// Sanitizer
export { sanitizeNode, sanitizeWorkflowNodes, validateNodeMetadata } from './sanitizer.js';

// Utilities
export { isActivatableTrigger, isTriggerNode, normalizeNodeType } from './utils.js';
