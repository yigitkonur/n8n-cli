/**
 * Credentials List Command
 * List all credentials from n8n instance
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
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

export async function credentialsListCommand(opts: ListOptions): Promise<void> {
  const limit = parseInt(opts.limit || '10', 10);
  const startTime = Date.now();
  
  try {
    const client = getApiClient();
    const config = getConfig();
    
    const params: any = {
      limit,
      cursor: opts.cursor,
    };
    
    const response = await client.listCredentials(params);
    const credentials = response.data;
    
    // JSON output mode
    if (opts.json) {
      // Mask credential data in JSON output
      const maskedCredentials = credentials.map(cred => ({
        ...cred,
        data: cred.data ? '[MASKED]' : undefined,
      }));
      outputJson({
        data: maskedCredentials,
        total: credentials.length,
        hasMore: !!response.nextCursor,
        nextCursor: response.nextCursor,
      });
      return;
    }
    
    // Save to file if requested (also masked)
    if (opts.save) {
      const maskedCredentials = credentials.map(cred => ({
        ...cred,
        data: cred.data ? '[MASKED]' : undefined,
      }));
      await saveToJson(maskedCredentials, { path: opts.save });
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Credentials',
      icon: icons.credential,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'Found': `${credentials.length} credentials`,
      },
    }));
    
    console.log('');
    
    if (credentials.length === 0) {
      console.log(chalk.yellow('  No credentials found.'));
      process.exitCode = 0;
      return;
    }
    
    // Format as table
    const tableData = credentials.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      updatedAt: c.updatedAt,
    }));
    
    const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'id', header: 'ID', width: 18 },
        { key: 'name', header: 'Name', width: 30 },
        { key: 'type', header: 'Type', width: 25 },
        { 
          key: 'updatedAt', 
          header: 'Updated', 
          width: 15,
          formatter: columnFormatters.relativeTime,
        },
      ],
      limit: 20,
      showIndex: true,
    });
    
    console.log(tableOutput);
    
    // Pagination
    if (response.nextCursor) {
      console.log(chalk.dim(`\n  More credentials available. Use --cursor ${response.nextCursor}`));
    }
    
    // Summary
    const durationMs = Date.now() - startTime;
    console.log('\n' + formatSummary({
      total: credentials.length,
      durationMs,
    }));
    
    // Next actions
    if (credentials.length > 0) {
      const firstCred = credentials[0];
      console.log(formatNextActions([
        { command: `n8n credentials schema ${firstCred.type}`, description: 'View credential type schema' },
        { command: `n8n credentials create --type ${firstCred.type}`, description: 'Create new credential of same type' },
      ]));
    }
    
    // Export hints
    if (credentials.length > 0) {
      console.log(formatExportFooter('credentials-list', 'credentials list', opts.save));
    }
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'credentials list');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
