import Table from 'cli-table3';
import chalk from 'chalk';

/**
 * Column definition for tables
 */
export interface TableColumn<T = unknown> {
  /** Key in the data object */
  key: string;
  /** Column header text */
  header: string;
  /** Optional fixed width */
  width?: number;
  /** Minimum width for auto-sizing */
  minWidth?: number;
  /** Weight for proportional sizing (default: 1) */
  weight?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom formatter function */
  formatter?: (value: T) => string;
}

/**
 * Table formatting options
 */
export interface TableOptions {
  /** Column definitions */
  columns: TableColumn[];
  /** Maximum rows to display (default: 10) */
  limit?: number;
  /** Show row index column */
  showIndex?: boolean;
  /** Auto-adjust columns to terminal width (default: true) */
  autoWidth?: boolean;
  /** Compact mode (reduced padding) */
  compact?: boolean;
}

/**
 * Get terminal width with fallback
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * Calculate column widths based on terminal size
 * Distributes available space proportionally
 */
export function calculateColumnWidths(
  columns: TableColumn[],
  options: { showIndex?: boolean; compact?: boolean } = {}
): (number | null)[] {
  const termWidth = getTerminalWidth();
  const { showIndex = false, compact = false } = options;
  
  // Account for table borders and padding
  // Each cell has: | padding content padding |
  const borderChars = columns.length + 1; // Vertical bars
  const paddingPerCell = compact ? 1 : 2; // Chars on each side
  const totalPadding = columns.length * paddingPerCell * 2;
  const indexColumnWidth = showIndex ? 4 : 0;
  
  const availableWidth = termWidth - borderChars - totalPadding - indexColumnWidth;
  
  // Calculate weights
  const totalWeight = columns.reduce((sum, col) => sum + (col.weight ?? 1), 0);
  
  // Calculate widths
  const widths = columns.map(col => {
    // If column has fixed width, use it
    if (col.width) {
      return col.width;
    }
    
    // Calculate proportional width
    const weight = col.weight ?? 1;
    const proportionalWidth = Math.floor((availableWidth * weight) / totalWeight);
    
    // Apply minimum width
    const minWidth = col.minWidth ?? 8;
    return Math.max(proportionalWidth, minWidth);
  });
  
  return showIndex ? [4, ...widths] : widths;
}

/**
 * Format data as a CLI table with truncation
 */
export function formatTable<T extends Record<string, unknown>>(
  data: T[],
  options: TableOptions
): string {
  const { columns, limit = 10, showIndex = false, autoWidth = true, compact = false } = options;
  
  // Truncate data if limit specified
  const displayLimit = limit > 0 ? limit : data.length;
  const displayData = data.slice(0, displayLimit);
  const truncated = data.length > displayLimit;
  
  // Build headers
  const headers = showIndex 
    ? ['#', ...columns.map(c => c.header)]
    : columns.map(c => c.header);
  
  // Calculate column widths
  const colWidths = autoWidth 
    ? calculateColumnWidths(columns, { showIndex, compact })
    : showIndex 
      ? [4, ...columns.map(c => c.width ?? null)]
      : columns.map(c => c.width ?? null);
  
  // Build table
  const table = new Table({
    head: headers.map(h => chalk.bold.cyan(h)),
    style: {
      head: [],
      border: ['gray'],
      'padding-left': compact ? 1 : 1,
      'padding-right': compact ? 1 : 1,
    },
    chars: compact 
      ? {
          'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
          'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
          'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
          'right': '', 'right-mid': '', 'middle': ' '
        }
      : {
          'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
          'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
          'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
          'right': '│', 'right-mid': '┤', 'middle': '│'
        },
    colWidths: colWidths as (number | null)[],
    colAligns: showIndex
      ? ['right', ...columns.map(c => c.align || 'left')]
      : columns.map(c => c.align || 'left'),
    wordWrap: true,
  });
  
  // Add rows
  for (let i = 0; i < displayData.length; i++) {
    const item = displayData[i];
    const row = columns.map(col => {
      const value = item[col.key];
      if (col.formatter) {
        return col.formatter(value);
      }
      if (value === null || value === undefined) {
        return chalk.dim('-');
      }
      return String(value);
    });
    
    if (showIndex) {
      table.push([chalk.dim(String(i + 1)), ...row]);
    } else {
      table.push(row);
    }
  }
  
  let output = table.toString();
  
  // Add truncation notice with guidance
  if (truncated) {
    const remaining = data.length - displayLimit;
    output += chalk.dim(`\n... and ${remaining} more (showing ${displayLimit} of ${data.length})`);
    output += chalk.dim('\n   • Use --limit 0 for all results');
    output += chalk.dim('\n   • Use --save <file>.json for complete dataset + jq filtering');
  }
  
  return output;
}

/**
 * Common formatters for table columns
 */
export const columnFormatters = {
  /** Format boolean as check/cross */
  boolean: (value: unknown): string => {
    return value ? chalk.green('✓') : chalk.red('✗');
  },
  
  /** Format number with color */
  number: (value: unknown): string => {
    return chalk.yellow(String(value ?? 0));
  },
  
  /** Format score (0-100) with color */
  score: (value: unknown): string => {
    const num = Number(value) || 0;
    if (num >= 80) return chalk.green(num.toFixed(1));
    if (num >= 50) return chalk.yellow(num.toFixed(1));
    return chalk.red(num.toFixed(1));
  },
  
  /** Format relative time */
  relativeTime: (value: unknown): string => {
    if (!value) return chalk.dim('-');
    const date = new Date(String(value));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  },
  
  /** Format duration in ms */
  duration: (value: unknown): string => {
    const ms = Number(value) || 0;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  },
  
  /** Truncate long text */
  truncate: (maxLen: number) => (value: unknown): string => {
    const str = String(value ?? '');
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
  },
  
  /** Format execution status */
  executionStatus: (value: unknown): string => {
    switch (value) {
      case 'success': return chalk.green('✓ success');
      case 'error': return chalk.red('✗ error');
      case 'waiting': return chalk.yellow('⊘ waiting');
      case 'running': return chalk.blue('▶ running');
      default: return chalk.dim(String(value ?? '-'));
    }
  },
};
