/**
 * Workflows Trigger Command
 * Trigger a workflow via webhook
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';

interface TriggerOptions {
  method?: string;
  data?: string;
  wait?: boolean;
  json?: boolean;
}

export async function workflowsTriggerCommand(webhookUrl: string, opts: TriggerOptions): Promise<void> {
  try {
    const client = getApiClient();
    
    // Parse data if provided
    let data: any;
    if (opts.data) {
      try {
        data = JSON.parse(opts.data);
      } catch {
        // Treat as string if not valid JSON
        data = { data: opts.data };
      }
    }
    
    const result = await client.triggerWebhook({
      webhookUrl,
      httpMethod: (opts.method?.toUpperCase() || 'POST') as any,
      data,
      waitForResponse: opts.wait !== false,
    });
    
    // JSON output
    if (opts.json) {
      outputJson(result);
      return;
    }
    
    // Human-friendly output
    const statusIcon = result.status >= 200 && result.status < 300 ? icons.success : icons.error;
    const statusColor = result.status >= 200 && result.status < 300 ? chalk.green : chalk.red;
    
    console.log(formatHeader({
      title: 'Webhook Triggered',
      icon: statusIcon,
      context: {
        'URL': webhookUrl.slice(0, 50) + (webhookUrl.length > 50 ? '...' : ''),
        'Status': statusColor(`${result.status} ${result.statusText}`),
      },
    }));
    
    console.log('');
    
    if (result.data) {
      console.log(chalk.cyan('  Response:'));
      const dataStr = typeof result.data === 'string' 
        ? result.data 
        : JSON.stringify(result.data, null, 2);
      
      // Truncate if too long
      if (dataStr.length > 500) {
        console.log(chalk.dim(`  ${  dataStr.slice(0, 500)  }...`));
        console.log(chalk.dim(`\n  (${dataStr.length} characters total, use --json for full response)`));
      } else {
        console.log(chalk.dim(`  ${  dataStr.split('\n').join('\n  ')}`));
      }
    }
    
    process.exitCode = result.status >= 200 && result.status < 300 ? 0 : 1;
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1; 
  }
}
