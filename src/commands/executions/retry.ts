/**
 * Executions Retry Command
 * Retry a failed execution
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { getConfig } from '../../core/config/loader.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';

export interface RetryOptions {
  loadLatest?: boolean;
  json?: boolean;
}

export async function executionsRetryCommand(id: string, opts: RetryOptions): Promise<void> {
  try {
    const client = getApiClient();
    const config = getConfig();
    
    console.log(chalk.dim(`  Retrying execution ${id}...`));
    
    const execution = await client.retryExecution(id, {
      loadWorkflow: opts.loadLatest || false,
    });
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        success: true,
        execution: {
          id: execution.id,
          workflowId: execution.workflowId,
          status: execution.status,
          retryOf: execution.retryOf,
          startedAt: execution.startedAt,
        },
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Execution Retry Started',
      icon: icons.retry,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'New Execution ID': execution.id,
        'Workflow ID': execution.workflowId,
        'Status': execution.status,
        'Retry Of': id,
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Execution retry started successfully!`));
    
    if (opts.loadLatest) {
      console.log(chalk.dim('  Using latest workflow version (--load-latest)'));
    } else {
      console.log(chalk.dim('  Using workflow snapshot from original execution'));
    }
    
    console.log('');
    
    // Display retry chain if available
    if (execution.retryOf) {
      console.log(chalk.bold('  Retry Chain:'));
      console.log(`    Original: ${chalk.cyan(execution.retryOf)}`);
      console.log(`    Current:  ${chalk.cyan(execution.id)}`);
      if (execution.retrySuccessId) {
        console.log(`    Success:  ${chalk.green(execution.retrySuccessId)}`);
      }
      console.log('');
    }
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n executions get ${execution.id}`, description: 'Check retry status' },
      { command: `n8n executions list --workflow-id ${execution.workflowId}`, description: 'View all executions for this workflow' },
      { command: `n8n workflows get ${execution.workflowId}`, description: 'View workflow details' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'executions retry');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
