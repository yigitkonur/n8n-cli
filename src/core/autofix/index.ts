/**
 * Autofix Module
 * 
 * Advanced autofix engine for workflow validation issues.
 * Provides expression validation, node similarity matching,
 * breaking change detection, and comprehensive fix generation.
 */

// Types and interfaces
export type {
  FixConfidenceLevel,
  FixType,
  FixOperation,
  AutoFixConfig,
  AutoFixResult,
  FixStats,
  ExpressionFormatIssue,
  ExpressionValidationResult,
  NodeSuggestion,
  CommonMistakePattern,
  ValidationContext,
  AppliedMigrationInfo,
} from './types.js';

// Breaking change type (from versioning module)
export type { BreakingChange } from '../versioning/index.js';

export {
  DEFAULT_AUTOFIX_CONFIG,
  createEmptyStats,
  CONFIDENCE_ORDER,
  getConfidenceIndex,
} from './types.js';

// Expression validator
export { ExpressionValidator } from './expression-validator.js';

// Node similarity service
export { NodeSimilarityService } from './node-similarity.js';
export type { SimilarityScore } from './node-similarity.js';

// Breaking changes registry (re-exported from versioning module)
export {
  BREAKING_CHANGES_REGISTRY,
  getBreakingChangesForNode,
  getAllChangesForNode,
  getAutoMigratableChanges,
  hasBreakingChanges,
  getMigrationHints,
  getNodesWithVersionMigrations,
  getTrackedVersionsForNode,
  compareVersions,
  getLatestRegistryVersion,
} from '../versioning/index.js';

// Versioning services (re-exported for convenience)
export {
  NodeVersionService,
  NodeMigrationService,
  BreakingChangeDetector,
} from '../versioning/index.js';

// Guidance generator (Post-Update Validator)
export {
  generateGuidanceFromFixes,
  generateGuidanceSummary,
} from './guidance-generator.js';

// Post-update guidance types
export type {
  PostUpdateGuidance,
  RequiredAction,
  DeprecatedProperty,
  BehaviorChange,
  MigrationResult,
  AppliedMigration,
  FixDetail,
  GuidanceConfidence,
  MigrationStatus,
  ActionPriority,
  ActionType,
} from './types.js';

// Main engine
export { WorkflowAutoFixer } from './engine.js';
