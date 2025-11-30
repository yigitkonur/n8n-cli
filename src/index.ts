// Core validation (existing)
export { jsonParse } from './core/json-parser.js';
export { validateWorkflowStructure, type ValidateOptions } from './core/validator.js';
export { validateNodeWithN8n } from './core/n8n-native-validator.js';
export { nodeRegistry } from './core/n8n-loader.js';
export { fixInvalidOptionsFields, applyExperimentalFixes, type ExperimentalFix, type FixResult } from './core/fixer.js';
export { sanitizeWorkflow } from './core/sanitizer.js';
export { createSourceMap, findSourceLocation, extractSnippet } from './core/source-location.js';
export type { 
  Workflow, 
  WorkflowNode, 
  ValidationResult, 
  ValidationSummary,
  ValidationIssue,
  SourceLocation,
  SourceSnippet,
  IssueSeverity
} from './core/types.js';

// Database (new)
export { NodeRepository, getNodeRepository } from './core/db/nodes.js';
export type { NodeSearchResult, NodeInfo } from './core/db/nodes.js';
export { createDatabaseAdapter, getDatabase, closeDatabase } from './core/db/adapter.js';
export type { DatabaseAdapter } from './core/db/adapter.js';

// Config (new)
export { loadConfig, getConfig, validateConfig, maskApiKey } from './core/config/loader.js';

// Utilities (new)
export { NodeTypeNormalizer } from './utils/node-type-normalizer.js';
export * from './utils/errors.js';

// Formatters (new)
export * from './core/formatters/index.js';

// Types (new)
export * from './types/index.js';
