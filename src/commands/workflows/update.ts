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
import { confirmAction, displayChangeSummary } from '../../utils/prompts.js';
import { maybeBackupWorkflow } from '../../utils/backup.js';

interface UpdateOptions {
  file?: string;
  activate?: boolean;
  deactivate?: boolean;
  json?: boolean;
  force?: boolean;
  yes?: boolean;
  backup?: boolean;  // Commander inverts --no-backup to backup=false
}

export async function workflowsUpdateCommand(id: string, opts: UpdateOptions): Promise<void> {
  try {
    const client = getApiClient();
    const forceFlag = opts.force || opts.yes;
    
    // If file provided, update with file content
    if (opts.file) {
      const content = await readFile(opts.file, 'utf8');
      const workflow = jsonParse(content, { repairJSON: true }) as any;
      
      if (!workflow) {
        console.error(chalk.red(`\n${icons.error} Failed to parse workflow from ${opts.file}`));
        process.exitCode = 1;
        return;
      }
      
      // Task 02: Confirm before API mutation
      displayChangeSummary({
        action: 'About to update workflow on n8n server',
        target: `Workflow ID: ${id}`,
        details: [`From file: ${opts.file}`],
      });
      
      const confirmed = await confirmAction('Update workflow on n8n?', { force: forceFlag });
      if (!confirmed) {
        console.log(chalk.yellow('  Aborted.'));
        return;
      }
      
      // Task 03: Backup original workflow before mutation
      const original = await client.getWorkflow(id);
      await maybeBackupWorkflow(original, id, { noBackup: opts.backup === false });
      
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
      // Task 02: Confirm activation
      const confirmed = await confirmAction(`Activate workflow ${id}?`, { force: forceFlag });
      if (!confirmed) {
        console.log(chalk.yellow('  Aborted.'));
        return;
      }
      
      const activated = await client.activateWorkflow(id);
      
      if (opts.json) {
        outputJson(activated);
        return;
      }
      
      console.log(chalk.green(`${icons.success} Workflow ${id} activated`));
      
    } else if (opts.deactivate) {
      // Task 02: Confirm deactivation
      const confirmed = await confirmAction(`Deactivate workflow ${id}?`, { force: forceFlag });
      if (!confirmed) {
        console.log(chalk.yellow('  Aborted.'));
        return;
      }
      
      const deactivated = await client.deactivateWorkflow(id);
      
      if (opts.json) {
        outputJson(deactivated);
        return;
      }
      
      console.log(chalk.yellow(`${icons.info} Workflow ${id} deactivated`));
      
    } else {
      console.error(chalk.red(`\n${icons.error} Provide --file, --activate, or --deactivate`));
      process.exitCode = 1;
      return;
    }
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n workflows get ${id}`, description: 'View workflow' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else if ((error as Error).message?.includes('non-interactive')) {
      // Task 02: Handle non-TTY error gracefully
      console.error(chalk.red(`\n${icons.error} ${(error as Error).message}`));
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
