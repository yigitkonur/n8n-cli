/**
 * n8n API Error Classes
 * Copied from n8n-mcp/src/utils/n8n-errors.ts
 * Modified: Removed MCP logger dependency, using console for CLI
 */

import chalk from 'chalk';

// Custom error classes for n8n API operations

export class N8nApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'N8nApiError';
  }
}

export class N8nAuthenticationError extends N8nApiError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'N8nAuthenticationError';
  }
}

export class N8nNotFoundError extends N8nApiError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'N8nNotFoundError';
  }
}

export class N8nValidationError extends N8nApiError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'N8nValidationError';
  }
}

export class N8nRateLimitError extends N8nApiError {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds`
      : 'Rate limit exceeded';
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'N8nRateLimitError';
  }
}

export class N8nServerError extends N8nApiError {
  constructor(message = 'Internal server error', statusCode = 500) {
    super(message, statusCode, 'SERVER_ERROR');
    this.name = 'N8nServerError';
  }
}

export class N8nConnectionError extends N8nApiError {
  constructor(message = 'Unable to connect to n8n server') {
    super(message, undefined, 'CONNECTION_ERROR');
    this.name = 'N8nConnectionError';
  }
}

// Error handling utility
export function handleN8nApiError(error: unknown): N8nApiError {
  if (error instanceof N8nApiError) {
    return error;
  }

  if (error instanceof Error) {
    // Check if it's an Axios error
    const axiosError = error as any;
    if (axiosError.response) {
      const { status, data } = axiosError.response;
      const message = data?.message || axiosError.message;

      switch (status) {
        case 401:
          return new N8nAuthenticationError(message);
        case 404:
          return new N8nNotFoundError('Resource', message);
        case 400:
          return new N8nValidationError(message, data);
        case 429:
          const retryAfter = axiosError.response.headers['retry-after'];
          return new N8nRateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
        default:
          if (status >= 500) {
            return new N8nServerError(message, status);
          }
          return new N8nApiError(message, status, 'API_ERROR', data);
      }
    } else if (axiosError.request) {
      // Request was made but no response received
      return new N8nConnectionError('No response from n8n server. Is it running?');
    } else if (axiosError.code === 'ECONNREFUSED') {
      return new N8nConnectionError('Connection refused. Check N8N_HOST setting.');
    } else {
      // Something happened in setting up the request
      return new N8nApiError(axiosError.message, undefined, 'REQUEST_ERROR');
    }
  }

  // Unknown error type
  return new N8nApiError('Unknown error occurred', undefined, 'UNKNOWN_ERROR', error);
}

/**
 * Format execution error message with guidance
 */
export function formatExecutionError(executionId: string, workflowId?: string): string {
  const workflowPrefix = workflowId ? `Workflow ${workflowId} execution ` : 'Execution ';
  return `${workflowPrefix}${executionId} failed. Run: n8n executions get ${executionId}`;
}

/**
 * Format error message when no execution ID is available
 */
export function formatNoExecutionError(): string {
  return "Workflow failed. Run: n8n executions list --status error";
}

// Utility to extract user-friendly error messages
export function getUserFriendlyErrorMessage(error: N8nApiError): string {
  switch (error.code) {
    case 'AUTHENTICATION_ERROR':
      return 'Failed to authenticate with n8n. Check your N8N_API_KEY.';
    case 'NOT_FOUND':
      return error.message;
    case 'VALIDATION_ERROR':
      return `Invalid request: ${error.message}`;
    case 'RATE_LIMIT_ERROR':
      return 'Too many requests. Please wait a moment and try again.';
    case 'CONNECTION_ERROR':
    case 'NO_RESPONSE':
      return 'Unable to connect to n8n. Check N8N_HOST and ensure n8n is running.';
    case 'SERVER_ERROR':
      return error.message || 'n8n server error occurred';
    default:
      return error.message || 'An unexpected error occurred';
  }
}

/**
 * Print error to console with formatting
 */
export function printError(error: N8nApiError, verbose = false): void {
  const friendlyMessage = getUserFriendlyErrorMessage(error);
  console.error(chalk.red(`\n❌ ${friendlyMessage}`));
  
  if (verbose) {
    console.error(chalk.dim(`\n   Code: ${error.code || 'unknown'}`));
    if (error.statusCode) {
      console.error(chalk.dim(`   Status: ${error.statusCode}`));
    }
    if (error.details) {
      console.error(chalk.dim(`   Details: ${JSON.stringify(error.details, null, 2)}`));
    }
  }
}

/**
 * Log error for debugging (only in debug mode)
 */
export function logError(error: N8nApiError, context?: string): void {
  if (process.env.N8N_DEBUG === 'true') {
    console.error(chalk.dim(`[DEBUG] ${context || 'Error'}:`), {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
  }
}
