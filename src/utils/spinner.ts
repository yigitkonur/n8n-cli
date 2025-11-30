import ora, { Ora } from 'ora';

/**
 * Spinner wrapper for async operations
 */

let currentSpinner: Ora | null = null;

/**
 * Start a spinner with message
 */
export function startSpinner(message: string): Ora {
  // Stop any existing spinner
  if (currentSpinner) {
    currentSpinner.stop();
  }
  
  currentSpinner = ora({
    text: message,
    spinner: 'dots',
  }).start();
  
  return currentSpinner;
}

/**
 * Stop spinner with success message
 */
export function succeedSpinner(message?: string): void {
  if (currentSpinner) {
    currentSpinner.succeed(message);
    currentSpinner = null;
  }
}

/**
 * Stop spinner with failure message
 */
export function failSpinner(message?: string): void {
  if (currentSpinner) {
    currentSpinner.fail(message);
    currentSpinner = null;
  }
}

/**
 * Stop spinner without message
 */
export function stopSpinner(): void {
  if (currentSpinner) {
    currentSpinner.stop();
    currentSpinner = null;
  }
}

/**
 * Update spinner text
 */
export function updateSpinner(message: string): void {
  if (currentSpinner) {
    currentSpinner.text = message;
  }
}

/**
 * Run async operation with spinner
 */
export async function withSpinner<T>(
  message: string,
  operation: () => Promise<T>,
  options?: {
    successMessage?: string;
    failMessage?: string;
  }
): Promise<T> {
  const spinner = startSpinner(message);
  
  try {
    const result = await operation();
    spinner.succeed(options?.successMessage);
    return result;
  } catch (error) {
    spinner.fail(options?.failMessage);
    throw error;
  }
}
