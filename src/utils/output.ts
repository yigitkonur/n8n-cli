/**
 * Output Context Utilities
 * Handles verbose/quiet/color modes for CLI output
 */

import chalk from 'chalk';
import type { GlobalOptions } from '../types/global-options.js';

// Chalk type for our context
type ChalkLike = typeof chalk;

/**
 * Output context that respects global options
 */
export interface OutputContext {
  /** Whether verbose mode is enabled */
  verbose: boolean;
  
  /** Whether quiet mode is enabled */
  quiet: boolean;
  
  /** Whether colors are enabled */
  colors: boolean;
  
  /** Chalk instance (may have colors disabled) */
  chalk: ChalkLike;
  
  /** Log to stdout (respects quiet mode) */
  log: (...args: unknown[]) => void;
  
  /** Log to stderr (always prints) */
  error: (...args: unknown[]) => void;
  
  /** Log debug info (only in verbose mode) */
  debug: (message: string, ...args: unknown[]) => void;
  
  /** Log info (respects quiet mode) */
  info: (message: string) => void;
  
  /** Log success message (respects quiet mode) */
  success: (message: string) => void;
  
  /** Log warning (always prints) */
  warn: (message: string) => void;
}

/**
 * No-op function for suppressed output
 */
 
const noop = () => {};

/**
 * Check if colors should be used
 * Respects NO_COLOR env var and --no-color flag
 */
export function shouldUseColor(opts?: GlobalOptions): boolean {
  // NO_COLOR environment variable takes precedence (standard)
  if (process.env.NO_COLOR) {
    return false;
  }
  
  // Check CLI flag
  if (opts?.noColor) {
    return false;
  }
  
  // Check if stdout is a TTY
  if (!process.stdout.isTTY) {
    return false;
  }
  
  return true;
}

/**
 * Check if verbose mode is enabled
 */
export function isVerbose(opts?: GlobalOptions): boolean {
  return opts?.verbose === true || process.env.N8N_DEBUG === 'true';
}

/**
 * Check if quiet mode is enabled
 */
export function isQuiet(opts?: GlobalOptions): boolean {
  return opts?.quiet === true;
}

/**
 * Create an output context based on global options
 * Use this in command handlers for consistent output handling
 */
export function createOutputContext(opts?: GlobalOptions): OutputContext {
  const verbose = isVerbose(opts);
  const quiet = isQuiet(opts);
  const colors = shouldUseColor(opts);
  
  // Use chalk directly - colors are disabled globally via disableColors() if needed
  // In Chalk v5, we can't create new instances, so we rely on global level
  const chalkInstance = chalk;
  
  return {
    verbose,
    quiet,
    colors,
    chalk: chalkInstance,
    
    // Standard log (respects quiet mode)
    log: quiet ? noop : (...args: unknown[]) => console.log(...args),
    
    // Error log (always prints)
    error: (...args: unknown[]) => console.error(...args),
    
    // Debug log (only in verbose mode)
    debug: verbose 
      ? (message: string, ...args: unknown[]) => {
          const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
          console.warn(chalkInstance.dim(`[${timestamp}] ${message}`), ...args);
        }
      : noop,
    
    // Info log (respects quiet mode)
    info: quiet 
      ? noop 
      : (message: string) => console.log(chalkInstance.blue(`ℹ ${message}`)),
    
    // Success log (respects quiet mode)
    success: quiet 
      ? noop 
      : (message: string) => console.log(chalkInstance.green(`✓ ${message}`)),
    
    // Warning log (always prints)
    warn: (message: string) => console.warn(chalkInstance.yellow(`⚠ ${message}`)),
  };
}

/**
 * Disable colors globally
 * Call this early in CLI startup if --no-color is set
 */
export function disableColors(): void {
  process.env.NO_COLOR = '1';
  chalk.level = 0;
}

/**
 * Get terminal width with fallback
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * Check if running in a TTY (interactive terminal)
 */
export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY);
}
