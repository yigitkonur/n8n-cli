import { randomUUID } from 'node:crypto';
import type { Workflow } from './types.js';

export interface SanitizeOptions {
  regenerateIds: boolean;
}

export interface SanitizeResult {
  workflow: Workflow;
  warnings: string[];
}

function generateUniqueName(base: string, existing: Set<string>): string {
  const cleanBase = base.split('.').pop() || base || 'Node';
  let candidate = cleanBase;
  let counter = 1;
  while (existing.has(candidate)) {
    candidate = `${cleanBase} ${counter}`;
    counter += 1;
  }
  return candidate;
}

export function sanitizeWorkflow(workflow: Workflow, options: SanitizeOptions): SanitizeResult {
  const warnings: string[] = [];

  if (!Array.isArray(workflow.nodes)) {
    return { workflow, warnings };
  }

  const existingNames = new Set<string>();
  const webhookIdCounts = new Map<string, number>();

  for (const node of workflow.nodes) {
    if (typeof node.name === 'string') {
      existingNames.add(node.name);
    }
    if (node.webhookId && typeof node.webhookId === 'string') {
      webhookIdCounts.set(node.webhookId, (webhookIdCounts.get(node.webhookId) ?? 0) + 1);
    }
  }

  const duplicateWebhookIds = new Set(
    Array.from(webhookIdCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([id]) => id),
  );

  for (const node of workflow.nodes) {
    if (!node.name || typeof node.name !== 'string') {
      const base = typeof node.type === 'string' ? node.type : 'Node';
      const newName = generateUniqueName(base, existingNames);
      node.name = newName;
      existingNames.add(newName);
      warnings.push(`Node without name received generated name: ${newName}`);
    }

    if (node.webhookId && typeof node.webhookId === 'string' && duplicateWebhookIds.has(node.webhookId)) {
      const oldId = node.webhookId;
      const newId = randomUUID();
      node.webhookId = newId;
      if (node.parameters && typeof node.parameters === 'object' && 'path' in node.parameters) {
        (node.parameters as any).path = newId;
      }
      warnings.push(`WebhookId ${oldId} duplicated in workflow, regenerated to ${newId}`);
    }

    if (options.regenerateIds) {
      if (node.id && typeof node.id === 'string') {
        node.id = randomUUID();
      } else if (!node.id) {
        node.id = randomUUID();
      }
    }
  }

  return { workflow, warnings };
}

/**
 * Read-only properties that must be stripped from exported workflows
 * before creating via API. The n8n API rejects these with:
 * - "must NOT have additional properties"
 * - "tags is read-only"
 * 
 * @see https://github.com/n8n-io/n8n/issues/7881
 * @see https://github.com/n8n-io/n8n/issues/19587
 */
const READ_ONLY_KEYS = [
  'id',
  'versionId', 
  'meta',
  'createdAt',
  'updatedAt',
  'staticData',
  'pinData',
  'tags',
  'shared',
  'homeProject',
  'sharedWithProjects',
  'triggerCount',
  'lastNodeExecuted',
  'templateData',
  'activeExecutions',
] as const;

/**
 * Strip read-only properties from exported workflow before API submission.
 * Use this when creating workflows from n8n UI exports to avoid API errors.
 * 
 * Note: 'active' is intentionally preserved as it's writable on create.
 * 
 * @example
 * const exported = JSON.parse(fs.readFileSync('workflow.json'));
 * const clean = stripReadOnlyProperties(exported);
 * await client.createWorkflow(clean);
 */
export function stripReadOnlyProperties<T extends Record<string, unknown>>(workflow: T): T {
  const cleaned = { ...workflow };
  for (const key of READ_ONLY_KEYS) {
    delete cleaned[key];
  }
  return cleaned;
}
