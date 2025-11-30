import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * CLI Configuration
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
 * Partial config from file or env
 */
interface PartialConfig {
  host?: string;
  apiKey?: string;
  timeout?: number;
  dbPath?: string;
  debug?: boolean;
}

/**
 * Default configuration values
 */
const defaults: CliConfig = {
  host: 'http://localhost:5678',
  apiKey: '',
  timeout: 30000,
  dbPath: '',
  debug: false,
};

/**
 * Config file search paths (in priority order)
 */
const configPaths = [
  '.n8nrc',
  '.n8nrc.json',
  join(homedir(), '.n8nrc'),
  join(homedir(), '.n8nrc.json'),
  join(homedir(), '.config', 'n8n', 'config.json'),
];

/**
 * Load config from file
 */
function loadConfigFile(): PartialConfig {
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(content);
        return {
          host: parsed.host || parsed.N8N_HOST || parsed.n8n_host,
          apiKey: parsed.apiKey || parsed.N8N_API_KEY || parsed.n8n_api_key,
          timeout: parsed.timeout,
          dbPath: parsed.dbPath || parsed.db_path,
          debug: parsed.debug,
        };
      } catch {
        // Invalid JSON, skip this file
      }
    }
  }
  return {};
}

/**
 * Load config from environment variables
 */
function loadEnvConfig(): PartialConfig {
  return {
    host: process.env.N8N_HOST || process.env.N8N_URL,
    apiKey: process.env.N8N_API_KEY,
    timeout: process.env.N8N_TIMEOUT ? parseInt(process.env.N8N_TIMEOUT, 10) : undefined,
    dbPath: process.env.N8N_DB_PATH,
    debug: process.env.N8N_DEBUG === 'true' || process.env.DEBUG === 'n8n-cli',
  };
}

/**
 * Get the default database path
 */
function getDefaultDbPath(): string {
  // Try package directory first
  const packageDbPath = join(process.cwd(), 'data', 'nodes.db');
  if (existsSync(packageDbPath)) {
    return packageDbPath;
  }
  
  // Try home directory
  const homeDbPath = join(homedir(), '.n8n-cli', 'nodes.db');
  if (existsSync(homeDbPath)) {
    return homeDbPath;
  }
  
  // Default to package directory (will be created)
  return packageDbPath;
}

/**
 * Load and merge configuration from all sources
 * Priority: env > file > defaults
 */
export function loadConfig(): CliConfig {
  const fileConfig = loadConfigFile();
  const envConfig = loadEnvConfig();
  
  const config: CliConfig = {
    host: envConfig.host || fileConfig.host || defaults.host,
    apiKey: envConfig.apiKey || fileConfig.apiKey || defaults.apiKey,
    timeout: envConfig.timeout || fileConfig.timeout || defaults.timeout,
    dbPath: envConfig.dbPath || fileConfig.dbPath || getDefaultDbPath(),
    debug: envConfig.debug ?? fileConfig.debug ?? defaults.debug,
  };
  
  return config;
}

/**
 * Validate that required config is present
 */
export function validateConfig(config: CliConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.apiKey) {
    errors.push('N8N_API_KEY is required. Set via environment or .n8nrc file.');
  }
  
  if (!config.host) {
    errors.push('N8N_HOST is required. Set via environment or .n8nrc file.');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Mask API key for display
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

// Singleton config instance
let _config: CliConfig | null = null;

/**
 * Get config singleton
 */
export function getConfig(): CliConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

/**
 * Reset config (for testing)
 */
export function resetConfig(): void {
  _config = null;
}
