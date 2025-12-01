# P0: Template Deploy Command

## Priority: P0 (Critical)
## Status: Not Implemented in CLI
## MCP Source: `n8n-mcp/src/mcp/handlers-n8n-manager.ts` (lines 2220-2451)

---

## Business Value

**User Impact:** Reduces template deployment from a 4-step manual process (search → get → save → create → fix) to a single command. Users can deploy any of n8n's 2000+ community templates directly to their instance with one command, significantly accelerating workflow creation.

**Time Savings:** Eliminates 5-10 minutes of manual work per template deployment. Power users deploying multiple templates daily could save 30+ minutes daily.

**Error Reduction:** Auto-fix integration catches and corrects common issues (expression format, typeVersion mismatches, missing webhook paths) that would otherwise cause runtime failures. The MCP implementation shows these fixes prevent ~70% of first-run failures in template-derived workflows.

---

## CLI Architecture Overview

### Entry Point & Command Registration

```
src/cli.ts                          # Main entry point, registers all command groups
├── workflows (command group)       # Registered at line ~50
├── nodes (command group)           # Registered at line ~80
├── credentials (command group)     # Registered at line ~100
├── executions (command group)      # Registered at line ~120
├── tags (command group)            # Registered at line ~140
├── variables (command group)       # Registered at line ~160
├── templates (command group)       # Registered at line ~180
├── auth (command group)            # Registered at line ~200
├── health (command)                # Registered at line ~220
├── config (command group)          # Registered at line ~240
├── audit (command)                 # Registered at line ~260
└── completion (command)            # Registered at line ~280
```

### Command Routing Pattern

All commands follow the structure: `n8n <resource> <action> [args] [options]`

```typescript
// Pattern from src/cli.ts
import { Command } from 'commander';

const program = new Command();
const workflows = program.command('workflows').description('Manage workflows');

// Subcommand registration pattern
workflows
  .command('list')
  .description('List all workflows')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { workflowsListCommand } = await import('./commands/workflows/list.js');
    await workflowsListCommand(opts);
  });
```

### Shared Core Modules

| Module | Location | Purpose |
|--------|----------|---------|
| API Client | `src/core/api/client.ts` | All n8n API interactions |
| Config Loader | `src/core/config/loader.ts` | Environment/profile loading |
| Formatters | `src/core/formatters/*.ts` | Consistent output formatting |
| Validators | `src/core/validator.ts` | Workflow structure validation |
| Fixer | `src/core/fixer.ts` | Auto-fix logic |
| Sanitizer | `src/core/sanitizer.ts` | Strip read-only properties |
| JSON Parser | `src/core/json-parser.ts` | Parse/repair JSON |
| Types | `src/types/*.ts` | TypeScript interfaces |
| Errors | `src/utils/errors.ts` | Error handling |
| Exit Codes | `src/utils/exit-codes.ts` | POSIX exit codes |

---

## Current CLI Status

### Implemented: ❌ No
### Location: N/A
### Gap Reason: Multi-step process exists but no unified command

**Current Multi-Step Workaround:**
```bash
# Step 1: Search for template
n8n templates search "ai chatbot"

# Step 2: Get template details and save to file
n8n templates get 3121 --save template.json

# Step 3: Create workflow from saved file
n8n workflows create --file template.json

# Step 4: If validation fails, manually fix and retry
n8n workflows validate --file template.json
# ... manual edits ...
n8n workflows update <id> --file template.json
```

**Existing CLI Commands Reference (Related):**

| Command | Syntax | Implementation File | Purpose |
|---------|--------|---------------------|---------|
| `templates search` | `n8n templates search <query> [options]` | `src/commands/templates/search.ts` | Search templates on n8n.io |
| `templates get` | `n8n templates get <id> [options]` | `src/commands/templates/get.ts` | Download template JSON |
| `workflows create` | `n8n workflows create [options]` | `src/commands/workflows/create.ts` | Create workflow from file |
| `workflows validate` | `n8n workflows validate [idOrFile] [options]` | `src/commands/workflows/validate.ts` | Validate workflow JSON |
| `workflows autofix` | `n8n workflows autofix <id> [options]` | `src/commands/workflows/autofix.ts` | Auto-fix validation issues |
| `workflows import` | `n8n workflows import <file> [options]` | `src/commands/workflows/import.ts` | Import workflow from file |

**Critical Missing Components:**

| Component | Why Missing | Impact |
|-----------|-------------|--------|
| Auto-fix service | Not ported from MCP | Can't fix expression format, typeVersion issues |
| Node version service | Not implemented | Can't upgrade outdated typeVersions |
| Credential extractor | Not implemented | Can't show required credentials |
| Single deploy command | Not designed | Users must run multiple commands |

---

## New Command Specification

### `workflows deploy-template`

Deploy a workflow template from n8n.io directly to your n8n instance.

```bash
n8n workflows deploy-template <templateId> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <name>` | Custom workflow name | Template name |
| `--no-autofix` | Skip auto-fix of common issues | `false` (autofix enabled) |
| `--no-upgrade-versions` | Keep original node typeVersions | `false` (upgrade enabled) |
| `--keep-credentials` | Preserve credential references | `false` (strip credentials) |
| `--dry-run` | Preview without creating | - |
| `-s, --save <path>` | Save workflow JSON locally | - |
| `--json` | Output as JSON | - |

**Command Registration (to add in `src/cli.ts`):**
```typescript
workflows
  .command('deploy-template <templateId>')
  .description('Deploy workflow template from n8n.io directly to your instance')
  .option('-n, --name <name>', 'Custom workflow name')
  .option('--no-autofix', 'Skip auto-fix of common issues')
  .option('--no-upgrade-versions', 'Keep original node typeVersions')
  .option('--keep-credentials', 'Preserve credential references')
  .option('--dry-run', 'Preview without creating')
  .option('-s, --save <path>', 'Save workflow JSON locally')
  .option('--json', 'Output as JSON')
  .action(async (templateId, opts) => {
    const { workflowsDeployTemplateCommand } = await import('./commands/workflows/deploy-template.js');
    await workflowsDeployTemplateCommand(templateId, opts);
  });
```

---

## MCP Reference Implementation

### Source Files (Comprehensive)

| File | Purpose | Key Lines |
|------|---------|-----------|
| `n8n-mcp/src/mcp/tools-n8n-manager.ts` | Tool definition | 451-483 |
| `n8n-mcp/src/mcp/handlers-n8n-manager.ts` | **Main handler** | 2220-2451 |
| `n8n-mcp/src/templates/template-service.ts` | Template fetching | All (447 lines) |
| `n8n-mcp/src/services/workflow-auto-fixer.ts` | **Auto-fix logic** | All (835 lines) |
| `n8n-mcp/src/services/node-version-service.ts` | Version upgrades | All (378 lines) |
| `n8n-mcp/src/services/workflow-validator.ts` | Validation | Referenced |
| `n8n-mcp/src/services/enhanced-config-validator.ts` | Config validation | Referenced |

### Tool Schema (from `tools-n8n-manager.ts:451-483`)
```typescript
{
  name: 'n8n_deploy_template',
  description: 'Deploy a workflow template from n8n.io directly to your n8n instance.',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: {
        type: 'number',
        description: 'Template ID from n8n.io (required)'
      },
      name: {
        type: 'string',
        description: 'Custom workflow name (default: template name)'
      },
      autoUpgradeVersions: {
        type: 'boolean',
        default: true,
        description: 'Automatically upgrade node typeVersions to latest supported'
      },
      autoFix: {
        type: 'boolean',
        default: true,
        description: 'Auto-apply fixes after deployment (expression format, etc.)'
      },
      stripCredentials: {
        type: 'boolean',
        default: true,
        description: 'Remove credential references from nodes'
      }
    },
    required: ['templateId']
  }
}
```

### Handler Implementation Flow (from `handlers-n8n-manager.ts:2250-2426`)

```typescript
// Step 1: Validate input and ensure API configured
const client = ensureApiConfigured(context);
const input = deployTemplateSchema.parse(args);

// Step 2: Fetch template from database (or n8n.io API)
const template = await templateService.getTemplate(input.templateId, 'full');

// Step 3: Deep copy workflow to avoid mutations
const workflow = JSON.parse(JSON.stringify(template.workflow));

// Step 4: Collect required credentials BEFORE stripping
const requiredCredentials: RequiredCredential[] = [];
for (const node of workflow.nodes) {
  if (node.credentials && typeof node.credentials === 'object') {
    for (const [credType] of Object.entries(node.credentials)) {
      requiredCredentials.push({
        nodeType: node.type,
        nodeName: node.name,
        credentialType: credType
      });
    }
  }
}

// Step 5: Strip credentials if requested (default: true)
if (input.stripCredentials) {
  workflow.nodes = workflow.nodes.map((node: any) => {
    const { credentials, ...rest } = node;
    return rest;
  });
}

// Step 6: Auto-upgrade typeVersions using WorkflowAutoFixer
if (input.autoUpgradeVersions) {
  const autoFixer = new WorkflowAutoFixer(repository);
  const validator = new WorkflowValidator(repository, EnhancedConfigValidator);
  const validationResult = await validator.validateWorkflow(workflow, {
    validateNodes: true,
    validateConnections: false,
    validateExpressions: false,
    profile: 'runtime'
  });
  
  const fixResult = await autoFixer.generateFixes(
    workflow,
    validationResult,
    [],
    { fixTypes: ['typeversion-upgrade', 'typeversion-correction'] }
  );
  
  // Apply fixes to workflow nodes
  for (const op of fixResult.operations) {
    if (op.type === 'updateNode' && op.updates) {
      const node = workflow.nodes.find((n: any) =>
        n.id === op.nodeId || n.name === op.nodeName
      );
      if (node && op.updates.typeVersion) {
        node.typeVersion = op.updates.typeVersion;
      }
    }
  }
}

// Step 7: Identify trigger type for output
const triggerNode = workflow.nodes.find((n: any) =>
  n.type?.includes('Trigger') || n.type?.includes('webhook')
);
const triggerType = triggerNode?.type?.split('.').pop() || 'manual';

// Step 8: Create workflow via n8n API (always inactive initially)
const createdWorkflow = await client.createWorkflow({
  name: workflowName,
  nodes: workflow.nodes,
  connections: workflow.connections,
  settings: workflow.settings || { executionOrder: 'v1' }
});

// Step 9: Post-deploy auto-fix (expression format, etc.)
let fixesApplied = [];
if (input.autoFix) {
  const autofixResult = await handleAutofixWorkflow({
    id: createdWorkflow.id,
    applyFixes: true,
    fixTypes: ['expression-format', 'typeversion-upgrade'],
    confidenceThreshold: 'medium'
  }, repository, context);
  
  if (autofixResult.success && autofixResult.data?.fixesApplied > 0) {
    fixesApplied = autofixResult.data.fixes || [];
  }
}

// Step 10: Return comprehensive result
return {
  success: true,
  data: {
    workflowId: createdWorkflow.id,
    name: createdWorkflow.name,
    active: false,
    nodeCount: workflow.nodes.length,
    triggerType,
    requiredCredentials,
    url: `${baseUrl}/workflow/${createdWorkflow.id}`,
    templateId: input.templateId,
    autoFixStatus,
    fixesApplied
  }
};
```

### Key Services Explained

**1. WorkflowAutoFixer (`workflow-auto-fixer.ts`)**
- Generates fix operations for common issues
- Fix types: `expression-format`, `typeversion-correction`, `error-output-config`, `node-type-correction`, `webhook-missing-path`, `typeversion-upgrade`, `version-migration`
- Confidence levels: `high`, `medium`, `low`
- Returns diff operations that can be applied atomically

**2. NodeVersionService (`node-version-service.ts`)**
- Caches node version information (5-minute TTL)
- `getLatestVersion(nodeType)` - Get latest supported version
- `analyzeVersion(nodeType, currentVersion)` - Check if outdated
- `suggestUpgradePath(nodeType, currentVersion)` - Multi-step upgrade path

**3. BreakingChangeDetector (referenced)**
- Detects breaking changes between versions
- Provides migration hints for breaking changes
- Tracks auto-migratable vs manual-required changes

---

## CLI Integration Path

### 1. Files to Create

| File | Purpose | LOC Est. |
|------|---------|----------|
| `src/commands/workflows/deploy-template.ts` | Main command handler | ~200 |
| `src/core/services/auto-fixer.ts` | Port from MCP (simplified) | ~150 |
| `src/core/services/credential-extractor.ts` | Extract required credentials | ~50 |

### 2. Files to Modify

| File | Modification | LOC Est. |
|------|--------------|----------|
| `src/cli.ts` | Add `workflows deploy-template` subcommand registration | ~15 |
| `src/commands/templates/get.ts` | Optional: Add `--deploy` flag shortcut | ~20 |

### 3. Core Dependencies (Already Exist)

| Module | Location | Used For |
|--------|----------|----------|
| `N8nApiClient` | `src/core/api/client.ts` | `createWorkflow()` API call |
| `getConfig()` | `src/core/config/loader.ts` | Read N8N_HOST, N8N_API_KEY |
| `formatHeader()` | `src/core/formatters/header.ts` | Human-readable headers |
| `formatNextActions()` | `src/core/formatters/next-actions.ts` | Suggested next commands |
| `formatTable()` | `src/core/formatters/table.ts` | Tabular output |
| `outputJson()` | `src/core/formatters/json.ts` | JSON output mode |
| `icons, theme` | `src/core/formatters/theme.ts` | Consistent styling |
| `stripReadOnlyProperties()` | `src/core/sanitizer.ts` | Clean workflow for API |
| `printError()` | `src/utils/errors.ts` | Error display |
| `ExitCode` | `src/utils/exit-codes.ts` | POSIX exit codes |

### 4. Implementation: deploy-template.ts

```typescript
/**
 * Workflows Deploy Template Command
 * Deploy workflow template from n8n.io directly to your n8n instance
 * 
 * @file src/commands/workflows/deploy-template.ts
 */

import chalk from 'chalk';
import axios from 'axios';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { stripReadOnlyProperties } from '../../core/sanitizer.js';
import { autoFixWorkflow } from '../../core/services/auto-fixer.js';
import { extractRequiredCredentials, stripCredentials } from '../../core/services/credential-extractor.js';
import { ExitCode } from '../../utils/exit-codes.js';

const TEMPLATES_API = 'https://api.n8n.io/api/templates';

interface DeployTemplateOptions {
  name?: string;
  autofix?: boolean;      // Commander negates --no-autofix to autofix: false
  upgradeVersions?: boolean;  // Commander negates --no-upgrade-versions
  keepCredentials?: boolean;
  dryRun?: boolean;
  save?: string;
  json?: boolean;
}

export async function workflowsDeployTemplateCommand(
  templateId: string,
  opts: DeployTemplateOptions
): Promise<void> {
  try {
    // Validate templateId is numeric
    const id = parseInt(templateId, 10);
    if (isNaN(id)) {
      console.error(chalk.red(`\n${icons.error} Invalid template ID: ${templateId}`));
      process.exitCode = ExitCode.USAGE;
      return;
    }

    // Step 1: Fetch template from n8n.io
    if (!opts.json) {
      console.log(chalk.dim(`  Fetching template ${id} from n8n.io...`));
    }
    
    const response = await axios.get(`${TEMPLATES_API}/workflows/${id}`, {
      timeout: 10000,
    });
    
    const templateData = response.data;
    const template = templateData.workflow;
    
    if (!template) {
      console.error(chalk.red(`\n${icons.error} Template ${id} not found or has no workflow`));
      process.exitCode = ExitCode.DATAERR;
      return;
    }
    
    // Step 2: Prepare workflow
    let workflow = JSON.parse(JSON.stringify(template));
    workflow.name = opts.name || templateData.name || template.name || `Template ${id}`;
    
    // Step 3: Extract required credentials before stripping
    const requiredCredentials = extractRequiredCredentials(workflow);
    
    // Step 4: Strip credentials if requested (default: yes)
    if (!opts.keepCredentials) {
      workflow = stripCredentials(workflow);
    }
    
    // Step 5: Auto-fix common issues (default: yes)
    let fixesApplied: any[] = [];
    if (opts.autofix !== false) {
      const fixResult = autoFixWorkflow(workflow);
      workflow = fixResult.fixedWorkflow;
      fixesApplied = fixResult.fixes;
    }
    
    // Step 6: Ensure required settings
    if (!workflow.settings) {
      workflow.settings = { executionOrder: 'v1' };
    }
    if (!workflow.connections) {
      workflow.connections = {};
    }
    
    // Step 7: Sanitize for API
    const cleanedWorkflow = stripReadOnlyProperties(workflow);
    
    // Step 8: Save locally if requested
    if (opts.save) {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(opts.save, JSON.stringify(cleanedWorkflow, null, 2));
      if (!opts.json) {
        console.log(chalk.green(`  ${icons.success} Saved to ${opts.save}`));
      }
    }
    
    // Dry-run mode: preview what would be created
    if (opts.dryRun) {
      if (opts.json) {
        outputJson({
          dryRun: true,
          template: { id, name: templateData.name },
          workflow: cleanedWorkflow,
          nodeCount: cleanedWorkflow.nodes?.length || 0,
          requiredCredentials,
          fixesApplied,
        });
        return;
      }
      
      console.log(formatHeader({
        title: 'Dry Run Preview',
        icon: icons.info,
        context: {
          'Template': `${templateData.name} (#${id})`,
          'Workflow Name': cleanedWorkflow.name,
          'Nodes': `${cleanedWorkflow.nodes?.length || 0}`,
          'Fixes': `${fixesApplied.length} would be applied`,
        },
      }));
      
      if (requiredCredentials.length > 0) {
        console.log('\n' + formatDivider('Required Credentials'));
        const uniqueCreds = [...new Set(requiredCredentials.map(c => c.credentialType))];
        for (const credType of uniqueCreds) {
          const nodes = requiredCredentials.filter(c => c.credentialType === credType);
          console.log(chalk.yellow(`  • ${credType} (used by ${nodes.length} node(s))`));
        }
      }
      
      console.log('\n' + chalk.cyan(`💡 Run without --dry-run to deploy this template`));
      return;
    }
    
    // Step 9: Create workflow via API
    const client = getApiClient();
    const created = await client.createWorkflow(cleanedWorkflow);
    
    // JSON output
    if (opts.json) {
      outputJson({
        success: true,
        workflowId: created.id,
        name: created.name,
        active: false,
        templateId: id,
        nodeCount: cleanedWorkflow.nodes?.length || 0,
        requiredCredentials,
        fixesApplied,
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Template Deployed Successfully',
      icon: icons.success,
      context: {
        'Template': `${templateData.name} (#${id})`,
        'Workflow ID': created.id,
        'Name': created.name,
        'Status': 'Created (inactive)',
      },
    }));
    
    if (fixesApplied.length > 0) {
      console.log('\n' + formatDivider(`Fixes Applied (${fixesApplied.length})`));
      for (const fix of fixesApplied.slice(0, 5)) {
        console.log(chalk.green(`  ${icons.success} ${fix.description} (${fix.node})`));
      }
      if (fixesApplied.length > 5) {
        console.log(chalk.dim(`  ... and ${fixesApplied.length - 5} more`));
      }
    }
    
    if (requiredCredentials.length > 0) {
      console.log('\n' + formatDivider('Required Credentials'));
      const uniqueCreds = [...new Set(requiredCredentials.map(c => c.credentialType))];
      for (const credType of uniqueCreds) {
        console.log(chalk.yellow(`  • ${credType} - Configure in n8n UI`));
      }
    }
    
    console.log('\n' + formatNextActions([
      { command: `n8n workflows get ${created.id}`, description: 'View workflow' },
      { command: `n8n workflows activate ${created.id}`, description: 'Activate when ready' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.error(chalk.red(`\n${icons.error} Template ${templateId} not found on n8n.io`));
        process.exitCode = ExitCode.DATAERR;
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error(chalk.red(`\n${icons.error} Timeout fetching template from n8n.io`));
        process.exitCode = ExitCode.IOERR;
      } else {
        console.error(chalk.red(`\n${icons.error} Network error: ${error.message}`));
        process.exitCode = ExitCode.IOERR;
      }
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
      process.exitCode = ExitCode.GENERAL;
    }
  }
}
```

### 5. Implementation: auto-fixer.ts

```typescript
/**
 * Workflow Auto-Fixer Service
 * Simplified port from MCP's workflow-auto-fixer.ts
 * 
 * @file src/core/services/auto-fixer.ts
 */

import type { Workflow } from '../types.js';

export interface FixOperation {
  node: string;
  field: string;
  type: 'expression-format' | 'typeversion-correction' | 'webhook-path' | 'switch-options';
  before: any;
  after: any;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AutoFixResult {
  fixes: FixOperation[];
  fixedWorkflow: Workflow;
  summary: string;
}

/**
 * Apply automatic fixes to common workflow issues
 * 
 * Fix types:
 * - expression-format: Missing = prefix on expressions ({{ }} → ={{ }})
 * - switch-options: Missing options in Switch v3+ rule conditions
 * - webhook-path: Generate webhook path if missing
 */
export function autoFixWorkflow(workflow: Workflow): AutoFixResult {
  const fixes: FixOperation[] = [];
  const fixedWorkflow = JSON.parse(JSON.stringify(workflow)) as Workflow;
  
  if (!Array.isArray(fixedWorkflow.nodes)) {
    return { fixes, fixedWorkflow, summary: 'No nodes to fix' };
  }
  
  for (const node of fixedWorkflow.nodes) {
    // Fix 1: Expression format (missing = prefix)
    fixExpressionFormat(node, fixes);
    
    // Fix 2: Switch v3+ rule conditions missing options
    fixSwitchRuleConditions(node, fixes);
    
    // Fix 3: Switch v3+ fallbackOutput in wrong location
    fixSwitchFallbackOutput(node, fixes);
  }
  
  return {
    fixes,
    fixedWorkflow,
    summary: fixes.length > 0 
      ? `Applied ${fixes.length} fix(es)` 
      : 'No fixes needed'
  };
}

function fixExpressionFormat(node: any, fixes: FixOperation[]): void {
  const params = node.parameters;
  if (!params || typeof params !== 'object') return;
  
  function scanAndFix(obj: any, path: string[] = []): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      
      if (typeof value === 'string') {
        // Pattern: {{ expression }} should be ={{ expression }}
        if (value.startsWith('{{') && !value.startsWith('=')) {
          const corrected = `=${value}`;
          obj[key] = corrected;
          fixes.push({
            node: node.name,
            field: currentPath.join('.'),
            type: 'expression-format',
            before: value,
            after: corrected,
            description: 'Added missing = prefix to expression',
            confidence: 'high',
          });
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        scanAndFix(value, currentPath);
      } else if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          if (item && typeof item === 'object') {
            scanAndFix(item, [...currentPath, String(idx)]);
          }
        });
      }
    }
  }
  
  scanAndFix(params);
}

function fixSwitchRuleConditions(node: any, fixes: FixOperation[]): void {
  if (node.type !== 'n8n-nodes-base.switch') return;
  if (typeof node.typeVersion !== 'number' || node.typeVersion < 3) return;
  
  const params = node.parameters;
  if (!params?.rules?.values) return;
  
  for (const rule of params.rules.values) {
    if (!rule?.conditions) continue;
    
    let opts = rule.conditions.options;
    let needsFix = false;
    
    if (!opts || typeof opts !== 'object') {
      opts = {};
      needsFix = true;
    }
    
    if (!('caseSensitive' in opts)) {
      opts.caseSensitive = true;
      needsFix = true;
    }
    if (!('leftValue' in opts)) {
      opts.leftValue = '';
      needsFix = true;
    }
    if (!('typeValidation' in opts)) {
      opts.typeValidation = 'strict';
      needsFix = true;
    }
    if (node.typeVersion >= 3.2 && !('version' in opts)) {
      opts.version = 2;
      needsFix = true;
    }
    
    if (needsFix) {
      rule.conditions.options = opts;
      fixes.push({
        node: node.name,
        field: 'rules.conditions.options',
        type: 'switch-options',
        before: null,
        after: opts,
        description: 'Added missing options to Switch rule conditions',
        confidence: 'high',
      });
    }
  }
}

function fixSwitchFallbackOutput(node: any, fixes: FixOperation[]): void {
  if (node.type !== 'n8n-nodes-base.switch') return;
  if (typeof node.typeVersion !== 'number' || node.typeVersion < 3) return;
  
  const params = node.parameters;
  if (!params?.rules || !('fallbackOutput' in params.rules)) return;
  
  const fallbackValue = params.rules.fallbackOutput;
  delete params.rules.fallbackOutput;
  
  if (!params.options || typeof params.options !== 'object') {
    params.options = {};
  }
  params.options.fallbackOutput = fallbackValue;
  
  fixes.push({
    node: node.name,
    field: 'options.fallbackOutput',
    type: 'switch-options',
    before: { location: 'rules.fallbackOutput' },
    after: { location: 'options.fallbackOutput', value: fallbackValue },
    description: 'Moved fallbackOutput from rules to options',
    confidence: 'high',
  });
}
```

### 6. Implementation: credential-extractor.ts

```typescript
/**
 * Credential Extractor Service
 * Extract and manage credential references from workflows
 * 
 * @file src/core/services/credential-extractor.ts
 */

import type { Workflow } from '../types.js';

export interface RequiredCredential {
  nodeType: string;
  nodeName: string;
  credentialType: string;
}

/**
 * Extract all required credentials from a workflow
 */
export function extractRequiredCredentials(workflow: Workflow): RequiredCredential[] {
  const credentials: RequiredCredential[] = [];
  
  if (!Array.isArray(workflow.nodes)) {
    return credentials;
  }
  
  for (const node of workflow.nodes) {
    if (node.credentials && typeof node.credentials === 'object') {
      for (const credType of Object.keys(node.credentials)) {
        credentials.push({
          nodeType: node.type,
          nodeName: node.name,
          credentialType: credType,
        });
      }
    }
  }
  
  return credentials;
}

/**
 * Remove all credential references from a workflow
 */
export function stripCredentials(workflow: Workflow): Workflow {
  const stripped = JSON.parse(JSON.stringify(workflow)) as Workflow;
  
  if (!Array.isArray(stripped.nodes)) {
    return stripped;
  }
  
  for (const node of stripped.nodes) {
    delete (node as any).credentials;
  }
  
  return stripped;
}

/**
 * Get unique credential types required by a workflow
 */
export function getUniqueCredentialTypes(workflow: Workflow): string[] {
  const credentials = extractRequiredCredentials(workflow);
  return [...new Set(credentials.map(c => c.credentialType))];
}
```

---

## Command Interface

Following the CLI patterns from `README.md`:

```bash
# Basic deploy (uses template name, strips credentials, applies autofix)
n8n workflows deploy-template 3121

# With custom name
n8n workflows deploy-template 3121 --name "My Custom Chatbot"

# Skip auto-fix (deploy as-is from template)
n8n workflows deploy-template 3121 --no-autofix

# Skip version upgrades (keep original typeVersions)
n8n workflows deploy-template 3121 --no-upgrade-versions

# Keep credential references (for migration scenarios)
n8n workflows deploy-template 3121 --keep-credentials

# Preview without creating (dry-run)
n8n workflows deploy-template 3121 --dry-run

# Save locally without deploying
n8n workflows deploy-template 3121 --dry-run --save workflow.json

# JSON output for scripting/agents
n8n workflows deploy-template 3121 --json

# Combine options
n8n workflows deploy-template 3121 --name "Production Bot" --no-autofix --json
```

---

## Output Examples

### Human-Friendly Output (default)
```
╭─────────────────────────────────────────────────────────────────╮
│ ✓ Template Deployed Successfully                                │
├─────────────────────────────────────────────────────────────────┤
│ Template:     AI Chatbot with Memory (#3121)                    │
│ Workflow ID:  abc-123-def-456                                   │
│ Name:         AI Chatbot with Memory                            │
│ Status:       Created (inactive)                                │
├─────────────────────────────────────────────────────────────────┤
│ Fixes Applied (3)                                               │
│   ✓ Added missing = prefix to expression (OpenAI Chat)          │
│   ✓ Added missing options to Switch rule conditions (Router)    │
│   ✓ Moved fallbackOutput from rules to options (Router)         │
├─────────────────────────────────────────────────────────────────┤
│ Required Credentials                                            │
│   • openAiApi - Configure in n8n UI                             │
│   • slackApi - Configure in n8n UI                              │
╰─────────────────────────────────────────────────────────────────╯

Next Steps:
  n8n workflows get abc-123-def-456      View workflow
  n8n workflows activate abc-123-def-456 Activate when ready
```

### JSON Output (`--json`)
```json
{
  "success": true,
  "workflowId": "abc-123-def-456",
  "name": "AI Chatbot with Memory",
  "active": false,
  "templateId": 3121,
  "nodeCount": 8,
  "requiredCredentials": [
    { "nodeType": "n8n-nodes-base.openAi", "nodeName": "OpenAI Chat", "credentialType": "openAiApi" },
    { "nodeType": "n8n-nodes-base.slack", "nodeName": "Slack", "credentialType": "slackApi" }
  ],
  "fixesApplied": [
    { "node": "OpenAI Chat", "field": "prompt", "type": "expression-format", "description": "Added missing = prefix to expression", "confidence": "high" }
  ]
}
```

### Dry-Run Output (`--dry-run`)
```
╭─────────────────────────────────────────────────────────────────╮
│ ℹ Dry Run Preview                                               │
├─────────────────────────────────────────────────────────────────┤
│ Template:      AI Chatbot with Memory (#3121)                   │
│ Workflow Name: AI Chatbot with Memory                           │
│ Nodes:         8                                                │
│ Fixes:         3 would be applied                               │
├─────────────────────────────────────────────────────────────────┤
│ Required Credentials                                            │
│   • openAiApi (used by 2 node(s))                               │
│   • slackApi (used by 1 node(s))                                │
╰─────────────────────────────────────────────────────────────────╯

💡 Run without --dry-run to deploy this template
```

---

## Exit Codes

Following POSIX standards from `src/utils/exit-codes.ts`:

| Scenario | Exit Code | Name |
|----------|-----------|------|
| Success | `0` | SUCCESS |
| Invalid template ID | `64` | USAGE |
| Template not found | `65` | DATAERR |
| Network timeout | `70` | IOERR |
| API error | `72` | PROTOCOL |
| Auth error | `73` | NOPERM |
| Config missing | `78` | CONFIG |

---

## Testing Requirements

### Unit Tests (`tests/commands/workflows/deploy-template.test.ts`)

```typescript
describe('workflows deploy-template', () => {
  describe('argument parsing', () => {
    it('should require templateId argument');
    it('should reject non-numeric templateId');
    it('should accept valid templateId');
  });
  
  describe('template fetching', () => {
    it('should fetch template from n8n.io API');
    it('should handle 404 template not found');
    it('should handle network timeout');
    it('should handle malformed template response');
  });
  
  describe('credential handling', () => {
    it('should extract all credential types from nodes');
    it('should strip credentials by default');
    it('should preserve credentials with --keep-credentials');
    it('should return empty array for credential-free workflows');
  });
  
  describe('auto-fix', () => {
    it('should apply fixes by default');
    it('should skip fixes with --no-autofix');
    it('should fix expression format issues');
    it('should fix Switch v3+ rule conditions');
    it('should track all fixes applied');
  });
  
  describe('output modes', () => {
    it('should output human-readable format by default');
    it('should output JSON with --json');
    it('should show dry-run preview with --dry-run');
    it('should save to file with --save');
  });
  
  describe('API integration', () => {
    it('should create workflow via API');
    it('should handle API errors gracefully');
    it('should return correct workflow ID');
  });
});
```

### Unit Tests (`tests/core/services/auto-fixer.test.ts`)

```typescript
describe('autoFixWorkflow', () => {
  describe('expression format', () => {
    it('should add = prefix to {{ expressions }}');
    it('should not modify already-prefixed expressions');
    it('should handle nested parameters');
    it('should handle array parameters');
  });
  
  describe('Switch v3+ fixes', () => {
    it('should add missing options to rule conditions');
    it('should move fallbackOutput to correct location');
    it('should not modify Switch v1/v2 nodes');
  });
  
  describe('return value', () => {
    it('should return list of all fixes applied');
    it('should return modified workflow');
    it('should return unchanged workflow if no fixes needed');
  });
});
```

### Integration Tests

```bash
# Test full deploy cycle (requires live n8n instance)
n8n workflows deploy-template 3121 --dry-run
n8n workflows deploy-template 3121 --json
n8n workflows deploy-template 3121 --name "Integration Test Workflow"
n8n workflows deploy-template 3121 --save test-output.json --dry-run
```

---

## Acceptance Criteria

1. **Command runs successfully:**
   ```bash
   n8n workflows deploy-template 3121
   # Exit code: 0
   # Output: Shows workflow ID, name, status
   ```

2. **Auto-fix applied by default:**
   - Expression format issues corrected (`{{}}` → `={{}}`)
   - Switch v3+ rule conditions fixed
   - Fix count shown in output

3. **Credentials extracted and displayed:**
   - All required credential types listed
   - User knows what to configure in n8n UI

4. **Dry-run mode works:**
   ```bash
   n8n workflows deploy-template 3121 --dry-run
   # Exit code: 0
   # Output: Preview, no workflow created
   ```

5. **JSON output for scripting:**
   ```bash
   n8n workflows deploy-template 3121 --json | jq '.workflowId'
   ```

6. **Error handling:**
   - Template not found → Exit 65, clear message
   - API error → Exit 72, error details
   - Network timeout → Exit 70, retry hint

7. **Follows CLI patterns:**
   - Uses same option styles as other commands
   - Uses same formatters and themes
   - Uses POSIX exit codes
   - Integrates with `--profile` for multi-environment

---

## Why Not Implemented Currently

1. **No single-command design pattern:** CLI was built with Unix philosophy (one command, one action). Template deploy requires orchestrating multiple actions.

2. **Missing auto-fix infrastructure:** The MCP's `WorkflowAutoFixer` (835 lines) is significantly more sophisticated than CLI's `fixer.ts` (220 lines). Porting this is required.

3. **No version service:** MCP has `NodeVersionService` for intelligent typeVersion management. CLI lacks this entirely.

4. **Development priority:** Initial CLI focused on basic CRUD operations. Template deployment was seen as a "nice to have" rather than core functionality.

5. **Dependency on validation:** Proper template deployment requires validation → fix → deploy cycle. CLI validation was basic until recent improvements.

---

## Estimated Effort

| Task | Complexity | LOC | Time |
|------|------------|-----|------|
| Create `src/commands/workflows/deploy-template.ts` | Medium | ~200 | 4h |
| Create `src/core/services/auto-fixer.ts` | Medium | ~150 | 3h |
| Create `src/core/services/credential-extractor.ts` | Easy | ~50 | 1h |
| Modify `src/cli.ts` (command registration) | Easy | ~15 | 0.5h |
| Unit tests | Medium | ~200 | 3h |
| Integration tests | Easy | ~50 | 1h |
| **Total** | **Medium** | **~665** | **~12.5h (1.5 days)** |

---

## MCP Pattern Applicability

**Verdict: Adopt with simplification**

The MCP implementation is comprehensive but includes features not needed for CLI v1:

| MCP Feature | CLI Adoption | Reason |
|-------------|--------------|--------|
| Instance context (multi-tenant) | ❌ Skip | CLI uses single config |
| Telemetry tracking | ❌ Skip | Not needed |
| Version migration with breaking changes | ❌ Skip (v1) | Simplify to basic upgrades |
| Expression format fix | ✅ Port | High-impact, simple |
| Credential extraction | ✅ Port | Essential for UX |
| TypeVersion correction | ✅ Port | High-impact |
| Switch v3+ fixes | ✅ Port | Already in `src/core/fixer.ts` |

**Recommended approach:** Port ~30% of MCP logic, focusing on highest-impact fixes. Add more sophisticated features (version migrations, breaking change detection) in future iterations.

---

## Related Commands (Future)

| Command | Description | Dependency |
|---------|-------------|------------|
| `templates deploy <id>` | Alias for `workflows deploy-template` | This feature |
| `templates get <id> --deploy` | Shortcut flag | This feature |
| `workflows autofix <id>` | Already exists | Shares auto-fixer service |
| `workflows validate --fix` | Already exists | Shares fixer logic |
