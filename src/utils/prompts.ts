/**
 * Interactive Prompts Utility
 * Task 02: Confirmation Prompts for Destructive Operations
 */

import * as readline from 'node:readline';
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
export async function confirmAction(
  message: string, 
  options: ConfirmOptions = {}
): Promise<boolean> {
  const { defaultNo = true, force = false } = options;
  
  // Skip prompt if force flag is set
  if (force) {
    return true;
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
