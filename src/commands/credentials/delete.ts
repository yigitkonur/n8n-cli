/**
 * Credentials Delete Command
 * Delete a credential from n8n
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { getConfig } from '../../core/config/loader.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { confirmAction } from '../../utils/prompts.js';

export interface DeleteOptions {
  force?: boolean;
  json?: boolean;
}

export async function credentialsDeleteCommand(id: string, opts: DeleteOptions): Promise<void> {
  try {
    const client = getApiClient();
    const config = getConfig();
    
    // Confirm deletion unless --force is used
    if (!opts.force && !opts.json) {
      const confirmed = await confirmAction(
        `Are you sure you want to delete credential "${id}"? This cannot be undone.`,
        { force: opts.force }
      );
      if (!confirmed) {
        console.log(chalk.yellow('  Deletion cancelled.'));
        return;
      }
    }
    
    const credential = await client.deleteCredential(id);
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        success: true,
        deleted: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
        },
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Credential Deleted',
      icon: icons.delete,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'ID': credential.id || id,
        'Name': credential.name,
        'Type': credential.type,
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Credential "${credential.name}" deleted successfully!`));
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n credentials list`, description: 'View remaining credentials' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'credentials delete');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
