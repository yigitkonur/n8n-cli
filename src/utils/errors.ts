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
 * Get common causes for an error - helps LLMs understand root issues
 */
export function getErrorCauses(code: string | undefined): string[] {
  const causes: Record<string, string[]> = {
    AUTHENTICATION_ERROR: [
      'Your API key may be expired or revoked',
      'The API key lacks required permissions',
      'N8N_API_KEY environment variable is not set',
      'You\'re connecting to the wrong n8n instance',
    ],
    NOT_FOUND: [
      'The resource was recently deleted',
      'You\'re looking in the wrong context/instance',
      'The ID was mistyped or uses wrong format',
      'The resource exists but you lack read permissions',
    ],
    VALIDATION_ERROR: [
      'Required fields are missing in the request',
      'Field values don\'t match expected format',
      'Referenced resources (nodes, credentials) don\'t exist',
      'Workflow JSON structure is malformed',
    ],
    RATE_LIMIT_ERROR: [
      'Too many API requests in short period',
      'Batch operations exceeded quota',
      'Concurrent requests from multiple clients',
    ],
    CONNECTION_ERROR: [
      'n8n instance is not running',
      'Network connectivity issues',
      'Firewall blocking the connection',
      'N8N_HOST URL is incorrect',
    ],
    NO_RESPONSE: [
      'n8n instance is overloaded',
      'Network timeout occurred',
      'Request was too large to process',
    ],
    SERVER_ERROR: [
      'n8n internal error occurred',
      'Database connectivity issues on server',
      'Resource exhaustion on n8n instance',
    ],
  };
  
  return causes[code || ''] || [];
}

/**
 * Get suggested commands for error recovery
 */
export function getErrorSuggestions(code: string | undefined, commandContext?: string): string[] {
  const suggestions: Record<string, string[]> = {
    AUTHENTICATION_ERROR: [
      'n8n auth login                  # Configure credentials',
      'n8n auth status                 # Check current auth',
      'n8n health                      # Verify connection',
    ],
    NOT_FOUND: [
      ...(commandContext?.includes('workflow') ? [
        'n8n workflows list             # List available workflows',
        'n8n workflows list --limit 0   # List ALL workflows',
      ] : []),
      ...(commandContext?.includes('execution') ? [
        'n8n executions list            # List recent executions',
        'n8n executions list --status error  # Find failed ones',
      ] : []),
      ...(commandContext?.includes('node') ? [
        'n8n nodes search <query>       # Search for nodes',
        'n8n nodes search --mode FUZZY  # Fuzzy search for typos',
      ] : []),
      'n8n --help                      # See all commands',
    ],
    VALIDATION_ERROR: [
      'n8n workflows validate <id> --fix         # Auto-fix issues',
      'n8n workflows validate <id> --repair      # Repair malformed JSON',
      'n8n nodes search <node-name>              # Find correct node types',
    ],
    RATE_LIMIT_ERROR: [
      '# Wait 60 seconds and retry',
      '# Use --limit to reduce batch size',
    ],
    CONNECTION_ERROR: [
      'n8n health                      # Check connectivity',
      'n8n auth status                 # Verify configuration',
      'curl $N8N_HOST/healthz          # Direct health check',
    ],
    NO_RESPONSE: [
      'n8n health                      # Check connectivity',
      '# Verify n8n instance is running',
      '# Check n8n server resource usage',
    ],
    SERVER_ERROR: [
      'n8n health                      # Check instance status',
      '# Check n8n server logs for details',
      '# Retry in a few minutes',
    ],
  };
  
  return suggestions[code || ''] || [];
}

/**
 * Get documentation URL for error code
 */
export function getErrorDocsUrl(code: string | undefined): string {
  const baseUrl = 'https://github.com/yigitkonur/n8n-cli#troubleshooting';
  return code ? `${baseUrl}-${code.toLowerCase().replace(/_/g, '-')}` : baseUrl;
}

/**
 * Sanitize object for logging - removes sensitive values
 * Task 06: Consistent API Key Masking
 */
export function sanitizeForLogging(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging);
  }
  
  const sanitized: Record<string, unknown> = {};
  const sensitivePattern = /api[-_]?key|auth|token|secret|password|credential/i;
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (sensitivePattern.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Print error to console with formatting and actionable guidance
 * Follows LLM-first CLI design: descriptive, actionable, with causes and suggestions
 */
export function printError(error: N8nApiError, verbose = false, commandContext?: string): void {
  const friendlyMessage = getUserFriendlyErrorMessage(error);
  
  // Error header with code
  console.error(chalk.red(`\n❌ ${friendlyMessage}`));
  if (error.code) {
    console.error(chalk.dim(`   [${error.code}]${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`));
  }
  
  // "This usually means:" section - helps LLMs understand root causes
  const causes = getErrorCauses(error.code);
  if (causes.length > 0) {
    console.error(chalk.yellow('\n   This usually means:'));
    for (const cause of causes.slice(0, 4)) {
      console.error(chalk.dim(`   • ${cause}`));
    }
  }
  
  // "Try:" section with actionable commands
  const suggestions = getErrorSuggestions(error.code, commandContext);
  if (suggestions.length > 0) {
    console.error(chalk.cyan('\n   Try:'));
    for (const suggestion of suggestions) {
      console.error(chalk.white(`   ${suggestion}`));
    }
  }
  
  // Documentation link
  console.error(chalk.dim(`\n   Docs: ${getErrorDocsUrl(error.code)}`));
  
  // Verbose mode: additional technical details
  if (verbose) {
    console.error(chalk.dim('\n   Debug info:'));
    console.error(chalk.dim(`   Code: ${error.code || 'UNKNOWN'}`));
    if (error.statusCode) {
      console.error(chalk.dim(`   Status: ${error.statusCode}`));
    }
    if (error.details) {
      const sanitizedDetails = sanitizeForLogging(error.details);
      console.error(chalk.dim(`   Details: ${JSON.stringify(sanitizedDetails, null, 2)}`));
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
