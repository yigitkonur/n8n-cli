/**
 * Tags Create Command
 * Create a new tag in n8n
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
  name: string;
  json?: boolean;
}

export async function tagsCreateCommand(opts: CreateOptions): Promise<void> {
  try {
    // Validate required options
    if (!opts.name) {
      console.error(chalk.red(`${icons.error} Error: --name is required`));
      console.log(chalk.dim('\nUsage: n8n tags create --name <name>'));
      process.exitCode = 1;
      return;
    }
    
    const client = getApiClient();
    const config = getConfig();
    
    const tag = await client.createTag({ name: opts.name });
    
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
      title: 'Tag Created',
      icon: icons.success,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'ID': tag.id || 'unknown',
        'Name': tag.name,
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Tag "${tag.name}" created successfully!`));
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: 'n8n tags list', description: 'View all tags' },
      { command: `n8n workflows tags <workflowId> --set ${tag.id}`, description: 'Assign this tag to a workflow' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'tags create');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
