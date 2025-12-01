/**
 * Nodes Search Command
 * Search for n8n nodes in the local database
 */

import chalk from 'chalk';
import { getNodeRepository, type NodeSearchResult } from '../../core/db/nodes.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatSummary } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';

interface SearchOptions {
  mode?: string;
  limit?: string;
  save?: string;
  json?: boolean;
}

export async function nodesSearchCommand(query: string, opts: SearchOptions): Promise<void> {
  const mode = (opts.mode?.toUpperCase() || 'OR') as 'OR' | 'AND' | 'FUZZY';
  const limit = parseInt(opts.limit || '10', 10);
  const displayLimit = Math.min(limit, 20); // Cap display at 20 for readability
  
  try {
    const repo = await getNodeRepository();
    const results = repo.searchNodes(query, mode, limit);
    
    // Sort by relevance score
    results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        query,
        mode,
        total: results.length,
        nodes: results,
      });
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(results, { path: opts.save });
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: `Nodes matching "${query}"`,
      icon: icons.search,
      context: {
        'Search mode': mode,
        'Results': `${results.length} found`,
      },
    }));
    
    console.log('');
    
    if (results.length === 0) {
      console.log(chalk.yellow('  No nodes found matching your query.'));
      console.log(chalk.dim('\n  Tips:'));
      console.log(chalk.dim('  • Try --mode FUZZY for broader matches'));
      console.log(chalk.dim('  • Use simpler search terms'));
      console.log(chalk.dim('  • Check spelling'));
      process.exitCode = 0; return;
    }
    
    // Format as table (cast to generic record for formatTable)
    const tableOutput = formatTable(results as unknown as Record<string, unknown>[], {
      columns: [
        { 
          key: 'nodeType', 
          header: 'Node Type', 
          width: 35,
          formatter: (v) => chalk.cyan(String(v)),
        },
        { 
          key: 'displayName', 
          header: 'Name', 
          width: 25,
          formatter: columnFormatters.truncate(24),
        },
        { 
          key: 'category', 
          header: 'Category', 
          width: 18,
          formatter: columnFormatters.truncate(17),
        },
        { 
          key: 'relevanceScore', 
          header: 'Score', 
          width: 8,
          align: 'right',
          formatter: columnFormatters.score,
        },
      ],
      limit: displayLimit,
      showIndex: true,
    });
    
    console.log(tableOutput);
    
    // Summary
    console.log('\n' + formatSummary({
      total: results.length,
      displayed: Math.min(results.length, displayLimit),
    }));
    
    // Next actions
    if (results.length > 0) {
      const topResult = results[0];
      console.log(formatNextActions([
        { command: `n8n nodes get ${topResult.nodeType}`, description: 'View node details' },
        { command: `n8n nodes get ${topResult.nodeType} --mode docs`, description: 'View documentation' },
        ...(opts.save ? [] : [{ command: `n8n nodes search "${query}" --save nodes.json`, description: 'Save full results' }]),
      ]));
    }
    
    // Export & jq filter hints (always show for discoverability)
    if (results.length > 0) {
      console.log(formatExportFooter('nodes-search', `nodes search "${query}"`, opts.save));
    }
    
  } catch (error: any) {
    console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    if (error.message.includes('Database not found')) {
      console.log(chalk.dim('\n  The nodes database is missing.'));
      console.log(chalk.dim('  Ensure you are running from the package root directory.'));
    }
    process.exitCode = 1; return;
  }
}
