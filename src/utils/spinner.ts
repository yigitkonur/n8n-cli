/**
 * Spinner Utility
 * Wraps ora for consistent spinner behavior across the CLI
 * Supports quiet mode, delay threshold, and TTY detection
 */

import ora, { type Ora } from 'ora';
import chalk from 'chalk';
import type { GlobalOptions } from '../types/global-options.js';
import { isQuiet, isTTY } from './output.js';

/**
 * Spinner options
 */
export interface SpinnerOptions {
  /** Text to show while spinning */
  text?: string;
  
  /** Delay in ms before showing spinner (default: 200) */
  delay?: number;
  
  /** Spinner type (default: 'dots') */
  spinner?: 'dots' | 'line' | 'arc' | 'bouncingBar';
  
  /** Global options for quiet mode detection */
  globalOpts?: GlobalOptions;
}

/**
 * Result of a spinner operation
 */
export interface SpinnerResult<T> {
  /** The result value */
  value: T;
  
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Create a managed spinner
 */
export function createSpinner(text: string, opts?: SpinnerOptions): Ora | null {
  // Skip spinner in quiet mode or non-TTY
  if (isQuiet(opts?.globalOpts) || !isTTY()) {
    return null;
  }
  
  return ora({
    text,
    spinner: opts?.spinner || 'dots',
  });
}

/**
 * Start a spinner with optional delay
 * Returns null if in quiet mode or non-TTY
 */
export function startSpinner(text: string, opts?: SpinnerOptions): Ora | null {
  const spinner = createSpinner(text, opts);
  if (!spinner) return null;
  
  const delay = opts?.delay ?? 200;
  
  if (delay > 0) {
    // Delay start to avoid flicker on fast operations
    setTimeout(() => {
      if (!spinner.isSpinning) {
        spinner.start();
      }
    }, delay);
    return spinner;
  }
  
  return spinner.start();
}

/**
 * Execute an async function with a spinner
 * Spinner only shows if operation takes longer than delay threshold
 * 
 * @param text - Text to show while spinning
 * @param fn - Async function to execute
 * @param opts - Spinner options
 * @returns Result with value and duration
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  opts?: SpinnerOptions
): Promise<SpinnerResult<T>> {
  const startTime = performance.now();
  const delay = opts?.delay ?? 200;
  
  // Skip spinner in quiet mode or non-TTY
  if (isQuiet(opts?.globalOpts) || !isTTY()) {
    const value = await fn();
    return { value, duration: performance.now() - startTime };
  }
  
  const spinner = ora({
    text,
    spinner: opts?.spinner || 'dots',
  });
  
  // Start spinner after delay
  let spinnerStarted = false;
  const timeoutId = setTimeout(() => {
    spinner.start();
    spinnerStarted = true;
  }, delay);
  
  try {
    const value = await fn();
    const duration = performance.now() - startTime;
    
    clearTimeout(timeoutId);
    
    if (spinnerStarted) {
      spinner.succeed(chalk.green(`${text} ✓`));
    }
    
    return { value, duration };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (spinnerStarted) {
      spinner.fail(chalk.red(`${text} ✗`));
    }
    
    throw error;
  }
}

/**
 * Execute multiple async operations with a single spinner
 * Shows progress as "text (1/3)"
 */
export async function withProgressSpinner<T>(
  text: string,
  items: T[],
  fn: (item: T, index: number) => Promise<void>,
  opts?: SpinnerOptions
): Promise<{ succeeded: number; failed: number; duration: number }> {
  const startTime = performance.now();
  const total = items.length;
  
  // Skip spinner in quiet mode or non-TTY
  if (isQuiet(opts?.globalOpts) || !isTTY()) {
    let succeeded = 0;
    let failed = 0;
    
    for (let i = 0; i < items.length; i++) {
      try {
        await fn(items[i], i);
        succeeded++;
      } catch {
        failed++;
      }
    }
    
    return { succeeded, failed, duration: performance.now() - startTime };
  }
  
  const spinner = ora({
    text: `${text} (0/${total})`,
    spinner: opts?.spinner || 'dots',
  }).start();
  
  let succeeded = 0;
  let failed = 0;
  
  for (let i = 0; i < items.length; i++) {
    spinner.text = `${text} (${i + 1}/${total})`;
    
    try {
      await fn(items[i], i);
      succeeded++;
    } catch {
      failed++;
    }
  }
  
  const duration = performance.now() - startTime;
  
  if (failed === 0) {
    spinner.succeed(chalk.green(`${text} - ${succeeded} completed ✓`));
  } else if (succeeded === 0) {
    spinner.fail(chalk.red(`${text} - ${failed} failed ✗`));
  } else {
    spinner.warn(chalk.yellow(`${text} - ${succeeded} succeeded, ${failed} failed`));
  }
  
  return { succeeded, failed, duration };
}

/**
 * Simple spinner methods for manual control
 */
export const spinner = {
  /** Start a spinner */
  start: startSpinner,
  
  /** Stop spinner with success */
  succeed: (s: Ora | null, text?: string) => {
    if (s) s.succeed(text ? chalk.green(text) : undefined);
  },
  
  /** Stop spinner with failure */
  fail: (s: Ora | null, text?: string) => {
    if (s) s.fail(text ? chalk.red(text) : undefined);
  },
  
  /** Stop spinner with warning */
  warn: (s: Ora | null, text?: string) => {
    if (s) s.warn(text ? chalk.yellow(text) : undefined);
  },
  
  /** Stop spinner with info */
  info: (s: Ora | null, text?: string) => {
    if (s) s.info(text ? chalk.blue(text) : undefined);
  },
  
  /** Stop and clear spinner */
  stop: (s: Ora | null) => {
    if (s) s.stop();
  },
  
  /** Update spinner text */
  text: (s: Ora | null, text: string) => {
    if (s) s.text = text;
  },
};
