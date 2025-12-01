/**
 * Workflows List Command
 * List workflows from n8n instance
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { getConfig } from '../../core/config/loader.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatSummary } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';

interface ListOptions {
  active?: boolean;
  tags?: string;
  limit?: string;
  cursor?: string;
  save?: string;
  json?: boolean;
}

export async function workflowsListCommand(opts: ListOptions): Promise<void> {
  const limit = parseInt(opts.limit || '10', 10);
  const startTime = Date.now();
  
  try {
    const client = getApiClient();
    
    const params: any = {
      limit,
      cursor: opts.cursor,
    };
    
    if (opts.active !== undefined) {
      params.active = opts.active;
    }
    if (opts.tags) {
      params.tags = opts.tags;
    }
    
    const response = await client.listWorkflows(params);
    const workflows = response.data;
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        data: workflows,
        total: workflows.length,
        hasMore: !!response.nextCursor,
        nextCursor: response.nextCursor,
      });
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(workflows, { path: opts.save });
    }
    
    // Human-friendly output with host context
    const config = getConfig();
    console.log(formatHeader({
      title: 'Workflows',
      icon: icons.workflow,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'Found': `${workflows.length} workflows`,
        ...(opts.active !== undefined && { 'Filter': opts.active ? 'Active only' : 'Inactive only' }),
      },
    }));
    
    console.log('');
    
    if (workflows.length === 0) {
      console.log(chalk.yellow('  No workflows found.'));
      console.log(chalk.dim('\n  Tips:'));
      console.log(chalk.dim('  • Check your n8n instance has workflows'));
      console.log(chalk.dim('  • Verify N8N_HOST and N8N_API_KEY are correct'));
      process.exitCode = 0; return;
    }
    
    // Format as table
    const tableData = workflows.map((w: any) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      updatedAt: w.updatedAt,
      nodes: w.nodes?.length || 0,
    }));
    
    const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'id', header: 'ID', width: 10 },
        { 
          key: 'name', 
          header: 'Name', 
          width: 35,
          formatter: columnFormatters.truncate(34),
        },
        { 
          key: 'active', 
          header: 'Active', 
          width: 8,
          formatter: columnFormatters.boolean,
        },
        { 
          key: 'updatedAt', 
          header: 'Updated', 
          width: 15,
          formatter: columnFormatters.relativeTime,
        },
        { 
          key: 'nodes', 
          header: 'Nodes', 
          width: 7,
          align: 'right',
          formatter: columnFormatters.number,
        },
      ],
      limit: 20,
      showIndex: true,
    });
    
    console.log(tableOutput);
    
    // Pagination info
    if (response.nextCursor) {
      console.log(chalk.dim(`\n  More workflows available. Use --cursor ${response.nextCursor} to see more.`));
    }
    
    // Summary with stats
    const activeCount = workflows.filter((w: any) => w.active).length;
    const inactiveCount = workflows.length - activeCount;
    const durationMs = Date.now() - startTime;
    
    console.log('\n' + formatSummary({ 
      total: workflows.length,
      active: activeCount,
      inactive: inactiveCount,
      durationMs,
    }));
    
    // Next actions
    if (workflows.length > 0) {
      const firstWorkflow = workflows[0];
      console.log(formatNextActions([
        { command: `n8n workflows get ${firstWorkflow.id}`, description: 'View workflow details' },
        { command: `n8n workflows validate ${firstWorkflow.id}`, description: 'Validate workflow' },
        { command: `n8n executions list --workflow-id ${firstWorkflow.id}`, description: 'View executions' },
      ]));
    }
    
    // Export & jq filter hints (always show for discoverability)
    if (workflows.length > 0) {
      console.log(formatExportFooter('workflows-list', 'workflows list', opts.save));
    }
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'workflows list');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1; return;
  }
}
