/**
 * Breaking Changes Registry
 * 
 * Central registry of known breaking changes between node versions.
 * Used by the autofixer to detect and migrate version upgrades intelligently.
 * 
 * Ported from n8n-mcp/src/services/breaking-changes-registry.ts
 */

import type { BreakingChange } from './types.js';

/**
 * Registry of known breaking changes across all n8n nodes
 */
export const BREAKING_CHANGES_REGISTRY: BreakingChange[] = [
  // ==========================================
  // Execute Workflow Node
  // ==========================================
  {
    nodeType: 'n8n-nodes-base.executeWorkflow',
    fromVersion: '1.0',
    toVersion: '1.1',
    propertyName: 'parameters.inputFieldMapping',
    changeType: 'added',
    isBreaking: true,
    migrationHint: 'In v1.1+, the Execute Workflow node requires explicit field mapping to pass data to sub-workflows. Add an "inputFieldMapping" object with "mappings" array.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: { mappings: [] },
    },
    severity: 'HIGH',
  },
  {
    nodeType: 'n8n-nodes-base.executeWorkflow',
    fromVersion: '1.0',
    toVersion: '1.1',
    propertyName: 'parameters.mode',
    changeType: 'requirement_changed',
    isBreaking: false,
    migrationHint: 'The "mode" parameter behavior changed in v1.1. Default is now "static" instead of "list".',
    autoMigratable: false,
    severity: 'MEDIUM',
  },

  // ==========================================
  // Webhook Node
  // ==========================================
  {
    nodeType: 'n8n-nodes-base.webhook',
    fromVersion: '2.0',
    toVersion: '2.1',
    propertyName: 'webhookId',
    changeType: 'added',
    isBreaking: true,
    migrationHint: 'In v2.1+, webhooks require a unique "webhookId" field. A UUID will be auto-generated if not provided.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: null, // Generated as UUID at runtime
    },
    severity: 'HIGH',
  },
  {
    nodeType: 'n8n-nodes-base.webhook',
    fromVersion: '1.0',
    toVersion: '2.0',
    propertyName: 'parameters.path',
    changeType: 'requirement_changed',
    isBreaking: true,
    migrationHint: 'In v2.0+, the webhook path must be explicitly defined and cannot be empty.',
    autoMigratable: false,
    severity: 'HIGH',
  },
  {
    nodeType: 'n8n-nodes-base.webhook',
    fromVersion: '1.0',
    toVersion: '2.0',
    propertyName: 'parameters.responseMode',
    changeType: 'added',
    isBreaking: false,
    migrationHint: 'v2.0 introduces "responseMode" to control webhook response. Default is "onReceived". Use "lastNode" to wait for completion.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: 'onReceived',
    },
    severity: 'LOW',
  },

  // ==========================================
  // HTTP Request Node
  // ==========================================
  {
    nodeType: 'n8n-nodes-base.httpRequest',
    fromVersion: '4.1',
    toVersion: '4.2',
    propertyName: 'parameters.sendBody',
    changeType: 'requirement_changed',
    isBreaking: false,
    migrationHint: 'In v4.2+, "sendBody" must be explicitly set to true for POST/PUT/PATCH requests.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: true,
    },
    severity: 'MEDIUM',
  },

  // ==========================================
  // Code Node (JavaScript)
  // ==========================================
  {
    nodeType: 'n8n-nodes-base.code',
    fromVersion: '1.0',
    toVersion: '2.0',
    propertyName: 'parameters.mode',
    changeType: 'added',
    isBreaking: false,
    migrationHint: 'v2.0 introduces execution modes: "runOnceForAllItems" (default) and "runOnceForEachItem".',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: 'runOnceForAllItems',
    },
    severity: 'MEDIUM',
  },

  // ==========================================
  // Schedule Trigger Node
  // ==========================================
  {
    nodeType: 'n8n-nodes-base.scheduleTrigger',
    fromVersion: '1.0',
    toVersion: '1.1',
    propertyName: 'parameters.rule.interval',
    changeType: 'type_changed',
    isBreaking: true,
    oldValue: 'string',
    newValue: 'array',
    migrationHint: 'In v1.1+, the interval parameter changed from string to array. Convert to: [{field: "hours", value: 1}]',
    autoMigratable: false,
    severity: 'HIGH',
  },

  // ==========================================
  // Switch Node
  // ==========================================
  {
    nodeType: 'n8n-nodes-base.switch',
    fromVersion: '2.0',
    toVersion: '3.0',
    propertyName: 'parameters.rules.values[].conditions.options',
    changeType: 'added',
    isBreaking: true,
    migrationHint: 'Switch v3+ requires options object in rule conditions: {caseSensitive, leftValue, typeValidation, version}',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'strict',
      },
    },
    severity: 'HIGH',
  },
  {
    nodeType: 'n8n-nodes-base.switch',
    fromVersion: '3.0',
    toVersion: '3.2',
    propertyName: 'parameters.rules.values[].conditions.options.version',
    changeType: 'added',
    isBreaking: false,
    migrationHint: 'Switch v3.2+ adds version field to conditions options.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: 2,
    },
    severity: 'LOW',
  },

  // ==========================================
  // If Node
  // ==========================================
  {
    nodeType: 'n8n-nodes-base.if',
    fromVersion: '1.0',
    toVersion: '2.0',
    propertyName: 'parameters.conditions',
    changeType: 'type_changed',
    isBreaking: true,
    migrationHint: 'If v2 uses new conditions structure. Manual migration required for complex conditions.',
    autoMigratable: false,
    severity: 'HIGH',
  },

  // ==========================================
  // Error Handling (Global Change)
  // ==========================================
  {
    nodeType: '*', // Applies to all nodes
    fromVersion: '1.0',
    toVersion: '2.0',
    propertyName: 'continueOnFail',
    changeType: 'removed',
    isBreaking: false,
    migrationHint: '"continueOnFail" is deprecated. Use "onError" with "continueErrorOutput" or "continueRegularOutput".',
    autoMigratable: true,
    migrationStrategy: {
      type: 'rename_property',
      sourceProperty: 'continueOnFail',
      targetProperty: 'onError',
      defaultValue: 'continueErrorOutput',
    },
    severity: 'MEDIUM',
  },

  // ==========================================
  // Google Sheets Node
  // ==========================================
  {
    nodeType: 'n8n-nodes-base.googleSheets',
    fromVersion: '3.0',
    toVersion: '4.0',
    propertyName: 'parameters.documentId',
    changeType: 'type_changed',
    isBreaking: true,
    migrationHint: 'Google Sheets v4 uses resource locator format for document selection.',
    autoMigratable: false,
    severity: 'HIGH',
  },

  // ==========================================
  // Slack Node
  // ==========================================
  {
    nodeType: 'n8n-nodes-base.slack',
    fromVersion: '2.0',
    toVersion: '2.1',
    propertyName: 'parameters.channel',
    changeType: 'type_changed',
    isBreaking: false,
    migrationHint: 'Slack v2.1 supports resource locator format for channel selection.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'set_default',
      defaultValue: { __rl: true, mode: 'id', value: '' },
    },
    severity: 'LOW',
  },
];

/**
 * Simple version comparison
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * Get breaking changes for a specific node type and version upgrade
 */
export function getBreakingChangesForNode(
  nodeType: string,
  fromVersion: string,
  toVersion: string
): BreakingChange[] {
  return BREAKING_CHANGES_REGISTRY.filter(change => {
    // Match exact node type or wildcard (*)
    const nodeMatches = change.nodeType === nodeType || change.nodeType === '*';

    // Check if version range overlaps
    const versionOverlaps = 
      compareVersions(change.fromVersion, toVersion) <= 0 &&
      compareVersions(change.toVersion, fromVersion) >= 0;

    return nodeMatches && versionOverlaps && change.isBreaking;
  });
}

/**
 * Get all changes (breaking and non-breaking) for a version upgrade
 */
export function getAllChangesForNode(
  nodeType: string,
  fromVersion: string,
  toVersion: string
): BreakingChange[] {
  return BREAKING_CHANGES_REGISTRY.filter(change => {
    const nodeMatches = change.nodeType === nodeType || change.nodeType === '*';
    const versionOverlaps = 
      compareVersions(change.fromVersion, toVersion) <= 0 &&
      compareVersions(change.toVersion, fromVersion) >= 0;

    return nodeMatches && versionOverlaps;
  });
}

/**
 * Get auto-migratable changes for a version upgrade
 */
export function getAutoMigratableChanges(
  nodeType: string,
  fromVersion: string,
  toVersion: string
): BreakingChange[] {
  return getAllChangesForNode(nodeType, fromVersion, toVersion).filter(
    change => change.autoMigratable
  );
}

/**
 * Check if a specific node has known breaking changes for a version upgrade
 */
export function hasBreakingChanges(
  nodeType: string,
  fromVersion: string,
  toVersion: string
): boolean {
  return getBreakingChangesForNode(nodeType, fromVersion, toVersion).length > 0;
}

/**
 * Get migration hints for a version upgrade
 */
export function getMigrationHints(
  nodeType: string,
  fromVersion: string,
  toVersion: string
): string[] {
  const changes = getAllChangesForNode(nodeType, fromVersion, toVersion);
  return changes.map(change => change.migrationHint);
}

/**
 * Get nodes with known version migrations
 */
export function getNodesWithVersionMigrations(): string[] {
  const nodeTypes = new Set<string>();

  BREAKING_CHANGES_REGISTRY.forEach(change => {
    if (change.nodeType !== '*') {
      nodeTypes.add(change.nodeType);
    }
  });

  return Array.from(nodeTypes);
}

/**
 * Get all versions tracked for a specific node
 */
export function getTrackedVersionsForNode(nodeType: string): string[] {
  const versions = new Set<string>();

  BREAKING_CHANGES_REGISTRY
    .filter(change => change.nodeType === nodeType || change.nodeType === '*')
    .forEach(change => {
      versions.add(change.fromVersion);
      versions.add(change.toVersion);
    });

  return Array.from(versions).sort((a, b) => compareVersions(a, b));
}
