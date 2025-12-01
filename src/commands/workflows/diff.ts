/**
 * Workflows Diff Command
 * Apply incremental diff operations to a workflow
 */

import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'node:fs';
import { getApiClient } from '../../core/api/client.js';
import { WorkflowDiffEngine } from '../../core/diff/index.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { confirmAction, displayChangeSummary } from '../../utils/prompts.js';
import { maybeBackupWorkflow } from '../../utils/backup.js';
import { ExitCode } from '../../utils/exit-codes.js';
import { validateBeforeApi, displayValidationErrors } from '../../core/validation/index.js';
import type { WorkflowDiffOperation, WorkflowDiffRequest } from '../../types/workflow-diff.js';

export interface DiffOptions {
  operations?: string;
  file?: string;
  dryRun?: boolean;
  continueOnError?: boolean;
  skipValidation?: boolean;
  force?: boolean;
  yes?: boolean;
  backup?: boolean;  // Commander inverts --no-backup to backup=false
  save?: string;
  json?: boolean;
}

/**
 * Parse operations from --operations flag or --file
 * Supports inline JSON or @file.json syntax (like credentials create)
 */
function parseOperations(opts: DiffOptions): WorkflowDiffOperation[] {
  let operationsJson: string | undefined;

  if (opts.operations) {
    if (opts.operations.startsWith('@')) {
      // Read from file: --operations @diff.json
      const filePath = opts.operations.slice(1);
      try {
        operationsJson = readFileSync(filePath, 'utf-8');
      } catch (err) {
        throw new Error(`Failed to read operations file "${filePath}": ${(err as Error).message}`);
      }
    } else {
      // Inline JSON
      operationsJson = opts.operations;
    }
  } else if (opts.file) {
    // Alternative: --file path.json
    try {
      operationsJson = readFileSync(opts.file, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to read file "${opts.file}": ${(err as Error).message}`);
    }
  } else {
    throw new Error('Missing operations. Use --operations <json|@file.json> or --file <path.json>');
  }

  try {
    const parsed = JSON.parse(operationsJson);
    // Support both { operations: [...] } and direct [...]
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.operations && Array.isArray(parsed.operations)) {
      return parsed.operations;
    }
    throw new Error('Invalid format. Expected { operations: [...] } or direct array [...]');
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${err.message}`);
    }
    throw err;
  }
}

export async function workflowsDiffCommand(id: string, opts: DiffOptions): Promise<void> {
  try {
    const client = getApiClient();
    const forceFlag = opts.force || opts.yes;

    // 1. Parse operations
    let operations: WorkflowDiffOperation[];
    try {
      operations = parseOperations(opts);
    } catch (err) {
      if (opts.json) {
        outputJson({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: (err as Error).message
          }
        });
      } else {
        console.error(chalk.red(`\n${icons.error} ${(err as Error).message}`));
        console.log(chalk.dim('\nUsage: n8n workflows diff <id> --operations @diff.json'));
      }
      process.exitCode = ExitCode.USAGE;
      return;
    }

    if (operations.length === 0) {
      if (opts.json) {
        outputJson({
          success: true,
          data: {
            workflowId: id,
            operationsApplied: 0,
            message: 'No operations to apply'
          }
        });
      } else {
        console.log(chalk.yellow(`${icons.info} No operations to apply`));
      }
      return;
    }

    // 2. Get workflow from API
    const workflow = await client.getWorkflow(id);

    // 3. Create diff request
    const request: WorkflowDiffRequest = {
      id,
      operations,
      validateOnly: opts.dryRun,
      continueOnError: opts.continueOnError
    };

    // 4. Apply diff via engine
    const engine = new WorkflowDiffEngine();
    const result = await engine.applyDiff(workflow, request);

    // 5. Handle dry-run mode
    if (opts.dryRun) {
      if (opts.json) {
        outputJson({
          valid: result.success,
          operations: operations.map((op, i) => ({
            index: i,
            type: op.type,
            status: result.errors?.find(e => e.operation === i) ? 'invalid' : 'valid',
            error: result.errors?.find(e => e.operation === i)?.message
          })),
          warnings: result.warnings
        });
      } else {
        console.log(formatHeader({
          title: 'Diff Validation',
          icon: result.success ? icons.success : icons.error,
          context: { 'Workflow ID': id, 'Operations': operations.length.toString() }
        }));

        if (result.success) {
          console.log(chalk.green(`\n  ${icons.success} All ${operations.length} operations are valid`));
        } else {
          console.log(chalk.red(`\n  ${icons.error} Validation failed:`));
          result.errors?.forEach(err => {
            console.log(chalk.red(`    • Operation ${err.operation}: ${err.message}`));
          });
        }

        if (result.warnings && result.warnings.length > 0) {
          console.log(chalk.yellow(`\n  ${icons.warning} Warnings:`));
          result.warnings.forEach(w => {
            console.log(chalk.yellow(`    • ${w.message}`));
          });
        }

        console.log('');
        console.log(formatNextActions([
          { command: `n8n workflows diff ${id} --operations @diff.json`, description: 'Apply changes' },
        ]));
      }
      
      process.exitCode = result.success ? ExitCode.SUCCESS : ExitCode.DATAERR;
      return;
    }

    // 6. Handle validation failure (non-dry-run)
    if (!result.success) {
      if (opts.json) {
        outputJson({
          success: false,
          error: {
            code: 'DIFF_VALIDATION_FAILED',
            message: `${result.errors?.length || 0} operations failed validation`,
            details: result.errors
          }
        });
      } else {
        console.log(formatHeader({
          title: 'Diff Failed',
          icon: icons.error,
          context: { 'Workflow ID': id }
        }));
        console.log(chalk.red(`\n  ${icons.error} Diff operation failed:`));
        result.errors?.forEach(err => {
          console.log(chalk.red(`    • Operation ${err.operation}: ${err.message}`));
        });
      }
      process.exitCode = ExitCode.DATAERR;
      return;
    }

    // 7. Confirm before applying (unless --force)
    if (!forceFlag) {
      displayChangeSummary({
        action: 'About to apply diff operations to workflow',
        target: `Workflow ID: ${id}`,
        details: [
          `Operations: ${operations.length}`,
          ...operations.slice(0, 5).map(op => `${op.type}${op.description ? `: ${op.description}` : ''}`),
          ...(operations.length > 5 ? [`... and ${operations.length - 5} more`] : [])
        ]
      });

      const confirmed = await confirmAction('Apply diff to workflow on n8n?', { force: forceFlag });
      if (!confirmed) {
        console.log(chalk.yellow('  Aborted.'));
        return;
      }
    }

    // 8. Validate result workflow before API call
    if (result.workflow) {
      const validation = validateBeforeApi(result.workflow, {
        skipValidation: opts.skipValidation,
        json: opts.json,
      });
      
      if (!validation.shouldProceed) {
        displayValidationErrors(validation, { json: opts.json, context: 'diff' });
        return;
      }
      
      // Show warnings but proceed
      if (validation.warnings.length > 0 && !opts.json) {
        console.log(chalk.yellow(`  ${icons.warning} ${validation.warnings.length} validation warning(s) - proceeding anyway`));
      }
    }

    // 9. Create backup (unless --no-backup)
    await maybeBackupWorkflow(workflow, id, { noBackup: opts.backup === false });

    // 10. Push update via API
    const updatedWorkflow = await client.updateWorkflow(id, result.workflow!);

    // 11. Handle activation/deactivation
    if (result.shouldActivate) {
      await client.activateWorkflow(id);
    }
    if (result.shouldDeactivate) {
      await client.deactivateWorkflow(id);
    }

    // 12. Save to file if requested
    if (opts.save) {
      try {
        writeFileSync(opts.save, JSON.stringify(updatedWorkflow, null, 2), 'utf-8');
      } catch (err) {
        console.error(chalk.yellow(`${icons.warning} Failed to save to ${opts.save}: ${(err as Error).message}`));
      }
    }

    // 13. Output result
    if (opts.json) {
      outputJson({
        success: true,
        data: {
          workflowId: id,
          operationsApplied: result.operationsApplied,
          operationsFailed: result.failed?.length || 0,
          workflow: updatedWorkflow,
          activated: result.shouldActivate,
          deactivated: result.shouldDeactivate
        }
      });
    } else {
      console.log(formatHeader({
        title: 'Diff Applied',
        icon: icons.success,
        context: { 
          'Workflow ID': id,
          'Operations': (result.operationsApplied || 0).toString()
        }
      }));

      console.log(chalk.green(`\n  ${icons.success} Successfully applied ${result.operationsApplied} operations`));
      
      if (result.shouldActivate) {
        console.log(chalk.green(`  ${icons.success} Workflow activated`));
      }
      if (result.shouldDeactivate) {
        console.log(chalk.yellow(`  ${icons.info} Workflow deactivated`));
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.log(chalk.yellow(`\n  ${icons.warning} Warnings:`));
        result.warnings.forEach(w => {
          console.log(chalk.yellow(`    • ${w.message}`));
        });
      }

      if (opts.save) {
        console.log(chalk.dim(`\n  💾 Saved to ${opts.save}`));
      }

      console.log('');
      console.log(formatNextActions([
        { command: `n8n workflows get ${id}`, description: 'View updated workflow' },
        { command: `n8n workflows validate ${id}`, description: 'Validate workflow' },
      ]));
    }

  } catch (error) {
    if (error instanceof N8nApiError) {
      if (opts.json) {
        outputJson({
          success: false,
          error: {
            code: error.code || 'API_ERROR',
            message: error.message,
            statusCode: error.statusCode
          }
        });
      } else {
        printError(error);
      }
    } else if ((error as Error).message?.includes('non-interactive')) {
      if (opts.json) {
        outputJson({
          success: false,
          error: {
            code: 'NON_INTERACTIVE',
            message: (error as Error).message
          }
        });
      } else {
        console.error(chalk.red(`\n${icons.error} ${(error as Error).message}`));
      }
    } else if (opts.json) {
        outputJson({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: (error as Error).message
          }
        });
      } else {
        console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
      }
    process.exitCode = ExitCode.GENERAL;
  }
}
