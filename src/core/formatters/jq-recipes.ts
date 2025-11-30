import chalk from 'chalk';

/**
 * jq recipe suggestion
 */
export interface JqRecipe {
  /** jq command */
  command: string;
  /** Description of what it does */
  description: string;
}

/**
 * Format jq recipes section
 * 
 * Example output:
 * 💡 jq recipes (after --save nodes.json):
 *    jq -r '.[].nodeType' nodes.json
 *       # Extract node types only
 *    jq '.[] | select(.category == "Core Nodes")' nodes.json
 *       # Filter to Core Nodes
 */
export function formatJqRecipes(recipes: JqRecipe[], filename: string): string {
  if (recipes.length === 0) return '';
  
  let output = chalk.yellow(`\n💡 jq recipes (after --save ${filename}):\n`);
  
  for (const recipe of recipes) {
    output += chalk.dim('   ') + chalk.green(recipe.command) + '\n';
    output += chalk.dim(`      # ${recipe.description}`) + '\n';
  }
  
  return output;
}

/**
 * Get standard jq recipes for common output types
 */
export function getStandardRecipes(dataType: 'nodes' | 'workflows' | 'executions' | 'templates', filename: string): JqRecipe[] {
  const recipes: Record<string, JqRecipe[]> = {
    nodes: [
      { command: `jq -r '.[].nodeType' ${filename}`, description: 'Extract node types only' },
      { command: `jq '.[] | select(.category == "Core Nodes")' ${filename}`, description: 'Filter to Core Nodes' },
      { command: `jq 'sort_by(.relevanceScore) | reverse' ${filename}`, description: 'Sort by relevance' },
    ],
    workflows: [
      { command: `jq -r '.[] | "\\(.id)\\t\\(.name)"' ${filename}`, description: 'List ID and name' },
      { command: `jq '.[] | select(.active == true)' ${filename}`, description: 'Filter active workflows' },
      { command: `jq '.[] | {id, name, nodeCount: (.nodes | length)}' ${filename}`, description: 'Show node counts' },
    ],
    executions: [
      { command: `jq '.[] | select(.status == "error")' ${filename}`, description: 'Filter failed executions' },
      { command: `jq -r '.[] | "\\(.id)\\t\\(.status)\\t\\(.startedAt)"' ${filename}`, description: 'Tabular list' },
      { command: `jq 'group_by(.status) | map({status: .[0].status, count: length})' ${filename}`, description: 'Count by status' },
    ],
    templates: [
      { command: `jq -r '.[].name' ${filename}`, description: 'List template names' },
      { command: `jq '.[] | select(.nodes | any(.type | contains("webhook")))' ${filename}`, description: 'Templates with webhooks' },
    ],
  };
  
  return recipes[dataType] || [];
}
