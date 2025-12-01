import chalk from 'chalk';

/**
 * Header options
 */
export interface HeaderOptions {
  /** Main title text */
  title: string;
  /** Optional icon prefix */
  icon?: string;
  /** Key-value context lines */
  context?: Record<string, string>;
  /** Show timestamp (default: true) */
  showTimestamp?: boolean;
  /** Optional host/source context */
  host?: string;
}

/**
 * Format a box-drawn header
 * 
 * Example output:
 * ╭─ 🔍 Nodes matching "webhook"
 * │  💡 Tip: Use --save webhook-nodes.json for complete dataset
 * │  🔍 Search mode: OR | Include examples: false
 * ╰─
 */
export function formatHeader(options: HeaderOptions): string {
  const { title, icon, context = {}, showTimestamp = true, host } = options;
  
  // Build title with optional host context
  let titleLine = icon ? `${icon} ${title}` : title;
  if (host) {
    titleLine += chalk.dim(` @ ${host}`);
  }
  
  let output = chalk.cyan(`╭─ ${titleLine}\n`);
  
  // Add timestamp if enabled
  if (showTimestamp) {
    const timestamp = `${new Date().toISOString().replace('T', ' ').slice(0, 19)  } UTC`;
    output += `${chalk.cyan('│  ') + chalk.dim(`Fetched: ${timestamp}`)  }\n`;
  }
  
  const contextEntries = Object.entries(context);
  if (contextEntries.length > 0) {
    for (const [key, value] of contextEntries) {
      output += `${chalk.cyan('│  ') + chalk.dim(`${key}: `) + value  }\n`;
    }
  }
  
  output += chalk.cyan('╰─');
  
  return output;
}

/**
 * Format a section divider
 */
export function formatDivider(title?: string): string {
  if (title) {
    return chalk.dim(`\n─── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}\n`);
  }
  return chalk.dim(`\n${  '─'.repeat(60)  }\n`);
}

/**
 * Format a simple title line
 */
export function formatTitle(title: string, icon?: string): string {
  const prefix = icon ? `${icon} ` : '';
  return chalk.bold(`${prefix}${title}`);
}
