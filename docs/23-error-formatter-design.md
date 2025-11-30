# Error Formatter Design

## Overview

Consistent error handling and formatting across all CLI commands with actionable messages.

## MCP Source Reference

**COPY error taxonomy from:** `n8n-mcp/src/utils/n8n-errors.ts` (157 lines)

This file defines the canonical error codes used across the n8n ecosystem:
- `N8nApiError` - Base API error class
- `N8nAuthenticationError` (401) - Authentication failures
- `N8nNotFoundError` (404) - Resource not found
- `N8nValidationError` (400) - Validation failures
- `N8nRateLimitError` (429) - Rate limiting
- `N8nServerError` (500+) - Server errors

**Also reference:** `n8n-mcp/src/errors/validation-service-error.ts` (if exists) for validation-specific errors

**Reuse error codes** to maintain consistency with the n8n ecosystem.

## Architecture

```
src/core/formatters/
└── errors.ts         # Error formatting and CLI error classes
```

## Error Classes

```typescript
// src/core/formatters/errors.ts
import chalk from 'chalk';

/**
 * Base CLI error with formatting support
 */
export class CLIError extends Error {
  public readonly code: string;
  public readonly suggestions: string[];
  public readonly context: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code?: string;
      suggestions?: string[];
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'CLIError';
    this.code = options.code || 'CLI_ERROR';
    this.suggestions = options.suggestions || [];
    this.context = options.context || {};
    this.cause = options.cause;
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends CLIError {
  constructor(message: string, suggestions?: string[]) {
    super(message, {
      code: 'CONFIG_ERROR',
      suggestions: suggestions || [
        'Check your .n8nrc file',
        'Verify environment variables: N8N_API_URL, N8N_API_KEY',
        'Run: n8n health --mode diagnostic',
      ],
    });
    this.name = 'ConfigurationError';
  }
}

/**
 * API connection errors
 */
export class APIError extends CLIError {
  public readonly statusCode?: number;
  public readonly endpoint?: string;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      endpoint?: string;
      cause?: Error;
    } = {}
  ) {
    const suggestions = [];
    
    if (options.statusCode === 401) {
      suggestions.push('Check your N8N_API_KEY');
      suggestions.push('Verify API key has correct permissions');
    } else if (options.statusCode === 404) {
      suggestions.push('Verify the resource ID exists');
      suggestions.push('Check N8N_API_URL is correct');
    } else if (options.statusCode === 429) {
      suggestions.push('Rate limited - wait and retry');
    } else if (!options.statusCode) {
      suggestions.push('Check n8n instance is running');
      suggestions.push('Verify N8N_API_URL: ' + (options.endpoint || ''));
      suggestions.push('Run: n8n health');
    }

    super(message, {
      code: `API_${options.statusCode || 'CONNECTION'}_ERROR`,
      suggestions,
      cause: options.cause,
    });
    
    this.name = 'APIError';
    this.statusCode = options.statusCode;
    this.endpoint = options.endpoint;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends CLIError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    errors: Array<{ field: string; message: string }> = []
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      context: { errors },
    });
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * File I/O errors
 */
export class FileError extends CLIError {
  public readonly path: string;

  constructor(message: string, path: string, cause?: Error) {
    const suggestions = [];
    
    if (cause?.message?.includes('ENOENT')) {
      suggestions.push(`File not found: ${path}`);
      suggestions.push('Check the file path is correct');
    } else if (cause?.message?.includes('EACCES')) {
      suggestions.push('Permission denied');
      suggestions.push('Check file permissions');
    } else if (cause?.message?.includes('EISDIR')) {
      suggestions.push('Path is a directory, expected file');
    }

    super(message, {
      code: 'FILE_ERROR',
      suggestions,
      context: { path },
      cause,
    });
    
    this.name = 'FileError';
    this.path = path;
  }
}

/**
 * Database errors
 */
export class DatabaseError extends CLIError {
  constructor(message: string, cause?: Error) {
    super(message, {
      code: 'DB_ERROR',
      suggestions: [
        'Node database may be corrupted',
        'Try reinstalling: npm install -g n8n-cli',
        'Check data/nodes.db exists',
      ],
      cause,
    });
    this.name = 'DatabaseError';
  }
}
```

## Error Formatter

```typescript
// src/core/formatters/errors.ts (continued)

export interface FormatErrorOptions {
  verbose?: boolean;
  showStack?: boolean;
}

export function formatError(
  error: unknown,
  options: FormatErrorOptions = {}
): string {
  const { verbose = false, showStack = false } = options;
  
  // Handle CLIError
  if (error instanceof CLIError) {
    return formatCLIError(error, options);
  }
  
  // Handle standard Error
  if (error instanceof Error) {
    return formatStandardError(error, options);
  }
  
  // Handle unknown
  return chalk.red(`❌ Error: ${String(error)}\n`);
}

function formatCLIError(error: CLIError, options: FormatErrorOptions): string {
  let output = '';
  
  // Error header
  output += chalk.red(`❌ ${error.name}: ${error.message}\n`);
  
  // Error code
  output += chalk.dim(`   Code: ${error.code}\n`);
  
  // Context (verbose)
  if (options.verbose && Object.keys(error.context).length > 0) {
    output += chalk.dim('\n   Context:\n');
    for (const [key, value] of Object.entries(error.context)) {
      output += chalk.dim(`     ${key}: ${JSON.stringify(value)}\n`);
    }
  }
  
  // Suggestions
  if (error.suggestions.length > 0) {
    output += chalk.yellow('\n💡 Suggestions:\n');
    for (const suggestion of error.suggestions) {
      output += chalk.dim(`   • ${suggestion}\n`);
    }
  }
  
  // Stack trace (verbose + showStack)
  if (options.verbose && options.showStack && error.stack) {
    output += chalk.dim('\n   Stack trace:\n');
    output += chalk.dim(error.stack.split('\n').slice(1).map(l => '   ' + l).join('\n'));
  }
  
  // Cause chain
  if (error.cause instanceof Error) {
    output += chalk.dim(`\n   Caused by: ${error.cause.message}\n`);
  }
  
  return output;
}

function formatStandardError(error: Error, options: FormatErrorOptions): string {
  let output = chalk.red(`❌ Error: ${error.message}\n`);
  
  if (options.verbose && options.showStack && error.stack) {
    output += chalk.dim('\n   Stack trace:\n');
    output += chalk.dim(error.stack.split('\n').slice(1).map(l => '   ' + l).join('\n'));
  }
  
  return output;
}
```

## Error Output Examples

### API Connection Error

```
❌ APIError: Failed to connect to n8n instance
   Code: API_CONNECTION_ERROR

💡 Suggestions:
   • Check n8n instance is running
   • Verify N8N_API_URL: https://n8n.example.com
   • Run: n8n health
```

### Authentication Error

```
❌ APIError: Authentication failed
   Code: API_401_ERROR

💡 Suggestions:
   • Check your N8N_API_KEY
   • Verify API key has correct permissions
```

### Validation Error

```
❌ ValidationError: Workflow validation failed
   Code: VALIDATION_ERROR

   Errors:
     • parameters.url: URL is required
     • credentials: Invalid credential ID

💡 Suggestions:
   • Check the workflow JSON structure
   • Verify all required fields are present
```

### File Not Found

```
❌ FileError: Cannot read workflow file
   Code: FILE_ERROR

💡 Suggestions:
   • File not found: /path/to/workflow.json
   • Check the file path is correct
```

## Usage in Commands

```typescript
// In any command
async execute(): Promise<number> {
  try {
    // Command logic
    const workflow = await getWorkflow(this.id);
    return 0;
  } catch (error) {
    // CLIError will be formatted automatically by BaseCommand
    if (error instanceof APIError && error.statusCode === 404) {
      throw new CLIError(`Workflow not found: ${this.id}`, {
        code: 'WORKFLOW_NOT_FOUND',
        suggestions: [
          `Check the workflow ID is correct`,
          `Run: n8n workflows list`,
        ],
      });
    }
    throw error;
  }
}
```

## Error Recovery Patterns

```typescript
// Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      if (error instanceof APIError && error.statusCode === 429) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Unreachable');
}
```
