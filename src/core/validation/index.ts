/**
 * Enhanced Validation Module
 *
 * Provides comprehensive validation for n8n workflows including:
 * - Expression format validation
 * - Profile-based validation (minimal, runtime, ai-friendly, strict)
 * - Mode-based property filtering (minimal, operation, full)
 * - Node-specific validators for common nodes
 * - FixedCollection structure validation
 */

// ========== Types ==========
export {
  type ValidationMode,
  type ValidationProfile,
  type ValidationErrorType,
  type ValidationWarningType,
  type ValidationError,
  type ValidationWarning,
  type OperationContext,
  type BaseValidationResult,
  type EnhancedValidationResult,
  type NodeValidationContext,
  type FixedCollectionPattern,
  type NodeConfigValue,
  type NodeConfig,
  type FixedCollectionValidationResult,
  type DisplayOptions,
  type NodeProperty,
} from './types.js';

// ========== Enhanced Validator ==========
export { EnhancedConfigValidator } from './enhanced-validator.js';

// ========== Node-Specific Validators ==========
export { NodeSpecificValidators } from './node-specific.js';

// ========== FixedCollection Validator ==========
export { FixedCollectionValidator } from './fixed-collection.js';

// ========== Property Visibility ==========
export {
  isPropertyVisible,
  isPropertyRelevantToOperation,
  applyNodeDefaults,
  extractOperationContext,
} from './property-visibility.js';

// ========== Profile Filtering ==========
export {
  applyProfileFilters,
  generateNextSteps,
  deduplicateErrors,
  filterIssuesByProfile,
  filterErrorsByProfile,
} from './profile-filter.js';

// ========== Expression Validation ==========
export {
  ExpressionFormatValidator,
  type ExpressionFormatIssue,
  type ResourceLocatorField,
  type ExpressionValidationContext,
} from './expression-format.js';

export {
  UniversalExpressionValidator,
  type UniversalValidationResult,
} from './universal-expression.js';

export {
  ConfidenceScorer,
  type ConfidenceScore,
  type ConfidenceFactor,
} from './confidence-scorer.js';

// ========== Utility Functions ==========
export {
  isExpression,
  containsExpression,
  shouldSkipLiteralValidation,
  extractExpressionContent,
  hasMixedContent,
} from './expression-utils.js';

// ========== Pre-API Validation ==========
export {
  validateBeforeApi,
  displayValidationErrors,
  hasStructuralErrors,
  type PreValidationOptions,
  type PreValidationResult,
} from './pre-api-validator.js';
