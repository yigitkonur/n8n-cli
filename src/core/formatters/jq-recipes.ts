import chalk from 'chalk';

/**
 * jq recipe with context
 */
export interface JqRecipe {
  /** jq filter expression (without filename) */
  filter: string;
  /** Short description */
  description: string;
}

/**
 * Command-specific jq recipe configurations
 * 
 * Key insight: 
 * - `--json` output: { data: [...], total: N } → use `.data[]`
 * - `--save` output: [...] → use `.[]`
 */
export type CommandType = 
  | 'workflows-list' 
  | 'executions-list' 
  | 'nodes-search' 
  | 'nodes-get'
  | 'templates-search'
  | 'templates-get'
  | 'workflows-get'
  | 'executions-get'
  | 'credentials-list'
  | 'variables-list'
  | 'tags-list'
  | 'audit';

/**
 * Get jq recipes for a specific command
 * Recipes are based on actual returned data structure
 */
export function getCommandRecipes(command: CommandType): JqRecipe[] {
  const recipes: Record<CommandType, JqRecipe[]> = {
    // ═══════════════════════════════════════════════════════════════════════
    // WORKFLOWS LIST
    // Returns: { id, name, active, nodes[], updatedAt, createdAt, tags[] }
    // ═══════════════════════════════════════════════════════════════════════
    'workflows-list': [
      { filter: `.[] | {id, name, active}`, description: 'Extract key fields' },
      { filter: `.[] | select(.active == true)`, description: 'Only active workflows' },
      { filter: `.[] | select(.active == false)`, description: 'Only inactive workflows' },
      { filter: `.[] | select(.nodes | length > 10)`, description: 'Workflows with 10+ nodes' },
      { filter: `sort_by(.updatedAt) | reverse | .[0:5]`, description: 'Most recently updated' },
      { filter: `-r '.[] | "\\(.id)\\t\\(.name)\\t\\(.active)"'`, description: 'TSV export' },
      { filter: `group_by(.active) | map({active: .[0].active, count: length})`, description: 'Count by status' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // EXECUTIONS LIST  
    // Returns: { id, workflowId, status, startedAt, stoppedAt, mode }
    // Status: "success" | "error" | "waiting" | "running" | "canceled"
    // ═══════════════════════════════════════════════════════════════════════
    'executions-list': [
      { filter: `.[] | {id, workflowId, status}`, description: 'Extract key fields' },
      { filter: `.[] | select(.status == "error")`, description: 'Only failed executions' },
      { filter: `.[] | select(.status == "success")`, description: 'Only successful executions' },
      { filter: `group_by(.status) | map({status: .[0].status, count: length})`, description: 'Count by status' },
      { filter: `group_by(.workflowId) | map({workflow: .[0].workflowId, runs: length})`, description: 'Runs per workflow' },
      { filter: `-r '.[] | "\\(.id)\\t\\(.status)\\t\\(.startedAt)"'`, description: 'TSV export' },
      { filter: `map(select(.status == "error")) | length`, description: 'Count errors' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // NODES SEARCH
    // Returns: { nodeType, displayName, category, package, relevanceScore }
    // ═══════════════════════════════════════════════════════════════════════
    'nodes-search': [
      { filter: `-r '.[].nodeType'`, description: 'List node types only' },
      { filter: `.[] | {nodeType, displayName, category}`, description: 'Extract key fields' },
      { filter: `.[] | select(.category == "Core Nodes")`, description: 'Filter by category' },
      { filter: `sort_by(.relevanceScore) | reverse`, description: 'Sort by relevance' },
      { filter: `group_by(.category) | map({category: .[0].category, count: length})`, description: 'Count by category' },
      { filter: `.[] | select(.isTrigger == true)`, description: 'Only trigger nodes' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // NODES GET (single node)
    // Returns: { nodeType, displayName, properties[], operations[], credentials[] }
    // ═══════════════════════════════════════════════════════════════════════
    'nodes-get': [
      { filter: `.properties | map(.name)`, description: 'List property names' },
      { filter: `.properties | map(select(.required == true))`, description: 'Required properties only' },
      { filter: `.operations | map(.value)`, description: 'List operations' },
      { filter: `.credentials | map(.name)`, description: 'List required credentials' },
      { filter: `{nodeType, properties: (.properties | length), operations: (.operations | length)}`, description: 'Summary stats' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // TEMPLATES SEARCH
    // Returns: { id, name, totalViews, user: {username}, description }
    // ═══════════════════════════════════════════════════════════════════════
    'templates-search': [
      { filter: `-r '.[].name'`, description: 'List template names' },
      { filter: `.[] | {id, name, views: .totalViews}`, description: 'ID, name, and views' },
      { filter: `sort_by(.totalViews) | reverse | .[0:5]`, description: 'Most popular templates' },
      { filter: `.[] | select(.user.username != null) | .user.username`, description: 'List authors' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // TEMPLATES GET (single template)
    // Returns: { id, name, description, workflow: {nodes[], connections{}} }
    // ═══════════════════════════════════════════════════════════════════════
    'templates-get': [
      { filter: `.workflow.nodes | map(.type)`, description: 'List node types used' },
      { filter: `.workflow.nodes | length`, description: 'Count nodes' },
      { filter: `.workflow.nodes | map(select(.type | contains("webhook")))`, description: 'Find webhooks' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // WORKFLOWS GET (single workflow)
    // Returns: { id, name, nodes[], connections{}, active, settings{} }
    // ═══════════════════════════════════════════════════════════════════════
    'workflows-get': [
      { filter: `.nodes | map(.type)`, description: 'List node types' },
      { filter: `.nodes | map({name, type})`, description: 'Node names and types' },
      { filter: `.nodes | map(select(.type | contains("webhook")))`, description: 'Find webhook nodes' },
      { filter: `.nodes | length`, description: 'Count total nodes' },
      { filter: `.settings`, description: 'View workflow settings' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // EXECUTIONS GET (single execution)
    // Returns: { id, status, data: {resultData: {runData{}}}, startedAt, stoppedAt }
    // ═══════════════════════════════════════════════════════════════════════
    'executions-get': [
      { filter: `.data.resultData.runData | keys`, description: 'List executed nodes' },
      { filter: `.data.resultData.error`, description: 'View error details' },
      { filter: `{id, status, nodes: (.data.resultData.runData | keys | length)}`, description: 'Execution summary' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // CREDENTIALS LIST
    // Returns: { id, name, type, createdAt, updatedAt }
    // ═══════════════════════════════════════════════════════════════════════
    'credentials-list': [
      { filter: `.[] | {id, name, type}`, description: 'Extract key fields' },
      { filter: `group_by(.type) | map({type: .[0].type, count: length})`, description: 'Count by type' },
      { filter: `-r '.[] | "\(.id)\t\(.name)\t\(.type)"'`, description: 'TSV export' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // VARIABLES LIST
    // Returns: { id, key, value, type }
    // ═══════════════════════════════════════════════════════════════════════
    'variables-list': [
      { filter: `.[] | {key, value}`, description: 'Extract key-value pairs' },
      { filter: `-r '.[] | "\(.key)=\(.value)"'`, description: 'Export as env format' },
      { filter: `map({(.key): .value}) | add`, description: 'Convert to object' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // TAGS LIST
    // Returns: { id, name, createdAt, updatedAt }
    // ═══════════════════════════════════════════════════════════════════════
    'tags-list': [
      { filter: `-r '.[].name'`, description: 'List tag names only' },
      { filter: `.[] | {id, name}`, description: 'Extract ID and name' },
      { filter: `sort_by(.name)`, description: 'Sort alphabetically' },
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIT
    // Returns: { 'Category Risk Report': { risk, sections[] } }
    // ═══════════════════════════════════════════════════════════════════════
    'audit': [
      { filter: `keys`, description: 'List risk report categories' },
      { filter: `.[] | .sections | length`, description: 'Count issues per category' },
      { filter: `.[] | .sections[].title`, description: 'List all issue titles' },
    ],
  };

  return recipes[command] || [];
}

/**
 * Format complete jq/export footer
 * Shows both pipe and file-based examples with real filters
 */
export function formatExportFooter(
  command: CommandType,
  cliCommand: string,
  savedFile?: string
): string {
  const recipes = getCommandRecipes(command);
  if (recipes.length === 0) return '';

  const lines: string[] = [];
  const isListCommand = command.includes('list') || command.includes('search');
  
  lines.push(chalk.cyan('\n💡 Export & filter with jq:'));
  
  // Pipe examples (for --json output)
  // Note: --json wraps in {data: [...]} for list commands
  lines.push(chalk.dim('\n   # Pipe to jq (quick analysis):'));
  
  const topRecipes = recipes.slice(0, 2);
  for (const recipe of topRecipes) {
    // For --json output, we need to access .data first for list commands
    const jsonFilter = isListCommand 
      ? recipe.filter.replace(/^\.\[\]/, '.data[]').replace(/^sort_by/, '.data | sort_by').replace(/^group_by/, '.data | group_by').replace(/^map/, '.data | map').replace(/^-r '\.\[\]/, `-r '.data[]`)
      : recipe.filter;
    
    lines.push(chalk.green(`   n8n ${cliCommand} --json | jq '${jsonFilter}'`));
    lines.push(chalk.dim(`      # ${recipe.description}`));
  }
  
  // Save + file-based examples
  const filename = savedFile || `${command.split('-')[0]}.json`;
  lines.push(chalk.dim('\n   # Save then filter (for larger datasets):'));
  lines.push(chalk.green(`   n8n ${cliCommand} --save ${filename}`));
  
  // Show remaining recipes for file-based filtering
  const fileRecipes = recipes.slice(0, 3);
  for (const recipe of fileRecipes) {
    lines.push(chalk.green(`   jq '${recipe.filter}' ${filename}`));
  }
  
  // Export tips
  lines.push(chalk.dim('\n   # Export as TSV/CSV:'));
  if (isListCommand) {
    const tsvRecipe = recipes.find(r => r.filter.startsWith('-r'));
    if (tsvRecipe) {
      lines.push(chalk.green(`   jq ${tsvRecipe.filter} ${filename}`));
    } else {
      lines.push(chalk.green(`   jq -r '.[] | [.id, .name] | @tsv' ${filename}`));
    }
  }
  
  return lines.join('\n') + '\n';
}

/**
 * Format compact jq hint (single line)
 */
export function formatJqHint(command: CommandType, cliCommand: string): string {
  const recipes = getCommandRecipes(command);
  if (recipes.length === 0) return '';
  
  const isListCommand = command.includes('list') || command.includes('search');
  const filter = isListCommand ? '.data[]' : '.';
  
  return chalk.dim(`\n💡 Tip: n8n ${cliCommand} --json | jq '${filter}'\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// Keep old function signature for backwards compatibility
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Use formatExportFooter instead
 */
export function formatJqRecipes(recipes: JqRecipe[], filename: string): string {
  if (recipes.length === 0) return '';
  
  let output = chalk.yellow(`\n💡 jq recipes (with --save ${filename}):\n`);
  
  for (const recipe of recipes) {
    const cmd = recipe.filter.startsWith('-r') 
      ? `jq ${recipe.filter} ${filename}`
      : `jq '${recipe.filter}' ${filename}`;
    output += chalk.dim('   ') + chalk.green(cmd) + '\n';
    output += chalk.dim(`      # ${recipe.description}`) + '\n';
  }
  
  return output;
}

/**
 * @deprecated Use getCommandRecipes instead
 */
export function getStandardRecipes(dataType: 'nodes' | 'workflows' | 'executions' | 'templates', filename: string): JqRecipe[] {
  // Map old data types to new command types
  const mapping: Record<string, CommandType> = {
    nodes: 'nodes-search',
    workflows: 'workflows-list',
    executions: 'executions-list',
    templates: 'templates-search',
  };
  
  return getCommandRecipes(mapping[dataType] || 'workflows-list');
}
