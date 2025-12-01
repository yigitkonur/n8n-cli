/**
 * Versioning Module
 * Exports for workflow version management and breaking change detection
 */

// Workflow Version Management
export { WorkflowVersioningService } from './service.js';
export { WorkflowVersionRepository } from './repository.js';

// Node Version Services
export { NodeVersionService } from './node-version-service.js';
export { BreakingChangeDetector } from './breaking-change-detector.js';
export { NodeMigrationService } from './node-migration-service.js';

// Breaking Changes Registry
export {
  BREAKING_CHANGES_REGISTRY,
  compareVersions,
  getBreakingChangesForNode,
  getAllChangesForNode,
  getAutoMigratableChanges,
  hasBreakingChanges,
  getMigrationHints,
  getNodesWithVersionMigrations,
  getTrackedVersionsForNode,
  getLatestRegistryVersion,
} from './breaking-changes-registry.js';

// Types
export type {
  // Version management types
  VersionTrigger,
  WorkflowVersion,
  VersionInfo,
  BackupResult,
  RestoreResult,
  StorageStats,
  WorkflowStorageInfo,
  VersionDiff,
  CreateBackupParams,
  PruneResult,
  DeleteResult,
  // Breaking change types
  Severity,
  ChangeType,
  MigrationStrategyType,
  MigrationStrategy,
  BreakingChange,
  DetectedChange,
  VersionUpgradeAnalysis,
  VersionComparison,
  NodeVersion,
  UpgradeStep,
  UpgradePath,
  MigrationResult,
  AppliedMigration,
  WorkflowUpgradeAnalysis,
  NodeUpgradeSummary,
} from './types.js';
