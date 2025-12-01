/**
 * Executions Delete Command
 * Delete an execution from n8n
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { getConfig } from '../../core/config/loader.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { confirmAction } from '../../utils/prompts.js';

export interface DeleteOptions {
  force?: boolean;
  json?: boolean;
}

export async function executionsDeleteCommand(id: string, opts: DeleteOptions): Promise<void> {
  try {
    const client = getApiClient();
    const config = getConfig();
    
    // Confirm deletion unless --force is used
    if (!opts.force && !opts.json) {
      const confirmed = await confirmAction(
        `Are you sure you want to delete execution "${id}"? This cannot be undone.`,
        { force: opts.force }
      );
      if (!confirmed) {
        console.log(chalk.yellow('  Deletion cancelled.'));
        return;
      }
    }
    
    const execution = await client.deleteExecution(id);
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        success: true,
        deleted: {
          id: execution.id || id,
          workflowId: execution.workflowId,
          status: execution.status,
        },
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Execution Deleted',
      icon: icons.delete,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'ID': execution.id || id,
        'Workflow ID': execution.workflowId,
        'Status': execution.status,
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Execution deleted successfully!`));
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: 'n8n executions list', description: 'View remaining executions' },
      { command: `n8n executions list --workflow-id ${execution.workflowId}`, description: 'View executions for this workflow' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'executions delete');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
