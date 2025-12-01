/**
 * Credential Utilities
 * Extract and manage credential references from workflows
 *
 * Used by deploy-template command to:
 * 1. Show users what credentials are required
 * 2. Strip credential references before deployment
 */

import type { Workflow } from './types.js';

/**
 * Represents a required credential for a workflow node
 */
export interface RequiredCredential {
  /** The n8n node type (e.g., n8n-nodes-base.openAi) */
  nodeType: string;
  /** The node name in the workflow */
  nodeName: string;
  /** The credential type identifier (e.g., openAiApi) */
  credentialType: string;
}

/**
 * Extract all required credentials from a workflow.
 * Call this BEFORE stripping credentials to capture what's needed.
 *
 * @param workflow - The workflow to analyze
 * @returns Array of required credentials with their node context
 *
 * @example
 * const creds = extractRequiredCredentials(workflow);
 * // Returns: [
 * //   { nodeType: 'n8n-nodes-base.openAi', nodeName: 'OpenAI Chat', credentialType: 'openAiApi' },
 * //   { nodeType: 'n8n-nodes-base.slack', nodeName: 'Send Message', credentialType: 'slackApi' }
 * // ]
 */
export function extractRequiredCredentials(workflow: Workflow): RequiredCredential[] {
  const credentials: RequiredCredential[] = [];

  if (!Array.isArray(workflow.nodes)) {
    return credentials;
  }

  for (const node of workflow.nodes) {
    if (!node || typeof node !== 'object') {continue;}

    // Check if node has credentials defined
    if (node.credentials && typeof node.credentials === 'object') {
      for (const credType of Object.keys(node.credentials)) {
        credentials.push({
          nodeType: node.type,
          nodeName: node.name || 'Unknown',
          credentialType: credType,
        });
      }
    }
  }

  return credentials;
}

/**
 * Remove all credential references from a workflow.
 * Users must configure credentials in n8n UI after deployment.
 *
 * @param workflow - The workflow to modify (deep copied, original unchanged)
 * @returns New workflow object with credentials removed
 *
 * @example
 * const stripped = stripCredentials(workflow);
 * // All nodes now have credentials: undefined
 */
export function stripCredentials(workflow: Workflow): Workflow {
  const stripped = JSON.parse(JSON.stringify(workflow)) as Workflow;

  if (!Array.isArray(stripped.nodes)) {
    return stripped;
  }

  for (const node of stripped.nodes) {
    if (!node || typeof node !== 'object') {continue;}
    // Remove credentials property entirely
    delete (node as Record<string, unknown>).credentials;
  }

  return stripped;
}

/**
 * Group credentials by type with node details.
 * Useful for output like "openAiApi (used by 2 nodes)".
 *
 * @param credentials - Array of required credentials
 * @returns Map of credential type to array of node names using it
 */
export function groupCredentialsByType(
  credentials: RequiredCredential[]
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const cred of credentials) {
    if (!grouped.has(cred.credentialType)) {
      grouped.set(cred.credentialType, []);
    }
    grouped.get(cred.credentialType)!.push(cred.nodeName);
  }

  return grouped;
}
