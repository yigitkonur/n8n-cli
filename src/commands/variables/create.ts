/**
 * Variables Create Command
 * Create a new variable in n8n
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { getConfig } from '../../core/config/loader.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';

export interface CreateOptions {
  key: string;
  value: string;
  json?: boolean;
}

// Validate variable key format
function isValidKey(key: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
}

export async function variablesCreateCommand(opts: CreateOptions): Promise<void> {
  try {
    // Validate required options
    if (!opts.key) {
      console.error(chalk.red(`${icons.error} Error: --key is required`));
      console.log(chalk.dim('\nUsage: n8n variables create --key <key> --value <value>'));
      process.exitCode = 1;
      return;
    }
    
    if (opts.value === undefined) {
      console.error(chalk.red(`${icons.error} Error: --value is required`));
      console.log(chalk.dim('\nUsage: n8n variables create --key <key> --value <value>'));
      process.exitCode = 1;
      return;
    }
    
    // Validate key format
    if (!isValidKey(opts.key)) {
      console.error(chalk.red(`${icons.error} Error: Invalid key format`));
      console.log(chalk.dim('\nKeys must start with a letter or underscore and contain only alphanumeric characters and underscores.'));
      console.log(chalk.dim('Examples: MY_API_KEY, config_value_1, _privateVar'));
      process.exitCode = 1;
      return;
    }
    
    const client = getApiClient();
    const config = getConfig();
    
    const variable = await client.createVariable({
      key: opts.key,
      value: opts.value,
    });
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        success: true,
        variable: variable,
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Variable Created',
      icon: icons.success,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'ID': variable.id || 'unknown',
        'Key': variable.key,
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Variable "${variable.key}" created successfully!`));
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: 'n8n variables list', description: 'View all variables' },
      { command: `n8n variables update ${variable.id} --value "new value"`, description: 'Update this variable' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'variables create');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
