#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registerShutdownHandlers, shutdown } from './core/lifecycle.js';

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgPath = join(__dirname, '..', 'package.json');
let version = '1.5.0';
try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  version = pkg.version;
} catch {
  // Use default version
}

// Create main program
const program = new Command();

program
  .name('n8n')
  .description('Full-featured n8n CLI - workflow management, validation, node search, and more')
  .version(version, '-V, --version', 'Output version number')
  .helpOption('-h, --help', 'Display help');

// Show version in help header
program.addHelpText('beforeAll', `\nn8n v${version}\n`);

// ============================================================================
// AUTH COMMAND
// ============================================================================
const authCmd = program
  .command('auth')
  .description('Manage n8n CLI authentication');

authCmd
  .command('login')
  .description('Configure n8n credentials')
  .option('-H, --host <url>', 'n8n instance URL (e.g., https://your-n8n.com)')
  .option('-k, --api-key <key>', 'n8n API key')
  .option('-i, --interactive', 'Use interactive mode with prompts')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { authLoginCommand } = await import('./commands/auth/index.js');
    await authLoginCommand(opts);
  });

authCmd
  .command('status')
  .alias('whoami')
  .description('Show current authentication status')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { authStatusCommand } = await import('./commands/auth/index.js');
    await authStatusCommand(opts);
  });

authCmd
  .command('logout')
  .description('Clear stored credentials')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { authLogoutCommand } = await import('./commands/auth/index.js');
    await authLogoutCommand(opts);
  });

// Default action for 'n8n auth' without subcommand - show help
authCmd.action(async () => {
  const { showAuthHelp } = await import('./commands/auth/index.js');
  showAuthHelp();
});

// ============================================================================
// HEALTH COMMAND
// ============================================================================
program
  .command('health')
  .description('Check n8n instance connectivity and API status')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { healthCommand } = await import('./commands/health/index.js');
    await healthCommand(opts);
  });

// ============================================================================
// NODES COMMANDS
// ============================================================================
const nodesCmd = program
  .command('nodes')
  .description('Search, list, and inspect n8n nodes');

nodesCmd
  .command('list')
  .description('List all available nodes')
  .option('--by-category', 'Group nodes by category')
  .option('-c, --category <name>', 'Filter by category')
  .option('-s, --search <query>', 'Search with fuzzy matching')
  .option('-l, --limit <n>', 'Limit results (0 = all)', '0')
  .option('--compact', 'Compact table format')
  .option('--save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { nodesListCommand } = await import('./commands/nodes/list.js');
    await nodesListCommand(opts);
  });

nodesCmd
  .command('show <nodeType>')
  .description('Show node details, schema, and examples')
  .option('--schema', 'Show full property schema')
  .option('--minimal', 'Show operations only')
  .option('--examples', 'Show usage examples')
  .option('-m, --mode <mode>', 'Output mode: info, docs, versions', 'info')
  .option('-d, --detail <level>', 'Detail level: minimal, standard, full', 'standard')
  .option('--json', 'Output as JSON')
  .option('-s, --save <path>', 'Save to JSON file')
  .action(async (nodeType, opts) => {
    const { nodesShowCommand } = await import('./commands/nodes/show.js');
    await nodesShowCommand(nodeType, opts);
  });

nodesCmd
  .command('categories')
  .description('List all node categories with counts')
  .option('--detailed', 'Show descriptions and examples')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { nodesCategoriesCommand } = await import('./commands/nodes/categories.js');
    await nodesCategoriesCommand(opts);
  });

nodesCmd
  .command('search <query>')
  .description('Search for nodes by keyword')
  .option('-m, --mode <mode>', 'Search mode: OR, AND, FUZZY', 'OR')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('-s, --save <path>', 'Save full results to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (query, opts) => {
    const { nodesSearchCommand } = await import('./commands/nodes/search.js');
    await nodesSearchCommand(query, opts);
  });

// Alias 'get' to 'show' for backwards compatibility
nodesCmd
  .command('get <nodeType>')
  .description('Get node schema (alias for "show")')
  .option('-m, --mode <mode>', 'Output mode: info, docs, versions', 'info')
  .option('-d, --detail <level>', 'Detail level: minimal, standard, full', 'standard')
  .option('--json', 'Output as JSON')
  .option('-s, --save <path>', 'Save to JSON file')
  .action(async (nodeType, opts) => {
    const { nodesShowCommand } = await import('./commands/nodes/show.js');
    await nodesShowCommand(nodeType, opts);
  });

nodesCmd
  .command('validate <nodeType>')
  .description('Validate node configuration')
  .option('-c, --config <json>', 'Node config as JSON string', '{}')
  .option('--profile <profile>', 'Validation profile: minimal, runtime, strict', 'runtime')
  .option('--json', 'Output as JSON')
  .action(async (nodeType, opts) => {
    const { nodesValidateCommand } = await import('./commands/nodes/validate.js');
    await nodesValidateCommand(nodeType, opts);
  });

// Default action for 'n8n nodes' without subcommand - show help with exit 0
nodesCmd.action((cmd) => {
  // Check if an unknown subcommand was passed
  const args = nodesCmd.args;
  if (args.length > 0) {
    console.error(`error: unknown command 'n8n nodes ${args[0]}'`);
    console.error(`Run 'n8n nodes --help' to see available commands.`);
    process.exitCode = 1;
    return;
  }
  nodesCmd.help();
});

// ============================================================================
// WORKFLOWS COMMANDS
// ============================================================================
const workflowsCmd = program
  .command('workflows')
  .description('Manage n8n workflows');

workflowsCmd
  .command('list')
  .description('List all workflows')
  .option('-a, --active', 'Filter active workflows only')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('--cursor <cursor>', 'Pagination cursor')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { workflowsListCommand } = await import('./commands/workflows/list.js');
    await workflowsListCommand(opts);
  });

workflowsCmd
  .command('get <id>')
  .description('Get workflow by ID')
  .option('-m, --mode <mode>', 'Output mode: full, details, structure, minimal', 'full')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { workflowsGetCommand } = await import('./commands/workflows/get.js');
    await workflowsGetCommand(id, opts);
  });

workflowsCmd
  .command('validate [idOrFile]')
  .description('Validate a workflow (by ID or local file)')
  .option('-f, --file <path>', 'Path to workflow JSON file')
  .option('--profile <profile>', 'Validation profile: minimal, runtime, ai-friendly, strict', 'runtime')
  .option('--repair', 'Attempt to repair malformed JSON')
  .option('--fix', 'Auto-fix known issues')
  .option('-s, --save <path>', 'Save fixed workflow to file')
  .option('--json', 'Output as JSON')
  .action(async (idOrFile, opts) => {
    const { workflowsValidateCommand } = await import('./commands/workflows/validate.js');
    await workflowsValidateCommand(idOrFile, opts);
  });

workflowsCmd
  .command('create')
  .description('Create a new workflow')
  .option('-f, --file <path>', 'Path to workflow JSON file (required)')
  .option('-n, --name <name>', 'Workflow name (overrides file)')
  .option('--dry-run', 'Preview without creating', true)
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { workflowsCreateCommand } = await import('./commands/workflows/create.js');
    await workflowsCreateCommand(opts);
  });

workflowsCmd
  .command('update <id>')
  .description('Update workflow with partial changes')
  .option('-o, --operations <json>', 'Diff operations as JSON')
  .option('-f, --file <path>', 'Path to workflow JSON file')
  .option('--activate', 'Activate the workflow')
  .option('--deactivate', 'Deactivate the workflow')
  .option('--force, --yes', 'Skip confirmation prompts')
  .option('--no-backup', 'Skip creating backup before changes')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { workflowsUpdateCommand } = await import('./commands/workflows/update.js');
    await workflowsUpdateCommand(id, opts);
  });

workflowsCmd
  .command('autofix <id>')
  .description('Auto-fix workflow validation issues')
  .option('--dry-run', 'Preview fixes without applying', true)
  .option('--confidence <level>', 'Minimum confidence: high, medium, low', 'medium')
  .option('-s, --save <path>', 'Save fixed workflow locally')
  .option('--apply', 'Apply fixes (to file or n8n server)')
  .option('--force, --yes', 'Skip confirmation prompts')
  .option('--no-backup', 'Skip creating backup before changes')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { workflowsAutofixCommand } = await import('./commands/workflows/autofix.js');
    await workflowsAutofixCommand(id, opts);
  });

workflowsCmd
  .command('trigger <webhookUrl>')
  .description('Trigger workflow via webhook')
  .option('-d, --data <json>', 'Request body as JSON', '{}')
  .option('-m, --method <method>', 'HTTP method: GET, POST, PUT, DELETE', 'POST')
  .option('--json', 'Output as JSON')
  .action(async (webhookUrl, opts) => {
    const { workflowsTriggerCommand } = await import('./commands/workflows/trigger.js');
    await workflowsTriggerCommand(webhookUrl, opts);
  });

workflowsCmd
  .command('tags <id>')
  .description('Get or set workflow tags')
  .option('--set <tagIds>', 'Comma-separated tag IDs to assign')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { workflowsTagsCommand } = await import('./commands/workflows/tags.js');
    await workflowsTagsCommand(id, opts);
  });

// Default action for 'n8n workflows' without subcommand - show help with exit 0
workflowsCmd.action(() => {
  const args = workflowsCmd.args;
  if (args.length > 0) {
    console.error(`error: unknown command 'n8n workflows ${args[0]}'`);
    console.error(`Run 'n8n workflows --help' to see available commands.`);
    process.exitCode = 1;
    return;
  }
  workflowsCmd.help();
});

// ============================================================================
// EXECUTIONS COMMANDS
// ============================================================================
const executionsCmd = program
  .command('executions')
  .description('View and manage workflow executions');

executionsCmd
  .command('list')
  .description('List executions')
  .option('-w, --workflow-id <id>', 'Filter by workflow ID')
  .option('--status <status>', 'Filter by status: success, error, waiting')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('--cursor <cursor>', 'Pagination cursor')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { executionsListCommand } = await import('./commands/executions/list.js');
    await executionsListCommand(opts);
  });

executionsCmd
  .command('get <id>')
  .description('Get execution details')
  .option('-m, --mode <mode>', 'Output mode: preview, summary, filtered, full', 'summary')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { executionsGetCommand } = await import('./commands/executions/get.js');
    await executionsGetCommand(id, opts);
  });

executionsCmd
  .command('retry <id>')
  .description('Retry a failed execution')
  .option('--load-latest', 'Use latest workflow version instead of snapshot')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { executionsRetryCommand } = await import('./commands/executions/retry.js');
    await executionsRetryCommand(id, opts);
  });

executionsCmd
  .command('delete <id>')
  .description('Delete an execution')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { executionsDeleteCommand } = await import('./commands/executions/delete.js');
    await executionsDeleteCommand(id, opts);
  });

// Default action for 'n8n executions' without subcommand - show help with exit 0
executionsCmd.action(() => {
  const args = executionsCmd.args;
  if (args.length > 0) {
    console.error(`error: unknown command 'n8n executions ${args[0]}'`);
    console.error(`Run 'n8n executions --help' to see available commands.`);
    process.exitCode = 1;
    return;
  }
  executionsCmd.help();
});

// ============================================================================
// CREDENTIALS COMMANDS
// ============================================================================
const credentialsCmd = program
  .command('credentials')
  .description('Manage n8n credentials');

credentialsCmd
  .command('list')
  .description('List all credentials')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('--cursor <cursor>', 'Pagination cursor')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { credentialsListCommand } = await import('./commands/credentials/index.js');
    await credentialsListCommand(opts);
  });

credentialsCmd
  .command('schema <typeName>')
  .description('Get credential type schema')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (typeName, opts) => {
    const { credentialsSchemaCommand } = await import('./commands/credentials/index.js');
    await credentialsSchemaCommand(typeName, opts);
  });

credentialsCmd
  .command('create')
  .description('Create a new credential')
  .requiredOption('-t, --type <type>', 'Credential type (e.g., githubApi)')
  .requiredOption('-n, --name <name>', 'Credential name')
  .option('-d, --data <json>', 'Credential data as JSON or @file.json')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { credentialsCreateCommand } = await import('./commands/credentials/index.js');
    await credentialsCreateCommand(opts);
  });

credentialsCmd
  .command('delete <id>')
  .description('Delete a credential')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { credentialsDeleteCommand } = await import('./commands/credentials/index.js');
    await credentialsDeleteCommand(id, opts);
  });

credentialsCmd
  .command('types')
  .description('List all available credential types')
  .option('--by-auth', 'Group by authentication method')
  .option('-s, --search <query>', 'Search credential types')
  .option('-l, --limit <n>', 'Limit results', '0')
  .option('--save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { credentialTypesCommand } = await import('./commands/credentials/types.js');
    await credentialTypesCommand(opts);
  });

credentialsCmd
  .command('show-type <typeName>')
  .description('Show credential type schema')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (typeName, opts) => {
    const { credentialTypeShowCommand } = await import('./commands/credentials/type-show.js');
    await credentialTypeShowCommand(typeName, opts);
  });

// Default action for 'n8n credentials' without subcommand
credentialsCmd.action(async () => {
  const { showCredentialsHelp } = await import('./commands/credentials/index.js');
  showCredentialsHelp();
});

// ============================================================================
// VARIABLES COMMANDS
// ============================================================================
const variablesCmd = program
  .command('variables')
  .description('Manage n8n environment variables');

variablesCmd
  .command('list')
  .description('List all variables')
  .option('-l, --limit <n>', 'Limit results', '100')
  .option('--cursor <cursor>', 'Pagination cursor')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { variablesListCommand } = await import('./commands/variables/index.js');
    await variablesListCommand(opts);
  });

variablesCmd
  .command('create')
  .description('Create a new variable')
  .requiredOption('-k, --key <key>', 'Variable key')
  .requiredOption('-v, --value <value>', 'Variable value')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { variablesCreateCommand } = await import('./commands/variables/index.js');
    await variablesCreateCommand(opts);
  });

variablesCmd
  .command('update <id>')
  .description('Update a variable')
  .requiredOption('-k, --key <key>', 'Variable key')
  .requiredOption('-v, --value <value>', 'Variable value')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { variablesUpdateCommand } = await import('./commands/variables/index.js');
    await variablesUpdateCommand(id, opts);
  });

variablesCmd
  .command('delete <id>')
  .description('Delete a variable')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { variablesDeleteCommand } = await import('./commands/variables/index.js');
    await variablesDeleteCommand(id, opts);
  });

// Default action for 'n8n variables' without subcommand
variablesCmd.action(async () => {
  const { showVariablesHelp } = await import('./commands/variables/index.js');
  showVariablesHelp();
});

// ============================================================================
// TAGS COMMANDS
// ============================================================================
const tagsCmd = program
  .command('tags')
  .description('Manage n8n tags');

tagsCmd
  .command('list')
  .description('List all tags')
  .option('-l, --limit <n>', 'Limit results', '100')
  .option('--cursor <cursor>', 'Pagination cursor')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { tagsListCommand } = await import('./commands/tags/index.js');
    await tagsListCommand(opts);
  });

tagsCmd
  .command('get <id>')
  .description('Get tag by ID')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { tagsGetCommand } = await import('./commands/tags/index.js');
    await tagsGetCommand(id, opts);
  });

tagsCmd
  .command('create')
  .description('Create a new tag')
  .requiredOption('-n, --name <name>', 'Tag name')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { tagsCreateCommand } = await import('./commands/tags/index.js');
    await tagsCreateCommand(opts);
  });

tagsCmd
  .command('update <id>')
  .description('Update a tag')
  .requiredOption('-n, --name <name>', 'New tag name')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { tagsUpdateCommand } = await import('./commands/tags/index.js');
    await tagsUpdateCommand(id, opts);
  });

tagsCmd
  .command('delete <id>')
  .description('Delete a tag')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { tagsDeleteCommand } = await import('./commands/tags/index.js');
    await tagsDeleteCommand(id, opts);
  });

// Default action for 'n8n tags' without subcommand
tagsCmd.action(async () => {
  const { showTagsHelp } = await import('./commands/tags/index.js');
  showTagsHelp();
});

// ============================================================================
// AUDIT COMMAND
// ============================================================================
program
  .command('audit')
  .description('Generate security audit for n8n instance')
  .option('-c, --categories <list>', 'Comma-separated categories: credentials,database,nodes,filesystem,instance')
  .option('--days-abandoned <n>', 'Days for workflow to be considered abandoned')
  .option('-s, --save <path>', 'Save report to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { auditCommand } = await import('./commands/audit/index.js');
    await auditCommand(opts);
  });

// ============================================================================
// TEMPLATES COMMANDS
// ============================================================================
const templatesCmd = program
  .command('templates')
  .description('Search and get workflow templates');

templatesCmd
  .command('search <query>')
  .description('Search templates by keyword')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (query, opts) => {
    const { templatesSearchCommand } = await import('./commands/templates/search.js');
    await templatesSearchCommand(query, opts);
  });

templatesCmd
  .command('get <id>')
  .description('Get template by ID')
  .option('-s, --save <path>', 'Save workflow to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { templatesGetCommand } = await import('./commands/templates/get.js');
    await templatesGetCommand(id, opts);
  });

// Default action for 'n8n templates' without subcommand - show help with exit 0
templatesCmd.action(() => {
  const args = templatesCmd.args;
  if (args.length > 0) {
    console.error(`error: unknown command 'n8n templates ${args[0]}'`);
    console.error(`Run 'n8n templates --help' to see available commands.`);
    process.exitCode = 1;
    return;
  }
  templatesCmd.help();
});

// ============================================================================
// LEGACY VALIDATE COMMAND (backwards compatibility)
// ============================================================================
program
  .command('validate [file]')
  .description('Validate workflow JSON file (legacy command)')
  .option('--repair', 'Attempt to repair malformed JSON')
  .option('--fix', 'Auto-fix known issues')
  .option('--json', 'Output as JSON')
  .option('-s, --save <path>', 'Save fixed workflow')
  .action(async (file, opts) => {
    // Redirect to workflows validate
    const { workflowsValidateCommand } = await import('./commands/workflows/validate.js');
    await workflowsValidateCommand(file, { ...opts, file: file || opts.file });
  });

// BUG-006: Handle unknown commands with helpful error
program.on('command:*', (operands) => {
  console.error(`error: unknown command '${operands[0]}'`);
  console.error(`Run 'n8n --help' to see available commands.`);
  process.exitCode = 1;
});

// Default action for 'n8n' without any command - show help with exit 0
program.action(() => {
  program.help();
});

// Register shutdown handlers for graceful cleanup
registerShutdownHandlers();

// Handle unhandled rejections - set exitCode instead of exit() to allow cleanup
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exitCode = 1;
});

// Parse and execute (async to properly await all command handlers)
(async () => {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    // Ensure cleanup runs on normal completion
    await shutdown();
  }
})();
