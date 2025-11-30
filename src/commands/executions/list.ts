/**
 * Executions List Command
 * List workflow executions from n8n instance
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatSummary } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
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
  
  try {
    const client = getApiClient();
    
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
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Executions',
      icon: icons.execution,
      context: {
        'Found': `${executions.length} executions`,
        ...(opts.workflowId && { 'Workflow': opts.workflowId }),
        ...(opts.status && { 'Status': opts.status }),
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
    
    // Summary with success rate
    const successCount = executions.filter((e: any) => e.status === 'success').length;
    const errorCount = executions.filter((e: any) => e.status === 'error').length;
    
    console.log('\n' + formatSummary({
      total: executions.length,
      success: successCount,
      failed: errorCount,
    }));
    
    // Next actions
    if (executions.length > 0) {
      console.log(formatNextActions([
        { command: `n8n executions get ${executions[0].id}`, description: 'View execution details' },
        { command: `n8n executions list --status error`, description: 'View failed executions' },
      ]));
    }
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1; return;
  }
}
