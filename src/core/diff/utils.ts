/**
 * Workflow Diff Utilities
 * Node type utilities for diff engine operations
 * Ported from n8n-mcp/src/utils/node-type-utils.ts
 */

/**
 * Normalize a node type to the standard short form
 * Handles both old-style (n8n-nodes-base.) and new-style (nodes-base.) prefixes
 *
 * @example
 * normalizeNodeType('n8n-nodes-base.httpRequest') // 'nodes-base.httpRequest'
 * normalizeNodeType('@n8n/n8n-nodes-langchain.openAi') // 'nodes-langchain.openAi'
 */
export function normalizeNodeType(type: string): string {
  if (!type) return type;

  return type
    .replace(/^n8n-nodes-base\./, 'nodes-base.')
    .replace(/^@n8n\/n8n-nodes-langchain\./, 'nodes-langchain.');
}

/**
 * Check if a node is ANY type of trigger (including executeWorkflowTrigger)
 *
 * This function determines if a node can start a workflow execution.
 * Returns true for:
 * - Webhook triggers (webhook, webhookTrigger)
 * - Time-based triggers (schedule, cron)
 * - Poll-based triggers (emailTrigger, slackTrigger, etc.)
 * - Manual triggers (manualTrigger, start, formTrigger)
 * - Sub-workflow triggers (executeWorkflowTrigger)
 *
 * Used for: Disconnection validation (triggers don't need incoming connections)
 *
 * @param nodeType - The node type to check (e.g., "n8n-nodes-base.executeWorkflowTrigger")
 * @returns true if node is any type of trigger
 */
export function isTriggerNode(nodeType: string): boolean {
  const normalized = normalizeNodeType(nodeType);
  const lowerType = normalized.toLowerCase();

  // Check for trigger pattern in node type name
  if (lowerType.includes('trigger')) {
    return true;
  }

  // Check for webhook nodes (excluding respondToWebhook which is NOT a trigger)
  if (lowerType.includes('webhook') && !lowerType.includes('respond')) {
    return true;
  }

  // Check for specific trigger types that don't have 'trigger' in their name
  const specificTriggers = [
    'nodes-base.start',
    'nodes-base.manualTrigger',
    'nodes-base.formTrigger'
  ];

  return specificTriggers.includes(normalized);
}

/**
 * Check if a node is an ACTIVATABLE trigger (excludes executeWorkflowTrigger)
 *
 * This function determines if a node can be used to activate a workflow.
 * Returns true for:
 * - Webhook triggers (webhook, webhookTrigger)
 * - Time-based triggers (schedule, cron)
 * - Poll-based triggers (emailTrigger, slackTrigger, etc.)
 * - Manual triggers (manualTrigger, start, formTrigger)
 *
 * Returns FALSE for:
 * - executeWorkflowTrigger (can only be invoked by other workflows)
 *
 * Used for: Activation validation (active workflows need activatable triggers)
 *
 * @param nodeType - The node type to check
 * @returns true if node can activate a workflow
 */
export function isActivatableTrigger(nodeType: string): boolean {
  const normalized = normalizeNodeType(nodeType);
  const lowerType = normalized.toLowerCase();

  // executeWorkflowTrigger cannot activate a workflow (invoked by other workflows)
  if (lowerType.includes('executeworkflow')) {
    return false;
  }

  // All other triggers can activate workflows
  return isTriggerNode(nodeType);
}
