/**
 * Workflows Create Command
 * Create new workflow from file or stdin
 */

import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { getApiClient } from '../../core/api/client.js';
import { jsonParse } from '../../core/json-parser.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';

interface CreateOptions {
  file?: string;
  name?: string;
  active?: boolean;
  json?: boolean;
}

export async function workflowsCreateCommand(opts: CreateOptions): Promise<void> {
  try {
    if (!opts.file) {
      console.error(chalk.red(`\n${icons.error} Please provide --file with workflow JSON`));
      process.exitCode = 1; return;
    }
    
    const content = await readFile(opts.file, 'utf8');
    const workflow = jsonParse(content, { repairJSON: true }) as any;
    
    if (!workflow) {
      console.error(chalk.red(`\n${icons.error} Failed to parse workflow from ${opts.file}`));
      process.exitCode = 1; return;
    }
    
    // Override name if provided
    if (opts.name) {
      workflow.name = opts.name;
    }
    
    // Ensure workflow has a name
    if (!workflow.name) {
      workflow.name = `Imported Workflow ${new Date().toISOString().split('T')[0]}`;
    }
    
    // Ensure workflow has required settings (n8n API requires this)
    if (!workflow.settings) {
      workflow.settings = { executionOrder: 'v1' };
    }
    
    // Ensure workflow has connections object
    if (!workflow.connections) {
      workflow.connections = {};
    }
    
    const client = getApiClient();
    const created = await client.createWorkflow(workflow);
    
    // Activate if requested
    if (opts.active && created.id) {
      await client.activateWorkflow(created.id);
      created.active = true;
    }
    
    // JSON output
    if (opts.json) {
      outputJson(created);
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Workflow Created',
      icon: icons.success,
      context: {
        'ID': created.id || 'Unknown',
        'Name': created.name || 'Unnamed',
        'Active': created.active ? 'Yes' : 'No',
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Workflow created successfully!`));
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n workflows get ${created.id}`, description: 'View workflow' },
      ...(!created.active ? [{ command: `n8n workflows activate ${created.id}`, description: 'Activate workflow' }] : []),
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1; return;
  }
}
