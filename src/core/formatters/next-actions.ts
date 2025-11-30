import chalk from 'chalk';

/**
 * Suggested next action
 */
export interface NextAction {
  /** Command to run */
  command: string;
  /** Optional description */
  description?: string;
}

/**
 * Format suggested next actions
 * 
 * Example output:
 * ⚡ Next steps:
 *    n8n nodes get n8n-nodes-base.webhook --mode docs
 *    n8n nodes search webhook --save webhook-nodes.json
 */
export function formatNextActions(actions: NextAction[]): string {
  if (actions.length === 0) return '';
  
  let output = chalk.cyan('\n⚡ Next steps:\n');
  
  for (const action of actions) {
    output += chalk.dim('   ') + chalk.white(action.command);
    if (action.description) {
      output += chalk.dim(` # ${action.description}`);
    }
    output += '\n';
  }
  
  return output;
}

/**
 * Generate context-aware next actions based on command type
 */
export function generateNextActions(
  commandType: 'nodes-search' | 'nodes-get' | 'workflows-list' | 'workflows-get' | 'executions-list' | 'templates-search',
  context: Record<string, string>
): NextAction[] {
  const actions: NextAction[] = [];
  
  switch (commandType) {
    case 'nodes-search':
      if (context.nodeType) {
        actions.push({ command: `n8n nodes get ${context.nodeType} --mode docs` });
      }
      if (context.query) {
        actions.push({ command: `n8n nodes search "${context.query}" --save nodes.json` });
      }
      break;
      
    case 'nodes-get':
      actions.push({ command: `n8n nodes search "${context.nodeType?.split('.').pop() || ''}"`, description: 'Find similar nodes' });
      break;
      
    case 'workflows-list':
      if (context.id) {
        actions.push({ command: `n8n workflows get ${context.id}` });
      }
      actions.push({ command: 'n8n workflows list --active true', description: 'Show only active' });
      break;
      
    case 'workflows-get':
      if (context.id) {
        actions.push({ command: `n8n workflows validate ${context.id}` });
        actions.push({ command: `n8n executions list --workflow-id ${context.id}` });
      }
      break;
      
    case 'executions-list':
      if (context.executionId) {
        actions.push({ command: `n8n executions get ${context.executionId}` });
      }
      break;
      
    case 'templates-search':
      if (context.templateId) {
        actions.push({ command: `n8n templates get ${context.templateId}` });
      }
      break;
  }
  
  return actions;
}
