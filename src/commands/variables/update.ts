/**
 * Variables Update Command
 * Update an existing variable in n8n
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { getConfig } from '../../core/config/loader.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';

export interface UpdateOptions {
  key: string;
  value: string;
  json?: boolean;
}

// Validate variable key format
function isValidKey(key: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
}

export async function variablesUpdateCommand(id: string, opts: UpdateOptions): Promise<void> {
  try {
    // Validate required options
    if (!opts.key) {
      console.error(chalk.red(`${icons.error} Error: --key is required`));
      console.log(chalk.dim('\nUsage: n8n variables update <id> --key <key> --value <value>'));
      process.exitCode = 1;
      return;
    }
    
    if (opts.value === undefined) {
      console.error(chalk.red(`${icons.error} Error: --value is required`));
      console.log(chalk.dim('\nUsage: n8n variables update <id> --key <key> --value <value>'));
      process.exitCode = 1;
      return;
    }
    
    // Validate key format
    if (!isValidKey(opts.key)) {
      console.error(chalk.red(`${icons.error} Error: Invalid key format`));
      console.log(chalk.dim('\nKeys must start with a letter or underscore and contain only alphanumeric characters and underscores.'));
      process.exitCode = 1;
      return;
    }
    
    const client = getApiClient();
    const config = getConfig();
    
    await client.updateVariable(id, {
      key: opts.key,
      value: opts.value,
    });
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        success: true,
        updated: {
          id,
          key: opts.key,
          value: opts.value,
        },
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Variable Updated',
      icon: icons.success,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'ID': id,
        'Key': opts.key,
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Variable "${opts.key}" updated successfully!`));
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: 'n8n variables list', description: 'View all variables' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'variables update');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
