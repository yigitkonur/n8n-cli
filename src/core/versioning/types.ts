/**
 * Versioning Types
 *
 * TypeScript interfaces for breaking change detection and version migration.
 * Adapted from n8n-mcp/src/services for CLI use.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Severity levels for breaking changes
 */
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Types of property changes between versions
 */
export type ChangeType =
  | 'added'
  | 'removed'
  | 'renamed'
  | 'type_changed'
  | 'requirement_changed'
  | 'default_changed';

/**
 * Migration strategy types
 */
export type MigrationStrategyType =
  | 'add_property'
  | 'remove_property'
  | 'rename_property'
  | 'set_default';

// ============================================================================
// Migration Strategy
// ============================================================================

/**
 * Defines how to automatically migrate a breaking change
 */
export interface MigrationStrategy {
  type: MigrationStrategyType;
  /** Default value to set for add_property or set_default */
  defaultValue?: unknown;
  /** Source property name for rename_property */
  sourceProperty?: string;
  /** Target property name for rename_property */
  targetProperty?: string;
}

// ============================================================================
// Breaking Change
// ============================================================================

/**
 * A known breaking change in the registry
 */
export interface BreakingChange {
  /** Node type this change applies to (or '*' for global) */
  nodeType: string;
  /** Starting version where this change applies */
  fromVersion: string;
  /** Ending version where this change applies */
  toVersion: string;
  /** Property path affected (e.g., 'parameters.inputFieldMapping') */
  propertyName: string;
  /** Type of change */
  changeType: ChangeType;
  /** Whether this change breaks existing workflows */
  isBreaking: boolean;
  /** Previous value (for type_changed, renamed) */
  oldValue?: string;
  /** New value (for type_changed, renamed) */
  newValue?: string;
  /** Human-readable migration instructions */
  migrationHint: string;
  /** Whether this can be automatically fixed */
  autoMigratable: boolean;
  /** Strategy for auto-migration */
  migrationStrategy?: MigrationStrategy;
  /** Severity level */
  severity: Severity;
}

// ============================================================================
// Detected Change
// ============================================================================

/**
 * A change detected during version analysis
 */
export interface DetectedChange {
  /** Property path affected */
  propertyName: string;
  /** Type of change */
  changeType: ChangeType;
  /** Whether this change breaks existing workflows */
  isBreaking: boolean;
  /** Previous value */
  oldValue?: unknown;
  /** New value */
  newValue?: unknown;
  /** Human-readable migration instructions */
  migrationHint: string;
  /** Whether this can be automatically fixed */
  autoMigratable: boolean;
  /** Strategy for auto-migration */
  migrationStrategy?: MigrationStrategy;
  /** Severity level */
  severity: Severity;
  /** Where this change was detected: registry or dynamic schema comparison */
  source: 'registry' | 'dynamic';
}

// ============================================================================
// Version Upgrade Analysis
// ============================================================================

/**
 * Complete analysis of a version upgrade
 */
export interface VersionUpgradeAnalysis {
  /** Node type analyzed */
  nodeType: string;
  /** Current version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Whether any breaking changes exist */
  hasBreakingChanges: boolean;
  /** List of all detected changes */
  changes: DetectedChange[];
  /** Count of changes that can be auto-migrated */
  autoMigratableCount: number;
  /** Count of changes requiring manual intervention */
  manualRequiredCount: number;
  /** Overall severity of the upgrade */
  overallSeverity: Severity;
  /** Actionable recommendations */
  recommendations: string[];
}

// ============================================================================
// Version Comparison
// ============================================================================

/**
 * Result of comparing current vs latest version
 */
export interface VersionComparison {
  /** Node type analyzed */
  nodeType: string;
  /** Current version in use */
  currentVersion: string;
  /** Latest available version */
  latestVersion: string;
  /** Whether current is behind latest */
  isOutdated: boolean;
  /** Number of versions behind */
  versionGap: number;
  /** Whether upgrade path has breaking changes */
  hasBreakingChanges: boolean;
  /** Whether upgrade is recommended */
  recommendUpgrade: boolean;
  /** Confidence in the recommendation */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Explanation of the recommendation */
  reason: string;
}

// ============================================================================
// Node Version Info
// ============================================================================

/**
 * Version metadata for a node
 */
export interface NodeVersion {
  /** Node type */
  nodeType: string;
  /** Version string */
  version: string;
  /** Package name (e.g., n8n-nodes-base) */
  packageName: string;
  /** Human-readable name */
  displayName: string;
  /** Whether this is the current maximum version */
  isCurrentMax: boolean;
  /** Minimum n8n version required */
  minimumN8nVersion?: string;
  /** Breaking changes introduced in this version */
  breakingChanges: BreakingChange[];
  /** Properties deprecated in this version */
  deprecatedProperties: string[];
  /** Properties added in this version */
  addedProperties: string[];
  /** When this version was released */
  releasedAt?: Date;
}

// ============================================================================
// Upgrade Path
// ============================================================================

/**
 * Single step in an upgrade path
 */
export interface UpgradeStep {
  /** Starting version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Number of breaking changes in this step */
  breakingChanges: number;
  /** Migration hints for this step */
  migrationHints: string[];
}

/**
 * Complete upgrade path from current to target version
 */
export interface UpgradePath {
  /** Node type */
  nodeType: string;
  /** Starting version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Whether direct upgrade is possible */
  direct: boolean;
  /** Intermediate versions if multi-step */
  intermediateVersions: string[];
  /** Total breaking changes across all steps */
  totalBreakingChanges: number;
  /** Changes that can be auto-migrated */
  autoMigratableChanges: number;
  /** Changes requiring manual work */
  manualRequiredChanges: number;
  /** Estimated effort level */
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Individual upgrade steps */
  steps: UpgradeStep[];
}

// ============================================================================
// Migration Result
// ============================================================================

/**
 * Result of applying a migration to a node
 */
export interface MigrationResult {
  /** Node name in workflow */
  nodeName: string;
  /** Node type */
  nodeType: string;
  /** Starting version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Migrations that were applied */
  appliedMigrations: AppliedMigration[];
  /** Issues that could not be auto-fixed */
  remainingIssues: string[];
  /** Confidence in the migration */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Details of a single applied migration
 */
export interface AppliedMigration {
  /** Property that was modified */
  propertyName: string;
  /** What action was taken */
  action: string;
  /** Previous value */
  oldValue?: unknown;
  /** New value */
  newValue?: unknown;
}

// ============================================================================
// Workflow Upgrade Analysis
// ============================================================================

/**
 * Analysis of all nodes in a workflow that need upgrades
 */
export interface WorkflowUpgradeAnalysis {
  /** Total nodes with available upgrades */
  nodesWithUpgrades: number;
  /** Total breaking changes across all nodes */
  breakingChangesTotal: number;
  /** Total auto-migratable changes */
  autoMigratableTotal: number;
  /** Per-node analysis */
  nodes: NodeUpgradeSummary[];
}

/**
 * Summary of upgrade needs for a single node
 */
export interface NodeUpgradeSummary {
  /** Node name in workflow */
  nodeName: string;
  /** Node type */
  nodeType: string;
  /** Current version */
  currentVersion: string;
  /** Latest available version */
  latestVersion: string;
  /** Number of breaking changes */
  breakingChanges: number;
  /** Number of auto-migratable changes */
  autoMigratable: number;
  /** Overall severity */
  severity: Severity;
}

// ============================================================================
// Workflow Version Management Types
// ============================================================================

/**
 * Trigger types for workflow version creation
 */
export type VersionTrigger = 'partial_update' | 'full_update' | 'autofix' | 'manual';

/**
 * Full workflow version stored in database
 */
export interface WorkflowVersion {
  id: number;
  workflowId: string;
  versionNumber: number;
  workflowName: string;
  workflowSnapshot: any;
  trigger: VersionTrigger;
  operations?: any[];
  fixTypes?: string[];
  metadata?: any;
  createdAt: string;
}

/**
 * Lightweight version info for listings
 */
export interface VersionInfo {
  id: number;
  workflowId: string;
  versionNumber: number;
  workflowName: string;
  trigger: string;
  operationCount?: number;
  fixTypesApplied?: string[];
  createdAt: string;
  size: number; // Size in bytes
}

/**
 * Result of creating a backup
 */
export interface BackupResult {
  versionId: number;
  versionNumber: number;
  pruned: number;
  message: string;
}

/**
 * Result of restoring a version
 */
export interface RestoreResult {
  success: boolean;
  message: string;
  workflowId: string;
  fromVersion?: number;
  toVersionId: number;
  backupCreated: boolean;
  backupVersionId?: number;
  validationErrors?: string[];
}

/**
 * Storage statistics for workflow versions
 */
export interface StorageStats {
  totalVersions: number;
  totalSize: number;
  totalSizeFormatted: string;
  byWorkflow: WorkflowStorageInfo[];
}

/**
 * Per-workflow storage information
 */
export interface WorkflowStorageInfo {
  workflowId: string;
  workflowName: string;
  versionCount: number;
  totalSize: number;
  totalSizeFormatted: string;
  lastBackup: string;
}

/**
 * Diff between two workflow versions
 */
export interface VersionDiff {
  versionId1: number;
  versionId2: number;
  version1Number: number;
  version2Number: number;
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: string[];
  connectionChanges: number;
  settingChanges: Record<string, { before: any; after: any }>;
}

/**
 * Parameters for creating a version backup
 */
export interface CreateBackupParams {
  trigger: VersionTrigger;
  operations?: any[];
  fixTypes?: string[];
  metadata?: any;
}

/**
 * Result of pruning old versions
 */
export interface PruneResult {
  pruned: number;
  remaining: number;
}

/**
 * Result of deleting versions
 */
export interface DeleteResult {
  deleted: number;
  message: string;
}
