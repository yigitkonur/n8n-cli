/**
 * Breaking Changes Registry
 *
 * Central registry of known breaking changes between n8n node versions.
 * Used by the version service and autofixer to detect and migrate version upgrades.
 *
 * Adapted from n8n-mcp/src/services/breaking-changes-registry.ts
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
    migrationHint: 'In v1.1+, the Execute Workflow node requires explicit field mapping to pass data to sub-workflows. Add an "inputFieldMapping" object with "mappings" array defining how to map fields from parent to child workflow.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: {
        mappings: []
      }
    },
    severity: 'HIGH'
  },
  {
    nodeType: 'n8n-nodes-base.executeWorkflow',
    fromVersion: '1.0',
    toVersion: '1.1',
    propertyName: 'parameters.mode',
    changeType: 'requirement_changed',
    isBreaking: false,
    migrationHint: 'The "mode" parameter behavior changed in v1.1. Default is now "static" instead of "list". Ensure your workflow ID specification matches the selected mode.',
    autoMigratable: false,
    severity: 'MEDIUM'
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
    migrationHint: 'In v2.1+, webhooks require a unique "webhookId" field in addition to the path. This ensures webhook persistence across workflow updates. A UUID will be auto-generated if not provided.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: null // Will be generated as UUID at runtime
    },
    severity: 'HIGH'
  },
  {
    nodeType: 'n8n-nodes-base.webhook',
    fromVersion: '1.0',
    toVersion: '2.0',
    propertyName: 'parameters.path',
    changeType: 'requirement_changed',
    isBreaking: true,
    migrationHint: 'In v2.0+, the webhook path must be explicitly defined and cannot be empty. Ensure a valid path is set.',
    autoMigratable: false,
    severity: 'HIGH'
  },
  {
    nodeType: 'n8n-nodes-base.webhook',
    fromVersion: '1.0',
    toVersion: '2.0',
    propertyName: 'parameters.responseMode',
    changeType: 'added',
    isBreaking: false,
    migrationHint: 'v2.0 introduces a "responseMode" parameter to control how the webhook responds. Default is "onReceived" (immediate response). Use "lastNode" to wait for workflow completion.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: 'onReceived'
    },
    severity: 'LOW'
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
    migrationHint: 'In v4.2+, "sendBody" must be explicitly set to true for POST/PUT/PATCH requests to include a body. Previous versions had implicit body sending.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: true
    },
    severity: 'MEDIUM'
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
    migrationHint: 'v2.0 introduces execution modes: "runOnceForAllItems" (default) and "runOnceForEachItem". The default mode processes all items at once, which may differ from v1.0 behavior.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: 'runOnceForAllItems'
    },
    severity: 'MEDIUM'
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
    migrationHint: 'In v1.1+, the interval parameter changed from a single string to an array of interval objects. Convert your single interval to an array format: [{field: "hours", value: 1}]',
    autoMigratable: false,
    severity: 'HIGH'
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
    migrationHint: 'In Switch v3+, each rule\'s conditions must have an "options" object with caseSensitive, leftValue, typeValidation, and version fields.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'strict'
      }
    },
    severity: 'HIGH'
  },
  {
    nodeType: 'n8n-nodes-base.switch',
    fromVersion: '3.0',
    toVersion: '3.2',
    propertyName: 'parameters.rules.values[].conditions.options.version',
    changeType: 'added',
    isBreaking: false,
    migrationHint: 'Switch v3.2+ requires a "version" field in conditions options.',
    autoMigratable: true,
    migrationStrategy: {
      type: 'add_property',
      defaultValue: 2
    },
    severity: 'LOW'
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
    oldValue: 'object',
    newValue: 'object with combinator',
    migrationHint: 'In If v2+, conditions use a combinator structure with "conditions" array and "combinator" field (and/or).',
    autoMigratable: false,
    severity: 'HIGH'
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
    migrationHint: 'The "continueOnFail" property is deprecated. Use "onError" instead with value "continueErrorOutput" or "continueRegularOutput".',
    autoMigratable: true,
    migrationStrategy: {
      type: 'rename_property',
      sourceProperty: 'continueOnFail',
      targetProperty: 'onError',
      defaultValue: 'continueErrorOutput'
    },
    severity: 'MEDIUM'
  }
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compare two version strings numerically
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
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
    // Change applies if: fromVersion >= change.fromVersion AND fromVersion < change.toVersion
    const fromNum = compareVersions(fromVersion, change.fromVersion);
    const toNum = compareVersions(toVersion, change.toVersion);
    
    // The change is relevant if we're upgrading through its version range
    const versionMatches = fromNum >= 0 && toNum >= 0;

    return nodeMatches && versionMatches && change.isBreaking;
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
    
    // The change applies if we're upgrading through its version range
    const fromNum = compareVersions(fromVersion, change.fromVersion);
    const toNum = compareVersions(toVersion, change.toVersion);
    const versionMatches = fromNum >= 0 && toNum >= 0;

    return nodeMatches && versionMatches;
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

/**
 * Get the latest known version for a node type from the registry
 */
export function getLatestRegistryVersion(nodeType: string): string | null {
  const versions = getTrackedVersionsForNode(nodeType);
  if (versions.length === 0) return null;
  return versions[versions.length - 1];
}
