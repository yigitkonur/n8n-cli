/**
 * Post-Update Guidance Generator
 * 
 * Generates comprehensive, actionable migration guidance after autofix operations.
 * Provides users with:
 * - Confidence scores for each upgrade (HIGH/MEDIUM/LOW)
 * - Step-by-step verification checklists
 * - Estimated time to complete manual tasks
 * - Documentation of behavior changes between versions
 * 
 * Ported from n8n-mcp/src/services/post-update-validator.ts with CLI adaptations.
 */

import type {
  PostUpdateGuidance,
  RequiredAction,
  DeprecatedProperty,
  BehaviorChange,
  FixDetail,
  GuidanceConfidence,
  MigrationStatus,
  ActionPriority,
  ActionType,
} from './types.js';

import {
  getAllChangesForNode,
  getBreakingChangesForNode,
} from './breaking-changes-registry.js';

/**
 * Generate post-update guidance from a list of applied fixes
 * Groups fixes by node and generates comprehensive guidance for each
 */
export function generateGuidanceFromFixes(fixDetails: FixDetail[]): PostUpdateGuidance[] {
  if (!fixDetails || fixDetails.length === 0) {
    return [];
  }

  // Group fixes by node
  const nodeFixMap = new Map<string, FixDetail[]>();
  
  for (const fix of fixDetails) {
    const key = fix.nodeId || fix.nodeName;
    const existing = nodeFixMap.get(key) || [];
    existing.push(fix);
    nodeFixMap.set(key, existing);
  }

  // Generate guidance for each node
  const guidance: PostUpdateGuidance[] = [];
  
  for (const [nodeKey, nodeFixes] of Array.from(nodeFixMap.entries())) {
    const firstFix = nodeFixes[0];
    const nodeGuidance = generateNodeGuidance(
      firstFix.nodeId,
      firstFix.nodeName,
      firstFix.nodeType,
      firstFix.nodeVersion?.toString() || '1',
      nodeFixes
    );
    
    if (nodeGuidance) {
      guidance.push(nodeGuidance);
    }
  }

  return guidance;
}

/**
 * Generate guidance for a single node based on its fixes
 */
function generateNodeGuidance(
  nodeId: string,
  nodeName: string,
  nodeType: string,
  nodeVersion: string,
  fixes: FixDetail[]
): PostUpdateGuidance | null {
  // Skip if no meaningful fixes to report
  if (fixes.length === 0) {
    return null;
  }

  // Determine version info - for now, use current version as both
  // In future with full migration service, we'd track from/to versions
  const oldVersion = nodeVersion;
  const newVersion = nodeVersion;

  // Get known changes from registry
  const registryChanges = getAllChangesForNode(nodeType, '1.0', nodeVersion);

  // Generate required actions based on fixes applied
  const requiredActions = generateRequiredActions(fixes, registryChanges);

  // Identify deprecated properties
  const deprecatedProperties = identifyDeprecatedProperties(registryChanges);

  // Document behavior changes for known nodes
  const behaviorChanges = documentBehaviorChanges(nodeType, nodeVersion);

  // Determine migration status
  const migrationStatus = determineMigrationStatus(fixes, requiredActions);

  // Generate step-by-step migration instructions
  const migrationSteps = generateMigrationSteps(
    requiredActions,
    deprecatedProperties,
    behaviorChanges
  );

  // Calculate confidence and estimated time
  const confidence = calculateConfidence(requiredActions, migrationStatus);
  const estimatedTime = estimateTime(requiredActions, behaviorChanges);

  return {
    nodeId,
    nodeName,
    nodeType,
    oldVersion,
    newVersion,
    migrationStatus,
    requiredActions,
    deprecatedProperties,
    behaviorChanges,
    migrationSteps,
    confidence,
    estimatedTime,
  };
}

/**
 * Generate required actions based on fixes and registry changes
 */
function generateRequiredActions(
  fixes: FixDetail[],
  registryChanges: ReturnType<typeof getAllChangesForNode>
): RequiredAction[] {
  const actions: RequiredAction[] = [];

  // Actions from non-auto-migratable registry changes
  const manualChanges = registryChanges.filter(c => !c.autoMigratable);
  
  for (const change of manualChanges) {
    actions.push({
      type: mapChangeTypeToActionType(change.changeType),
      property: change.propertyName,
      reason: change.migrationHint,
      suggestedValue: change.newValue,
      currentValue: change.oldValue,
      documentation: `See n8n documentation for ${change.nodeType}`,
      priority: mapSeverityToPriority(change.severity),
    });
  }

  // Add review actions for complex fixes
  for (const fix of fixes) {
    if (fix.confidence === 'low') {
      actions.push({
        type: 'REVIEW_CONFIGURATION',
        property: fix.propertyPath,
        reason: `Low-confidence fix applied: ${fix.description}. Please verify the change.`,
        currentValue: fix.oldValue,
        suggestedValue: fix.newValue,
        priority: 'MEDIUM',
      });
    }
  }

  return actions;
}

/**
 * Identify deprecated or removed properties from registry changes
 */
function identifyDeprecatedProperties(
  registryChanges: ReturnType<typeof getAllChangesForNode>
): DeprecatedProperty[] {
  const deprecated: DeprecatedProperty[] = [];

  for (const change of registryChanges) {
    if (change.changeType === 'removed') {
      deprecated.push({
        property: change.propertyName,
        status: 'removed',
        replacement: change.migrationStrategy?.targetProperty,
        action: change.autoMigratable ? 'remove' : 'replace',
        impact: change.isBreaking ? 'breaking' : 'warning',
      });
    }
  }

  return deprecated;
}

/**
 * Document behavior changes for specific node types
 * These are hardcoded based on known n8n node behavior changes
 */
function documentBehaviorChanges(
  nodeType: string,
  version: string
): BehaviorChange[] {
  const changes: BehaviorChange[] = [];
  const versionNum = parseFloat(version) || 1;

  // Switch node behavior changes
  if (nodeType === 'n8n-nodes-base.switch') {
    if (versionNum >= 3) {
      changes.push({
        aspect: 'Rule evaluation',
        oldBehavior: 'Rules evaluated with implicit type coercion',
        newBehavior: 'Rules use strict type validation by default',
        impact: 'MEDIUM',
        actionRequired: true,
        recommendation: 'Review rule conditions and ensure type matching is correct. Set typeValidation to "loose" if needed.',
      });
    }
    if (versionNum >= 3.2) {
      changes.push({
        aspect: 'Condition options',
        oldBehavior: 'No version tracking in conditions',
        newBehavior: 'Conditions include version field for compatibility',
        impact: 'LOW',
        actionRequired: false,
        recommendation: 'No action required - version field is handled automatically.',
      });
    }
  }

  // Execute Workflow node behavior changes
  if (nodeType === 'n8n-nodes-base.executeWorkflow') {
    if (versionNum >= 1.1) {
      changes.push({
        aspect: 'Data passing to sub-workflows',
        oldBehavior: 'Automatic data passing - all data from parent workflow automatically available',
        newBehavior: 'Explicit field mapping required - must define inputFieldMapping to pass specific fields',
        impact: 'HIGH',
        actionRequired: true,
        recommendation: 'Define inputFieldMapping with specific field mappings between parent and child workflows.',
      });
    }
  }

  // Webhook node behavior changes
  if (nodeType === 'n8n-nodes-base.webhook') {
    if (versionNum >= 2.1) {
      changes.push({
        aspect: 'Webhook persistence',
        oldBehavior: 'Webhook URL may change on workflow updates',
        newBehavior: 'Stable webhook URL via webhookId field',
        impact: 'MEDIUM',
        actionRequired: false,
        recommendation: 'Webhook URLs now remain stable. Update external systems if they cache the old URL.',
      });
    }
    if (versionNum >= 2.0) {
      changes.push({
        aspect: 'Response handling',
        oldBehavior: 'Automatic response after webhook trigger',
        newBehavior: 'Configurable response mode (onReceived vs lastNode)',
        impact: 'MEDIUM',
        actionRequired: true,
        recommendation: 'Review responseMode setting. Use "onReceived" for immediate responses or "lastNode" to wait for workflow completion.',
      });
    }
  }

  // HTTP Request node behavior changes
  if (nodeType === 'n8n-nodes-base.httpRequest') {
    if (versionNum >= 4.2) {
      changes.push({
        aspect: 'Request body handling',
        oldBehavior: 'Body automatically sent for POST/PUT/PATCH requests',
        newBehavior: 'sendBody must be explicitly set to true',
        impact: 'MEDIUM',
        actionRequired: true,
        recommendation: 'Set sendBody to true if you need to send a request body.',
      });
    }
  }

  // If node behavior changes
  if (nodeType === 'n8n-nodes-base.if') {
    if (versionNum >= 2) {
      changes.push({
        aspect: 'Condition structure',
        oldBehavior: 'Simple condition format',
        newBehavior: 'New structured conditions with multiple combinator support',
        impact: 'HIGH',
        actionRequired: true,
        recommendation: 'Complex conditions may need manual migration. Review condition logic after upgrade.',
      });
    }
  }

  return changes;
}

/**
 * Determine migration status based on fixes and remaining actions
 */
function determineMigrationStatus(
  fixes: FixDetail[],
  requiredActions: RequiredAction[]
): MigrationStatus {
  const criticalActions = requiredActions.filter(a => a.priority === 'CRITICAL');
  
  if (criticalActions.length > 0) {
    return 'manual_required';
  }

  if (requiredActions.length === 0) {
    return 'complete';
  }

  return 'partial';
}

/**
 * Generate step-by-step migration instructions
 */
function generateMigrationSteps(
  requiredActions: RequiredAction[],
  deprecatedProperties: DeprecatedProperty[],
  behaviorChanges: BehaviorChange[]
): string[] {
  const steps: string[] = [];
  let stepNumber = 1;

  // Start with deprecations
  if (deprecatedProperties.length > 0) {
    steps.push(`Step ${stepNumber++}: Remove deprecated properties`);
    for (const dep of deprecatedProperties) {
      const replacement = dep.replacement ? ` (use "${dep.replacement}" instead)` : '';
      steps.push(`  - Remove "${dep.property}"${replacement}`);
    }
  }

  // Critical actions first
  const criticalActions = requiredActions.filter(a => a.priority === 'CRITICAL');
  if (criticalActions.length > 0) {
    steps.push(`Step ${stepNumber++}: Address critical configuration requirements`);
    for (const action of criticalActions) {
      steps.push(`  - ${action.property}: ${action.reason}`);
      if (action.suggestedValue !== undefined) {
        steps.push(`    Suggested value: ${JSON.stringify(action.suggestedValue)}`);
      }
    }
  }

  // High priority actions
  const highActions = requiredActions.filter(a => a.priority === 'HIGH');
  if (highActions.length > 0) {
    steps.push(`Step ${stepNumber++}: Configure required properties`);
    for (const action of highActions) {
      steps.push(`  - ${action.property}: ${action.reason}`);
    }
  }

  // Behavior change adaptations
  const actionRequiredChanges = behaviorChanges.filter(c => c.actionRequired);
  if (actionRequiredChanges.length > 0) {
    steps.push(`Step ${stepNumber++}: Adapt to behavior changes`);
    for (const change of actionRequiredChanges) {
      steps.push(`  - ${change.aspect}: ${change.recommendation}`);
    }
  }

  // Medium/Low priority actions
  const otherActions = requiredActions.filter(
    a => a.priority === 'MEDIUM' || a.priority === 'LOW'
  );
  if (otherActions.length > 0) {
    steps.push(`Step ${stepNumber++}: Review optional configurations`);
    for (const action of otherActions) {
      steps.push(`  - ${action.property}: ${action.reason}`);
    }
  }

  // Final validation step
  steps.push(`Step ${stepNumber}: Test workflow execution`);
  steps.push('  - Validate all node configurations');
  steps.push('  - Run a test execution');
  steps.push('  - Verify expected behavior');

  return steps;
}

/**
 * Map change type to action type
 */
function mapChangeTypeToActionType(
  changeType: string
): ActionType {
  switch (changeType) {
    case 'added':
      return 'ADD_PROPERTY';
    case 'requirement_changed':
    case 'type_changed':
      return 'UPDATE_PROPERTY';
    case 'default_changed':
      return 'CONFIGURE_OPTION';
    default:
      return 'REVIEW_CONFIGURATION';
  }
}

/**
 * Map severity to priority
 */
function mapSeverityToPriority(
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
): ActionPriority {
  if (severity === 'HIGH') return 'CRITICAL';
  return severity;
}

/**
 * Calculate overall confidence in the migration
 */
function calculateConfidence(
  requiredActions: RequiredAction[],
  migrationStatus: MigrationStatus
): GuidanceConfidence {
  if (migrationStatus === 'complete') return 'HIGH';

  const criticalActions = requiredActions.filter(a => a.priority === 'CRITICAL');

  if (migrationStatus === 'manual_required' || criticalActions.length > 3) {
    return 'LOW';
  }

  return 'MEDIUM';
}

/**
 * Estimate time required for manual migration steps
 */
function estimateTime(
  requiredActions: RequiredAction[],
  behaviorChanges: BehaviorChange[]
): string {
  const criticalCount = requiredActions.filter(a => a.priority === 'CRITICAL').length;
  const highCount = requiredActions.filter(a => a.priority === 'HIGH').length;
  const behaviorCount = behaviorChanges.filter(c => c.actionRequired).length;

  const totalComplexity = criticalCount * 5 + highCount * 3 + behaviorCount * 2;

  if (totalComplexity === 0) return '< 1 minute';
  if (totalComplexity <= 5) return '2-5 minutes';
  if (totalComplexity <= 10) return '5-10 minutes';
  if (totalComplexity <= 20) return '10-20 minutes';
  return '20+ minutes';
}

/**
 * Generate a human-readable summary of guidance
 */
export function generateGuidanceSummary(guidance: PostUpdateGuidance): string {
  const lines: string[] = [];

  lines.push(`Node "${guidance.nodeName}" (${guidance.nodeType})`);
  lines.push(`Status: ${guidance.migrationStatus.toUpperCase()}`);
  lines.push(`Confidence: ${guidance.confidence}`);
  lines.push(`Estimated time: ${guidance.estimatedTime}`);

  if (guidance.requiredActions.length > 0) {
    lines.push(`\nRequired actions: ${guidance.requiredActions.length}`);
    for (const action of guidance.requiredActions.slice(0, 3)) {
      lines.push(`  - [${action.priority}] ${action.property}: ${action.reason}`);
    }
    if (guidance.requiredActions.length > 3) {
      lines.push(`  ... and ${guidance.requiredActions.length - 3} more`);
    }
  }

  if (guidance.behaviorChanges.length > 0) {
    lines.push(`\nBehavior changes: ${guidance.behaviorChanges.length}`);
    for (const change of guidance.behaviorChanges) {
      lines.push(`  - ${change.aspect}: ${change.newBehavior}`);
    }
  }

  return lines.join('\n');
}
