/**
 * Tags Get Command
 * Get a single tag by ID
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { getConfig } from '../../core/config/loader.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';

export interface GetOptions {
  save?: string;
  json?: boolean;
}

export async function tagsGetCommand(id: string, opts: GetOptions): Promise<void> {
  try {
    const client = getApiClient();
    const config = getConfig();
    
    const tag = await client.getTag(id);
    
    // JSON output mode
    if (opts.json) {
      outputJson(tag);
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(tag, { path: opts.save });
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: `Tag: ${tag.name}`,
      icon: icons.tag,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'ID': tag.id || id,
        'Name': tag.name,
      },
    }));
    
    console.log('');
    
    // Display tag details
    console.log(chalk.bold('  Details:'));
    console.log(`    ID:       ${chalk.cyan(tag.id || id)}`);
    console.log(`    Name:     ${chalk.white(tag.name)}`);
    if (tag.createdAt) {
      console.log(`    Created:  ${chalk.dim(new Date(tag.createdAt).toLocaleString())}`);
    }
    if (tag.updatedAt) {
      console.log(`    Updated:  ${chalk.dim(new Date(tag.updatedAt).toLocaleString())}`);
    }
    
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n tags update ${tag.id} --name "New Name"`, description: 'Rename this tag' },
      { command: `n8n workflows list --tags ${tag.name}`, description: 'List workflows with this tag' },
      { command: 'n8n tags list', description: 'View all tags' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'tags get');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
