/**
 * CLI Exit Codes
 * Based on POSIX sysexits.h standards for semantic exit codes
 * These enable scripting/automation with meaningful status checks
 */

export enum ExitCode {
  /** Successful execution */
  SUCCESS = 0,
  
  /** General/unknown error (catch-all) */
  GENERAL = 1,
  
  /** Command line usage error (bad args, unknown command) */
  USAGE = 64,
  
  /** Data format error (invalid input, not found) */
  DATAERR = 65,
  
  /** Cannot open input file */
  NOINPUT = 66,
  
  /** I/O error (network, connection issues) */
  IOERR = 70,
  
  /** Temporary failure (rate limit, try again) */
  TEMPFAIL = 71,
  
  /** Protocol error (API/server errors) */
  PROTOCOL = 72,
  
  /** Permission denied (authentication error) */
  NOPERM = 73,
  
  /** Configuration error */
  CONFIG = 78,
}

/**
 * Map error codes to exit codes
 */
const errorCodeToExitCode: Record<string, ExitCode> = {
  // Validation/input errors
  VALIDATION_ERROR: ExitCode.DATAERR,
  NOT_FOUND: ExitCode.DATAERR,
  
  // Authentication errors
  AUTHENTICATION_ERROR: ExitCode.NOPERM,
  
  // Network/connection errors
  CONNECTION_ERROR: ExitCode.IOERR,
  NO_RESPONSE: ExitCode.IOERR,
  REQUEST_ERROR: ExitCode.IOERR,
  
  // Rate limiting
  RATE_LIMIT_ERROR: ExitCode.TEMPFAIL,
  
  // Server errors
  SERVER_ERROR: ExitCode.PROTOCOL,
  API_ERROR: ExitCode.PROTOCOL,
  
  // Unknown
  UNKNOWN_ERROR: ExitCode.GENERAL,
};

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
 * Exit with a specific code (use sparingly - prefer setExitCode)
 */
export function exitWithCode(code: ExitCode): never {
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
    case ExitCode.DATAERR: return 'Data error (invalid input or not found)';
    case ExitCode.NOINPUT: return 'Cannot open input file';
    case ExitCode.IOERR: return 'I/O error (network/connection)';
    case ExitCode.TEMPFAIL: return 'Temporary failure (retry later)';
    case ExitCode.PROTOCOL: return 'Protocol error (server/API)';
    case ExitCode.NOPERM: return 'Permission denied (auth required)';
    case ExitCode.CONFIG: return 'Configuration error';
    default: return `Unknown exit code: ${code}`;
  }
}
