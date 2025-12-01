/**
 * API Retry Logic
 * Provides retry functionality with exponential backoff for API calls
 */

import pRetry, { AbortError } from 'p-retry';
import { debug } from '../debug.js';
import { 
  N8nApiError, 
  N8nAuthenticationError, 
  N8nValidationError,
  N8nRateLimitError,
  N8nConnectionError,
} from '../../utils/errors.js';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Number of retry attempts (default: 3) */
  retries?: number;
  
  /** Minimum timeout in ms (default: 1000) */
  minTimeout?: number;
  
  /** Maximum timeout in ms (default: 10000) */
  maxTimeout?: number;
  
  /** Randomization factor (default: 0.25) */
  factor?: number;
  
  /** Callback for retry attempts (for logging) */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Default retry options
 */
const defaultOptions: Required<RetryOptions> = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 10000,
  factor: 2,
  onRetry: (error, attempt) => {
    debug('api', `Retry attempt ${attempt}: ${error.message}`);
  },
};

/**
 * Check if an error is retryable
 * Only network errors and rate limits should be retried
 * Authentication and validation errors should NOT be retried
 */
export function isRetryableError(error: unknown): boolean {
  // Don't retry authentication errors
  if (error instanceof N8nAuthenticationError) {
    return false;
  }
  
  // Don't retry validation errors
  if (error instanceof N8nValidationError) {
    return false;
  }
  
  // Retry rate limit errors (with backoff)
  if (error instanceof N8nRateLimitError) {
    return true;
  }
  
  // Retry connection errors
  if (error instanceof N8nConnectionError) {
    return true;
  }
  
  // Check for generic N8nApiError codes
  if (error instanceof N8nApiError) {
    const retryableCodes = [
      'CONNECTION_ERROR',
      'NO_RESPONSE',
      'RATE_LIMIT_ERROR',
      'REQUEST_ERROR',
    ];
    return retryableCodes.includes(error.code || '');
  }
  
  // Check for network-related errors by message
  if (error instanceof Error) {
    const networkErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'socket hang up',
      'network',
    ];
    const message = error.message.toLowerCase();
    return networkErrors.some(e => message.includes(e.toLowerCase()));
  }
  
  return false;
}

/**
 * Execute a function with retry logic
 * Uses exponential backoff for transient failures
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Promise with the function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  
  return pRetry(
    async () => {
      try {
        return await fn();
      } catch (error) {
        // Wrap non-retryable errors to stop retrying
        if (!isRetryableError(error)) {
          throw new AbortError(error instanceof Error ? error.message : String(error));
        }
        throw error;
      }
    },
    {
      retries: opts.retries,
      minTimeout: opts.minTimeout,
      maxTimeout: opts.maxTimeout,
      factor: opts.factor,
      onFailedAttempt: (error: { attemptNumber: number } & Error) => {
        if (opts.onRetry) {
          opts.onRetry(error, error.attemptNumber);
        }
      },
    }
  );
}

/**
 * Create a retryable version of an async function
 * 
 * @param fn - Async function to wrap
 * @param options - Retry configuration
 * @returns Wrapped function with retry logic
 */
export function retryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return withRetry(() => fn(...args), options);
  }) as T;
}
