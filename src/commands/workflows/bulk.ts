/**
 * Bulk Workflow Operations
 * Activate, deactivate, or delete multiple workflows
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { confirmAction } from '../../utils/prompts.js';
import type { GlobalOptions } from '../../types/global-options.js';

interface BulkOptions extends GlobalOptions {
  ids?: string;
  all?: boolean;
  force?: boolean;
  yes?: boolean;
  json?: boolean;
}

type BulkOperation = 'activate' | 'deactivate' | 'delete';

/**
 * Parse IDs from comma-separated string
 */
function parseIds(idsString?: string): string[] {
  if (!idsString) return [];
  return idsString.split(',').map(id => id.trim()).filter(Boolean);
}

/**
 * Perform bulk operation on workflows
 */
async function performBulkOperation(
  operation: BulkOperation,
  workflowIds: string[],
  opts: BulkOptions
): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }> {
  const client = getApiClient();
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  
  for (const id of workflowIds) {
    try {
      switch (operation) {
        case 'activate':
          await client.activateWorkflow(id);
          break;
        case 'deactivate':
          await client.deactivateWorkflow(id);
          break;
        case 'delete':
          await client.deleteWorkflow(id);
          break;
      }
      succeeded.push(id);
      
      if (!opts.quiet && !opts.json) {
        console.log(chalk.green(`  ✓ ${id}`));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failed.push({ id, error: errorMessage });
      
      if (!opts.quiet && !opts.json) {
        console.log(chalk.red(`  ✗ ${id}: ${errorMessage}`));
      }
    }
  }
  
  return { succeeded, failed };
}

/**
 * Bulk activate workflows
 */
export async function workflowsActivateCommand(opts: BulkOptions): Promise<void> {
  await executeBulkCommand('activate', opts);
}

/**
 * Bulk deactivate workflows
 */
export async function workflowsDeactivateCommand(opts: BulkOptions): Promise<void> {
  await executeBulkCommand('deactivate', opts);
}

/**
 * Bulk delete workflows
 */
export async function workflowsDeleteCommand(opts: BulkOptions): Promise<void> {
  await executeBulkCommand('delete', opts);
}

/**
 * Execute bulk command
 */
async function executeBulkCommand(operation: BulkOperation, opts: BulkOptions): Promise<void> {
  try {
    const client = getApiClient();
    let workflowIds: string[] = [];
    
    // Get workflow IDs
    if (opts.all) {
      // Fetch all workflows
      if (!opts.quiet && !opts.json) {
        console.log(chalk.dim('Fetching all workflows...'));
      }
      
      const response = await client.listWorkflows({ limit: 0 });
      workflowIds = response.data.map((w: any) => w.id).filter(Boolean);
      
      if (workflowIds.length === 0) {
        if (opts.json) {
          outputJson({ success: true, message: 'No workflows found', affected: 0 });
        } else {
          console.log(chalk.yellow('No workflows found.'));
        }
        return;
      }
    } else if (opts.ids) {
      workflowIds = parseIds(opts.ids);
      
      if (workflowIds.length === 0) {
        console.error(chalk.red(`\n${icons.error} No valid IDs provided`));
        process.exitCode = 1;
        return;
      }
    } else {
      console.error(chalk.red(`\n${icons.error} Please specify --ids or --all`));
      console.error(chalk.dim(`  Example: n8n workflows ${operation} --ids id1,id2,id3`));
      console.error(chalk.dim(`  Example: n8n workflows ${operation} --all`));
      process.exitCode = 1;
      return;
    }
    
    // Confirmation for destructive operations (unless --force/--yes)
    const skipConfirm = opts.force || opts.yes;
    
    if (!skipConfirm && !opts.json) {
      const actionWord = operation === 'delete' ? 'DELETE' : operation;
      const confirmed = await confirmAction(
        `${actionWord} ${workflowIds.length} workflow(s)?`,
        { defaultNo: true }
      );
      
      if (!confirmed) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }
    }
    
    // Show header
    if (!opts.quiet && !opts.json) {
      console.log(formatHeader({
        title: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Workflows`,
        icon: operation === 'delete' ? icons.delete : icons.workflow,
        context: {
          'Total': `${workflowIds.length}`,
        },
      }));
      console.log('');
    }
    
    // Perform operation
    const { succeeded, failed } = await performBulkOperation(operation, workflowIds, opts);
    
    // Output results
    if (opts.json) {
      outputJson({
        success: failed.length === 0,
        operation,
        total: workflowIds.length,
        succeeded: succeeded.length,
        failed: failed.length,
        succeededIds: succeeded,
        failedIds: failed,
      });
      return;
    }
    
    // Summary
    console.log('');
    if (failed.length === 0) {
      console.log(chalk.green(`  ${icons.success} All ${succeeded.length} workflow(s) ${operation}d successfully`));
    } else if (succeeded.length === 0) {
      console.log(chalk.red(`  ${icons.error} All ${failed.length} operations failed`));
      process.exitCode = 1;
    } else {
      console.log(chalk.yellow(`  ${icons.warning} ${succeeded.length} succeeded, ${failed.length} failed`));
    }
    
    // Next actions
    if (operation !== 'delete' && succeeded.length > 0) {
      console.log(formatNextActions([
        { command: 'n8n workflows list', description: 'List all workflows' },
      ]));
    }
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, { commandContext: `workflows ${operation}` });
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  }
}
