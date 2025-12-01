/**
 * Autofix Types and Interfaces
 * 
 * Defines the core types for the advanced autofix engine.
 * Ported from n8n-mcp/src/services/workflow-auto-fixer.ts with CLI adaptations.
 */

import type { Workflow } from '../types.js';

/**
 * Confidence levels for fix operations
 * - high: Safe to auto-apply (>90% certainty)
 * - medium: Review recommended before applying
 * - low: Informational only, requires manual action
 */
export type FixConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Types of fixes the engine can generate
 */
export type FixType =
  | 'expression-format'       // Add missing = prefix to expressions (HIGH)
  | 'typeversion-correction'  // Fix version exceeding max supported (HIGH)
  | 'error-output-config'     // Remove invalid onError settings (MEDIUM)
  | 'node-type-correction'    // Fix typos in node types (HIGH when >90%)
  | 'webhook-missing-path'    // Generate UUID paths for webhooks (HIGH)
  | 'switch-options'          // Fix Switch/If node options (HIGH) - existing CLI fixes
  | 'typeversion-upgrade'     // Proactive version upgrades (MEDIUM)
  | 'version-migration';      // Handle breaking changes (LOW)

/**
 * Applied migration from version upgrade
 */
export interface AppliedMigrationInfo {
  /** Property that was changed */
  propertyName: string;
  /** Action taken (e.g., 'Added property', 'Removed property') */
  action: string;
  /** Old value if applicable */
  oldValue?: unknown;
  /** New value if applicable */
  newValue?: unknown;
}

/**
 * A single fix operation that can be applied to a workflow
 */
export interface FixOperation {
  /** Node name where the fix applies */
  node: string;
  /** Field path being modified (e.g., 'parameters.url', 'typeVersion') */
  field: string;
  /** Type of fix being applied */
  type: FixType;
  /** Value before the fix */
  before: unknown;
  /** Value after the fix */
  after: unknown;
  /** Confidence level of this fix */
  confidence: FixConfidenceLevel;
  /** Human-readable description of the fix */
  description: string;
  /** Optional: Node ID for reference */
  nodeId?: string;
  /** For version-migration: list of parameter changes applied */
  appliedMigrations?: AppliedMigrationInfo[];
  /** For version-migration: list of issues requiring manual action */
  remainingIssues?: string[];
  /** For version-migration: the new typeVersion to apply */
  newTypeVersion?: number;
}

/**
 * Configuration for the autofix engine
 */
export interface AutoFixConfig {
  /** Whether to actually apply fixes to the workflow object */
  applyFixes: boolean;
  /** Filter to specific fix types (undefined = all types) */
  fixTypes?: FixType[];
  /** Minimum confidence level to include (undefined = all levels) */
  confidenceThreshold?: FixConfidenceLevel;
  /** Maximum number of fixes to generate (default: 50) */
  maxFixes?: number;
}

/**
 * Statistics about generated fixes
 */
export interface FixStats {
  /** Total number of fixes */
  total: number;
  /** Count by fix type */
  byType: Record<FixType, number>;
  /** Count by confidence level */
  byConfidence: Record<FixConfidenceLevel, number>;
}

/**
 * Result from the autofix engine
 */
export interface AutoFixResult {
  /** List of fix operations */
  fixes: FixOperation[];
  /** Statistics about the fixes */
  stats: FixStats;
  /** Human-readable summary */
  summary: string;
  /** Modified workflow (only if applyFixes=true) */
  workflow?: Workflow;
}

/**
 * Issue detected in expression format validation
 */
export interface ExpressionFormatIssue {
  /** Path to the field (e.g., 'parameters.url') */
  fieldPath: string;
  /** Current value with the issue */
  currentValue: unknown;
  /** Corrected value */
  correctedValue: unknown;
  /** Type of issue detected */
  issueType: 'missing-prefix' | 'needs-resource-locator' | 'invalid-syntax' | 'mixed-format';
  /** Human-readable explanation */
  explanation: string;
  /** Severity level */
  severity: 'error' | 'warning';
  /** Confidence score (0.0 to 1.0) for node-specific recommendations */
  confidence?: number;
}

/**
 * Result from universal expression validation
 */
export interface ExpressionValidationResult {
  /** Whether the expression is valid */
  isValid: boolean;
  /** Whether the value contains an expression */
  hasExpression: boolean;
  /** Whether the expression needs = prefix */
  needsPrefix: boolean;
  /** Whether it's mixed literal + expression content */
  isMixedContent: boolean;
  /** Confidence level (always 1.0 for universal rules) */
  confidence: number;
  /** Suggested correction */
  suggestion?: string;
  /** Explanation of the validation result */
  explanation: string;
}

/**
 * Node suggestion for similarity-based corrections
 */
export interface NodeSuggestion {
  /** Suggested node type (e.g., 'n8n-nodes-base.slack') */
  nodeType: string;
  /** Display name of the node */
  displayName: string;
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  /** Reason for the suggestion */
  reason: string;
  /** Category of the node */
  category?: string;
  /** Description of the node */
  description?: string;
  /** Whether this can be auto-fixed (confidence >= 0.9) */
  autoFixable?: boolean;
}

/**
 * Common mistake pattern for node type corrections
 */
export interface CommonMistakePattern {
  /** Pattern to match (case-insensitive) */
  pattern: string;
  /** Suggested correct node type */
  suggestion: string;
  /** Confidence score */
  confidence: number;
  /** Reason for the correction */
  reason: string;
}

/**
 * Breaking change entry in the registry
 */
export interface BreakingChange {
  /** Node type this applies to (* for all) */
  nodeType: string;
  /** Version before the change */
  fromVersion: string;
  /** Version after the change */
  toVersion: string;
  /** Property that changed */
  propertyName: string;
  /** Type of change */
  changeType: 'added' | 'removed' | 'renamed' | 'type_changed' | 'requirement_changed' | 'default_changed';
  /** Whether this is a breaking change */
  isBreaking: boolean;
  /** Previous value (if applicable) */
  oldValue?: string;
  /** New value (if applicable) */
  newValue?: string;
  /** Migration hint for users/AI */
  migrationHint: string;
  /** Whether this can be auto-migrated */
  autoMigratable: boolean;
  /** Migration strategy details */
  migrationStrategy?: {
    type: 'add_property' | 'remove_property' | 'rename_property' | 'set_default';
    defaultValue?: unknown;
    sourceProperty?: string;
    targetProperty?: string;
  };
  /** Severity of the change */
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Context for expression validation
 */
export interface ValidationContext {
  /** Node type being validated */
  nodeType: string;
  /** Node name */
  nodeName: string;
  /** Node ID (optional) */
  nodeId?: string;
}

/**
 * Default autofix configuration
 */
export const DEFAULT_AUTOFIX_CONFIG: AutoFixConfig = {
  applyFixes: false,
  confidenceThreshold: 'medium',
  maxFixes: 50,
};

/**
 * Create initial empty fix stats
 */
export function createEmptyStats(): FixStats {
  return {
    total: 0,
    byType: {
      'expression-format': 0,
      'typeversion-correction': 0,
      'error-output-config': 0,
      'node-type-correction': 0,
      'webhook-missing-path': 0,
      'switch-options': 0,
      'typeversion-upgrade': 0,
      'version-migration': 0,
    },
    byConfidence: {
      high: 0,
      medium: 0,
      low: 0,
    },
  };
}

/**
 * Confidence level ordering for filtering
 */
export const CONFIDENCE_ORDER: FixConfidenceLevel[] = ['high', 'medium', 'low'];

/**
 * Get the index of a confidence level for comparison
 */
export function getConfidenceIndex(level: FixConfidenceLevel): number {
  return CONFIDENCE_ORDER.indexOf(level);
}

// =============================================================================
// POST-UPDATE GUIDANCE TYPES
// Ported from n8n-mcp/src/services/post-update-validator.ts
// =============================================================================

/**
 * Confidence levels for migration guidance (uppercase for MCP compatibility)
 */
export type GuidanceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Migration status indicating completion level
 */
export type MigrationStatus = 'complete' | 'partial' | 'manual_required';

/**
 * Priority levels for required actions
 */
export type ActionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Types of required actions after migration
 */
export type ActionType = 'ADD_PROPERTY' | 'UPDATE_PROPERTY' | 'CONFIGURE_OPTION' | 'REVIEW_CONFIGURATION';

/**
 * Comprehensive post-update guidance for a migrated node
 * Provides actionable information for users/AI about what was changed,
 * what manual steps remain, and how to verify the migration.
 */
export interface PostUpdateGuidance {
  /** Node ID (short UUID) */
  nodeId: string;
  /** Node display name */
  nodeName: string;
  /** Full node type (e.g., 'n8n-nodes-base.switch') */
  nodeType: string;
  /** Version before fix/migration */
  oldVersion: string;
  /** Version after fix/migration */
  newVersion: string;
  /** Overall migration status */
  migrationStatus: MigrationStatus;
  /** Actions user must take */
  requiredActions: RequiredAction[];
  /** Properties that were removed or deprecated */
  deprecatedProperties: DeprecatedProperty[];
  /** Behavior changes between versions */
  behaviorChanges: BehaviorChange[];
  /** Step-by-step migration instructions */
  migrationSteps: string[];
  /** Confidence level in the migration */
  confidence: GuidanceConfidence;
  /** Estimated time for manual tasks (e.g., '5 minutes', '< 1 minute') */
  estimatedTime: string;
}

/**
 * An action the user must take after migration
 */
export interface RequiredAction {
  /** Type of action required */
  type: ActionType;
  /** Property path affected (e.g., 'parameters.sendBody') */
  property: string;
  /** Reason this action is needed */
  reason: string;
  /** Suggested value to set */
  suggestedValue?: unknown;
  /** Current value (if applicable) */
  currentValue?: unknown;
  /** Link to documentation */
  documentation?: string;
  /** Priority of this action */
  priority: ActionPriority;
}

/**
 * A property that was deprecated or removed in the new version
 */
export interface DeprecatedProperty {
  /** Property path that changed */
  property: string;
  /** Whether it was fully removed or just deprecated */
  status: 'removed' | 'deprecated';
  /** Replacement property to use instead */
  replacement?: string;
  /** What action to take */
  action: 'remove' | 'replace' | 'ignore';
  /** Impact level */
  impact: 'breaking' | 'warning';
}

/**
 * A behavior change between versions
 */
export interface BehaviorChange {
  /** Aspect of node behavior that changed (e.g., 'data passing', 'response handling') */
  aspect: string;
  /** How it worked before */
  oldBehavior: string;
  /** How it works now */
  newBehavior: string;
  /** Impact level */
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Whether user action is required */
  actionRequired: boolean;
  /** Recommendation for handling this change */
  recommendation: string;
}

/**
 * Result from a node migration operation
 */
export interface MigrationResult {
  /** Whether migration was successful */
  success: boolean;
  /** Node ID */
  nodeId: string;
  /** Node display name */
  nodeName: string;
  /** Version before migration */
  fromVersion: string;
  /** Version after migration */
  toVersion: string;
  /** Migrations that were applied automatically */
  appliedMigrations: AppliedMigration[];
  /** Issues that need manual resolution */
  remainingIssues: string[];
  /** Confidence in the migration result */
  confidence: GuidanceConfidence;
  /** The updated node object */
  updatedNode: unknown;
}

/**
 * A migration that was automatically applied
 */
export interface AppliedMigration {
  /** Property that was modified */
  propertyName: string;
  /** Action taken (e.g., 'Added property', 'Removed property') */
  action: string;
  /** Value before the change */
  oldValue?: unknown;
  /** Value after the change */
  newValue?: unknown;
  /** Human-readable description */
  description: string;
}

/**
 * Detailed information about a single fix that was applied
 * Used to generate PostUpdateGuidance
 */
export interface FixDetail {
  /** Node ID */
  nodeId: string;
  /** Node display name */
  nodeName: string;
  /** Node type (e.g., 'n8n-nodes-base.switch') */
  nodeType: string;
  /** Node version (typeVersion) */
  nodeVersion?: number;
  /** Type of fix that was applied */
  fixType: FixType;
  /** Property path that was fixed */
  propertyPath: string;
  /** Value before the fix */
  oldValue?: unknown;
  /** Value after the fix */
  newValue?: unknown;
  /** Human-readable description of the fix */
  description: string;
  /** Confidence level of the fix */
  confidence: FixConfidenceLevel;
}
