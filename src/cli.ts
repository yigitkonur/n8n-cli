#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registerShutdownHandlers, shutdown } from './core/lifecycle.js';
import { disableColors } from './utils/output.js';
import { setConfigProfile } from './core/config/loader.js';
import type { GlobalOptions } from './types/global-options.js';

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
  .helpOption('-h, --help', 'Display help')
  // Global options - available on all commands
  .option('-v, --verbose', 'Enable verbose/debug output')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--no-color', 'Disable colored output')
  .option('--profile <name>', 'Use specific configuration profile');

// Handle --no-color globally before any output
program.on('option:no-color', () => {
  disableColors();
});

// Handle --profile to set config profile before commands run
program.on('option:profile', (profileName: string) => {
  setConfigProfile(profileName);
});

// Get global options and merge with local options
function getGlobalOpts(): GlobalOptions {
  return program.opts<GlobalOptions>();
}

// Merge global options with command-specific options
function mergeOpts<T extends object>(localOpts: T): T & GlobalOptions {
  return { ...getGlobalOpts(), ...localOpts };
}

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
  .addHelpText('after', `
Configuration Storage:
  Credentials are saved to ~/.n8nrc.json (or .n8nrc.json in current directory)
  API keys are stored in plain text - ensure file permissions are secure.

Environment Variables:
  N8N_HOST      Override host URL
  N8N_API_KEY   Override API key (avoids storing in config file)

Examples:
  n8n auth login --interactive              # Guided setup with prompts
  n8n auth login -H https://n8n.example.com -k eyJhbGc...
  N8N_API_KEY=xxx n8n workflows list        # Use env var without saving

💡 Tip: Get your API key from n8n Settings → API → Create API Key
`)
  .action(async (opts) => {
    const { authLoginCommand } = await import('./commands/auth/index.js');
    await authLoginCommand(mergeOpts(opts));
  });

authCmd
  .command('status')
  .alias('whoami')
  .description('Show current authentication status')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Checks:
  • Config file exists and is readable
  • Host URL is configured
  • API key is present and valid format
  • Connection to n8n instance works
  • API key has not expired

Example Output:
  Host:     https://n8n.example.com
  API Key:  eyJh...vGv8 (masked)
  Status:   Connected (531ms latency)

💡 Tip: Use 'n8n health' for a quick connectivity check
`)
  .action(async (opts) => {
    const { authStatusCommand } = await import('./commands/auth/index.js');
    await authStatusCommand(mergeOpts(opts));
  });

authCmd
  .command('logout')
  .description('Clear stored credentials')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Behavior:
  Removes host and API key from ~/.n8nrc.json
  Does NOT invalidate the API key on the n8n server
  Environment variables (N8N_HOST, N8N_API_KEY) are not affected

⚠️  Note: To fully revoke access, also delete the API key in n8n UI:
   n8n Settings → API → Delete the API key
`)
  .action(async (opts) => {
    const { authLogoutCommand } = await import('./commands/auth/index.js');
    await authLogoutCommand(mergeOpts(opts));
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
  .addHelpText('after', `
Checks Performed:
  • DNS resolution and network connectivity
  • HTTPS/TLS certificate validity
  • API endpoint responds (GET /api/v1)
  • API key authentication works
  • Response time (latency)

Common Issues:
  "Connection refused"    → Check host URL and port
  "Certificate error"     → Self-signed cert? Use NODE_TLS_REJECT_UNAUTHORIZED=0
  "401 Unauthorized"      → API key invalid or expired, run 'n8n auth login'
  "Timeout"               → Network/firewall issue, check connectivity

Example:
  n8n health              # Human-readable output
  n8n health --json       # For scripting/monitoring
`)
  .action(async (opts) => {
    const { healthCommand } = await import('./commands/health/index.js');
    await healthCommand(mergeOpts(opts));
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
  .addHelpText('after', `
📋 Data Source: Local SQLite database (bundled with CLI)
   This does NOT query your n8n instance - it uses offline node data.
   Database location: <cli-install>/data/nodes.db

Categories: Transform, Input, Trigger, Output, Organization

Examples:
  n8n nodes list --by-category                  # Group by category
  n8n nodes list --category trigger --limit 20  # List trigger nodes
  n8n nodes list --search "http" --save nodes.json

jq Examples (after --save):
  jq '.nodes[] | select(.category=="trigger")' nodes.json
  jq -r '.nodes[].nodeType' nodes.json | sort | uniq
`)
  .action(async (opts) => {
    const { nodesListCommand } = await import('./commands/nodes/list.js');
    await nodesListCommand(mergeOpts(opts));
  });

nodesCmd
  .command('show <nodeType>')
  .description('Show node details, schema, and examples')
  .option('--schema', 'Show full property schema')
  .option('--minimal', 'Show operations only')
  .option('--examples', 'Show usage examples')
  .option('-m, --mode <mode>', 'Output mode: info, docs, versions, breaking', 'info')
  .option('-d, --detail <level>', 'Detail level: minimal, standard, full', 'standard')
  .option('--from <version>', 'Source version (for --mode breaking)')
  .option('--to <version>', 'Target version (for --mode breaking)')
  .option('--json', 'Output as JSON')
  .option('-s, --save <path>', 'Save to JSON file')
  .addHelpText('after', `
Node Type Naming:
  Use the internal node type name, NOT the display name:
  ✓ n8n-nodes-base.httpRequest     (correct)
  ✓ @n8n/n8n-nodes-langchain.agent  (community nodes)
  ✗ "HTTP Request"                  (display name - won't work)

💡 Find node types with: n8n nodes search "http"

Output Modes:
  info      Default: operations, properties, credentials
  docs      Documentation and descriptions
  versions  Version history and changes
  breaking  Breaking changes between versions (use --from/--to)

Examples:
  n8n nodes show n8n-nodes-base.slack --schema
  n8n nodes show n8n-nodes-base.httpRequest --mode docs
  n8n nodes show n8n-nodes-base.webhook --save webhook-schema.json
  n8n nodes show n8n-nodes-base.webhook --mode breaking --from 1.0 --to 2.0
`)
  .action(async (nodeType, opts) => {
    const { nodesShowCommand } = await import('./commands/nodes/show.js');
    await nodesShowCommand(nodeType, mergeOpts(opts));
  });

nodesCmd
  .command('categories')
  .description('List all node categories with counts')
  .option('--detailed', 'Show descriptions and examples')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Categories:
  Transform      Data manipulation (Set, Split, Merge, etc.)
  Input          Read data (HTTP Request, Read File, etc.)
  Trigger        Start workflows (Webhook, Schedule, etc.)
  Output         Write data (Write File, Send Email, etc.)
  Organization   Workflow organization (Sticky Note, etc.)

Example:
  n8n nodes categories --detailed
  n8n nodes list --category trigger
`)
  .action(async (opts) => {
    const { nodesCategoriesCommand } = await import('./commands/nodes/categories.js');
    await nodesCategoriesCommand(mergeOpts(opts));
  });

nodesCmd
  .command('search <query>')
  .description('Search for nodes by keyword')
  .option('-m, --mode <mode>', 'Search mode: OR, AND, FUZZY', 'OR')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('-s, --save <path>', 'Save full results to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Search Modes:
  OR (default)  Match ANY term: "slack message" finds slack OR message
  AND           Match ALL terms: "http request" finds nodes with both
  FUZZY         Typo-tolerant: "gogle" finds "google"

📋 Searches local database, not your n8n instance.
   Results show: nodeType (for use in commands), displayName, category

Examples:
  n8n nodes search "slack"                    # Find Slack nodes
  n8n nodes search "http request" --mode AND  # Both terms required
  n8n nodes search "gogle" --mode FUZZY       # Handles typos

💡 Get full node details: n8n nodes show <nodeType>
`)
  .action(async (query, opts) => {
    const { nodesSearchCommand } = await import('./commands/nodes/search.js');
    await nodesSearchCommand(query, mergeOpts(opts));
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
    await nodesShowCommand(nodeType, mergeOpts(opts));
  });

nodesCmd
  .command('validate <nodeType>')
  .description('Validate node configuration')
  .option('-c, --config <json>', 'Node config as JSON string', '{}')
  .option('--profile <profile>', 'Validation profile: minimal, runtime, strict', 'runtime')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Validation Profiles:
  minimal   Basic type checks only
  runtime   Default: validates against node schema
  strict    All checks + best practice warnings

Examples:
  n8n nodes validate n8n-nodes-base.webhook --config '{"path":"/test"}'  
  n8n nodes validate n8n-nodes-base.httpRequest --profile strict

💡 Get valid config options: n8n nodes show <nodeType> --schema
`)
  .action(async (nodeType, opts) => {
    const { nodesValidateCommand } = await import('./commands/nodes/validate.js');
    await nodesValidateCommand(nodeType, mergeOpts(opts));
  });

nodesCmd
  .command('breaking-changes <nodeType>')
  .description('Analyze breaking changes between node versions')
  .option('--from <version>', 'Source version (default: 1.0)')
  .option('--to <version>', 'Target version (default: latest known)')
  .option('--severity <level>', 'Filter by severity: LOW, MEDIUM, HIGH')
  .option('--auto-only', 'Show only auto-migratable changes')
  .option('-s, --save <path>', 'Save analysis to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
📋 Uses bundled breaking changes registry (offline, no n8n instance needed)

Severity Levels:
  HIGH     Breaking changes that will cause errors
  MEDIUM   Changes that may affect behavior
  LOW      Minor changes, usually safe

Examples:
  n8n nodes breaking-changes webhook --from 1.0 --to 2.0
  n8n nodes breaking-changes httpRequest --from 4.1 --to 4.2 --json
  n8n nodes breaking-changes executeWorkflow --from 1.0 --severity HIGH
  n8n nodes breaking-changes switch --from 2.0 --auto-only

💡 Check your workflows: n8n workflows validate <file> --check-upgrades
`)
  .action(async (nodeType, opts) => {
    const { nodesBreakingChangesCommand } = await import('./commands/nodes/breaking-changes.js');
    await nodesBreakingChangesCommand(nodeType, mergeOpts(opts));
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
  .addHelpText('after', `
Pagination:
  Default shows 10 workflows. Use --limit 0 for all (may be slow).
  For large instances, use --cursor from previous response for next page.

Filtering:
  --active        Only active (running) workflows
  --tags          Filter by tag names (comma-separated)

Examples:
  n8n workflows list --limit 50               # First 50 workflows
  n8n workflows list --active --save active.json
  n8n workflows list --tags "production,critical"

jq Examples (after --save):
  jq '.data[] | {id, name, active}' workflows.json
  jq '.data[] | select(.active==true) | .id' workflows.json
  jq -r '.data[].id' workflows.json | head -5  # First 5 IDs
`)
  .action(async (opts) => {
    const { workflowsListCommand } = await import('./commands/workflows/list.js');
    await workflowsListCommand(mergeOpts(opts));
  });

workflowsCmd
  .command('get <id>')
  .description('Get workflow by ID')
  .option('-m, --mode <mode>', 'Output mode: full, details, structure, minimal', 'full')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Output Modes:
  full        Complete workflow with all nodes and connections
  details     Metadata only (name, dates, tags, no nodes)
  structure   Nodes and connections (for analysis)
  minimal     Just ID, name, active status

Export for Backup/Migration:
  n8n workflows get WORKFLOW_ID --save backup.json

⚠️  Exported files contain read-only properties (id, tags, etc.)
   Use 'n8n workflows create --file backup.json' which auto-strips them.

Examples:
  n8n workflows get abc123 --mode details     # Quick metadata
  n8n workflows get abc123 --save workflow.json --json
`)
  .action(async (id, opts) => {
    const { workflowsGetCommand } = await import('./commands/workflows/get.js');
    await workflowsGetCommand(id, mergeOpts(opts));
  });

workflowsCmd
  .command('validate [idOrFile]')
  .description('Validate a workflow (by ID or local file)')
  .option('-f, --file <path>', 'Path to workflow JSON file')
  .option('--profile <profile>', 'Validation profile: minimal, runtime, ai-friendly, strict', 'runtime')
  .option('--repair', 'Attempt to repair malformed JSON')
  .option('--fix', 'Auto-fix known issues')
  .option('--check-upgrades', 'Check for node version upgrades and breaking changes')
  .option('--upgrade-severity <level>', 'Minimum severity for upgrade warnings: LOW, MEDIUM, HIGH')
  .option('--validate-expressions', 'Enable expression format validation (default: true)')
  .option('--no-validate-expressions', 'Skip expression format validation')
  .option('-s, --save <path>', 'Save fixed workflow to file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Validation Profiles:
  minimal      Basic structure checks (fast)
  runtime      Default: structure + node type validation
  ai-friendly  Optimized output for LLM processing
  strict       All checks + best practices warnings

Upgrade Checking:
  --check-upgrades       Analyze nodes for available version upgrades
  --upgrade-severity     Filter by severity (LOW, MEDIUM, HIGH)

💡 Tip: Use --fix --save to clean exported workflows:
   n8n workflows validate workflow.json --fix --save clean.json

Examples:
  n8n workflows validate workflow.json --check-upgrades
  n8n workflows validate workflow.json --check-upgrades --upgrade-severity HIGH --json
`)
  .action(async (idOrFile, opts) => {
    const { workflowsValidateCommand } = await import('./commands/workflows/validate.js');
    await workflowsValidateCommand(idOrFile, mergeOpts(opts));
  });

workflowsCmd
  .command('create')
  .description('Create a new workflow')
  .option('-f, --file <path>', 'Path to workflow JSON file (required)')
  .option('-n, --name <name>', 'Workflow name (overrides file)')
  .option('--dry-run', 'Preview without creating')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
⚠️  Using exported workflow files?
   Exported files contain read-only properties that must be stripped.
   This command auto-strips them, but you can also clean manually:

   cat workflow.json | jq 'del(.id, .versionId, .tags, .pinData, .meta,
     .createdAt, .updatedAt, .staticData, .shared, .homeProject,
     .sharedWithProjects)' > clean.json

💡 Tip: Use --dry-run to preview before creating:
   n8n workflows create --file workflow.json --dry-run
`)
  .action(async (opts) => {
    const { workflowsCreateCommand } = await import('./commands/workflows/create.js');
    await workflowsCreateCommand(mergeOpts(opts));
  });

workflowsCmd
  .command('update <id>')
  .description('Update workflow with partial changes')
  .option('-o, --operations <json>', 'Diff operations as JSON')
  .option('-f, --file <path>', 'Path to workflow JSON file')
  .option('-n, --name <name>', 'New workflow name')
  .option('--activate', 'Activate the workflow')
  .option('--deactivate', 'Deactivate the workflow')
  .option('--force, --yes', 'Skip confirmation prompts')
  .option('--no-backup', 'Skip creating backup before changes')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
⚠️  Scripting/CI Note:
   Use --force or --yes to skip confirmation prompts.
   Required when using --json or in non-interactive environments.

Example:
   n8n workflows update abc123 --activate --force --json
`)
  .action(async (id, opts) => {
    const { workflowsUpdateCommand } = await import('./commands/workflows/update.js');
    await workflowsUpdateCommand(id, mergeOpts(opts));
  });

workflowsCmd
  .command('autofix <idOrFile>')
  .description('Auto-fix workflow validation issues with confidence-based filtering')
  .option('--preview', 'Preview fixes without applying (default)')
  .option('--apply', 'Apply fixes (to file or n8n server)')
  .option('--confidence <level>', 'Minimum confidence: high, medium, low', 'medium')
  .option('--fix-types <types>', 'Comma-separated fix types to apply (default: all)')
  .option('--upgrade-versions', 'Apply version migration fixes for node upgrades')
  .option('--target-version <version>', 'Target version for upgrades (default: latest)')
  .option('--max-fixes <n>', 'Maximum number of fixes to apply', '50')
  .option('-s, --save <path>', 'Save fixed workflow locally')
  .option('--force, --yes', 'Skip confirmation prompts')
  .option('--no-backup', 'Skip creating backup before changes')
  .option('--no-guidance', 'Suppress post-update guidance display')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Confidence Levels:
  high     Only safe, certain fixes (>90% certainty)
  medium   Include likely-correct fixes (default)
  low      Include all fixes including informational

Fix Types:
  expression-format     Add missing = prefix to expressions (HIGH)
  node-type-correction  Fix typos in node types (HIGH when >90%)
  webhook-missing-path  Generate UUID paths for webhooks (HIGH)
  switch-options        Fix Switch/If node options (HIGH)
  typeversion-correction Fix version exceeding max (MEDIUM)
  error-output-config   Remove invalid onError settings (MEDIUM)
  typeversion-upgrade   Proactive version upgrades (MEDIUM)
  version-migration     Breaking change migration info (LOW)

Behavior:
  Default is --preview (show fixes, no changes made)
  Use --apply to actually modify the workflow
  Use --save to save fixed version locally

Post-Update Guidance:
  After fixes, displays actionable migration guidance including:
  - Confidence scores (HIGH/MEDIUM/LOW)
  - Required manual actions and behavior changes
  - Step-by-step verification checklists
  Use --no-guidance to suppress this output.

Examples:
  n8n workflows autofix abc123                       # Preview all fixes
  n8n workflows autofix abc123 --apply --force       # Apply without prompts
  n8n workflows autofix abc123 --confidence high     # Only high-confidence
  n8n workflows autofix abc123 --fix-types expression-format,webhook-missing-path
  n8n workflows autofix abc123 --max-fixes 10        # Limit to 10 fixes
  n8n workflows autofix abc123 --json                # Machine-readable output
`)
  .action(async (id, opts) => {
    const { workflowsAutofixCommand } = await import('./commands/workflows/autofix.js');
    await workflowsAutofixCommand(id, mergeOpts(opts));
  });

workflowsCmd
  .command('diff <id>')
  .description('Apply incremental diff operations to a workflow')
  .option('-o, --operations <json>', 'Diff operations (JSON string or @file.json)')
  .option('-f, --file <path>', 'Path to operations JSON file')
  .option('--dry-run', 'Validate without applying changes', false)
  .option('--continue-on-error', 'Apply valid operations, report failures', false)
  .option('--force, --yes', 'Skip confirmation prompts')
  .option('--no-backup', 'Skip creating backup before changes')
  .option('-s, --save <path>', 'Save result workflow to file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Diff Operations:
  Apply surgical modifications to workflows without full replacement.
  Supports 17 operation types: addNode, removeNode, updateNode, moveNode,
  enableNode, disableNode, addConnection, removeConnection, rewireConnection,
  updateSettings, updateName, addTag, removeTag, activateWorkflow,
  deactivateWorkflow, cleanStaleConnections, replaceConnections.

Operation Modes:
  Default (atomic):    All operations must succeed or none are applied
  --continue-on-error: Apply valid operations, report failures (best-effort)
  --dry-run:           Validate operations without applying changes

Smart Parameters (IF/Switch nodes):
  branch: "true"/"false"  Use instead of sourceIndex for IF nodes
  case: <n>               Use instead of sourceIndex for Switch nodes

Examples:
  # Apply diff from file
  n8n workflows diff abc123 --operations @diff.json

  # Validate without applying
  n8n workflows diff abc123 --operations @diff.json --dry-run

  # Inline JSON operation
  n8n workflows diff abc123 --operations '[{"type":"updateNode","nodeName":"Slack","updates":{"parameters.channel":"#alerts"}}]'

  # Best-effort mode (apply what works)
  n8n workflows diff abc123 --operations @diff.json --continue-on-error

  # Force without confirmation
  n8n workflows diff abc123 --operations @diff.json --force

Operations JSON Format:
  {
    "operations": [
      { "type": "addNode", "node": { "name": "HTTP", "type": "n8n-nodes-base.httpRequest", "position": [400, 300] } },
      { "type": "updateNode", "nodeName": "Slack", "updates": { "parameters.channel": "#alerts" } },
      { "type": "addConnection", "source": "IF", "target": "Success", "branch": "true" },
      { "type": "activateWorkflow" }
    ]
  }
`)
  .action(async (id, opts) => {
    const { workflowsDiffCommand } = await import('./commands/workflows/diff.js');
    await workflowsDiffCommand(id, mergeOpts(opts));
  });

workflowsCmd
  .command('trigger <webhookUrl>')
  .description('Trigger workflow via webhook')
  .option('-d, --data <json>', 'Request body as JSON', '{}')
  .option('-m, --method <method>', 'HTTP method: GET, POST, PUT, DELETE', 'POST')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Webhook URL Format:
  Full URL: https://your-n8n.com/webhook/abc123
  Or path:  /webhook/abc123 (uses configured host)

Request Data:
  --data accepts JSON string or @file.json
  Empty object {} is sent by default

⚠️  Workflow must be ACTIVE and have a Webhook trigger node.
   Test webhooks (in n8n editor) have different URLs.

Examples:
  n8n workflows trigger https://n8n.example.com/webhook/abc123
  n8n workflows trigger /webhook/abc123 --data '{"name":"test"}'
  n8n workflows trigger /webhook/abc123 --method GET
  n8n workflows trigger /webhook/abc123 --data @payload.json
`)
  .action(async (webhookUrl, opts) => {
    const { workflowsTriggerCommand } = await import('./commands/workflows/trigger.js');
    await workflowsTriggerCommand(webhookUrl, mergeOpts(opts));
  });

workflowsCmd
  .command('tags <id>')
  .description('Get or set workflow tags')
  .option('--set <tagIds>', 'Comma-separated tag IDs to assign')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
⚠️  Important: --set requires TAG IDs, not tag names!
   First get tag IDs with: n8n tags list

Behavior:
  Without --set: Shows current workflow tags
  With --set:    REPLACES all tags (not additive)

Examples:
  n8n workflows tags abc123                    # View current tags
  n8n workflows tags abc123 --set tag1,tag2   # Replace with these tags
  n8n workflows tags abc123 --set ""           # Remove all tags

Workflow:
  1. n8n tags list                             # Get available tag IDs
  2. n8n workflows tags abc123 --set BCM4YL05,XoavLho
`)
  .action(async (id, opts) => {
    const { workflowsTagsCommand } = await import('./commands/workflows/tags.js');
    await workflowsTagsCommand(id, mergeOpts(opts));
  });

workflowsCmd
  .command('export <id>')
  .description('Export workflow to JSON file')
  .option('-o, --output <path>', 'Output file path (prints to stdout if not specified)')
  .option('--full', 'Include all fields (don\'t strip server-generated fields)')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Examples:
  # Export to file
  n8n workflows export abc123 -o workflow.json
  
  # Export to stdout (pipe-friendly)
  n8n workflows export abc123 > workflow.json
  
  # Export with all fields (including server-generated)
  n8n workflows export abc123 --full -o workflow-backup.json
`)
  .action(async (id, opts) => {
    const { workflowsExportCommand } = await import('./commands/workflows/export.js');
    await workflowsExportCommand(id, mergeOpts(opts));
  });

workflowsCmd
  .command('import <file>')
  .description('Import workflow from JSON file')
  .option('-n, --name <name>', 'Workflow name (overrides file)')
  .option('--dry-run', 'Preview without creating')
  .option('--activate', 'Activate workflow after import')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Examples:
  # Import workflow
  n8n workflows import workflow.json
  
  # Import with custom name
  n8n workflows import workflow.json --name "My Workflow"
  
  # Preview before import
  n8n workflows import workflow.json --dry-run
  
  # Import and activate immediately
  n8n workflows import workflow.json --activate
`)
  .action(async (file, opts) => {
    const { workflowsImportCommand } = await import('./commands/workflows/import.js');
    await workflowsImportCommand(file, mergeOpts(opts));
  });

workflowsCmd
  .command('activate')
  .description('Activate workflow(s)')
  .option('--ids <ids>', 'Comma-separated workflow IDs')
  .option('--all', 'Activate all workflows')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { workflowsActivateCommand } = await import('./commands/workflows/bulk.js');
    await workflowsActivateCommand(mergeOpts(opts));
  });

workflowsCmd
  .command('deactivate')
  .description('Deactivate workflow(s)')
  .option('--ids <ids>', 'Comma-separated workflow IDs')
  .option('--all', 'Deactivate all workflows')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { workflowsDeactivateCommand } = await import('./commands/workflows/bulk.js');
    await workflowsDeactivateCommand(mergeOpts(opts));
  });

workflowsCmd
  .command('delete')
  .description('Delete workflow(s)')
  .option('--ids <ids>', 'Comma-separated workflow IDs')
  .option('--all', 'Delete all workflows (DANGEROUS)')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--no-backup', 'Skip creating backup before delete')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { workflowsDeleteCommand } = await import('./commands/workflows/bulk.js');
    await workflowsDeleteCommand(mergeOpts(opts));
  });

workflowsCmd
  .command('deploy-template <templateId>')
  .description('Deploy workflow template from n8n.io directly to your instance')
  .option('-n, --name <name>', 'Custom workflow name (overrides template name)')
  .option('--no-autofix', 'Skip auto-fix of common issues (expression format, Switch v3+)')
  .option('--keep-credentials', 'Preserve credential references (default: strip)')
  .option('--dry-run', 'Preview deployment without creating workflow')
  .option('-s, --save <path>', 'Save workflow JSON locally')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Template Deployment:
  Fetches a template from n8n.io and deploys it to your n8n instance.
  Templates are always created INACTIVE - activate after configuring credentials.

Auto-Fix (enabled by default):
  • Expression format: Fixes {{ }} → ={{ }} for n8n compatibility
  • Switch v3+: Adds missing rule condition options
  • Fallback output: Moves fallbackOutput to correct location

Credential Handling:
  By default, credential references are STRIPPED from the template.
  You must configure credentials in n8n UI after deployment.
  Use --keep-credentials to preserve references (for migration scenarios).

Examples:
  n8n workflows deploy-template 3121                  # Deploy template #3121
  n8n workflows deploy-template 3121 --name "My Bot"  # With custom name
  n8n workflows deploy-template 3121 --dry-run        # Preview first
  n8n workflows deploy-template 3121 --no-autofix     # Skip auto-fix
  n8n workflows deploy-template 3121 --save bot.json  # Save locally too

Find Templates:
  n8n templates search "chatbot"     # Search n8n.io templates
  n8n templates get 3121             # View template details
  https://n8n.io/workflows           # Browse all templates

After Deployment:
  1. Configure required credentials in n8n UI
  2. Review workflow settings and connections
  3. Activate: n8n workflows activate --ids <workflowId>
`)
  .action(async (templateId, opts) => {
    const { workflowsDeployTemplateCommand } = await import('./commands/workflows/deploy-template.js');
    await workflowsDeployTemplateCommand(templateId, mergeOpts(opts));
  });

workflowsCmd
  .command('versions [id]')
  .description('Manage workflow version history, rollback, and cleanup')
  .option('-l, --limit <n>', 'Limit version history results', '10')
  .option('--get <version-id>', 'Get specific version details')
  .option('--rollback', 'Rollback to previous version')
  .option('--to-version <id>', 'Specific version ID for rollback')
  .option('--skip-validation', 'Skip validation before rollback')
  .option('--compare <v1,v2>', 'Compare two versions (comma-separated IDs)')
  .option('--delete <version-id>', 'Delete specific version')
  .option('--delete-all', 'Delete all versions for workflow')
  .option('--prune', 'Prune old versions')
  .option('--keep <n>', 'Keep N most recent versions (with --prune)', '5')
  .option('--stats', 'Show storage statistics (no workflow ID required)')
  .option('--truncate-all', 'Delete ALL versions for ALL workflows')
  .option('--force, --yes', 'Skip confirmation prompts')
  .option('--no-backup', 'Skip creating backup before rollback')
  .option('-s, --save <path>', 'Save version snapshot to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Version Management:
  Workflow versions are created automatically when you:
    • Update a workflow: n8n workflows update <id> --file ...
    • Apply autofix:     n8n workflows autofix <id> --apply
  
  Versions are stored locally in ~/.n8n-cli/data.db
  Auto-prunes to 10 versions per workflow to prevent storage bloat.

Examples:
  # List version history (default: 10 most recent)
  n8n workflows versions abc123
  n8n workflows versions abc123 --limit 5

  # Get specific version details
  n8n workflows versions abc123 --get 42
  n8n workflows versions abc123 --get 42 --save version.json

  # Rollback to previous version (with validation)
  n8n workflows versions abc123 --rollback
  n8n workflows versions abc123 --rollback --to-version 42
  n8n workflows versions abc123 --rollback --skip-validation

  # Compare two versions
  n8n workflows versions abc123 --compare 41,42

  # Delete specific version
  n8n workflows versions abc123 --delete 42 --force

  # Delete all versions for workflow
  n8n workflows versions abc123 --delete-all --force

  # Prune old versions (keep N most recent)
  n8n workflows versions abc123 --prune --keep 5

  # Storage statistics (global - no workflow ID required)
  n8n workflows versions --stats

  # JSON output for agents
  n8n workflows versions abc123 --json
  n8n workflows versions abc123 --rollback --json
`)
  .action(async (id, opts) => {
    const { workflowsVersionsCommand } = await import('./commands/workflows/versions.js');
    await workflowsVersionsCommand(id, mergeOpts(opts));
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
  .addHelpText('after', `
Status Values:
  success   Completed successfully
  error     Failed with error
  waiting   Waiting for manual trigger/approval
  running   Currently executing (rare in list)

⚠️  Data Retention: Executions may be pruned based on n8n settings.
   Old executions might not be available.

Examples:
  n8n executions list --status error --limit 20
  n8n executions list --workflow-id abc123 --save execs.json
  n8n executions list --status success --limit 0  # All successful

jq Examples (after --save):
  jq '.data[] | {id, status, workflowName}' executions.json
  jq '.data[] | select(.status=="error") | .id' executions.json
`)
  .action(async (opts) => {
    const { executionsListCommand } = await import('./commands/executions/list.js');
    await executionsListCommand(mergeOpts(opts));
  });

executionsCmd
  .command('get <id>')
  .description('Get execution details')
  .option('-m, --mode <mode>', 'Output mode: preview, summary, filtered, full', 'summary')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Output Modes:
  preview   Quick overview (status, timing, error if any)
  summary   Default: status + node execution summary
  filtered  Summary without large data payloads
  full      Complete execution data (may be very large!)

⚠️  Full mode can return megabytes of data for complex workflows.
   Use --save for large executions.

Examples:
  n8n executions get 9361 --mode preview      # Quick check
  n8n executions get 9361 --mode full --save exec-full.json

💡 For failed executions, error details are in the response:
   n8n executions get 9361 --json | jq '.data.error'
`)
  .action(async (id, opts) => {
    const { executionsGetCommand } = await import('./commands/executions/get.js');
    await executionsGetCommand(id, mergeOpts(opts));
  });

executionsCmd
  .command('retry <id>')
  .description('Retry a failed execution')
  .option('--load-latest', 'Use latest workflow version instead of snapshot')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Retry Behavior:
  Default: Retries using the SAME workflow version that was executed
  --load-latest: Uses the CURRENT workflow version (if workflow was updated)

When to Use --load-latest:
  • Workflow was fixed after the failure
  • You want to test new logic against old input data
  • Credentials or settings were updated

⚠️  Only failed executions can be retried.
   The retry creates a NEW execution.

Examples:
  n8n executions retry 9351                    # Retry with same version
  n8n executions retry 9351 --load-latest      # Retry with updated workflow
`)
  .action(async (id, opts) => {
    const { executionsRetryCommand } = await import('./commands/executions/retry.js');
    await executionsRetryCommand(id, mergeOpts(opts));
  });

executionsCmd
  .command('delete <id>')
  .description('Delete an execution')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
⚠️  DESTRUCTIVE: Permanently deletes execution data.
   This includes all node outputs, timing data, and error logs.
   This action cannot be undone.

Scripting/CI:
  Use --force to skip confirmation prompt.

Examples:
  n8n executions delete 9350                # With confirmation
  n8n executions delete 9350 --force --json # For scripts
`)
  .action(async (id, opts) => {
    const { executionsDeleteCommand } = await import('./commands/executions/delete.js');
    await executionsDeleteCommand(id, mergeOpts(opts));
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
  .addHelpText('after', `
⚠️  API Requirement:
   This command requires n8n API v1.1+ (credentials endpoint).
   Some self-hosted instances may return HTTP 405.
   Use 'n8n credentials schema <type>' to check credential requirements.
`)
  .action(async (opts) => {
    const { credentialsListCommand } = await import('./commands/credentials/index.js');
    await credentialsListCommand(mergeOpts(opts));
  });

credentialsCmd
  .command('schema <typeName>')
  .description('Get credential type schema')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Shows required and optional fields for a credential type.
Use this to prepare data for 'n8n credentials create'.

Find Type Names:
  n8n credentials types --search "slack"
  Common types: slackApi, githubApi, openAiApi, googleApi

Examples:
  n8n credentials schema slackApi
  n8n credentials schema githubApi --save github-schema.json

💡 After viewing schema:
   n8n credentials create --type slackApi --name "My Slack" --data '{...}'
`)
  .action(async (typeName, opts) => {
    const { credentialsSchemaCommand } = await import('./commands/credentials/index.js');
    await credentialsSchemaCommand(typeName, mergeOpts(opts));
  });

credentialsCmd
  .command('create')
  .description('Create a new credential')
  .requiredOption('-t, --type <type>', 'Credential type (e.g., githubApi)')
  .requiredOption('-n, --name <name>', 'Credential name')
  .option('-d, --data <json>', 'Credential data as JSON or @file.json')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Data Format:
  --data '{"apiKey":"xxx"}'     Inline JSON
  --data @credentials.json      Read from file (avoids secrets in shell history)

🔒 Security Best Practice:
  Use @file.json to avoid exposing secrets in shell history!
  chmod 600 credentials.json before storing secrets.

Workflow:
  1. n8n credentials schema githubApi    # See required fields
  2. echo '{"accessToken":"ghp_xxx"}' > github-creds.json
  3. n8n credentials create --type githubApi --name "GitHub" --data @github-creds.json
  4. rm github-creds.json                # Clean up

Examples:
  n8n credentials create --type openAiApi --name "OpenAI" --data '{"apiKey":"sk-xxx"}'
  n8n credentials create --type slackApi --name "Slack Bot" --data @slack.json
`)
  .action(async (opts) => {
    const { credentialsCreateCommand } = await import('./commands/credentials/index.js');
    await credentialsCreateCommand(mergeOpts(opts));
  });

credentialsCmd
  .command('delete <id>')
  .description('Delete a credential')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
⚠️  DESTRUCTIVE: Permanently deletes the credential.
   Workflows using this credential will FAIL until reconfigured.

Before Deleting:
  Check which workflows use this credential in the n8n UI.
  Consider deactivating dependent workflows first.

Examples:
  n8n credentials delete qB5iZGzGjmU5ZPDI              # With confirmation
  n8n credentials delete qB5iZGzGjmU5ZPDI --force      # For scripts
`)
  .action(async (id, opts) => {
    const { credentialsDeleteCommand } = await import('./commands/credentials/index.js');
    await credentialsDeleteCommand(id, mergeOpts(opts));
  });

credentialsCmd
  .command('types')
  .description('List all available credential types')
  .option('--by-auth', 'Group by authentication method')
  .option('-s, --search <query>', 'Search credential types')
  .option('-l, --limit <n>', 'Limit results', '0')
  .option('--save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Auth Methods (with --by-auth):
  apiKey       API Key authentication
  oauth2       OAuth 2.0 (requires redirect handling)
  basic        Username/password
  header       Custom header authentication
  none         No authentication needed

Examples:
  n8n credentials types --search "oauth"  # Find OAuth types
  n8n credentials types --by-auth         # Group by auth method
  n8n credentials types --save types.json

💡 Get field details: n8n credentials schema <typeName>
`)
  .action(async (opts) => {
    const { credentialTypesCommand } = await import('./commands/credentials/types.js');
    await credentialTypesCommand(mergeOpts(opts));
  });

credentialsCmd
  .command('show-type <typeName>')
  .description('Show credential type schema')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Alias for 'n8n credentials schema'.

Examples:
  n8n credentials show-type slackApi --json
  n8n credentials show-type openAiApi --save openai-schema.json
`)
  .action(async (typeName, opts) => {
    const { credentialTypeShowCommand } = await import('./commands/credentials/type-show.js');
    await credentialTypeShowCommand(typeName, mergeOpts(opts));
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
  .description('Manage n8n environment variables')
  .addHelpText('after', `
⚠️  License Requirement:
   Variables require n8n Enterprise or Pro license with feat:variables.
   Community edition will return HTTP 403 (license error).
`);

variablesCmd
  .command('list')
  .description('List all variables')
  .option('-l, --limit <n>', 'Limit results', '100')
  .option('--cursor <cursor>', 'Pagination cursor')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Usage in Workflows:
  Variables are accessed via: {{ $vars.VARIABLE_KEY }}
  They provide instance-wide environment configuration.

Examples:
  n8n variables list
  n8n variables list --save variables.json

jq Examples (after --save):
  jq '.data[] | {key, value}' variables.json
`)
  .action(async (opts) => {
    const { variablesListCommand } = await import('./commands/variables/index.js');
    await variablesListCommand(mergeOpts(opts));
  });

variablesCmd
  .command('create')
  .description('Create a new variable')
  .requiredOption('-k, --key <key>', 'Variable key')
  .requiredOption('-v, --value <value>', 'Variable value')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Key Format Requirements:
  • Must start with a letter or underscore
  • Can contain only letters, numbers, underscores
  • Case-sensitive (MY_VAR ≠ my_var)
  • Examples: API_KEY, database_url, Config_Value_1

Examples:
  n8n variables create --key API_KEY --value "sk-xxx"
  n8n variables create --key BASE_URL --value "https://api.example.com"

💡 In workflows: {{ $vars.API_KEY }}
`)
  .action(async (opts) => {
    const { variablesCreateCommand } = await import('./commands/variables/index.js');
    await variablesCreateCommand(mergeOpts(opts));
  });

variablesCmd
  .command('update <id>')
  .description('Update a variable')
  .requiredOption('-k, --key <key>', 'Variable key')
  .requiredOption('-v, --value <value>', 'Variable value')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
⚠️  Updating a variable affects ALL workflows using it.
   Changes take effect immediately.

To find the variable ID:
  n8n variables list --json | jq '.data[] | {id, key}'

Examples:
  n8n variables update varId123 --key API_KEY --value "new-value"
`)
  .action(async (id, opts) => {
    const { variablesUpdateCommand } = await import('./commands/variables/index.js');
    await variablesUpdateCommand(id, mergeOpts(opts));
  });

variablesCmd
  .command('delete <id>')
  .description('Delete a variable')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
⚠️  DESTRUCTIVE: Workflows using this variable will fail!
   Check which workflows use {{ $vars.VARIABLE_KEY }} before deleting.

Examples:
  n8n variables delete varId123              # With confirmation
  n8n variables delete varId123 --force      # For scripts
`)
  .action(async (id, opts) => {
    const { variablesDeleteCommand } = await import('./commands/variables/index.js');
    await variablesDeleteCommand(id, mergeOpts(opts));
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
  .addHelpText('after', `
Tag IDs vs Names:
  Commands use TAG IDs (like BCM4YL05avZ5KuP2), not names.
  Use this command to find tag IDs for other operations.

Examples:
  n8n tags list
  n8n tags list --json | jq '.data[] | {id, name}'

💡 Assign tags to workflow: n8n workflows tags WORKFLOW_ID --set TAG_ID1,TAG_ID2
`)
  .action(async (opts) => {
    const { tagsListCommand } = await import('./commands/tags/index.js');
    await tagsListCommand(mergeOpts(opts));
  });

tagsCmd
  .command('get <id>')
  .description('Get tag by ID')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Examples:
  n8n tags get BCM4YL05avZ5KuP2
  n8n tags get BCM4YL05avZ5KuP2 --json
`)
  .action(async (id, opts) => {
    const { tagsGetCommand } = await import('./commands/tags/index.js');
    await tagsGetCommand(id, mergeOpts(opts));
  });

tagsCmd
  .command('create')
  .description('Create a new tag')
  .requiredOption('-n, --name <name>', 'Tag name')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Tag names can contain spaces and special characters.
Tags are used to organize and filter workflows.

Examples:
  n8n tags create --name "Production"
  n8n tags create --name "Needs Review" --json

💡 After creating, assign to workflows:
   n8n workflows tags WORKFLOW_ID --set NEW_TAG_ID
`)
  .action(async (opts) => {
    const { tagsCreateCommand } = await import('./commands/tags/index.js');
    await tagsCreateCommand(mergeOpts(opts));
  });

tagsCmd
  .command('update <id>')
  .description('Update a tag')
  .requiredOption('-n, --name <name>', 'New tag name')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Renaming a tag updates it for all associated workflows.

Examples:
  n8n tags update BCM4YL05avZ5KuP2 --name "Critical Production"
`)
  .action(async (id, opts) => {
    const { tagsUpdateCommand } = await import('./commands/tags/index.js');
    await tagsUpdateCommand(id, mergeOpts(opts));
  });

tagsCmd
  .command('delete <id>')
  .description('Delete a tag')
  .option('--force, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
⚠️  Deleting a tag removes it from all workflows.
   Workflows themselves are NOT affected, only the tag association.

Examples:
  n8n tags delete BCM4YL05avZ5KuP2              # With confirmation
  n8n tags delete BCM4YL05avZ5KuP2 --force      # For scripts
`)
  .action(async (id, opts) => {
    const { tagsDeleteCommand } = await import('./commands/tags/index.js');
    await tagsDeleteCommand(id, mergeOpts(opts));
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
  .addHelpText('after', `
Audit Categories:
  credentials   Unused or insecure credentials, missing OAuth tokens
  database      Database connection security, injection risks
  nodes         Risky nodes (Code, Execute Command, filesystem access)
  filesystem    Read/write to filesystem, path traversal risks
  instance      Instance configuration, exposed endpoints, CORS

Examples:
  n8n audit                                     # Full audit
  n8n audit --categories credentials,nodes      # Specific categories
  n8n audit --days-abandoned 90 --save audit.json

jq Examples (after --save):
  jq '.sections[] | {title, riskScore}' audit.json
  jq '.sections[].issues[] | select(.severity=="high")' audit.json

⚠️  Audit requires access to instance configuration.
   Some checks may require admin privileges.
`)
  .action(async (opts) => {
    const { auditCommand } = await import('./commands/audit/index.js');
    await auditCommand(mergeOpts(opts));
  });

// ============================================================================
// TEMPLATES COMMANDS
// ============================================================================
const templatesCmd = program
  .command('templates')
  .description('Search and get workflow templates');

templatesCmd
  .command('search [query]')
  .description('Search templates by keyword, nodes, task, or metadata')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  // Search mode options
  .option('--by-nodes <types>', 'Search by node types (comma-separated)')
  .option('--by-task <task>', 'Search by task type')
  .option('--complexity <level>', 'Filter by complexity (simple, medium, complex)')
  .option('--max-setup <minutes>', 'Maximum setup time in minutes')
  .option('--min-setup <minutes>', 'Minimum setup time in minutes')
  .option('--service <name>', 'Filter by required service')
  .option('--audience <type>', 'Filter by target audience')
  .option('--local', 'Force local database search')
  .addHelpText('after', `
🔍 Search Modes:

  Keyword (default):  n8n templates search "openai chatbot"
                      Uses n8n.io API (requires internet)

  By Nodes:           n8n templates search --by-nodes slack,webhook
                      Find templates using specific nodes (local)

  By Task:            n8n templates search --by-task ai_automation
                      Curated templates for common tasks (local)

  By Metadata:        n8n templates search --complexity simple --max-setup 15
                      Filter by complexity, setup time, services (local)

📋 Available Tasks:
  ai_automation, data_sync, webhook_processing, email_automation,
  slack_integration, data_transformation, file_processing, scheduling,
  api_integration, database_operations

💡 Tips:
  • Use 'n8n templates list-tasks' for task descriptions
  • Combine filters: --complexity simple --service openai
  • Force local keyword search: n8n templates search "query" --local

Examples:
  n8n templates search "openai"                    # Keyword (n8n.io API)
  n8n templates search --by-nodes slack,httpRequest # By nodes (local)
  n8n templates search --by-task ai_automation     # By task (local)
  n8n templates search --complexity simple         # By metadata (local)
  n8n templates search --service openai --limit 20 # Combined filters
`)
  .action(async (query, opts) => {
    const { templatesSearchCommand } = await import('./commands/templates/search.js');
    await templatesSearchCommand(query, mergeOpts(opts));
  });

templatesCmd
  .command('get <id>')
  .description('Get template by ID')
  .option('-s, --save <path>', 'Save workflow to JSON file')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Downloads complete workflow template from n8n.io.
Save to file and import into your n8n instance.

Workflow:
  1. n8n templates search "openai"              # Find template
  2. n8n templates get 3121 --save template.json # Download
  3. n8n workflows create --file template.json   # Import

Examples:
  n8n templates get 3121                         # View template info
  n8n templates get 3121 --save my-workflow.json # Download for import

⚠️  Templates may require specific credentials or nodes.
   Check template description for requirements.
`)
  .action(async (id, opts) => {
    const { templatesGetCommand } = await import('./commands/templates/get.js');
    await templatesGetCommand(id, mergeOpts(opts));
  });

templatesCmd
  .command('list-tasks')
  .description('List available task types for --by-task search')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Lists all task types that can be used with --by-task search mode.
Each task represents a common automation pattern with typical nodes.

Examples:
  n8n templates list-tasks              # Human-readable table
  n8n templates list-tasks --json       # JSON for scripting

Then search by task:
  n8n templates search --by-task ai_automation
`)
  .action(async (opts) => {
    const { templatesListTasksCommand } = await import('./commands/templates/list-tasks.js');
    await templatesListTasksCommand(mergeOpts(opts));
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
  .addHelpText('after', `
⚠️  Note: For validation profiles (minimal, runtime, ai-friendly, strict),
   use the newer command:

   n8n workflows validate <file> --profile <profile>

Example:
   n8n workflows validate workflow.json --profile strict
`)
  .action(async (file, opts) => {
    // Redirect to workflows validate
    const { workflowsValidateCommand } = await import('./commands/workflows/validate.js');
    await workflowsValidateCommand(file, mergeOpts({ ...opts, file: file || opts.file }));
  });

// ============================================================================
// CONFIG COMMAND
// ============================================================================
const configCmd = program
  .command('config')
  .description('View and manage CLI configuration');

configCmd
  .command('show')
  .description('Display current configuration')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { configShowCommand } = await import('./commands/config/index.js');
    await configShowCommand(mergeOpts(opts));
  });

// Default action for 'n8n config' without subcommand
configCmd.action(async () => {
  const { showConfigHelp } = await import('./commands/config/index.js');
  showConfigHelp();
});

// ============================================================================
// COMPLETION COMMAND
// ============================================================================
program
  .command('completion <shell>')
  .description('Generate shell completion scripts')
  .addHelpText('after', `
Supported shells: bash, zsh, fish

Examples:
  # Bash - add to ~/.bashrc
  source <(n8n completion bash)
  
  # Zsh - add to ~/.zshrc  
  source <(n8n completion zsh)
  
  # Fish - save to completions
  n8n completion fish > ~/.config/fish/completions/n8n.fish
`)
  .action(async (shell, opts) => {
    const { completionCommand } = await import('./commands/completion/index.js');
    await completionCommand(shell, mergeOpts(opts));
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
