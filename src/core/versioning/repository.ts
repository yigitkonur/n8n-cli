/**
 * Workflow Version Repository
 * Database operations for workflow version management
 */

import type { UserDatabaseAdapter } from '../user-db/adapter.js';
import type { WorkflowVersion, VersionTrigger } from './types.js';

/**
 * Parameters for creating a workflow version
 */
export interface CreateVersionParams {
  workflowId: string;
  versionNumber: number;
  workflowName: string;
  workflowSnapshot: any;
  trigger: VersionTrigger;
  operations?: any[];
  fixTypes?: string[];
  metadata?: any;
}

/**
 * Repository for workflow version database operations
 */
export class WorkflowVersionRepository {
  constructor(private db: UserDatabaseAdapter) {}

  /**
   * Create a new workflow version
   * @returns The ID of the created version
   */
  createWorkflowVersion(data: CreateVersionParams): number {
    const stmt = this.db.prepare(`
      INSERT INTO workflow_versions (
        workflow_id, version_number, workflow_name, workflow_snapshot,
        trigger, operations, fix_types, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.workflowId,
      data.versionNumber,
      data.workflowName,
      JSON.stringify(data.workflowSnapshot),
      data.trigger,
      data.operations ? JSON.stringify(data.operations) : null,
      data.fixTypes ? JSON.stringify(data.fixTypes) : null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Get workflow versions ordered by version number (newest first)
   */
  getWorkflowVersions(workflowId: string, limit?: number): WorkflowVersion[] {
    let sql = `
      SELECT * FROM workflow_versions
      WHERE workflow_id = ?
      ORDER BY version_number DESC
    `;

    if (limit) {
      sql += ` LIMIT ?`;
      const rows = this.db.prepare(sql).all(workflowId, limit) as any[];
      return rows.map(row => this.parseWorkflowVersionRow(row));
    }

    const rows = this.db.prepare(sql).all(workflowId) as any[];
    return rows.map(row => this.parseWorkflowVersionRow(row));
  }

  /**
   * Get a specific workflow version by ID
   */
  getWorkflowVersion(versionId: number): WorkflowVersion | null {
    const row = this.db.prepare(`
      SELECT * FROM workflow_versions WHERE id = ?
    `).get(versionId) as any;

    if (!row) {return null;}
    return this.parseWorkflowVersionRow(row);
  }

  /**
   * Get the latest workflow version for a workflow
   */
  getLatestWorkflowVersion(workflowId: string): WorkflowVersion | null {
    const row = this.db.prepare(`
      SELECT * FROM workflow_versions
      WHERE workflow_id = ?
      ORDER BY version_number DESC
      LIMIT 1
    `).get(workflowId) as any;

    if (!row) {return null;}
    return this.parseWorkflowVersionRow(row);
  }

  /**
   * Delete a specific workflow version
   */
  deleteWorkflowVersion(versionId: number): void {
    this.db.prepare(`
      DELETE FROM workflow_versions WHERE id = ?
    `).run(versionId);
  }

  /**
   * Delete all versions for a specific workflow
   * @returns Number of versions deleted
   */
  deleteWorkflowVersionsByWorkflowId(workflowId: string): number {
    const result = this.db.prepare(`
      DELETE FROM workflow_versions WHERE workflow_id = ?
    `).run(workflowId);

    return result.changes;
  }

  /**
   * Prune old workflow versions, keeping only the most recent N versions
   * @returns Number of versions deleted
   */
  pruneWorkflowVersions(workflowId: string, keepCount: number): number {
    // Get all versions ordered by version_number DESC
    const versions = this.db.prepare(`
      SELECT id FROM workflow_versions
      WHERE workflow_id = ?
      ORDER BY version_number DESC
    `).all(workflowId) as any[];

    // If we have fewer versions than keepCount, no pruning needed
    if (versions.length <= keepCount) {
      return 0;
    }

    // Get IDs of versions to delete (all except the most recent keepCount)
    const idsToDelete = versions.slice(keepCount).map(v => v.id);

    if (idsToDelete.length === 0) {
      return 0;
    }

    // Delete old versions
    const placeholders = idsToDelete.map(() => '?').join(',');
    const result = this.db.prepare(`
      DELETE FROM workflow_versions WHERE id IN (${placeholders})
    `).run(...idsToDelete);

    return result.changes;
  }

  /**
   * Truncate the entire workflow_versions table
   * @returns Number of rows deleted
   */
  truncateWorkflowVersions(): number {
    const result = this.db.prepare(`
      DELETE FROM workflow_versions
    `).run();

    return result.changes;
  }

  /**
   * Get count of versions for a specific workflow
   */
  getWorkflowVersionCount(workflowId: string): number {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM workflow_versions WHERE workflow_id = ?
    `).get(workflowId) as any;

    return result.count;
  }

  /**
   * Get storage statistics for workflow versions
   */
  getVersionStorageStats(): {
    totalVersions: number;
    totalSize: number;
    byWorkflow: Array<{
      workflowId: string;
      workflowName: string;
      versionCount: number;
      totalSize: number;
      lastBackup: string;
    }>;
  } {
    // Total versions
    const totalResult = this.db.prepare(`
      SELECT COUNT(*) as count FROM workflow_versions
    `).get() as any;

    // Total size (approximate - sum of JSON lengths)
    const sizeResult = this.db.prepare(`
      SELECT SUM(LENGTH(workflow_snapshot)) as total_size FROM workflow_versions
    `).get() as any;

    // Per-workflow breakdown
    const byWorkflow = this.db.prepare(`
      SELECT
        workflow_id,
        workflow_name,
        COUNT(*) as version_count,
        SUM(LENGTH(workflow_snapshot)) as total_size,
        MAX(created_at) as last_backup
      FROM workflow_versions
      GROUP BY workflow_id
      ORDER BY version_count DESC
    `).all() as any[];

    return {
      totalVersions: totalResult.count,
      totalSize: sizeResult.total_size || 0,
      byWorkflow: byWorkflow.map(row => ({
        workflowId: row.workflow_id,
        workflowName: row.workflow_name,
        versionCount: row.version_count,
        totalSize: row.total_size,
        lastBackup: row.last_backup
      }))
    };
  }

  /**
   * Safe JSON parse with fallback
   */
  private safeJsonParse(json: string | null, defaultValue: any): any {
    if (!json) {return defaultValue;}
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Parse workflow version row from database
   */
  private parseWorkflowVersionRow(row: any): WorkflowVersion {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      versionNumber: row.version_number,
      workflowName: row.workflow_name,
      workflowSnapshot: this.safeJsonParse(row.workflow_snapshot, null),
      trigger: row.trigger,
      operations: row.operations ? this.safeJsonParse(row.operations, null) : undefined,
      fixTypes: row.fix_types ? this.safeJsonParse(row.fix_types, null) : undefined,
      metadata: row.metadata ? this.safeJsonParse(row.metadata, null) : undefined,
      createdAt: row.created_at
    };
  }
}
