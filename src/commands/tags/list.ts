/**
 * Tags List Command
 * List all tags from n8n instance
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

export async function tagsListCommand(opts: ListOptions): Promise<void> {
  const limit = parseInt(opts.limit || '100', 10);
  const startTime = Date.now();
  
  try {
    const client = getApiClient();
    const config = getConfig();
    
    const params: any = {
      limit,
      cursor: opts.cursor,
    };
    
    const response = await client.listTags(params);
    const tags = response.data;
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        data: tags,
        total: tags.length,
        hasMore: Boolean(response.nextCursor),
        nextCursor: response.nextCursor,
      });
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(tags, { path: opts.save });
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Tags',
      icon: icons.tag,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'Found': `${tags.length} tags`,
      },
    }));
    
    console.log('');
    
    if (tags.length === 0) {
      console.log(chalk.yellow('  No tags found.'));
      console.log('');
      console.log(formatNextActions([
        { command: 'n8n tags create --name "Production"', description: 'Create your first tag' },
      ]));
      process.exitCode = 0;
      return;
    }
    
    // Format as table
    const tableData = tags.map((t: any) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
    
    const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'id', header: 'ID', width: 18 },
        { key: 'name', header: 'Name', width: 30 },
        { 
          key: 'createdAt', 
          header: 'Created', 
          width: 15,
          formatter: columnFormatters.relativeTime,
        },
        { 
          key: 'updatedAt', 
          header: 'Updated', 
          width: 15,
          formatter: columnFormatters.relativeTime,
        },
      ],
      limit: 50,
      showIndex: true,
    });
    
    console.log(tableOutput);
    
    // Pagination
    if (response.nextCursor) {
      console.log(chalk.dim(`\n  More tags available. Use --cursor ${response.nextCursor}`));
    }
    
    // Summary
    const durationMs = Date.now() - startTime;
    console.log(`\n${  formatSummary({
      total: tags.length,
      durationMs,
    })}`);
    
    // Next actions
    if (tags.length > 0) {
      const firstTag = tags[0];
      console.log(formatNextActions([
        { command: `n8n tags get ${firstTag.id}`, description: 'View tag details' },
        { command: 'n8n tags create --name "New Tag"', description: 'Create new tag' },
        { command: `n8n workflows list --tags ${firstTag.name}`, description: 'List workflows with this tag' },
      ]));
    }
    
    // Export hints
    if (tags.length > 0) {
      console.log(formatExportFooter('tags-list', 'tags list', opts.save));
    }
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'tags list');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
