/**
 * CLI Exit Codes
 * Based on POSIX sysexits.h standards for semantic exit codes
 * These enable scripting/automation with meaningful status checks
 */

/**
 * POSIX Exit Codes (sysexits.h)
 * @see https://man.freebsd.org/cgi/man.cgi?query=sysexits
 */
export enum ExitCode {
  /** Successful execution */
  SUCCESS = 0,
  
  /** General/unknown error (catch-all) */
  GENERAL = 1,
  
  /** Command line usage error (bad args, unknown command) */
  USAGE = 64,
  
  /** Data format error (invalid input, validation failure) */
  DATAERR = 65,
  
  /** Cannot open input file */
  NOINPUT = 66,
  
  /** Addressee unknown (user doesn't exist) */
  NOUSER = 67,
  
  /** Host name unknown */
  NOHOST = 68,
  
  /** Service unavailable */
  UNAVAILABLE = 69,
  
  /** Internal software error */
  SOFTWARE = 70,
  
  /** System error (OS-level) */
  OSERR = 71,
  
  /** Critical OS file missing */
  OSFILE = 72,
  
  /** Can't create output file */
  CANTCREAT = 73,
  
  /** I/O error (network, connection issues) */
  IOERR = 74,
  
  /** Temporary failure (rate limit, try again) */
  TEMPFAIL = 75,
  
  /** Protocol error (API/server errors) */
  PROTOCOL = 76,
  
  /** Permission denied (authentication error) */
  NOPERM = 77,
  
  /** Configuration error */
  CONFIG = 78,
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  /** Command line usage/syntax errors */
  USAGE = 'USAGE',
  /** Data format/validation errors */
  DATA = 'DATA',
  /** File I/O errors */
  IO = 'IO',
  /** Network/connection errors */
  NETWORK = 'NETWORK',
  /** Configuration errors */
  CONFIG = 'CONFIG',
  /** Internal software errors */
  INTERNAL = 'INTERNAL',
  /** Authentication/permission errors */
  AUTH = 'AUTH',
}

/**
 * Map error codes to exit codes
 */
const errorCodeToExitCode: Record<string, ExitCode> = {
  // Validation/input errors
  VALIDATION_ERROR: ExitCode.DATAERR,
  NOT_FOUND: ExitCode.DATAERR,
  INVALID_JSON: ExitCode.DATAERR,
  PARSE_ERROR: ExitCode.DATAERR,
  
  // File errors
  ENOENT: ExitCode.NOINPUT,
  FILE_NOT_FOUND: ExitCode.NOINPUT,
  EACCES: ExitCode.NOPERM,
  EPERM: ExitCode.NOPERM,
  
  // Authentication errors
  AUTHENTICATION_ERROR: ExitCode.NOPERM,
  UNAUTHORIZED: ExitCode.NOPERM,
  FORBIDDEN: ExitCode.NOPERM,
  
  // Network/connection errors
  CONNECTION_ERROR: ExitCode.UNAVAILABLE,
  NO_RESPONSE: ExitCode.UNAVAILABLE,
  REQUEST_ERROR: ExitCode.IOERR,
  ECONNREFUSED: ExitCode.UNAVAILABLE,
  ETIMEDOUT: ExitCode.UNAVAILABLE,
  ENOTFOUND: ExitCode.NOHOST,
  
  // Rate limiting
  RATE_LIMIT_ERROR: ExitCode.TEMPFAIL,
  TOO_MANY_REQUESTS: ExitCode.TEMPFAIL,
  
  // Server errors
  SERVER_ERROR: ExitCode.PROTOCOL,
  API_ERROR: ExitCode.PROTOCOL,
  INTERNAL_SERVER_ERROR: ExitCode.PROTOCOL,
  
  // Configuration
  CONFIG_ERROR: ExitCode.CONFIG,
  INVALID_CONFIG: ExitCode.CONFIG,
  
  // Unknown
  UNKNOWN_ERROR: ExitCode.GENERAL,
};

/**
 * Map ErrorCategory to ExitCode
 */
const categoryToExitCode: Record<ErrorCategory, ExitCode> = {
  [ErrorCategory.USAGE]: ExitCode.USAGE,
  [ErrorCategory.DATA]: ExitCode.DATAERR,
  [ErrorCategory.IO]: ExitCode.IOERR,
  [ErrorCategory.NETWORK]: ExitCode.UNAVAILABLE,
  [ErrorCategory.CONFIG]: ExitCode.CONFIG,
  [ErrorCategory.INTERNAL]: ExitCode.SOFTWARE,
  [ErrorCategory.AUTH]: ExitCode.NOPERM,
};

/**
 * Determine error category from error properties
 */
export function mapErrorToCategory(error: unknown): ErrorCategory {
  if (!error || typeof error !== 'object') {
    return ErrorCategory.INTERNAL;
  }
  
  const err = error as Record<string, unknown>;
  const code = err.code as string | undefined;
  const message = (err.message as string || '').toLowerCase();
  
  // File system errors
  if (code === 'ENOENT' || code === 'EACCES' || code === 'EPERM') {
    return ErrorCategory.IO;
  }
  
  // Network errors
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
    return ErrorCategory.NETWORK;
  }
  
  // Authentication
  if (message.includes('authentication') || message.includes('unauthorized') || message.includes('forbidden')) {
    return ErrorCategory.AUTH;
  }
  
  // Validation
  if (message.includes('validation') || message.includes('invalid') || message.includes('not found')) {
    return ErrorCategory.DATA;
  }
  
  // Configuration
  if (message.includes('config') || message.includes('configuration')) {
    return ErrorCategory.CONFIG;
  }
  
  return ErrorCategory.INTERNAL;
}

/**
 * Get exit code from error category
 */
export function getExitCodeForCategory(category: ErrorCategory): ExitCode {
  return categoryToExitCode[category] || ExitCode.GENERAL;
}

/**
 * Get the appropriate exit code for an error
 * @param error - The error object (can be N8nApiError or any Error)
 * @returns The semantic exit code
 */
export function getExitCode(error: unknown): ExitCode {
  if (!error) {
    return ExitCode.SUCCESS;
  }
  
  // Handle errors with a code property (N8nApiError)
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const {code} = (error as { code?: string });
    if (code && code in errorCodeToExitCode) {
      return errorCodeToExitCode[code];
    }
  }
  
  // Handle errors with statusCode (HTTP-based)
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const {statusCode} = (error as { statusCode?: number });
    if (statusCode) {
      if (statusCode === 401 || statusCode === 403) {return ExitCode.NOPERM;}
      if (statusCode === 404) {return ExitCode.DATAERR;}
      if (statusCode === 400) {return ExitCode.DATAERR;}
      if (statusCode === 429) {return ExitCode.TEMPFAIL;}
      if (statusCode >= 500) {return ExitCode.PROTOCOL;}
    }
  }
  
  return ExitCode.GENERAL;
}

/**
 * Set process exit code without immediately exiting
 * Allows async cleanup to complete
 */
export function setExitCode(code: ExitCode): void {
  process.exitCode = code;
}

/**
 * Exit with code and optional message to stderr
 * Use this for immediate exit with proper code
 * @param code - POSIX exit code
 * @param message - Optional message to stderr
 */
export function exitWithCode(code: ExitCode, message?: string): never {
  if (message) {
    console.error(message);
  }
  process.exit(code);
}

/**
 * Get human-readable description of exit code
 * Useful for --verbose output
 */
export function getExitCodeDescription(code: ExitCode): string {
  switch (code) {
    case ExitCode.SUCCESS: return 'Success';
    case ExitCode.GENERAL: return 'General error';
    case ExitCode.USAGE: return 'Usage error (invalid arguments)';
    case ExitCode.DATAERR: return 'Data error (invalid input or validation failure)';
    case ExitCode.NOINPUT: return 'Cannot open input file';
    case ExitCode.NOUSER: return 'User not found';
    case ExitCode.NOHOST: return 'Host name unknown';
    case ExitCode.UNAVAILABLE: return 'Service unavailable';
    case ExitCode.SOFTWARE: return 'Internal software error';
    case ExitCode.OSERR: return 'System error';
    case ExitCode.OSFILE: return 'Critical OS file missing';
    case ExitCode.CANTCREAT: return 'Cannot create output file';
    case ExitCode.IOERR: return 'I/O error';
    case ExitCode.TEMPFAIL: return 'Temporary failure (retry later)';
    case ExitCode.PROTOCOL: return 'Protocol error (server/API)';
    case ExitCode.NOPERM: return 'Permission denied (auth required)';
    case ExitCode.CONFIG: return 'Configuration error';
    default: return `Unknown exit code: ${code}`;
  }
}
