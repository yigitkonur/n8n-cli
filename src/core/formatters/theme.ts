import chalk from 'chalk';

/**
 * Consistent color theme for CLI output
 */
export const theme = {
  // Status colors
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  
  // UI elements
  header: chalk.cyan.bold,
  border: chalk.gray,
  dim: chalk.dim,
  bold: chalk.bold,
  
  // Data display
  key: chalk.cyan,
  value: chalk.white,
  number: chalk.yellow,
  
  // Commands and code
  command: chalk.white,
  flag: chalk.green,
  argument: chalk.yellow,
  code: chalk.cyan,
  
  // Box drawing
  box: chalk.cyan,
};

/**
 * Status icons
 */
export const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  check: '✓',
  cross: '✗',
  notExecuted: '⊘',
  tip: '💡',
  summary: '📊',
  next: '⚡',
  search: '🔍',
  package: '📦',
  launch: '🚀',
  fix: '🔧',
  health: '🏥',
  debug: '🐛',
  rollback: '⏮️',
  workflow: '🔄',
  node: '📦',
  execution: '▶️',
  template: '📋',
  auth: '🔐',
  user: '👤',
  logout: '🚪',
  credential: '🔑',
  variable: '📝',
  tag: '🏷️',
  audit: '🛡️',
  retry: '🔄',
  delete: '🗑️',
};

/**
 * Format status with icon and color
 */
export function formatStatus(status: 'success' | 'error' | 'warning' | 'info', text: string): string {
  const icon = icons[status];
  const color = theme[status];
  return `${icon} ${color(text)}`;
}

/**
 * Format a boolean as colored check/cross
 */
export function formatBoolean(value: boolean): string {
  return value ? theme.success(icons.check) : theme.error(icons.cross);
}
