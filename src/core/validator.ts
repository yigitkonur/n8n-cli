import type { Workflow, ValidationResult } from './types.js';

export function validateWorkflowStructure(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeTypeIssues: string[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push('Workflow must be a JSON object');
    return { valid: false, errors, warnings, nodeTypeIssues };
  }

  const wf = data as Workflow;

  if (wf.nodes === undefined) {
    errors.push('Missing required property: nodes');
  } else if (!Array.isArray(wf.nodes)) {
    errors.push('Property "nodes" must be an array');
  }

  if (wf.connections === undefined) {
    errors.push('Missing required property: connections');
  } else if (typeof wf.connections !== 'object' || wf.connections === null) {
    errors.push('Property "connections" must be an object');
  } else if (Array.isArray(wf.connections)) {
    errors.push('Property "connections" must be an object, not an array');
  }

  if (Array.isArray(wf.nodes)) {
    for (let i = 0; i < wf.nodes.length; i++) {
      const node = wf.nodes[i];
      if (!node || typeof node !== 'object') {
        errors.push(`Node at index ${i} is not an object`);
        continue;
      }

      if (!node.type) {
        errors.push(`Node at index ${i} (${node.name || 'unnamed'}) missing required field: type`);
      } else if (typeof node.type !== 'string') {
        errors.push(`Node at index ${i} (${node.name || 'unnamed'}) field 'type' must be a string`);
      } else {
        if (!node.type.includes('.')) {
          nodeTypeIssues.push(`Node "${node.name || 'unnamed'}" has invalid type "${node.type}" - must include package prefix (e.g., "n8n-nodes-base.webhook")`);
        } else if (node.type.startsWith('nodes-base.')) {
          nodeTypeIssues.push(`Node "${node.name || 'unnamed'}" has invalid type "${node.type}" - should be "n8n-${node.type}"`);
        }
      }

      if (!node.name) {
        warnings.push(`Node at index ${i} (type: ${node.type || 'unknown'}) missing 'name' field - will be auto-generated`);
      }

      if (node.typeVersion === undefined) {
        errors.push(`Node "${node.name || 'unnamed'}" missing required field: typeVersion`);
      } else if (typeof node.typeVersion !== 'number') {
        errors.push(`Node "${node.name || 'unnamed'}" field 'typeVersion' must be a number`);
      }

      if (!node.position) {
        errors.push(`Node "${node.name || 'unnamed'}" missing required field: position`);
      } else if (!Array.isArray(node.position) || node.position.length !== 2) {
        errors.push(`Node "${node.name || 'unnamed'}" field 'position' must be an array of [x, y]`);
      }

      if (node.parameters === undefined) {
        errors.push(`Node "${node.name || 'unnamed'}" missing required field: parameters`);
      } else if (typeof node.parameters !== 'object' || node.parameters === null) {
        errors.push(`Node "${node.name || 'unnamed'}" field 'parameters' must be an object`);
      } else {
        if (node.type === 'n8n-nodes-base.if' || node.type === 'n8n-nodes-base.switch') {
          if ('options' in node.parameters && 
              typeof node.parameters.options === 'object' &&
              node.parameters.options !== null &&
              Object.keys(node.parameters.options).length === 0) {
            errors.push(
              `Node "${node.name || 'unnamed'}" (${node.type}): Invalid empty 'options' field at parameters root. ` +
              `Remove 'parameters.options' - the 'options' field should only exist inside 'conditions', not at root level. ` +
              `This causes "Could not find property option" error when pasting into n8n editor.`
            );
          }
        }
      }
    }
  }

  return { 
    valid: errors.length === 0, 
    errors, 
    warnings, 
    nodeTypeIssues: nodeTypeIssues.length > 0 ? nodeTypeIssues : undefined 
  };
}
