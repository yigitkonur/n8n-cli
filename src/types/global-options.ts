/**
 * Global CLI Options
 * These options are available on all commands and affect output/behavior globally
 */

/**
 * Global options that can be passed to any command
 * Defined at the program level in cli.ts
 */
export interface GlobalOptions {
  /** Enable verbose/debug output */
  verbose?: boolean;
  
  /** Suppress all non-essential output (banners, tips, etc.) */
  quiet?: boolean;
  
  /** Disable colored output (also respects NO_COLOR env var) */
  noColor?: boolean;
  
  /** Configuration profile to use */
  profile?: string;
}

/**
 * Merge global options with command-specific options
 * Use this in every command action handler
 */
export type WithGlobalOptions<T> = T & GlobalOptions;

/**
 * Common command options that many commands share
 */
export interface CommonCommandOptions extends GlobalOptions {
  /** Output as JSON instead of human-readable format */
  json?: boolean;
  
  /** Save output to file path */
  save?: string;
}

/**
 * Options for commands that support pagination
 */
export interface PaginatedOptions extends CommonCommandOptions {
  /** Maximum number of results to return */
  limit?: string;
  
  /** Cursor for pagination */
  cursor?: string;
}

/**
 * Options for destructive commands that need confirmation
 */
export interface DestructiveOptions extends CommonCommandOptions {
  /** Skip confirmation prompt */
  force?: boolean;
  
  /** Alias for force */
  yes?: boolean;
}
