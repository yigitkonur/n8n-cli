/**
 * CLI Configuration Types
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
