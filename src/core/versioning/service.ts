/**
 * Workflow Versioning Service
 *
 * Provides workflow backup, versioning, rollback, and cleanup capabilities.
 * Automatically prunes to 10 versions per workflow to prevent storage bloat.
 */

import type { N8nApiClient } from '../api/client.js';
import type { UserDatabaseAdapter } from '../user-db/adapter.js';
import { WorkflowVersionRepository } from './repository.js';
import { validateWorkflowStructure } from '../validator.js';
import type {
  WorkflowVersion,
  VersionInfo,
  BackupResult,
  RestoreResult,
  StorageStats,
  VersionDiff,
  CreateBackupParams,
  PruneResult,
  DeleteResult,
} from './types.js';

/**
 * Workflow Versioning Service
 */
export class WorkflowVersioningService {
  private readonly DEFAULT_MAX_VERSIONS = 10;
  private repository: WorkflowVersionRepository;

  constructor(
    db: UserDatabaseAdapter,
    private apiClient?: N8nApiClient
  ) {
    this.repository = new WorkflowVersionRepository(db);
  }

  /**
   * Create backup before modification
   * Automatically prunes to 10 versions after backup creation
   */
   
  async createBackup(
    workflowId: string,
    workflow: any,
    context: CreateBackupParams
  ): Promise<BackupResult> {
    // Get current max version number
    const versions = this.repository.getWorkflowVersions(workflowId, 1);
    const nextVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

    // Create new version
    const versionId = this.repository.createWorkflowVersion({
      workflowId,
      versionNumber: nextVersion,
      workflowName: workflow.name || 'Unnamed Workflow',
      workflowSnapshot: workflow,
      trigger: context.trigger,
      operations: context.operations,
      fixTypes: context.fixTypes,
      metadata: context.metadata
    });

    // Auto-prune to keep max 10 versions
    const pruned = this.repository.pruneWorkflowVersions(
      workflowId,
      this.DEFAULT_MAX_VERSIONS
    );

    return {
      versionId,
      versionNumber: nextVersion,
      pruned,
      message: pruned > 0
        ? `Backup created (version ${nextVersion}), pruned ${pruned} old version(s)`
        : `Backup created (version ${nextVersion})`
    };
  }

  /**
   * Get version history for a workflow
   */
   
  async getVersionHistory(workflowId: string, limit: number = 10): Promise<VersionInfo[]> {
    const versions = this.repository.getWorkflowVersions(workflowId, limit);

    return versions.map(v => ({
      id: v.id,
      workflowId: v.workflowId,
      versionNumber: v.versionNumber,
      workflowName: v.workflowName,
      trigger: v.trigger,
      operationCount: v.operations ? v.operations.length : undefined,
      fixTypesApplied: v.fixTypes || undefined,
      createdAt: v.createdAt,
      size: JSON.stringify(v.workflowSnapshot).length
    }));
  }

  /**
   * Get a specific workflow version
   */
   
  async getVersion(versionId: number): Promise<WorkflowVersion | null> {
    return this.repository.getWorkflowVersion(versionId);
  }

  /**
   * Restore workflow to a previous version
   * Creates backup of current state before restoring
   */
  async restoreVersion(
    workflowId: string,
    versionId?: number,
    validateBefore: boolean = true
  ): Promise<RestoreResult> {
    if (!this.apiClient) {
      return {
        success: false,
        message: 'API client not configured - cannot restore workflow',
        workflowId,
        toVersionId: versionId || 0,
        backupCreated: false
      };
    }

    // Get the version to restore
    let versionToRestore: WorkflowVersion | null;

    if (versionId) {
      versionToRestore = this.repository.getWorkflowVersion(versionId);
    } else {
      // Get latest backup
      versionToRestore = this.repository.getLatestWorkflowVersion(workflowId);
    }

    if (!versionToRestore) {
      return {
        success: false,
        message: versionId
          ? `Version ${versionId} not found`
          : `No backup versions found for workflow ${workflowId}`,
        workflowId,
        toVersionId: versionId || 0,
        backupCreated: false
      };
    }

    // Validate workflow structure if requested
    if (validateBefore) {
      const validationResult = validateWorkflowStructure(versionToRestore.workflowSnapshot);

      if (!validationResult.valid) {
        return {
          success: false,
          message: `Cannot restore - version ${versionToRestore.versionNumber} has validation errors`,
          workflowId,
          toVersionId: versionToRestore.id,
          backupCreated: false,
          validationErrors: validationResult.errors
        };
      }
    }

    // Create backup of current workflow before restoring
    let backupResult: BackupResult | undefined;
    let currentWorkflow: any;
    
    try {
      currentWorkflow = await this.apiClient.getWorkflow(workflowId);
      backupResult = await this.createBackup(workflowId, currentWorkflow, {
        trigger: 'manual',
        metadata: {
          reason: 'Backup before rollback',
          restoringToVersion: versionToRestore.versionNumber
        }
      });
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create backup before restore: ${error.message}`,
        workflowId,
        toVersionId: versionToRestore.id,
        backupCreated: false
      };
    }

    // Restore the workflow
    try {
      await this.apiClient.updateWorkflow(workflowId, versionToRestore.workflowSnapshot);

      return {
        success: true,
        message: `Successfully restored workflow to version ${versionToRestore.versionNumber}`,
        workflowId,
        fromVersion: backupResult.versionNumber,
        toVersionId: versionToRestore.id,
        backupCreated: true,
        backupVersionId: backupResult.versionId
      };
    } catch (error: any) {
      // Compensation: Try to restore original if update failed
      try {
        if (currentWorkflow) {
          await this.apiClient.updateWorkflow(workflowId, currentWorkflow);
        }
        // Delete the backup we created since restore failed
        if (backupResult) {
          this.repository.deleteWorkflowVersion(backupResult.versionId);
        }
      } catch {
        // Compensation failed, but we still have the backup
      }

      return {
        success: false,
        message: `Failed to restore workflow: ${error.message}`,
        workflowId,
        toVersionId: versionToRestore.id,
        backupCreated: true,
        backupVersionId: backupResult?.versionId
      };
    }
  }

  /**
   * Delete a specific version
   */
   
  async deleteVersion(versionId: number): Promise<DeleteResult> {
    const version = this.repository.getWorkflowVersion(versionId);

    if (!version) {
      return {
        deleted: 0,
        message: `Version ${versionId} not found`
      };
    }

    this.repository.deleteWorkflowVersion(versionId);

    return {
      deleted: 1,
      message: `Deleted version ${version.versionNumber} for workflow ${version.workflowId}`
    };
  }

  /**
   * Delete all versions for a workflow
   */
   
  async deleteAllVersions(workflowId: string): Promise<DeleteResult> {
    const count = this.repository.getWorkflowVersionCount(workflowId);

    if (count === 0) {
      return {
        deleted: 0,
        message: `No versions found for workflow ${workflowId}`
      };
    }

    const deleted = this.repository.deleteWorkflowVersionsByWorkflowId(workflowId);

    return {
      deleted,
      message: `Deleted ${deleted} version(s) for workflow ${workflowId}`
    };
  }

  /**
   * Manually trigger pruning for a workflow
   */
   
  async pruneVersions(
    workflowId: string,
    maxVersions: number = 10
  ): Promise<PruneResult> {
    const pruned = this.repository.pruneWorkflowVersions(workflowId, maxVersions);
    const remaining = this.repository.getWorkflowVersionCount(workflowId);

    return { pruned, remaining };
  }

  /**
   * Truncate entire workflow_versions table
   * Requires explicit confirmation
   */
   
  async truncateAllVersions(confirm: boolean): Promise<DeleteResult> {
    if (!confirm) {
      return {
        deleted: 0,
        message: 'Truncate operation not confirmed - no action taken'
      };
    }

    const deleted = this.repository.truncateWorkflowVersions();

    return {
      deleted,
      message: `Truncated workflow_versions table - deleted ${deleted} version(s)`
    };
  }

  /**
   * Get storage statistics
   */
   
  async getStorageStats(): Promise<StorageStats> {
    const stats = this.repository.getVersionStorageStats();

    return {
      totalVersions: stats.totalVersions,
      totalSize: stats.totalSize,
      totalSizeFormatted: this.formatBytes(stats.totalSize),
      byWorkflow: stats.byWorkflow.map(w => ({
        workflowId: w.workflowId,
        workflowName: w.workflowName,
        versionCount: w.versionCount,
        totalSize: w.totalSize,
        totalSizeFormatted: this.formatBytes(w.totalSize),
        lastBackup: w.lastBackup
      }))
    };
  }

  /**
   * Compare two versions
   */
   
  async compareVersions(versionId1: number, versionId2: number): Promise<VersionDiff> {
    const v1 = this.repository.getWorkflowVersion(versionId1);
    const v2 = this.repository.getWorkflowVersion(versionId2);

    if (!v1 || !v2) {
      throw new Error(`One or both versions not found: ${versionId1}, ${versionId2}`);
    }

    // Compare nodes
    const nodes1 = new Set<string>(
      v1.workflowSnapshot.nodes?.map((n: any) => n.id as string) || []
    );
    const nodes2 = new Set<string>(
      v2.workflowSnapshot.nodes?.map((n: any) => n.id as string) || []
    );

    const addedNodes: string[] = [...nodes2].filter(id => !nodes1.has(id));
    const removedNodes: string[] = [...nodes1].filter(id => !nodes2.has(id));
    const commonNodes = [...nodes1].filter(id => nodes2.has(id));

    // Check for modified nodes
    const modifiedNodes: string[] = [];
    for (const nodeId of commonNodes) {
      const node1 = v1.workflowSnapshot.nodes?.find((n: any) => n.id === nodeId);
      const node2 = v2.workflowSnapshot.nodes?.find((n: any) => n.id === nodeId);

      if (JSON.stringify(node1) !== JSON.stringify(node2)) {
        modifiedNodes.push(nodeId);
      }
    }

    // Compare connections
    const conn1Str = JSON.stringify(v1.workflowSnapshot.connections || {});
    const conn2Str = JSON.stringify(v2.workflowSnapshot.connections || {});
    const connectionChanges = conn1Str !== conn2Str ? 1 : 0;

    // Compare settings
    const settings1 = v1.workflowSnapshot.settings || {};
    const settings2 = v2.workflowSnapshot.settings || {};
    const settingChanges = this.diffObjects(settings1, settings2);

    return {
      versionId1,
      versionId2,
      version1Number: v1.versionNumber,
      version2Number: v2.versionNumber,
      addedNodes,
      removedNodes,
      modifiedNodes,
      connectionChanges,
      settingChanges
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) {return '0 Bytes';}

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Math.round((bytes / k**i) * 100) / 100  } ${  sizes[i]}`;
  }

  /**
   * Simple object diff
   */
  private diffObjects(obj1: any, obj2: any): Record<string, { before: any; after: any }> {
    const changes: Record<string, { before: any; after: any }> = {};

    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of allKeys) {
      if (JSON.stringify(obj1?.[key]) !== JSON.stringify(obj2?.[key])) {
        changes[key] = {
          before: obj1?.[key],
          after: obj2?.[key]
        };
      }
    }

    return changes;
  }
}
