/**
 * Output Formatting Types
 */

export interface FormatOptions {
  /** Output as JSON */
  json: boolean;
  /** Minimal output */
  quiet: boolean;
  /** Verbose output */
  verbose: boolean;
  /** Maximum rows to display */
  limit: number;
  /** Save output to file */
  save?: string;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  displayed: number;
  hasMore: boolean;
  nextCursor?: string;
}
