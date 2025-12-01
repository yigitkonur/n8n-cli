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
  /** Active count (for workflows) */
  active?: number;
  /** Inactive count */
  inactive?: number;
  /** Timing in ms */
  durationMs?: number;
  /** Additional stats */
  [key: string]: number | string | undefined;
}

/**
 * Format summary stats line
 * 
 * Example output:
 * 📊 Summary: 198 total | 10 displayed | 190 success (96.0%) | 8 failed | ⏱️ 243ms
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
  
  // Active/Inactive for workflows
  if (stats.active !== undefined || stats.inactive !== undefined) {
    if (stats.active !== undefined && stats.active > 0) {
      parts.push(chalk.green(`${stats.active} active`));
    }
    if (stats.inactive !== undefined && stats.inactive > 0) {
      parts.push(chalk.dim(`${stats.inactive} inactive`));
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
  
  // Timing
  if (stats.durationMs !== undefined) {
    const timing = stats.durationMs < 1000 
      ? `${stats.durationMs}ms` 
      : `${(stats.durationMs / 1000).toFixed(1)}s`;
    parts.push(chalk.dim(`⏱️ ${timing}`));
  }
  
  if (parts.length === 0) {
    return '';
  }
  
  return chalk.blue('📊 Summary: ') + parts.join(' | ');
}

/**
 * Format health indicator based on stats
 */
export function formatHealthIndicator(stats: { failed?: number; warnings?: number; total?: number }): string {
  if (!stats.total || stats.total === 0) {
    return '';
  }
  
  const failRate = ((stats.failed || 0) / stats.total) * 100;
  const warnRate = ((stats.warnings || 0) / stats.total) * 100;
  
  if (failRate > 10) {
    return chalk.red(`\n⚠️  Health: Critical - ${stats.failed} failures require attention`);
  } else if (failRate > 0 || warnRate > 20) {
    return chalk.yellow(`\n⚠️  Health: Warning - Review ${stats.failed || 0} failures, ${stats.warnings || 0} warnings`);
  } 
    return chalk.green(`\n✅ Health: Good - All resources operating normally`);
  
}
