/**
 * Workflows Versions Command
 * Manage workflow version history, rollback, and cleanup
 */

import chalk from 'chalk';
import { writeFile } from 'node:fs/promises';
import { getApiClient } from '../../core/api/client.js';
import { getUserDatabase } from '../../core/user-db/index.js';
import { WorkflowVersioningService } from '../../core/versioning/service.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { confirmAction, requireTypedConfirmation, displayChangeSummary } from '../../utils/prompts.js';
import { ExitCode } from '../../utils/exit-codes.js';
import type { GlobalOptions } from '../../types/global-options.js';

interface VersionsOptions extends GlobalOptions {
  limit?: string;
  get?: string;
  rollback?: boolean;
  toVersion?: string;
  skipValidation?: boolean;
  compare?: string;
  delete?: string;
  deleteAll?: boolean;
  prune?: boolean;
  keep?: string;
  stats?: boolean;
  truncateAll?: boolean;
  force?: boolean;
  yes?: boolean;
  noBackup?: boolean;
  save?: string;
  json?: boolean;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format trigger type for display
 */
function formatTrigger(trigger: string): string {
  switch (trigger) {
    case 'full_update': return chalk.blue('update');
    case 'partial_update': return chalk.cyan('partial');
    case 'autofix': return chalk.yellow('autofix');
    case 'manual': return chalk.green('manual');
    default: return chalk.dim(trigger);
  }
}

export async function workflowsVersionsCommand(
  workflowId: string | undefined,
  opts: VersionsOptions
): Promise<void> {
  const forceFlag = opts.force || opts.yes;

  try {
    // Get user database
    const db = await getUserDatabase();
    
    // Create versioning service (API client is optional, only needed for rollback)
    let apiClient;
    try {
      apiClient = getApiClient();
    } catch {
      // API client not configured, rollback won't work
    }
    
    const service = new WorkflowVersioningService(db, apiClient);

    // Handle --stats (no workflow ID required)
    if (opts.stats) {
      const stats = await service.getStorageStats();
      
      if (opts.json) {
        outputJson({ success: true, data: stats });
        return;
      }

      console.log(formatHeader({
        title: 'Version Storage Statistics',
        icon: '📊',
        context: {
          'Total Versions': `${stats.totalVersions}`,
          'Total Size': stats.totalSizeFormatted,
        },
      }));
      console.log('');

      if (stats.byWorkflow.length > 0) {
        console.log(formatDivider('Per Workflow Breakdown'));
        
        const tableData = stats.byWorkflow.map(w => ({
          workflowId: w.workflowId,
          workflowName: w.workflowName,
          versionCount: w.versionCount,
          totalSize: w.totalSize,
          lastBackup: w.lastBackup,
        }));

        const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
          columns: [
            { key: 'workflowId', header: 'ID', width: 12 },
            { key: 'workflowName', header: 'Name', width: 25, formatter: columnFormatters.truncate(24) },
            { key: 'versionCount', header: 'Versions', width: 10, align: 'right' },
            { key: 'totalSize', header: 'Size', width: 12, formatter: (v) => formatBytes(v as number) },
            { key: 'lastBackup', header: 'Last Backup', width: 20, formatter: columnFormatters.relativeTime },
          ],
          limit: 20,
        });
        console.log(tableOutput);
      } else {
        console.log(chalk.dim('  No workflow versions stored yet.'));
      }

      console.log(formatNextActions([
        { command: 'n8n workflows versions <id>', description: 'View specific workflow history' },
        { command: 'n8n workflows versions --truncate-all --force', description: 'Delete all versions' },
      ]));
      return;
    }

    // Handle --truncate-all (no workflow ID required)
    if (opts.truncateAll) {
      if (!forceFlag) {
        const confirmed = await requireTypedConfirmation(
          `Type 'DELETE ALL' to confirm deleting ALL versions for ALL workflows: `,
          'DELETE ALL'
        );
        if (!confirmed) {
          console.log(chalk.yellow('  Aborted.'));
          return;
        }
      }
      
      const result = await service.truncateAllVersions(true);
      
      if (opts.json) {
        outputJson({ success: true, data: result });
      } else {
        console.log(chalk.green(`${icons.success} ${result.message}`));
      }
      return;
    }

    // All other operations require workflow ID
    if (!workflowId) {
      if (opts.json) {
        outputJson({ 
          success: false, 
          error: { code: 'MISSING_WORKFLOW_ID', message: 'Workflow ID required' } 
        });
      } else {
        console.error(chalk.red(`${icons.error} Workflow ID required`));
        console.log(chalk.dim('\n  Usage: n8n workflows versions <workflow-id> [options]'));
        console.log(chalk.dim('  Use --stats to view global storage statistics without workflow ID'));
      }
      process.exitCode = ExitCode.USAGE;
      return;
    }

    // Handle --rollback
    if (opts.rollback) {
      if (!apiClient) {
        if (opts.json) {
          outputJson({ 
            success: false, 
            error: { code: 'API_NOT_CONFIGURED', message: 'API client not configured - cannot rollback' } 
          });
        } else {
          console.error(chalk.red(`${icons.error} API client not configured - cannot rollback`));
          console.log(chalk.dim('  Run: n8n auth login'));
        }
        process.exitCode = ExitCode.CONFIG;
        return;
      }

      const targetVersion = opts.toVersion ? parseInt(opts.toVersion) : undefined;
      const targetLabel = targetVersion ? `version ${targetVersion}` : 'latest backup';

      if (!forceFlag) {
        displayChangeSummary({
          action: `Rollback workflow ${workflowId} to ${targetLabel}`,
          target: `Workflow ID: ${workflowId}`,
          details: [
            'Current workflow will be backed up first',
            opts.skipValidation ? 'Validation will be skipped' : 'Workflow will be validated before restore',
          ],
        });

        const confirmed = await confirmAction('Proceed with rollback?', { force: forceFlag });
        if (!confirmed) {
          console.log(chalk.yellow('  Aborted.'));
          return;
        }
      }

      const result = await service.restoreVersion(
        workflowId,
        targetVersion,
        !opts.skipValidation
      );

      if (opts.json) {
        outputJson({ success: result.success, data: result });
      } else if (result.success) {
        console.log(chalk.green(`\n${icons.success} ${result.message}`));
        if (result.backupCreated) {
          console.log(chalk.dim(`  📦 Pre-rollback backup created: version ${result.backupVersionId}`));
        }
        
        console.log(formatNextActions([
          { command: `n8n workflows get ${workflowId}`, description: 'View restored workflow' },
          { command: `n8n workflows versions ${workflowId}`, description: 'View version history' },
        ]));
      } else {
        console.error(chalk.red(`\n${icons.error} ${result.message}`));
        if (result.validationErrors && result.validationErrors.length > 0) {
          console.log(chalk.dim('\n  Validation errors:'));
          result.validationErrors.slice(0, 5).forEach(e => {
            console.log(chalk.red(`    - ${e}`));
          });
          if (result.validationErrors.length > 5) {
            console.log(chalk.dim(`    ... and ${result.validationErrors.length - 5} more`));
          }
        }
        process.exitCode = ExitCode.DATAERR;
      }
      return;
    }

    // Handle --compare
    if (opts.compare) {
      const parts = opts.compare.split(',').map(v => parseInt(v.trim()));
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
        if (opts.json) {
          outputJson({ 
            success: false, 
            error: { code: 'INVALID_COMPARE_FORMAT', message: 'Invalid compare format. Use: --compare <id1>,<id2>' } 
          });
        } else {
          console.error(chalk.red(`${icons.error} Invalid compare format. Use: --compare <id1>,<id2>`));
        }
        process.exitCode = ExitCode.USAGE;
        return;
      }

      try {
        const diff = await service.compareVersions(parts[0], parts[1]);
        
        if (opts.json) {
          outputJson({ success: true, data: diff });
        } else {
          console.log(formatHeader({
            title: 'Version Comparison',
            icon: '🔍',
            context: {
              'Version': `v${diff.version1Number} → v${diff.version2Number}`,
              'Workflow': workflowId,
            },
          }));
          console.log('');

          console.log(chalk.bold('  Changes:'));
          console.log(`    Added nodes:    ${chalk.green(diff.addedNodes.length)}`);
          console.log(`    Removed nodes:  ${chalk.red(diff.removedNodes.length)}`);
          console.log(`    Modified nodes: ${chalk.yellow(diff.modifiedNodes.length)}`);
          console.log(`    Connections:    ${diff.connectionChanges > 0 ? chalk.yellow('changed') : chalk.dim('unchanged')}`);
          
          const settingKeys = Object.keys(diff.settingChanges);
          if (settingKeys.length > 0) {
            console.log(`    Settings:       ${chalk.yellow(settingKeys.length + ' changed')}`);
            settingKeys.slice(0, 3).forEach(key => {
              console.log(chalk.dim(`      - ${key}`));
            });
          }
          console.log('');
        }
      } catch (error: any) {
        if (opts.json) {
          outputJson({ success: false, error: { code: 'COMPARE_ERROR', message: error.message } });
        } else {
          console.error(chalk.red(`${icons.error} ${error.message}`));
        }
        process.exitCode = ExitCode.DATAERR;
      }
      return;
    }

    // Handle --prune
    if (opts.prune) {
      const keepCount = parseInt(opts.keep || '5');
      
      if (!forceFlag) {
        const confirmed = await confirmAction(
          `Prune old versions for workflow ${workflowId}, keeping ${keepCount} most recent?`,
          { force: forceFlag }
        );
        if (!confirmed) {
          console.log(chalk.yellow('  Aborted.'));
          return;
        }
      }

      const result = await service.pruneVersions(workflowId, keepCount);
      
      if (opts.json) {
        outputJson({ success: true, data: result });
      } else {
        if (result.pruned > 0) {
          console.log(chalk.green(`${icons.success} Pruned ${result.pruned} old version(s), ${result.remaining} remaining`));
        } else {
          console.log(chalk.dim(`${icons.info} No versions to prune (${result.remaining} total)`));
        }
      }
      return;
    }

    // Handle --delete
    if (opts.delete) {
      const versionId = parseInt(opts.delete);
      if (isNaN(versionId)) {
        if (opts.json) {
          outputJson({ success: false, error: { code: 'INVALID_VERSION_ID', message: 'Invalid version ID' } });
        } else {
          console.error(chalk.red(`${icons.error} Invalid version ID: ${opts.delete}`));
        }
        process.exitCode = ExitCode.USAGE;
        return;
      }

      if (!forceFlag) {
        const confirmed = await confirmAction(`Delete version ${versionId}?`, { force: forceFlag });
        if (!confirmed) {
          console.log(chalk.yellow('  Aborted.'));
          return;
        }
      }

      const result = await service.deleteVersion(versionId);
      
      if (opts.json) {
        outputJson({ success: result.deleted > 0, data: result });
      } else if (result.deleted > 0) {
        console.log(chalk.green(`${icons.success} ${result.message}`));
      } else {
        console.log(chalk.yellow(`${icons.warning} ${result.message}`));
        process.exitCode = ExitCode.DATAERR;
      }
      return;
    }

    // Handle --delete-all
    if (opts.deleteAll) {
      if (!forceFlag) {
        const confirmed = await requireTypedConfirmation(
          `Type 'DELETE' to confirm deleting all versions for workflow ${workflowId}: `,
          'DELETE'
        );
        if (!confirmed) {
          console.log(chalk.yellow('  Aborted.'));
          return;
        }
      }

      const result = await service.deleteAllVersions(workflowId);
      
      if (opts.json) {
        outputJson({ success: true, data: result });
      } else {
        console.log(chalk.green(`${icons.success} ${result.message}`));
      }
      return;
    }

    // Handle --get
    if (opts.get) {
      const versionId = parseInt(opts.get);
      if (isNaN(versionId)) {
        if (opts.json) {
          outputJson({ success: false, error: { code: 'INVALID_VERSION_ID', message: 'Invalid version ID' } });
        } else {
          console.error(chalk.red(`${icons.error} Invalid version ID: ${opts.get}`));
        }
        process.exitCode = ExitCode.USAGE;
        return;
      }

      const version = await service.getVersion(versionId);
      
      if (!version) {
        if (opts.json) {
          outputJson({ success: false, error: { code: 'VERSION_NOT_FOUND', message: `Version ${versionId} not found` } });
        } else {
          console.error(chalk.red(`${icons.error} Version ${versionId} not found`));
        }
        process.exitCode = ExitCode.DATAERR;
        return;
      }

      // Save to file if requested
      if (opts.save) {
        await writeFile(opts.save, JSON.stringify(version.workflowSnapshot, null, 2), 'utf8');
        if (!opts.json) {
          console.log(chalk.green(`${icons.success} Saved workflow snapshot to ${opts.save}`));
        }
      }

      if (opts.json) {
        outputJson({ success: true, data: version });
      } else {
        console.log(formatHeader({
          title: `Version ${version.versionNumber}`,
          icon: '📋',
          context: {
            'Workflow': version.workflowName,
            'ID': workflowId,
          },
        }));
        console.log('');
        console.log(`  Trigger:   ${formatTrigger(version.trigger)}`);
        console.log(`  Created:   ${chalk.cyan(version.createdAt)}`);
        console.log(`  Size:      ${chalk.cyan(formatBytes(JSON.stringify(version.workflowSnapshot).length))}`);
        
        if (version.fixTypes && version.fixTypes.length > 0) {
          console.log(`  Fix Types: ${version.fixTypes.join(', ')}`);
        }
        if (version.metadata) {
          console.log(`  Metadata:  ${chalk.dim(JSON.stringify(version.metadata))}`);
        }
        console.log('');

        console.log(formatNextActions([
          { command: `n8n workflows versions ${workflowId} --rollback --to-version ${versionId}`, description: 'Rollback to this version' },
          ...(opts.save ? [] : [{ command: `n8n workflows versions ${workflowId} --get ${versionId} --save workflow.json`, description: 'Save snapshot to file' }]),
        ]));
      }
      return;
    }

    // Default: list versions
    const limit = parseInt(opts.limit || '10');
    const versions = await service.getVersionHistory(workflowId, limit);

    if (opts.json) {
      outputJson({ 
        success: true, 
        data: { 
          workflowId, 
          versions, 
          count: versions.length,
          limit,
        } 
      });
      return;
    }

    console.log(formatHeader({
      title: 'Version History',
      icon: '📜',
      context: {
        'Workflow': workflowId,
        'Showing': `${versions.length} version(s)`,
      },
    }));
    console.log('');

    if (versions.length === 0) {
      console.log(chalk.dim('  No versions found for this workflow.'));
      console.log(chalk.dim('\n  Versions are created automatically when you:'));
      console.log(chalk.dim('    • Update a workflow: n8n workflows update <id> --file ...'));
      console.log(chalk.dim('    • Apply autofix:     n8n workflows autofix <id> --apply'));
    } else {
      const tableData = versions.map(v => ({
        id: v.id,
        version: v.versionNumber,
        trigger: v.trigger,
        workflowName: v.workflowName,
        size: v.size,
        createdAt: v.createdAt,
      }));

      const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
        columns: [
          { key: 'id', header: 'ID', width: 6, align: 'right' },
          { key: 'version', header: 'Ver', width: 5, align: 'right' },
          { key: 'trigger', header: 'Trigger', width: 10, formatter: (v) => formatTrigger(v as string) },
          { key: 'workflowName', header: 'Name', width: 25, formatter: columnFormatters.truncate(24) },
          { key: 'size', header: 'Size', width: 10, formatter: (v) => formatBytes(v as number) },
          { key: 'createdAt', header: 'Created', width: 18, formatter: columnFormatters.relativeTime },
        ],
        limit: 20,
        showIndex: false,
      });
      console.log(tableOutput);
    }

    console.log(formatNextActions([
      ...(versions.length > 0 ? [
        { command: `n8n workflows versions ${workflowId} --rollback`, description: 'Rollback to latest backup' },
        { command: `n8n workflows versions ${workflowId} --get ${versions[0]?.id}`, description: 'View version details' },
      ] : []),
      { command: `n8n workflows update ${workflowId} --file ...`, description: 'Create new version via update' },
    ]));

  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else if ((error as Error).message?.includes('non-interactive')) {
      console.error(chalk.red(`\n${icons.error} ${(error as Error).message}`));
    } else {
      if (opts.json) {
        outputJson({ 
          success: false, 
          error: { 
            code: 'VERSION_ERROR', 
            message: error instanceof Error ? error.message : 'Unknown error' 
          } 
        });
      } else {
        console.error(chalk.red(`${icons.error} ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }
    process.exitCode = ExitCode.GENERAL;
  }
}
