/**
 * Node Migration Service
 *
 * Handles smart auto-migration of node configurations during version upgrades.
 * Applies migration strategies from the breaking changes registry.
 *
 * Adapted from n8n-mcp/src/services/node-migration-service.ts
 */

import { randomUUID } from 'node:crypto';
import type { DetectedChange, MigrationResult, AppliedMigration } from './types.js';
import { BreakingChangeDetector } from './breaking-change-detector.js';
import { NodeVersionService } from './node-version-service.js';

/**
 * Node Migration Service
 * 
 * Applies auto-migrations to nodes during version upgrades.
 */
export class NodeMigrationService {
  private versionService: NodeVersionService;
  private breakingChangeDetector: BreakingChangeDetector;

  constructor(
    versionService?: NodeVersionService,
    breakingChangeDetector?: BreakingChangeDetector
  ) {
    this.breakingChangeDetector = breakingChangeDetector || new BreakingChangeDetector();
    this.versionService = versionService || new NodeVersionService(this.breakingChangeDetector);
  }

  /**
   * Migrate a node from its current version to a target version
   */
  migrateNode(
    node: Record<string, unknown>,
    targetVersion?: string
  ): MigrationResult {
    const nodeName = (node.name as string) || 'Unknown Node';
    const nodeType = node.type as string;
    const currentVersion = String(node.typeVersion || '1');

    // Determine target version
    const latestVersion = targetVersion || this.versionService.getLatestVersion(nodeType);
    
    if (!latestVersion) {
      return {
        nodeName,
        nodeType,
        fromVersion: currentVersion,
        toVersion: currentVersion,
        appliedMigrations: [],
        remainingIssues: ['No version information available for this node type.'],
        confidence: 'LOW'
      };
    }

    // Check if already at or above target
    const comparison = this.versionService.compareVersions(currentVersion, latestVersion);
    if (comparison >= 0) {
      return {
        nodeName,
        nodeType,
        fromVersion: currentVersion,
        toVersion: currentVersion,
        appliedMigrations: [],
        remainingIssues: [],
        confidence: 'HIGH'
      };
    }

    // Analyze the version upgrade
    const analysis = this.breakingChangeDetector.analyzeVersionUpgrade(
      nodeType,
      currentVersion,
      latestVersion
    );

    const appliedMigrations: AppliedMigration[] = [];
    const remainingIssues: string[] = [];

    // Apply auto-migratable changes
    for (const change of analysis.changes.filter(c => c.autoMigratable)) {
      const migration = this.applyMigration(node, change);

      if (migration) {
        appliedMigrations.push(migration);
      }
    }

    // Update the typeVersion
    node.typeVersion = this.parseVersion(latestVersion);

    // Collect remaining manual issues
    for (const change of analysis.changes.filter(c => !c.autoMigratable)) {
      remainingIssues.push(
        `Manual action required for "${change.propertyName}": ${change.migrationHint}`
      );
    }

    // Determine confidence based on remaining issues
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';

    if (remainingIssues.length > 0) {
      confidence = remainingIssues.length > 3 ? 'LOW' : 'MEDIUM';
    }

    return {
      nodeName,
      nodeType,
      fromVersion: currentVersion,
      toVersion: latestVersion,
      appliedMigrations,
      remainingIssues,
      confidence
    };
  }

  /**
   * Apply a single migration change to a node
   */
  private applyMigration(node: Record<string, unknown>, change: DetectedChange): AppliedMigration | null {
    if (!change.migrationStrategy) return null;

    const { type, defaultValue, sourceProperty, targetProperty } = change.migrationStrategy;

    switch (type) {
      case 'add_property':
        return this.addProperty(node, change.propertyName, defaultValue);

      case 'remove_property':
        return this.removeProperty(node, change.propertyName);

      case 'rename_property':
        return this.renameProperty(node, sourceProperty!, targetProperty!);

      case 'set_default':
        return this.setDefault(node, change.propertyName, defaultValue);

      default:
        return null;
    }
  }

  /**
   * Add a new property to the node configuration
   */
  private addProperty(
    node: Record<string, unknown>,
    propertyPath: string,
    defaultValue: unknown
  ): AppliedMigration {
    const value = this.resolveDefaultValue(propertyPath, defaultValue, node);

    // Handle nested property paths (e.g., "parameters.inputFieldMapping")
    const parts = propertyPath.split('.');
    let target: Record<string, unknown> = node;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!target[part] || typeof target[part] !== 'object') {
        target[part] = {};
      }
      target = target[part] as Record<string, unknown>;
    }

    const finalKey = parts[parts.length - 1];
    target[finalKey] = value;

    return {
      propertyName: propertyPath,
      action: 'Added property',
      newValue: value
    };
  }

  /**
   * Remove a deprecated property from the node configuration
   */
  private removeProperty(
    node: Record<string, unknown>,
    propertyPath: string
  ): AppliedMigration | null {
    const parts = propertyPath.split('.');
    let target: Record<string, unknown> = node;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!target[part] || typeof target[part] !== 'object') return null;
      target = target[part] as Record<string, unknown>;
    }

    const finalKey = parts[parts.length - 1];
    const oldValue = target[finalKey];

    if (oldValue !== undefined) {
      delete target[finalKey];

      return {
        propertyName: propertyPath,
        action: 'Removed property',
        oldValue
      };
    }

    return null;
  }

  /**
   * Rename a property (move value from old name to new name)
   */
  private renameProperty(
    node: Record<string, unknown>,
    sourcePath: string,
    targetPath: string
  ): AppliedMigration | null {
    // Get old value
    const sourceParts = sourcePath.split('.');
    let sourceTarget: Record<string, unknown> = node;

    for (let i = 0; i < sourceParts.length - 1; i++) {
      if (!sourceTarget[sourceParts[i]] || typeof sourceTarget[sourceParts[i]] !== 'object') return null;
      sourceTarget = sourceTarget[sourceParts[i]] as Record<string, unknown>;
    }

    const sourceKey = sourceParts[sourceParts.length - 1];
    const oldValue = sourceTarget[sourceKey];

    if (oldValue === undefined) return null; // Source doesn't exist

    // Set new value
    const targetParts = targetPath.split('.');
    let targetTarget: Record<string, unknown> = node;

    for (let i = 0; i < targetParts.length - 1; i++) {
      if (!targetTarget[targetParts[i]] || typeof targetTarget[targetParts[i]] !== 'object') {
        targetTarget[targetParts[i]] = {};
      }
      targetTarget = targetTarget[targetParts[i]] as Record<string, unknown>;
    }

    const targetKey = targetParts[targetParts.length - 1];
    targetTarget[targetKey] = oldValue;

    // Remove old value
    delete sourceTarget[sourceKey];

    return {
      propertyName: targetPath,
      action: 'Renamed property',
      oldValue: `${sourcePath}: ${JSON.stringify(oldValue)}`,
      newValue: `${targetPath}: ${JSON.stringify(oldValue)}`
    };
  }

  /**
   * Set a default value for a property
   */
  private setDefault(
    node: Record<string, unknown>,
    propertyPath: string,
    defaultValue: unknown
  ): AppliedMigration | null {
    const parts = propertyPath.split('.');
    let target: Record<string, unknown> = node;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]] || typeof target[parts[i]] !== 'object') {
        target[parts[i]] = {};
      }
      target = target[parts[i]] as Record<string, unknown>;
    }

    const finalKey = parts[parts.length - 1];

    // Only set if not already defined
    if (target[finalKey] === undefined) {
      const value = this.resolveDefaultValue(propertyPath, defaultValue, node);
      target[finalKey] = value;

      return {
        propertyName: propertyPath,
        action: 'Set default value',
        newValue: value
      };
    }

    return null;
  }

  /**
   * Resolve default value with special handling for certain property types
   */
  private resolveDefaultValue(
    propertyPath: string,
    defaultValue: unknown,
    node: Record<string, unknown>
  ): unknown {
    // Special case: webhookId needs a UUID
    if (propertyPath === 'webhookId' || propertyPath.endsWith('.webhookId')) {
      return randomUUID();
    }

    // Special case: webhook path needs a unique value
    if (propertyPath === 'path' || propertyPath.endsWith('.path')) {
      if (node.type === 'n8n-nodes-base.webhook') {
        return `/webhook-${Date.now()}`;
      }
    }

    // Return provided default or null
    return defaultValue !== null && defaultValue !== undefined ? defaultValue : null;
  }

  /**
   * Parse version string to number (for typeVersion field)
   */
  private parseVersion(version: string): number {
    const parts = version.split('.').map(Number);

    // Handle versions like "1.1" -> 1.1, "2.0" -> 2
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] + parts[1] / 10;

    // For more complex versions, just use first number
    return parts[0];
  }

  /**
   * Batch migrate multiple nodes in a workflow
   */
  migrateWorkflowNodes(
    workflow: { nodes?: Array<Record<string, unknown>> },
    targetVersions?: Record<string, string> // nodeName -> targetVersion
  ): {
    success: boolean;
    results: MigrationResult[];
    overallConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  } {
    const results: MigrationResult[] = [];

    for (const node of workflow.nodes || []) {
      const nodeName = node.name as string;
      const targetVersion = targetVersions?.[nodeName];

      if (node.typeVersion !== undefined) {
        const result = this.migrateNode(node, targetVersion);
        results.push(result);
      }
    }

    // Calculate overall confidence
    const confidences = results.map(r => r.confidence);
    let overallConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';

    if (confidences.includes('LOW')) {
      overallConfidence = 'LOW';
    } else if (confidences.includes('MEDIUM')) {
      overallConfidence = 'MEDIUM';
    }

    const success = results.every(r => r.remainingIssues.length === 0);

    return {
      success,
      results,
      overallConfidence
    };
  }
}
