/**
 * Workflows Update Command
 * Update existing workflow from file
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

interface UpdateOptions {
  file?: string;
  activate?: boolean;
  deactivate?: boolean;
  json?: boolean;
}

export async function workflowsUpdateCommand(id: string, opts: UpdateOptions): Promise<void> {
  try {
    const client = getApiClient();
    
    // If file provided, update with file content
    if (opts.file) {
      const content = await readFile(opts.file, 'utf8');
      const workflow = jsonParse(content, { repairJSON: true }) as any;
      
      if (!workflow) {
        console.error(chalk.red(`\n${icons.error} Failed to parse workflow from ${opts.file}`));
        process.exit(1);
      }
      
      const updated = await client.updateWorkflow(id, workflow);
      
      if (opts.json) {
        outputJson(updated);
        return;
      }
      
      console.log(formatHeader({
        title: 'Workflow Updated',
        icon: icons.success,
        context: { 'ID': id, 'Source': opts.file },
      }));
      console.log(chalk.green(`\n  ${icons.success} Workflow updated successfully!`));
      
    } else if (opts.activate) {
      const activated = await client.activateWorkflow(id);
      
      if (opts.json) {
        outputJson(activated);
        return;
      }
      
      console.log(chalk.green(`${icons.success} Workflow ${id} activated`));
      
    } else if (opts.deactivate) {
      const deactivated = await client.deactivateWorkflow(id);
      
      if (opts.json) {
        outputJson(deactivated);
        return;
      }
      
      console.log(chalk.yellow(`${icons.info} Workflow ${id} deactivated`));
      
    } else {
      console.error(chalk.red(`\n${icons.error} Provide --file, --activate, or --deactivate`));
      process.exit(1);
    }
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n workflows get ${id}`, description: 'View workflow' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exit(1);
  }
}
