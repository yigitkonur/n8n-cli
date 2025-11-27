import type { Workflow } from './types.js';

export interface FixResult {
  fixed: number;
  warnings: string[];
}

export function fixInvalidOptionsFields(workflow: Workflow): FixResult {
  const warnings: string[] = [];
  let fixed = 0;

  if (!Array.isArray(workflow.nodes)) {
    return { fixed, warnings };
  }

  for (const node of workflow.nodes) {
    if (!node || typeof node !== 'object') continue;

    if (node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.switch') {
      if (node.parameters && 
          typeof node.parameters === 'object' &&
          'options' in node.parameters &&
          typeof node.parameters.options === 'object' &&
          node.parameters.options !== null &&
          Object.keys(node.parameters.options).length === 0) {
        delete node.parameters.options;
        fixed++;
        warnings.push(`Fixed node "${node.name}": Removed invalid empty 'options' field from parameters root`);
      }
    }
  }

  return { fixed, warnings };
}
