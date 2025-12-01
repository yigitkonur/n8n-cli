/**
 * Credentials Create Command
 * Create a new credential in n8n
 */

import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { getConfig } from '../../core/config/loader.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';

export interface CreateOptions {
  type: string;
  name: string;
  data?: string;
  json?: boolean;
}

export async function credentialsCreateCommand(opts: CreateOptions): Promise<void> {
  try {
    // Validate required options
    if (!opts.type) {
      console.error(chalk.red(`${icons.error} Error: --type is required`));
      console.log(chalk.dim('\nUsage: n8n credentials create --type <type> --name <name> --data @file.json'));
      process.exitCode = 1;
      return;
    }
    
    if (!opts.name) {
      console.error(chalk.red(`${icons.error} Error: --name is required`));
      console.log(chalk.dim('\nUsage: n8n credentials create --type <type> --name <name> --data @file.json'));
      process.exitCode = 1;
      return;
    }
    
    // Parse credential data
    let credentialData: Record<string, unknown> = {};
    
    if (opts.data) {
      try {
        if (opts.data.startsWith('@')) {
          // Read from file
          const filePath = opts.data.slice(1);
          const fileContent = readFileSync(filePath, 'utf-8');
          credentialData = JSON.parse(fileContent);
        } else {
          // Parse as inline JSON
          credentialData = JSON.parse(opts.data);
        }
      } catch (parseError) {
        console.error(chalk.red(`${icons.error} Error parsing credential data: ${(parseError as Error).message}`));
        console.log(chalk.dim('\nTip: Use --data @file.json to read from a file'));
        process.exitCode = 1;
        return;
      }
    }
    
    const client = getApiClient();
    const config = getConfig();
    
    const credential = await client.createCredential({
      type: opts.type,
      name: opts.name,
      data: credentialData,
    });
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        success: true,
        credential: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          createdAt: credential.createdAt,
        },
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Credential Created',
      icon: icons.success,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'ID': credential.id || 'unknown',
        'Name': credential.name,
        'Type': credential.type,
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Credential "${credential.name}" created successfully!`));
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n credentials list`, description: 'View all credentials' },
      { command: `n8n credentials delete ${credential.id}`, description: 'Delete this credential' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'credentials create');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
