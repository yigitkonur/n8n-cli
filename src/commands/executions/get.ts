/**
 * Executions Get Command
 * Get execution details from n8n instance
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';

interface GetOptions {
  mode?: string;
  save?: string;
  json?: boolean;
}

export async function executionsGetCommand(id: string, opts: GetOptions): Promise<void> {
  const mode = opts.mode || 'summary';
  const includeData = mode === 'full' || mode === 'filtered';
  
  try {
    const client = getApiClient();
    const execution = await client.getExecution(id, includeData);
    
    // JSON output mode
    if (opts.json) {
      outputJson(execution);
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(execution, { path: opts.save });
    }
    
    // Output based on mode
    outputExecution(execution, mode);
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1; 
  }
}

function outputExecution(execution: any, mode: string): void {
  const statusIcon = execution.status === 'success' ? '✅' : 
                     execution.status === 'error' ? '❌' : '⏳';
  const statusColor = execution.status === 'success' ? chalk.green :
                      execution.status === 'error' ? chalk.red : chalk.yellow;
  
  // Calculate duration
  let duration = '-';
  if (execution.startedAt && execution.stoppedAt) {
    const ms = new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime();
    if (ms < 1000) {duration = `${ms}ms`;}
    else if (ms < 60000) {duration = `${(ms / 1000).toFixed(1)}s`;}
    else {duration = `${(ms / 60000).toFixed(1)}m`;}
  }
  
  // Header
  console.log(formatHeader({
    title: `Execution ${execution.id}`,
    icon: statusIcon,
    context: {
      'Status': statusColor(execution.status),
      'Workflow': execution.workflowId || execution.workflowName || 'Unknown',
      'Started': new Date(execution.startedAt).toLocaleString(),
      'Duration': duration,
    },
  }));
  
  console.log('');
  
  // Mode info
  if (execution.mode) {
    console.log(`  ${chalk.cyan('Mode:')} ${execution.mode}`);
  }
  
  // Error information
  if (execution.status === 'error') {
    console.log(formatDivider('Error Details'));
    
    if (execution.data?.resultData?.error) {
      const {error} = execution.data.resultData;
      console.log(chalk.red(`  ${error.message || 'Unknown error'}`));
      if (error.node) {
        console.log(chalk.dim(`  Failed at node: ${error.node}`));
      }
      if (error.stack && mode === 'full') {
        console.log(chalk.dim('\n  Stack trace:'));
        console.log(chalk.dim(`  ${  error.stack.split('\n').slice(0, 5).join('\n  ')}`));
      }
    } else {
      console.log(chalk.red('  Execution failed. Use --mode full for details.'));
    }
    console.log('');
  }
  
  // Node execution summary (if data available)
  if (mode !== 'preview' && execution.data?.resultData?.runData) {
    console.log(formatDivider('Node Execution'));
    
    const {runData} = execution.data.resultData;
    const nodeNames = Object.keys(runData);
    
    for (const nodeName of nodeNames.slice(0, 10)) {
      const nodeRuns = runData[nodeName];
      if (nodeRuns && nodeRuns.length > 0) {
        const lastRun = nodeRuns[nodeRuns.length - 1];
        const nodeStatus = lastRun.error ? '❌' : '✓';
        const itemCount = lastRun.data?.main?.[0]?.length || 0;
        
        console.log(`  ${nodeStatus} ${chalk.bold(nodeName)}`);
        console.log(chalk.dim(`     Items: ${itemCount}`));
        
        if (lastRun.error) {
          console.log(chalk.red(`     Error: ${lastRun.error.message}`));
        }
      }
    }
    
    if (nodeNames.length > 10) {
      console.log(chalk.dim(`\n  ... and ${nodeNames.length - 10} more nodes`));
    }
    console.log('');
  }
  
  // Last executed node
  if (execution.data?.resultData?.lastNodeExecuted) {
    console.log(`  ${chalk.cyan('Last node:')} ${execution.data.resultData.lastNodeExecuted}`);
    console.log('');
  }
  
  // Next actions
  console.log(formatNextActions([
    { command: `n8n workflows get ${execution.workflowId}`, description: 'View workflow' },
    { command: `n8n executions get ${execution.id} --mode full`, description: 'View full data' },
    { command: `n8n executions get ${execution.id} --json --save execution.json`, description: 'Export' },
  ]));
  
  // Export & jq filter hints
  console.log(formatExportFooter('executions-get', `executions get ${execution.id}`));
}
