/**
 * Tags Update Command
 * Update an existing tag in n8n
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
  name: string;
  json?: boolean;
}

export async function tagsUpdateCommand(id: string, opts: UpdateOptions): Promise<void> {
  try {
    // Validate required options
    if (!opts.name) {
      console.error(chalk.red(`${icons.error} Error: --name is required`));
      console.log(chalk.dim('\nUsage: n8n tags update <id> --name <name>'));
      process.exitCode = 1;
      return;
    }
    
    const client = getApiClient();
    const config = getConfig();
    
    const tag = await client.updateTag(id, { name: opts.name });
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        success: true,
        tag: tag,
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Tag Updated',
      icon: icons.success,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'ID': tag.id || id,
        'Name': tag.name,
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Tag renamed to "${tag.name}" successfully!`));
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n tags get ${tag.id}`, description: 'View tag details' },
      { command: 'n8n tags list', description: 'View all tags' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'tags update');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
