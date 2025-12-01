/**
 * Nodes List Command
 * List all available n8n nodes with grouping options
 */

import chalk from 'chalk';
import { getNodeRepository, NodeRepository, type NodeSearchResult } from '../../core/db/nodes.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatAlphaTree, formatCategoryTree, CATEGORY_META } from '../../core/formatters/tree.js';
import { formatSummary } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';

interface ListOptions {
  byCategory?: boolean;
  category?: string;
  search?: string;
  limit?: string;
  compact?: boolean;
  save?: string;
  json?: boolean;
}

export async function nodesListCommand(opts: ListOptions): Promise<void> {
  const limit = parseInt(opts.limit || '0', 10); // 0 = all
  const startTime = Date.now();
  
  try {
    const repo = await getNodeRepository();
    let nodes: NodeSearchResult[];
    let title = 'Available Nodes';
    const context: Record<string, string> = {};

    // Determine which nodes to show
    if (opts.category) {
      // Filter by specific category
      nodes = repo.getNodesByCategory(opts.category);
      const meta = CATEGORY_META[opts.category.toLowerCase()] || CATEGORY_META.default;
      title = `${meta.icon} ${capitalizeFirst(opts.category)} Nodes`;
      context.Category = opts.category;
    } else if (opts.search) {
      // Search with fuzzy fallback
      nodes = repo.searchNodes(opts.search, 'FUZZY', limit || 50);
      title = `Nodes matching "${opts.search}"`;
      context.Search = opts.search;
    } else {
      // All nodes
      nodes = repo.getAllNodes();
    }

    // Apply limit if specified
    const totalCount = nodes.length;
    if (limit > 0 && nodes.length > limit) {
      nodes = nodes.slice(0, limit);
    }

    context.Total = `${totalCount} nodes`;

    // JSON output mode
    if (opts.json) {
      const jsonNodes = nodes.map(n => ({
        name: n.displayName,
        type: NodeRepository.formatNodeType(n.nodeType),
        category: n.category,
        description: n.description,
        isTrigger: n.isTrigger,
        isWebhook: n.isWebhook,
        isAITool: n.isAITool,
      }));
      outputJson({
        total: totalCount,
        displayed: nodes.length,
        nodes: jsonNodes,
      });
      return;
    }

    // Save to file if requested
    if (opts.save) {
      const saveNodes = nodes.map(n => ({
        name: n.displayName,
        type: NodeRepository.formatNodeType(n.nodeType),
        category: n.category,
        description: n.description,
        isTrigger: n.isTrigger,
        isWebhook: n.isWebhook,
        isAITool: n.isAITool,
      }));
      await saveToJson(saveNodes, { path: opts.save });
    }

    // Human-friendly output
    console.log(formatHeader({
      title,
      icon: icons.node,
      context,
    }));

    if (nodes.length === 0) {
      console.log(chalk.yellow('\n  No nodes found.'));
      if (opts.category) {
        console.log(chalk.dim(`\n  Available categories: n8n nodes categories`));
      }
      process.exitCode = 0;
      return;
    }

    // Format output based on options
    if (opts.byCategory) {
      // Group by category tree
      const treeItems = nodes.map(n => ({
        name: n.nodeType,
        displayName: n.displayName,
        type: NodeRepository.formatNodeType(n.nodeType),
        category: n.category,
      }));
      console.log(formatCategoryTree(treeItems, { limit: 15, showType: true }));
    } else if (opts.compact) {
      // Compact table format
      const tableOutput = formatTable(nodes as unknown as Record<string, unknown>[], {
        columns: [
          { key: 'displayName', header: 'Name', width: 30, formatter: columnFormatters.truncate(29) },
          { 
            key: 'nodeType', 
            header: 'Type', 
            width: 35,
            formatter: (v) => chalk.cyan(NodeRepository.formatNodeType(String(v))),
          },
          { key: 'category', header: 'Category', width: 15 },
        ],
        limit: limit || 50,
        showIndex: true,
      });
      console.log(`\n${  tableOutput}`);
    } else {
      // Default: Alphabetical tree
      const treeItems = nodes.map(n => ({
        name: n.nodeType,
        displayName: n.displayName,
        type: NodeRepository.formatNodeType(n.nodeType),
      }));
      console.log(formatAlphaTree(treeItems, { limit: 20, showType: true }));
    }

    // Summary
    const durationMs = Date.now() - startTime;
    console.log(`\n${  formatSummary({
      total: totalCount,
      displayed: nodes.length,
      durationMs,
    })}`);

    // Next actions
    if (nodes.length > 0) {
      const firstNode = nodes[0];
      const actions = [
        { command: `n8n nodes show ${firstNode.nodeType}`, description: 'View node details' },
      ];
      
      if (!opts.byCategory) {
        actions.push({ command: `n8n nodes list --by-category`, description: 'View by category' });
      }
      if (!opts.category) {
        actions.push({ command: `n8n nodes categories`, description: 'View category stats' });
      }
      if (!opts.save) {
        actions.push({ command: `n8n nodes list --save nodes.json`, description: 'Export all nodes' });
      }
      
      console.log(formatNextActions(actions.slice(0, 3)));
    }

    // Export hints
    console.log(formatExportFooter('nodes-list', 'nodes list', opts.save));

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
  if (!str) {return str;}
  return str.charAt(0).toUpperCase() + str.slice(1);
}
