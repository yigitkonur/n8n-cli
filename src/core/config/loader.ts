import { existsSync, readFileSync, statSync, writeFileSync, chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { homedir } from 'node:os';
import { join } from 'node:path';
import chalk from 'chalk';
import type { CliConfig } from '../../types/config.js';

// Re-export CliConfig for backward compatibility
export type { CliConfig } from '../../types/config.js';

/**
 * Partial config from file or env
 */
export interface PartialConfig {
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
 * Check file permissions for security
 * Task 04: Config File Permission Checks
 * Returns { secure: boolean, mode: string }
 */
function checkFilePermissions(filePath: string): { secure: boolean; mode: string } {
  // Skip on Windows - no Unix permission model
  if (process.platform === 'win32') {
    return { secure: true, mode: 'N/A' };
  }
  
  try {
    const stats = statSync(filePath);
    const mode = stats.mode;
    // Check if group or world has any access (mode & 0o077)
    const insecureBits = mode & 0o077;
    const modeString = (mode & 0o777).toString(8).padStart(3, '0');
    
    return {
      secure: insecureBits === 0,
      mode: modeString,
    };
  } catch {
    // If we can't check, assume secure to avoid false positives
    return { secure: true, mode: 'unknown' };
  }
}

/**
 * Load config from file
 */
function loadConfigFile(): PartialConfig {
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      // Task 04: Check file permissions before reading secrets
      const permCheck = checkFilePermissions(configPath);
      if (!permCheck.secure) {
        console.warn(chalk.yellow(`⚠️  Config file ${configPath} has insecure permissions (${permCheck.mode})`));
        console.warn(chalk.yellow(`   Contains API key. Run: chmod 600 ${configPath}`));
        
        // In strict mode, refuse to load insecure config
        if (process.env.N8N_STRICT_PERMISSIONS === 'true') {
          throw new Error(
            `Refusing to load config file with insecure permissions. ` +
            `Run: chmod 600 ${configPath} or set N8N_STRICT_PERMISSIONS=false`
          );
        }
      }
      
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
      } catch (error) {
        // Warn user about invalid JSON in config file (CLI-018)
        if (error instanceof SyntaxError) {
          console.warn(`Warning: Config file ${configPath} contains invalid JSON: ${error.message}`);
          console.warn('  Using default configuration instead.\n');
        }
        // Continue to try other config paths
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
 * Validate that required config is present and properly formatted
 * Task 05: Enhanced Config Validation
 */
export function validateConfig(config: CliConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // API Key validation
  if (!config.apiKey) {
    errors.push('N8N_API_KEY is required. Set via environment or .n8nrc file.');
  } else if (!/^[a-zA-Z0-9_-]{20,}$/.test(config.apiKey)) {
    errors.push('N8N_API_KEY appears malformed. Expected 20+ alphanumeric characters (including - and _).');
  }
  
  // Host URL validation
  if (!config.host) {
    errors.push('N8N_HOST is required. Set via environment or .n8nrc file.');
  } else {
    try {
      const url = new URL(config.host);
      
      // Check protocol
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('N8N_HOST must use http:// or https:// protocol.');
      }
      
      // Warn about path components
      if (url.pathname && url.pathname !== '/') {
        errors.push(`N8N_HOST should not include path (found: ${url.pathname}). Use base URL only.`);
      }
    } catch {
      // Common mistake: host:port without protocol
      if (/^[a-zA-Z0-9.-]+:\d+$/.test(config.host)) {
        errors.push(`N8N_HOST should include protocol, e.g., http://${config.host}`);
      } else {
        errors.push('N8N_HOST is not a valid URL.');
      }
    }
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

/**
 * Normalize a URL to its base form (protocol + host + port)
 * Handles dirty URLs like 'https://example.com/settings/profile?tab=api'
 * Returns: 'https://example.com'
 */
export function normalizeUrl(input: string): string {
  // Handle common mistakes: host:port without protocol
  let urlStr = input.trim();
  if (/^[a-zA-Z0-9.-]+:\d+$/.test(urlStr)) {
    urlStr = `http://${urlStr}`;
  } else if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = `https://${urlStr}`;
  }
  
  try {
    const url = new URL(urlStr);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('URL must use http:// or https:// protocol');
    }
    // Return origin (protocol + host + port if non-standard)
    return url.origin;
  } catch (error) {
    throw new Error(`Invalid URL: ${input}. Expected format: https://your-n8n-instance.com`);
  }
}

/**
 * Get the default config file path for writing
 * Prefers ~/.n8nrc.json for user-level config
 */
export function getConfigFilePath(): string {
  // Check if any config file exists (use that for updates)
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  // Default to ~/.n8nrc.json for new configs
  return join(homedir(), '.n8nrc.json');
}

/**
 * Save configuration to file
 * Merges with existing config and sets secure permissions (600 on Unix)
 * @returns The path where config was saved
 */
export function saveConfig(partial: PartialConfig): string {
  const configPath = getConfigFilePath();
  
  // Ensure directory exists
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }
  
  // Load existing config (if any) and merge
  let existing: PartialConfig = {};
  if (existsSync(configPath)) {
    try {
      existing = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch {
      // Start fresh if file is corrupted
    }
  }
  
  // Merge new values with existing (new values take precedence)
  const merged = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(partial).filter(([_, v]) => v !== undefined)
    ),
  };
  
  // Write config
  writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
  
  // Set secure permissions on Unix (owner read/write only)
  if (process.platform !== 'win32') {
    try {
      chmodSync(configPath, 0o600);
    } catch {
      // Ignore permission errors (e.g., on some filesystems)
    }
  }
  
  // Invalidate cached config
  resetConfig();
  
  return configPath;
}

/**
 * Clear authentication credentials from config
 * Removes apiKey while preserving other settings
 */
export function clearAuthConfig(): void {
  const configPath = getConfigFilePath();
  
  if (!existsSync(configPath)) {
    return; // Nothing to clear
  }
  
  try {
    const existing = JSON.parse(readFileSync(configPath, 'utf8'));
    // Remove auth-related fields
    delete existing.apiKey;
    delete existing.N8N_API_KEY;
    delete existing.n8n_api_key;
    
    writeFileSync(configPath, JSON.stringify(existing, null, 2), 'utf8');
    resetConfig();
  } catch {
    // Ignore errors
  }
}

/**
 * Check if CLI is configured with required auth credentials
 */
export function isConfigured(): boolean {
  const config = getConfig();
  return Boolean(config.host && config.apiKey);
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
