/**
 * Nodes Categories Command
 * List all node categories with counts and descriptions
 */

import chalk from 'chalk';
import { getNodeRepository } from '../../core/db/nodes.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatCategoryStats, CATEGORY_META } from '../../core/formatters/tree.js';
import { formatTable } from '../../core/formatters/table.js';
import { formatSummary } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';

interface CategoriesOptions {
  detailed?: boolean;
  save?: string;
  json?: boolean;
}

export async function nodesCategoriesCommand(opts: CategoriesOptions): Promise<void> {
  const startTime = Date.now();
  
  try {
    const repo = await getNodeRepository();
    const stats = repo.getCategoryStats();
    const totalNodes = stats.reduce((sum, s) => sum + s.count, 0);

    // Enrich with metadata
    const enrichedStats = stats.map(s => {
      const meta = CATEGORY_META[s.category.toLowerCase()] || CATEGORY_META.default;
      return {
        category: s.category,
        count: s.count,
        icon: meta.icon,
        description: meta.description,
        examples: meta.examples || [],
      };
    });

    // JSON output mode
    if (opts.json) {
      outputJson({
        total: totalNodes,
        categories: enrichedStats,
      });
      return;
    }

    // Save to file if requested
    if (opts.save) {
      await saveToJson(enrichedStats, { path: opts.save });
    }

    // Human-friendly output
    console.log(formatHeader({
      title: 'Node Categories',
      icon: '📂',
      context: {
        'Categories': `${stats.length} categories`,
        'Total Nodes': `${totalNodes} nodes`,
      },
    }));

    if (stats.length === 0) {
      console.log(chalk.yellow('\n  No categories found.'));
      process.exitCode = 0;
      return;
    }

    if (opts.detailed) {
      // Detailed view with descriptions and examples
      console.log('');
      
      for (const stat of enrichedStats) {
        console.log(chalk.bold(`\n  ${stat.icon} ${capitalizeFirst(stat.category)} (${stat.count} nodes)`));
        console.log(chalk.dim(`     ${stat.description}`));
        
        if (stat.examples.length > 0) {
          console.log(chalk.dim(`     Examples: ${stat.examples.slice(0, 4).join(', ')}`));
        }
      }
      console.log('');
    } else {
      // Simple table view
      console.log(formatCategoryStats(enrichedStats, { showDescription: false }));
    }

    // Summary
    const durationMs = Date.now() - startTime;
    console.log('\n' + formatSummary({
      total: stats.length,
      durationMs,
    }));

    // Next actions
    console.log(formatNextActions([
      { command: `n8n nodes list --category trigger`, description: 'View trigger nodes' },
      { command: `n8n nodes list --by-category`, description: 'List all nodes grouped' },
      { command: `n8n nodes categories --detailed`, description: 'View with descriptions' },
    ]));

    // Export hints
    console.log(formatExportFooter('nodes-categories', 'nodes categories', opts.save));

  } catch (error: any) {
    console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    if (error.message.includes('Database not found')) {
      console.log(chalk.dim('\n  The nodes database is missing.'));
      console.log(chalk.dim('  Ensure you are running from the package root directory.'));
    }
    process.exitCode = 1;
  }
}

/**
 * Helper: Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
