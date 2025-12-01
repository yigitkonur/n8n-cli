/**
 * Tree Formatter
 * Renders hierarchical data as CLI trees with Unicode box-drawing characters
 */

import chalk from 'chalk';

/**
 * Tree item with name and optional metadata
 */
export interface TreeItem {
  name: string;
  displayName?: string;
  type?: string;
  description?: string;
  count?: number;
  icon?: string;
}

/**
 * Options for tree formatting
 */
export interface TreeOptions {
  /** Maximum items to show per group (default: 20) */
  limit?: number;
  /** Show item type in parentheses */
  showType?: boolean;
  /** Custom icon for items */
  itemIcon?: string;
  /** Indent size (default: 2) */
  indent?: number;
}

/**
 * Category metadata for enhanced display
 */
export interface CategoryMeta {
  icon: string;
  description: string;
  examples?: string[];
}

/**
 * Default category metadata
 */
export const CATEGORY_META: Record<string, CategoryMeta> = {
  trigger: {
    icon: '⚡',
    description: 'Nodes that start workflows',
    examples: ['Webhook', 'Schedule Trigger', 'Gmail Trigger'],
  },
  transform: {
    icon: '🔄',
    description: 'Nodes that modify or reshape data',
    examples: ['Code', 'Set', 'Function', 'Edit Fields'],
  },
  output: {
    icon: '📤',
    description: 'Nodes that send data to external destinations',
    examples: ['Email Send', 'Write Binary File', 'Respond to Webhook'],
  },
  input: {
    icon: '📥',
    description: 'Nodes that receive data into workflows',
    examples: ['Webhook', 'Form Trigger', 'Manual Trigger'],
  },
  organization: {
    icon: '🗂️',
    description: 'Nodes that control workflow logic and flow',
    examples: ['If', 'Switch', 'Merge', 'Split In Batches'],
  },
  schedule: {
    icon: '🕐',
    description: 'Nodes that trigger on time-based schedules',
    examples: ['Cron', 'Interval', 'Schedule Trigger'],
  },
  integration: {
    icon: '🔌',
    description: 'Nodes for integrating with external services',
    examples: ['Slack', 'GitHub', 'Google Sheets', 'AWS S3'],
  },
  // Fallbacks
  action: { icon: '▶️', description: 'Action nodes' },
  flow: { icon: '🔀', description: 'Flow control nodes' },
  core: { icon: '⚙️', description: 'Core n8n nodes' },
  default: { icon: '📦', description: 'Other nodes' },
};

/**
 * Box-drawing characters for tree rendering
 */
const TREE_CHARS = {
  branch: '├─',
  lastBranch: '└─',
  pipe: '│ ',
  space: '  ',
};

/**
 * Render a single tree branch with proper indentation
 */
export function renderTreeBranch(
  item: string,
  isLast: boolean,
  prefix: string = '',
  color?: typeof chalk.cyan
): string {
  const connector = isLast ? TREE_CHARS.lastBranch : TREE_CHARS.branch;
  const colorFn = color || chalk.white;
  return chalk.gray(prefix + connector) + ' ' + colorFn(item);
}

/**
 * Format items as an alphabetical tree (A, B, C... sections)
 */
export function formatAlphaTree(
  items: TreeItem[],
  options: TreeOptions = {}
): string {
  const { limit = 20, showType = false, itemIcon } = options;

  if (items.length === 0) {
    return chalk.dim('  No items found.');
  }

  // Sort alphabetically by displayName or name
  const sorted = [...items].sort((a, b) =>
    (a.displayName || a.name).localeCompare(b.displayName || b.name)
  );

  // Group by first letter
  const groups: Record<string, TreeItem[]> = {};
  for (const item of sorted) {
    const letter = (item.displayName || item.name)[0]?.toUpperCase() || '#';
    groups[letter] = groups[letter] || [];
    groups[letter].push(item);
  }

  let output = '';
  const letters = Object.keys(groups).sort();

  for (const letter of letters) {
    const groupItems = groups[letter];
    
    // Section header
    output += chalk.bold.cyan(`\n  ${letter}\n`);
    
    // Items in this group
    const displayItems = groupItems.slice(0, limit);
    const remaining = groupItems.length - displayItems.length;

    for (let i = 0; i < displayItems.length; i++) {
      const item = displayItems[i];
      const isLast = i === displayItems.length - 1 && remaining === 0;
      const icon = itemIcon || '';
      const name = item.displayName || item.name;
      const typeStr = showType && item.type ? chalk.dim(` (${item.type})`) : '';
      
      output += '  ' + renderTreeBranch(
        `${icon}${icon ? ' ' : ''}${name}${typeStr}`,
        isLast,
        '  '
      ) + '\n';
    }

    if (remaining > 0) {
      output += chalk.dim(`    └─ ... and ${remaining} more\n`);
    }
  }

  return output;
}

/**
 * Format items grouped by category with tree structure
 */
export function formatCategoryTree(
  items: TreeItem[],
  options: TreeOptions = {}
): string {
  const { limit = 10, showType = true } = options;

  if (items.length === 0) {
    return chalk.dim('  No items found.');
  }

  // Group by category
  const groups: Record<string, TreeItem[]> = {};
  for (const item of items) {
    const category = (item as any).category || 'other';
    groups[category] = groups[category] || [];
    groups[category].push(item);
  }

  let output = '';
  const categories = Object.keys(groups).sort();

  for (const category of categories) {
    const groupItems = groups[category];
    const meta = CATEGORY_META[category.toLowerCase()] || CATEGORY_META.default;
    
    // Category header with icon and count
    output += chalk.bold(`\n  ${meta.icon} ${capitalizeFirst(category)} (${groupItems.length})\n`);
    
    // Sort items within category
    const sortedItems = [...groupItems].sort((a, b) =>
      (a.displayName || a.name).localeCompare(b.displayName || b.name)
    );
    
    const displayItems = sortedItems.slice(0, limit);
    const remaining = sortedItems.length - displayItems.length;

    for (let i = 0; i < displayItems.length; i++) {
      const item = displayItems[i];
      const isLast = i === displayItems.length - 1 && remaining === 0;
      const name = item.displayName || item.name;
      const typeStr = showType && item.type ? chalk.dim(` ${item.type}`) : '';
      
      output += '  ' + renderTreeBranch(name + typeStr, isLast, '  ') + '\n';
    }

    if (remaining > 0) {
      output += chalk.dim(`    └─ ... and ${remaining} more\n`);
    }
  }

  return output;
}

/**
 * Format a simple list as tree (no grouping)
 */
export function formatSimpleTree(
  items: string[],
  options: { prefix?: string; icon?: string } = {}
): string {
  const { prefix = '  ', icon } = options;

  if (items.length === 0) {
    return chalk.dim(`${prefix}No items.`);
  }

  let output = '';
  for (let i = 0; i < items.length; i++) {
    const isLast = i === items.length - 1;
    const itemText = icon ? `${icon} ${items[i]}` : items[i];
    output += prefix + renderTreeBranch(itemText, isLast) + '\n';
  }

  return output;
}

/**
 * Format nested operations as a resource → operation tree
 * e.g., Slack: channel → archive, create, delete
 */
export function formatOperationsTree(
  operations: Record<string, string[]>,
  options: { prefix?: string } = {}
): string {
  const { prefix = '  ' } = options;

  const resources = Object.keys(operations).sort();
  if (resources.length === 0) {
    return chalk.dim(`${prefix}No operations.`);
  }

  let output = '';
  for (let r = 0; r < resources.length; r++) {
    const resource = resources[r];
    const ops = operations[resource];
    const isLastResource = r === resources.length - 1;
    
    // Resource header
    output += prefix + renderTreeBranch(
      chalk.bold(capitalizeFirst(resource)),
      isLastResource && ops.length === 0,
      ''
    ) + '\n';

    // Operations under this resource
    const opPrefix = prefix + (isLastResource ? TREE_CHARS.space : TREE_CHARS.pipe);
    for (let o = 0; o < ops.length; o++) {
      const isLastOp = o === ops.length - 1;
      output += opPrefix + renderTreeBranch(
        chalk.green(ops[o]),
        isLastOp,
        ''
      ) + '\n';
    }
  }

  return output;
}

/**
 * Format category stats as a summary table/tree
 */
export function formatCategoryStats(
  stats: Array<{ category: string; count: number }>,
  options: { showDescription?: boolean } = {}
): string {
  const { showDescription = false } = options;

  if (stats.length === 0) {
    return chalk.dim('  No categories found.');
  }

  // Sort by count descending
  const sorted = [...stats].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((sum, s) => sum + s.count, 0);

  let output = chalk.bold.cyan('\n📂 Node Categories\n\n');

  // Header
  const catWidth = 20;
  const countWidth = 8;
  output += chalk.bold(
    '  ' +
    'Category'.padEnd(catWidth) +
    'Count'.padStart(countWidth) +
    (showDescription ? '  Description' : '') +
    '\n'
  );
  output += chalk.dim('  ' + '─'.repeat(catWidth + countWidth + (showDescription ? 30 : 0)) + '\n');

  for (const stat of sorted) {
    const meta = CATEGORY_META[stat.category.toLowerCase()] || CATEGORY_META.default;
    const catStr = `${meta.icon} ${capitalizeFirst(stat.category)}`.padEnd(catWidth + 2);
    const countStr = String(stat.count).padStart(countWidth);
    const descStr = showDescription ? chalk.dim(`  ${meta.description}`) : '';
    
    output += `  ${catStr}${countStr}${descStr}\n`;
  }

  output += chalk.dim('  ' + '─'.repeat(catWidth + countWidth) + '\n');
  output += chalk.bold(`  ${'Total'.padEnd(catWidth)}${String(total).padStart(countWidth)}\n`);

  return output;
}

/**
 * Format auth method stats for credentials
 */
export function formatAuthMethodTree(
  items: Array<{ name: string; displayName: string; authType: string }>,
  options: TreeOptions = {}
): string {
  const { limit = 10 } = options;

  // Group by auth type
  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    const auth = item.authType || 'Custom';
    groups[auth] = groups[auth] || [];
    groups[auth].push(item);
  }

  // Define auth type icons and order
  const authMeta: Record<string, { icon: string; order: number }> = {
    'OAuth2': { icon: '🔐', order: 1 },
    'API Key': { icon: '🔑', order: 2 },
    'Basic Auth': { icon: '👤', order: 3 },
    'Bearer': { icon: '🎫', order: 4 },
    'Custom': { icon: '⚙️', order: 5 },
  };

  let output = '';
  const authTypes = Object.keys(groups).sort(
    (a, b) => (authMeta[a]?.order || 99) - (authMeta[b]?.order || 99)
  );

  for (const authType of authTypes) {
    const groupItems = groups[authType];
    const meta = authMeta[authType] || { icon: '📦', order: 99 };
    
    // Auth type header
    output += chalk.bold(`\n  ${meta.icon} ${authType} (${groupItems.length})\n`);
    
    // Sort items
    const sortedItems = [...groupItems].sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
    
    const displayItems = sortedItems.slice(0, limit);
    const remaining = sortedItems.length - displayItems.length;

    for (let i = 0; i < displayItems.length; i++) {
      const item = displayItems[i];
      const isLast = i === displayItems.length - 1 && remaining === 0;
      output += '  ' + renderTreeBranch(
        `${item.displayName} ${chalk.dim(`(${item.name})`)}`,
        isLast,
        '  '
      ) + '\n';
    }

    if (remaining > 0) {
      output += chalk.dim(`    └─ ... and ${remaining} more\n`);
    }
  }

  return output;
}

/**
 * Helper: Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
