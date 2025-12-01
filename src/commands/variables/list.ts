/**
 * Variables List Command
 * List all variables from n8n instance
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable } from '../../core/formatters/table.js';
import { formatSummary } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { getConfig } from '../../core/config/loader.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';

export interface ListOptions {
  limit?: string;
  cursor?: string;
  save?: string;
  json?: boolean;
}

export async function variablesListCommand(opts: ListOptions): Promise<void> {
  const limit = parseInt(opts.limit || '100', 10);
  const startTime = Date.now();
  
  try {
    const client = getApiClient();
    const config = getConfig();
    
    const params: any = {
      limit,
      cursor: opts.cursor,
    };
    
    const response = await client.listVariables(params);
    const variables = response.data;
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        data: variables,
        total: variables.length,
        hasMore: !!response.nextCursor,
        nextCursor: response.nextCursor,
      });
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(variables, { path: opts.save });
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Variables',
      icon: icons.variable,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'Found': `${variables.length} variables`,
      },
    }));
    
    console.log('');
    
    if (variables.length === 0) {
      console.log(chalk.yellow('  No variables found.'));
      console.log('');
      console.log(formatNextActions([
        { command: 'n8n variables create --key MY_VAR --value "my value"', description: 'Create your first variable' },
      ]));
      process.exitCode = 0;
      return;
    }
    
    // Format as table
    const tableData = variables.map((v: any) => ({
      id: v.id,
      key: v.key,
      value: v.value.length > 40 ? v.value.substring(0, 37) + '...' : v.value,
      type: v.type || 'string',
    }));
    
    const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'id', header: 'ID', width: 18 },
        { key: 'key', header: 'Key', width: 25 },
        { key: 'value', header: 'Value', width: 40 },
        { key: 'type', header: 'Type', width: 10 },
      ],
      limit: 50,
      showIndex: true,
    });
    
    console.log(tableOutput);
    
    // Pagination
    if (response.nextCursor) {
      console.log(chalk.dim(`\n  More variables available. Use --cursor ${response.nextCursor}`));
    }
    
    // Summary
    const durationMs = Date.now() - startTime;
    console.log('\n' + formatSummary({
      total: variables.length,
      durationMs,
    }));
    
    // Next actions
    if (variables.length > 0) {
      const firstVar = variables[0];
      console.log(formatNextActions([
        { command: `n8n variables update ${firstVar.id} --value "new value"`, description: 'Update a variable' },
        { command: 'n8n variables create --key NEW_VAR --value "value"', description: 'Create new variable' },
      ]));
    }
    
    // Export hints
    if (variables.length > 0) {
      console.log(formatExportFooter('variables-list', 'variables list', opts.save));
    }
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'variables list');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
