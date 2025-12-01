/**
 * Interactive Prompts Utility
 * Task 02: Confirmation Prompts for Destructive Operations
 */

import * as readline from 'node:readline';
import { spawn } from 'node:child_process';
import chalk from 'chalk';

/**
 * Options for confirmation prompt
 */
export interface ConfirmOptions {
  /** Default to 'no' if user just presses Enter */
  defaultNo?: boolean;
  /** Skip prompt if true (for --force flag) */
  force?: boolean;
}

/**
 * Check if running in interactive mode (TTY)
 */
export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY);
}

/**
 * Check if running in non-interactive mode (CI, agents, piped input)
 * More comprehensive than just !isInteractive()
 */
export function isNonInteractive(): boolean {
  // Check for common CI environment variables
  const ciEnvVars = [
    'CI',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'JENKINS_URL',
    'TRAVIS',
    'CIRCLECI',
    'BUILDKITE',
    'DRONE',
    'TF_BUILD', // Azure DevOps
  ];
  
  const isCI = ciEnvVars.some(envVar => process.env[envVar]);
  const noTTY = !process.stdin.isTTY;
  const dumbTerminal = process.env.TERM === 'dumb';
  
  return isCI || noTTY || dumbTerminal;
}

/**
 * Open a URL in the default browser
 * Cross-platform: macOS (open), Windows (start), Linux (xdg-open)
 */
export function openBrowser(url: string): boolean {
  try {
    let command: string;
    let args: string[];
    
    switch (process.platform) {
      case 'darwin':
        command = 'open';
        args = [url];
        break;
      case 'win32':
        command = 'cmd';
        args = ['/c', 'start', '', url];
        break;
      default: // Linux and others
        command = 'xdg-open';
        args = [url];
        break;
    }
    
    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
    });
    
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/**
 * Prompt for a single line of input
 * @param message - Prompt message
 * @param defaultValue - Optional default value shown in brackets
 */
export function promptInput(
  message: string,
  defaultValue?: string
): Promise<string> {
  if (isNonInteractive()) {
    throw new Error(
      'Cannot prompt for input in non-interactive mode.\n' +
      'Provide required values via command-line flags or environment variables.'
    );
  }
  
  const defaultHint = defaultValue ? ` [${defaultValue}]` : '';
  const prompt = `${message}${defaultHint}: `;
  
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.on('SIGINT', () => {
      rl.close();
      console.log(chalk.yellow('\nAborted.'));
      process.exit(1);
    });
    
    rl.question(chalk.cyan(prompt), (answer) => {
      rl.close();
      const value = answer.trim() || defaultValue || '';
      resolve(value);
    });
  });
}

/**
 * Prompt user for confirmation
 * 
 * @param message - The message to display
 * @param options - Prompt options
 * @returns Promise<boolean> - true if user confirms, false otherwise
 * 
 * Behavior:
 * - If --force is set, returns true immediately
 * - If not TTY and no --force, throws error (prevents accidental automation)
 * - In TTY mode, shows prompt and waits for y/n
 */
export function confirmAction(
  message: string, 
  options: ConfirmOptions = {}
): Promise<boolean> {
  const { defaultNo = true, force = false } = options;
  
  // Skip prompt if force flag is set
  if (force) {
    return Promise.resolve(true);
  }
  
  // Error in non-interactive mode without force
  if (!isInteractive()) {
    throw new Error(
      'Cannot prompt for confirmation in non-interactive mode.\n' +
      'Use --force or --yes to proceed without confirmation.'
    );
  }
  
  const defaultHint = defaultNo ? '[y/N]' : '[Y/n]';
  const prompt = `${message} ${defaultHint}: `;
  
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Handle Ctrl+C during prompt
    rl.on('SIGINT', () => {
      rl.close();
      console.log(chalk.yellow('\nAborted.'));
      resolve(false);
    });
    
    rl.question(chalk.yellow(prompt), (answer) => {
      rl.close();
      
      const normalized = answer.trim().toLowerCase();
      
      // Empty answer = use default
      if (normalized === '') {
        resolve(!defaultNo);
        return;
      }
      
      // Check for yes
      if (normalized === 'y' || normalized === 'yes') {
        resolve(true);
        return;
      }
      
      // Anything else is no
      resolve(false);
    });
  });
}

/**
 * Require typed confirmation for dangerous operations
 * User must type the exact expected text to confirm
 * 
 * @param prompt - The prompt message (should include what to type)
 * @param expectedText - The exact text the user must type
 * @returns Promise<boolean> - true if user typed correctly
 */
export function requireTypedConfirmation(
  prompt: string,
  expectedText: string
): Promise<boolean> {
  // Error in non-interactive mode
  if (isNonInteractive()) {
    throw new Error(
      'Typed confirmation required but running in non-interactive mode.\n' +
      'Use --force or --yes to proceed without confirmation.'
    );
  }
  
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Handle Ctrl+C during prompt
    rl.on('SIGINT', () => {
      rl.close();
      console.log(chalk.yellow('\nAborted.'));
      resolve(false);
    });
    
    rl.question(chalk.yellow(prompt), (answer) => {
      rl.close();
      
      const typed = answer.trim();
      
      if (typed === expectedText) {
        resolve(true);
      } else {
        console.log(chalk.red(`Expected "${expectedText}", got "${typed}". Operation cancelled.`));
        resolve(false);
      }
    });
  });
}

/**
 * Display a summary of changes before confirmation
 */
export function displayChangeSummary(changes: {
  action: string;
  target: string;
  details?: string[];
}): void {
  console.log('');
  console.log(chalk.yellow(`⚠️  ${changes.action}`));
  console.log(chalk.dim(`   Target: ${changes.target}`));
  
  if (changes.details && changes.details.length > 0) {
    console.log(chalk.dim('   Changes:'));
    changes.details.slice(0, 5).forEach((detail) => {
      console.log(chalk.dim(`     • ${detail}`));
    });
    if (changes.details.length > 5) {
      console.log(chalk.dim(`     ... and ${changes.details.length - 5} more`));
    }
  }
  console.log('');
}
