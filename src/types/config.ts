/**
 * CLI Configuration Types
 */

/**
 * Core CLI configuration
 */
export interface CliConfig {
  /** n8n instance URL */
  host: string;
  /** n8n API key */
  apiKey: string;
  /** Request timeout in ms */
  timeout: number;
  /** Path to nodes database */
  dbPath: string;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Partial configuration for profiles/overrides
 */
export interface PartialCliConfig {
  host?: string;
  apiKey?: string;
  timeout?: number;
  dbPath?: string;
  debug?: boolean;
}

/**
 * Profile-based configuration file structure
 * Supports both flat config (backward compat) and profiles
 * 
 * @example Flat config (backward compatible):
 * ```json
 * { "host": "https://n8n.example.com", "apiKey": "xxx" }
 * ```
 * 
 * @example Profile-based config:
 * ```json
 * {
 *   "default": "prod",
 *   "profiles": {
 *     "prod": { "host": "https://n8n.example.com", "apiKey": "xxx" },
 *     "dev": { "host": "http://localhost:5678", "apiKey": "yyy" }
 *   }
 * }
 * ```
 */
export interface ProfiledConfig {
  /** Default profile name (optional, defaults to "default") */
  default?: string;
  
  /** Named configuration profiles */
  profiles: Record<string, PartialCliConfig>;
}

/**
 * Check if config object has profiles structure
 */
export function hasProfiles(config: unknown): config is ProfiledConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'profiles' in config &&
    typeof (config as ProfiledConfig).profiles === 'object'
  );
}
