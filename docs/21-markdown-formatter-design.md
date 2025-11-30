# Markdown Formatter Design

## Overview

Terminal output uses a consistent Markdown-inspired format with box drawing, tables, colors, and contextual help.

## MCP Source Reference

**Patterns from:** `n8n-mcp/src/mcp/tools/*.ts` - Response formatting
**Adapt:** Terminal-optimized with colors and box drawing

## Architecture

```
src/core/formatters/
├── markdown.ts       # Main formatter module
├── table.ts          # Table generation (cli-table3)
├── header.ts         # Box-drawn headers
├── summary.ts        # Stats summaries
├── next-actions.ts   # Contextual next steps
└── jq-recipes.ts     # jq command suggestions
```

## Visual Language

### Box Drawing Characters

```
╭─ Header Title
│  Context line 1
│  Context line 2
╰─

# For sections with content:
╭─ Section Title
╰─
(content follows)
```

### Status Icons

| Icon | Meaning | Color |
|------|---------|-------|
| ✅ | Success/Valid | Green |
| ❌ | Error/Invalid | Red |
| ⚠️ | Warning | Yellow |
| ℹ️ | Info | Blue |
| ✓ | Check mark | Green |
| ✗ | X mark | Red |
| ⊘ | Not executed | Gray |
| 💡 | Tip | Yellow |
| 📊 | Summary | Blue |
| ⚡ | Next steps | Cyan |
| 🔍 | Search/Filter | Blue |
| 📦 | Package/Node | Purple |
| 🚀 | Action/Launch | Green |
| 🔧 | Fix/Tool | Yellow |
| 🏥 | Health | Green |
| 🐛 | Debug | Red |
| ⏮️ | Rollback | Yellow |

## Core Formatter Functions

### 1. formatHeader()

```typescript
// src/core/formatters/header.ts
import chalk from 'chalk';

export interface HeaderOptions {
  title: string;
  context?: Record<string, string>;
  icon?: string;
}

export function formatHeader(options: HeaderOptions): string {
  const { title, context = {}, icon = '' } = options;
  
  let output = chalk.cyan(`╭─ ${icon ? icon + ' ' : ''}${title}\n`);
  
  for (const [key, value] of Object.entries(context)) {
    output += chalk.cyan('│  ') + chalk.dim(`${key}: `) + value + '\n';
  }
  
  output += chalk.cyan('╰─\n');
  
  return output;
}

// Usage:
formatHeader({
  title: 'Nodes matching "webhook"',
  context: {
    '💡 Tip': 'Use --save webhook-nodes.json for complete dataset',
    '🔍 Search mode': 'OR | Include examples: false'
  }
});

// Output:
// ╭─ Nodes matching "webhook"
// │  💡 Tip: Use --save webhook-nodes.json for complete dataset
// │  🔍 Search mode: OR | Include examples: false
// ╰─
```

### 2. formatTable()

```typescript
// src/core/formatters/table.ts
import Table from 'cli-table3';
import chalk from 'chalk';

export interface TableColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: unknown) => string;
}

export interface TableOptions {
  columns: TableColumn[];
  limit?: number;
  showIndex?: boolean;
}

export function formatTable<T extends Record<string, unknown>>(
  data: T[],
  options: TableOptions
): string {
  const { columns, limit = 10, showIndex = false } = options;
  
  // Truncate data if limit specified
  const displayData = limit > 0 ? data.slice(0, limit) : data;
  const truncated = limit > 0 && data.length > limit;
  
  // Build table
  const table = new Table({
    head: columns.map(c => chalk.bold(c.header)),
    style: {
      head: ['cyan'],
      border: ['gray'],
    },
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│'
    }
  });
  
  // Add rows
  for (const item of displayData) {
    const row = columns.map(col => {
      const value = item[col.key];
      return col.formatter ? col.formatter(value) : String(value ?? '');
    });
    table.push(row);
  }
  
  let output = table.toString() + '\n';
  
  // Add truncation indicator
  if (truncated) {
    output += chalk.dim(`\n... and ${data.length - limit} more (showing ${limit} of ${data.length})\n`);
  }
  
  return output;
}

// Column formatters
export const formatters = {
  status: (active: boolean) => active ? chalk.green('✓') : chalk.red('✗'),
  score: (score: number) => chalk.yellow(score.toFixed(1)),
  date: (date: string) => formatRelativeTime(date),
  duration: (ms: number) => formatDuration(ms),
  truncate: (text: string, max: number = 30) => 
    text.length > max ? text.slice(0, max - 1) + '…' : text,
};
```

### 3. formatSummary()

```typescript
// src/core/formatters/summary.ts
import chalk from 'chalk';

export interface SummaryStats {
  total?: number;
  displayed?: number;
  success?: number;
  failed?: number;
  warnings?: number;
  [key: string]: number | string | undefined;
}

export function formatSummary(stats: SummaryStats): string {
  const parts: string[] = [];
  
  if (stats.total !== undefined) {
    if (stats.displayed !== undefined && stats.displayed < stats.total) {
      parts.push(`${stats.total} total`);
      parts.push(`${stats.displayed} displayed`);
    } else {
      parts.push(`${stats.total} found`);
    }
  }
  
  if (stats.success !== undefined && stats.failed !== undefined) {
    const successRate = (stats.success / (stats.success + stats.failed) * 100).toFixed(1);
    parts.push(chalk.green(`${stats.success} success (${successRate}%)`));
    parts.push(chalk.red(`${stats.failed} failed`));
  }
  
  if (stats.warnings !== undefined && stats.warnings > 0) {
    parts.push(chalk.yellow(`${stats.warnings} warnings`));
  }
  
  return chalk.blue('📊 Summary: ') + parts.join(' | ') + '\n';
}

// Usage:
formatSummary({
  total: 198,
  displayed: 10,
  success: 190,
  failed: 8
});

// Output:
// 📊 Summary: 198 total | 10 displayed | 190 success (96.0%) | 8 failed
```

### 4. formatNextActions()

```typescript
// src/core/formatters/next-actions.ts
import chalk from 'chalk';

export interface NextAction {
  command: string;
  description?: string;
}

export function formatNextActions(actions: NextAction[]): string {
  if (actions.length === 0) return '';
  
  let output = chalk.cyan('\n⚡ Next steps:\n');
  
  for (const action of actions) {
    output += chalk.dim('   ') + chalk.white(action.command);
    if (action.description) {
      output += chalk.dim(` # ${action.description}`);
    }
    output += '\n';
  }
  
  return output;
}

// Usage:
formatNextActions([
  { command: 'n8n nodes get n8n-nodes-base.webhook --mode docs' },
  { command: 'n8n nodes search webhook --save webhook-nodes.json' },
]);

// Output:
// ⚡ Next steps:
//    n8n nodes get n8n-nodes-base.webhook --mode docs
//    n8n nodes search webhook --save webhook-nodes.json
```

### 5. formatJqRecipes()

```typescript
// src/core/formatters/jq-recipes.ts
import chalk from 'chalk';

export interface JqRecipe {
  command: string;
  description: string;
}

export function formatJqRecipes(recipes: JqRecipe[], filename: string): string {
  if (recipes.length === 0) return '';
  
  let output = chalk.yellow(`\n💡 jq recipes (after --save ${filename}):\n`);
  
  for (const recipe of recipes) {
    output += chalk.dim('   ') + chalk.green(recipe.command) + '\n';
    output += chalk.dim(`      # ${recipe.description}`) + '\n';
  }
  
  return output;
}

// Usage:
formatJqRecipes([
  { 
    command: "jq -r '.[].nodeType' nodes.json",
    description: 'Extract node types only'
  },
  {
    command: "jq '.[] | select(.category == \"Core Nodes\")' nodes.json",
    description: 'Filter to Core Nodes'
  }
], 'nodes.json');
```

## Domain-Specific Formatters

### formatNodesTable()

```typescript
// src/core/formatters/markdown.ts
import { formatHeader, formatTable, formatSummary, formatNextActions, formatJqRecipes } from './index.js';
import { NodeSearchResult } from '../../types/node.js';
import { FormatOptions } from '../../commands/base.js';

export function formatNodesTable(
  results: { nodes: NodeSearchResult[]; totalFound: number; query: string; mode: string },
  options: FormatOptions
): string {
  const { limit, verbose } = options;
  
  let output = formatHeader({
    title: `Nodes matching "${results.query}"`,
    context: {
      '🔍 Search mode': results.mode,
      '💡 Tip': `Use --save nodes.json for complete dataset`
    }
  });
  
  output += '\n';
  
  output += formatTable(results.nodes, {
    columns: [
      { key: 'nodeType', header: 'Node Type', width: 35 },
      { key: 'displayName', header: 'Display Name', width: 20 },
      { key: 'category', header: 'Category', width: 15 },
      { key: 'relevanceScore', header: 'Score', width: 8, formatter: formatters.score },
    ],
    limit,
  });
  
  output += formatSummary({
    total: results.totalFound,
    displayed: Math.min(limit, results.nodes.length)
  });
  
  if (results.nodes.length > 0) {
    output += formatNextActions([
      { command: `n8n nodes get ${results.nodes[0].nodeType} --mode docs` },
      { command: `n8n nodes search "${results.query}" --save nodes.json` },
    ]);
  }
  
  return output;
}
```

### formatWorkflowsTable()

```typescript
export function formatWorkflowsTable(
  results: { workflows: Workflow[]; totalFound: number; hasMore: boolean },
  options: FormatOptions
): string {
  const { limit } = options;
  
  let output = formatHeader({
    title: `Workflows`,
    context: {
      '📊 Total': `${results.totalFound} workflows`,
      ...(results.hasMore ? { '📄 Pagination': 'Use --cursor for next page' } : {})
    }
  });
  
  output += '\n';
  
  output += formatTable(results.workflows, {
    columns: [
      { key: 'id', header: 'ID', width: 12 },
      { key: 'name', header: 'Name', width: 30, formatter: v => formatters.truncate(v, 30) },
      { key: 'active', header: 'Active', width: 8, formatter: formatters.status },
      { key: 'updatedAt', header: 'Updated', width: 15, formatter: formatters.date },
    ],
    limit,
  });
  
  // Stats
  const active = results.workflows.filter(w => w.active).length;
  const inactive = results.workflows.length - active;
  
  output += formatSummary({
    total: results.totalFound,
    displayed: Math.min(limit, results.workflows.length)
  });
  
  output += chalk.dim(`   Active: ${active} | Inactive: ${inactive}\n`);
  
  if (results.workflows.length > 0) {
    output += formatNextActions([
      { command: `n8n workflows get ${results.workflows[0].id}` },
      { command: `n8n workflows list --active true` },
    ]);
  }
  
  return output;
}
```

### formatValidationResult()

```typescript
export function formatValidationResult(
  result: ValidationResult,
  options: FormatOptions
): string {
  let output = '';
  
  // Header
  output += formatHeader({
    title: result.isValid ? 'Validation Passed' : 'Validation Failed',
    icon: result.isValid ? '✅' : '❌',
    context: {
      'Profile': result.profile,
      'Duration': `${result.durationMs}ms`
    }
  });
  
  output += '\n';
  
  // Errors
  if (result.errors.length > 0) {
    output += chalk.red.bold('Errors:\n');
    for (const error of result.errors) {
      output += chalk.red(`  ❌ ${error.message}\n`);
      if (error.node) output += chalk.dim(`     Node: ${error.node}\n`);
      if (error.field) output += chalk.dim(`     Field: ${error.field}\n`);
    }
    output += '\n';
  }
  
  // Warnings
  if (result.warnings.length > 0) {
    output += chalk.yellow.bold('Warnings:\n');
    for (const warning of result.warnings) {
      output += chalk.yellow(`  ⚠️  ${warning.message}\n`);
    }
    output += '\n';
  }
  
  // Summary
  output += formatSummary({
    total: result.errors.length + result.warnings.length,
    failed: result.errors.length,
    warnings: result.warnings.length
  });
  
  return output;
}
```

## Dependencies

```json
{
  "dependencies": {
    "cli-table3": "^0.6.3",
    "chalk": "^5.3.0"
  }
}
```

## Color Theme

```typescript
// src/core/formatters/theme.ts
import chalk from 'chalk';

export const theme = {
  // Status
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  
  // UI
  header: chalk.cyan.bold,
  border: chalk.gray,
  dim: chalk.dim,
  
  // Data
  key: chalk.cyan,
  value: chalk.white,
  number: chalk.yellow,
  
  // Commands
  command: chalk.white,
  flag: chalk.green,
  argument: chalk.yellow,
};
```

## Testing Formatters

```typescript
// tests/formatters/table.test.ts
import { formatTable, formatters } from '../../src/core/formatters/table.js';

describe('formatTable', () => {
  it('should render basic table', () => {
    const data = [
      { name: 'Webhook', type: 'n8n-nodes-base.webhook' },
      { name: 'Slack', type: 'n8n-nodes-base.slack' },
    ];
    
    const output = formatTable(data, {
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'type', header: 'Type' },
      ],
    });
    
    expect(output).toContain('Webhook');
    expect(output).toContain('n8n-nodes-base.webhook');
  });
  
  it('should truncate with indicator', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    
    const output = formatTable(data, {
      columns: [{ key: 'id', header: 'ID' }],
      limit: 5,
    });
    
    expect(output).toContain('showing 5 of 20');
  });
});
```
