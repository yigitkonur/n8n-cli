/**
 * Executions List Command
 * List workflow executions from n8n instance
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatSummary, formatHealthIndicator } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { getConfig } from '../../core/config/loader.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';

interface ListOptions {
  workflowId?: string;
  status?: string;
  limit?: string;
  cursor?: string;
  save?: string;
  json?: boolean;
}

export async function executionsListCommand(opts: ListOptions): Promise<void> {
  const limit = parseInt(opts.limit || '10', 10);
  const startTime = Date.now();
  
  try {
    const client = getApiClient();
    const config = getConfig();
    
    const params: any = {
      limit,
      cursor: opts.cursor,
    };
    
    if (opts.workflowId) {
      params.workflowId = opts.workflowId;
    }
    if (opts.status) {
      params.status = opts.status;
    }
    
    const response = await client.listExecutions(params);
    const executions = response.data;
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        data: executions,
        total: executions.length,
        hasMore: !!response.nextCursor,
        nextCursor: response.nextCursor,
      });
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(executions, { path: opts.save });
    }
    
    // Human-friendly output with context
    console.log(formatHeader({
      title: 'Executions',
      icon: icons.execution,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'Found': `${executions.length} executions`,
        ...(opts.workflowId && { 'Workflow': opts.workflowId }),
        ...(opts.status && { 'Status filter': opts.status }),
      },
    }));
    
    console.log('');
    
    if (executions.length === 0) {
      console.log(chalk.yellow('  No executions found.'));
      process.exitCode = 0; return;
    }
    
    // Format as table
    const tableData = executions.map((e: any) => ({
      id: e.id,
      workflowId: e.workflowId,
      status: e.status,
      startedAt: e.startedAt,
      duration: e.stoppedAt && e.startedAt 
        ? new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime()
        : null,
    }));
    
    const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'id', header: 'ID', width: 12 },
        { key: 'workflowId', header: 'Workflow', width: 12 },
        { 
          key: 'status', 
          header: 'Status', 
          width: 14,
          formatter: columnFormatters.executionStatus,
        },
        { 
          key: 'startedAt', 
          header: 'Started', 
          width: 15,
          formatter: columnFormatters.relativeTime,
        },
        { 
          key: 'duration', 
          header: 'Duration', 
          width: 12,
          formatter: columnFormatters.duration,
        },
      ],
      limit: 20,
      showIndex: true,
    });
    
    console.log(tableOutput);
    
    // Pagination
    if (response.nextCursor) {
      console.log(chalk.dim(`\n  More executions available. Use --cursor ${response.nextCursor}`));
    }
    
    // Summary with success rate and timing
    const successCount = executions.filter((e: any) => e.status === 'success').length;
    const errorCount = executions.filter((e: any) => e.status === 'error').length;
    const durationMs = Date.now() - startTime;
    
    console.log('\n' + formatSummary({
      total: executions.length,
      success: successCount,
      failed: errorCount,
      durationMs,
    }));
    
    // Health indicator for executions
    if (errorCount > 0) {
      console.log(formatHealthIndicator({
        total: executions.length,
        failed: errorCount,
      }));
    }
    
    // Context-aware next actions
    if (executions.length > 0) {
      const hasErrors = errorCount > 0;
      const latestExec = executions[0];
      
      console.log(formatNextActions([
        { command: `n8n executions get ${latestExec.id}`, description: 'View latest execution details' },
        ...(hasErrors ? [
          { command: `n8n executions list --status error`, description: '⚠️ Focus on failed executions' },
          { command: `n8n executions get ${executions.find((e: any) => e.status === 'error')?.id}`, description: 'Debug first failure' },
        ] : []),
        ...(opts.workflowId ? [
          { command: `n8n workflows get ${opts.workflowId}`, description: 'View workflow' },
          { command: `n8n workflows validate ${opts.workflowId}`, description: 'Validate workflow' },
        ] : []),
      ]));
    }
    
    // Export & jq filter hints (always show for discoverability)
    if (executions.length > 0) {
      console.log(formatExportFooter('executions-list', 'executions list', opts.save));
    }
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'executions list');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1; return;
  }
}
