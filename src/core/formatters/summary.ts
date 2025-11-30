import chalk from 'chalk';

/**
 * Summary statistics
 */
export interface SummaryStats {
  /** Total items */
  total?: number;
  /** Items displayed */
  displayed?: number;
  /** Successful items */
  success?: number;
  /** Failed items */
  failed?: number;
  /** Warning count */
  warnings?: number;
  /** Additional stats */
  [key: string]: number | string | undefined;
}

/**
 * Format summary stats line
 * 
 * Example output:
 * 📊 Summary: 198 total | 10 displayed | 190 success (96.0%) | 8 failed
 */
export function formatSummary(stats: SummaryStats): string {
  const parts: string[] = [];
  
  // Total count
  if (stats.total !== undefined) {
    if (stats.displayed !== undefined && stats.displayed < stats.total) {
      parts.push(`${stats.total} total`);
      parts.push(`${stats.displayed} shown`);
    } else {
      parts.push(`${stats.total} found`);
    }
  }
  
  // Success/failure rate
  if (stats.success !== undefined && stats.failed !== undefined) {
    const total = stats.success + stats.failed;
    if (total > 0) {
      const rate = ((stats.success / total) * 100).toFixed(1);
      parts.push(chalk.green(`${stats.success} success (${rate}%)`));
      if (stats.failed > 0) {
        parts.push(chalk.red(`${stats.failed} failed`));
      }
    }
  }
  
  // Warnings
  if (stats.warnings !== undefined && stats.warnings > 0) {
    parts.push(chalk.yellow(`${stats.warnings} warnings`));
  }
  
  if (parts.length === 0) {
    return '';
  }
  
  return chalk.blue('📊 Summary: ') + parts.join(' | ');
}

/**
 * Format a compact stats line
 */
export function formatCompactStats(items: Array<{ label: string; value: string | number; color?: 'success' | 'error' | 'warning' | 'info' }>): string {
  const colors = {
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
  };
  
  const formatted = items.map(item => {
    const colorFn = item.color ? colors[item.color] : chalk.white;
    return `${chalk.dim(item.label + ':')} ${colorFn(String(item.value))}`;
  });
  
  return formatted.join('  ');
}
