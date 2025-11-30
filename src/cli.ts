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
  .description('Search and inspect n8n nodes');

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

nodesCmd
  .command('get <nodeType>')
  .description('Get node schema and documentation')
  .option('-m, --mode <mode>', 'Output mode: info, docs, versions', 'info')
  .option('-d, --detail <level>', 'Detail level: minimal, standard, full', 'standard')
  .option('--json', 'Output as JSON')
  .option('-s, --save <path>', 'Save to JSON file')
  .action(async (nodeType, opts) => {
    const { nodesGetCommand } = await import('./commands/nodes/get.js');
    await nodesGetCommand(nodeType, opts);
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

// ============================================================================
// LEGACY VALIDATE COMMAND (backwards compatibility)
// ============================================================================
program
  .command('validate [file]')
  .description('Validate workflow JSON file (legacy command)')
  .option('--repair', 'Attempt to repair malformed JSON')
  .option('--fix', 'Auto-fix known issues')
  .option('--json', 'Output as JSON')
  .option('-o, --output <path>', 'Save fixed workflow')
  .action(async (file, opts) => {
    // Redirect to workflows validate
    const { workflowsValidateCommand } = await import('./commands/workflows/validate.js');
    await workflowsValidateCommand(file, { ...opts, file: file || opts.file });
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
