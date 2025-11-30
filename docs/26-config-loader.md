# Config Loader Design

## Overview

Configuration management supporting environment variables, `.n8nrc` file, and CLI flags with proper precedence.

## MCP Source Reference

**Reference for environment variable parsing:**
- `n8n-mcp/src/config/n8n-api.ts` (if exists) → API config structure
- `n8n-mcp/src/services/n8n-api-client.ts` lines 28-33 → `N8nApiClientConfig` interface

**Key environment variables used by MCP (reuse same names):**
```bash
N8N_API_URL=https://your-n8n-instance.com
N8N_API_KEY=your-api-key
```

**DO NOT copy telemetry:** See `n8n-mcp/src/telemetry/` for reference, but **disable/remove** all telemetry for CLI to ensure it runs locally without sending data.

## Architecture

```
src/core/utils/
└── config.ts         # Configuration loader
```

## Configuration Sources (Precedence)

1. **CLI Flags** (highest) - `--api-url`, `--api-key`
2. **Environment Variables** - `N8N_API_URL`, `N8N_API_KEY`
3. **Project Config** - `./.n8nrc` in current directory
4. **User Config** - `~/.n8nrc` in home directory
5. **Defaults** (lowest)

## Config Interface

```typescript
// src/types/config.ts
export interface Config {
  // Required
  n8nUrl: string;
  apiKey: string;

  // Optional with defaults
  timeout: number;           // Default: 30000
  retries: number;           // Default: 3
  verbose: boolean;          // Default: false

  // Database
  nodesDbPath: string;       // Default: bundled

  // Version storage
  versionsDbPath: string;    // Default: ~/.cli/versions.db

  // Output
  defaultLimit: number;      // Default: 10
  colorEnabled: boolean;     // Default: true (auto-detect)
}

export interface ConfigFile {
  url?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  defaultLimit?: number;
}
```

## Config Loader

```typescript
// src/core/utils/config.ts
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ConfigurationError } from '../formatters/errors.js';
import { Config, ConfigFile } from '../../types/config.js';

const DEFAULT_CONFIG: Omit<Config, 'n8nUrl' | 'apiKey'> = {
  timeout: 30000,
  retries: 3,
  verbose: false,
  nodesDbPath: join(__dirname, '../../data/nodes.db'),
  versionsDbPath: join(homedir(), '.n8n-cli', 'versions.db'),
  defaultLimit: 10,
  colorEnabled: process.stdout.isTTY ?? true,
};

let cachedConfig: Config | null = null;

/**
 * Load configuration from all sources
 */
export async function getConfig(overrides: Partial<Config> = {}): Promise<Config> {
  if (cachedConfig && Object.keys(overrides).length === 0) {
    return cachedConfig;
  }

  // Load config files
  const userConfig = await loadConfigFile(join(homedir(), '.n8nrc'));
  const projectConfig = await loadConfigFile(join(process.cwd(), '.n8nrc'));

  // Merge with precedence
  const config: Config = {
    ...DEFAULT_CONFIG,
    
    // User config (lowest file precedence)
    ...(userConfig && {
      n8nUrl: userConfig.url,
      apiKey: userConfig.apiKey,
      timeout: userConfig.timeout,
      retries: userConfig.retries,
      defaultLimit: userConfig.defaultLimit,
    }),
    
    // Project config (higher file precedence)
    ...(projectConfig && {
      n8nUrl: projectConfig.url,
      apiKey: projectConfig.apiKey,
      timeout: projectConfig.timeout,
      retries: projectConfig.retries,
      defaultLimit: projectConfig.defaultLimit,
    }),
    
    // Environment variables
    n8nUrl: process.env.N8N_API_URL || process.env.N8N_URL || '',
    apiKey: process.env.N8N_API_KEY || '',
    ...(process.env.N8N_TIMEOUT && { timeout: parseInt(process.env.N8N_TIMEOUT) }),
    ...(process.env.N8N_RETRIES && { retries: parseInt(process.env.N8N_RETRIES) }),
    ...(process.env.NO_COLOR && { colorEnabled: false }),
    
    // CLI overrides (highest precedence)
    ...overrides,
  } as Config;

  // Validate required fields
  if (!config.n8nUrl) {
    throw new ConfigurationError('n8n URL not configured', [
      'Set N8N_API_URL environment variable',
      'Or create ~/.n8nrc with url field',
      'Or use --api-url flag',
    ]);
  }

  if (!config.apiKey) {
    throw new ConfigurationError('API key not configured', [
      'Set N8N_API_KEY environment variable',
      'Or create ~/.n8nrc with apiKey field',
      'Or use --api-key flag',
    ]);
  }

  // Normalize URL
  config.n8nUrl = config.n8nUrl.replace(/\/$/, '');

  cachedConfig = config;
  return config;
}

/**
 * Load and parse .n8nrc file
 */
async function loadConfigFile(path: string): Promise<ConfigFile | null> {
  if (!existsSync(path)) return null;

  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as ConfigFile;
  } catch (error) {
    // Silently ignore malformed config files
    return null;
  }
}

/**
 * Reset cached config (for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

/**
 * Check if config is valid without throwing
 */
export async function validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    await getConfig();
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      errors.push(error.message);
    }
    return { valid: false, errors };
  }
}
```

## .n8nrc File Format

```json
{
  "url": "https://n8n.example.com",
  "apiKey": "n8n_api_xxx",
  "timeout": 30000,
  "retries": 3,
  "defaultLimit": 10
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `N8N_API_URL` | n8n instance URL | `https://n8n.example.com` |
| `N8N_API_KEY` | API key for authentication | `n8n_api_xxx` |
| `N8N_TIMEOUT` | Request timeout (ms) | `30000` |
| `N8N_RETRIES` | Number of retries | `3` |
| `NO_COLOR` | Disable colored output | `1` |

## CLI Flags (Global)

```typescript
// In BaseCommand
apiUrl = Option.String('--api-url', {
  description: 'n8n instance URL (overrides config)',
});

apiKey = Option.String('--api-key', {
  description: 'API key (overrides config)',
});
```

## Config Diagnostic

```typescript
// src/core/utils/config.ts

export interface ConfigDiagnostic {
  sources: {
    name: string;
    path?: string;
    loaded: boolean;
    fields: string[];
  }[];
  resolved: Partial<Config>;
  masked: Partial<Config>;
}

export async function diagnoseConfig(): Promise<ConfigDiagnostic> {
  const sources = [];

  // Check user config
  const userPath = join(homedir(), '.n8nrc');
  const userConfig = await loadConfigFile(userPath);
  sources.push({
    name: 'User Config',
    path: userPath,
    loaded: !!userConfig,
    fields: userConfig ? Object.keys(userConfig) : [],
  });

  // Check project config
  const projectPath = join(process.cwd(), '.n8nrc');
  const projectConfig = await loadConfigFile(projectPath);
  sources.push({
    name: 'Project Config',
    path: projectPath,
    loaded: !!projectConfig,
    fields: projectConfig ? Object.keys(projectConfig) : [],
  });

  // Check environment
  const envFields = [];
  if (process.env.N8N_API_URL) envFields.push('N8N_API_URL');
  if (process.env.N8N_API_KEY) envFields.push('N8N_API_KEY');
  if (process.env.N8N_TIMEOUT) envFields.push('N8N_TIMEOUT');
  sources.push({
    name: 'Environment',
    loaded: envFields.length > 0,
    fields: envFields,
  });

  // Get resolved config
  let resolved: Partial<Config> = {};
  try {
    resolved = await getConfig();
  } catch {}

  // Mask sensitive values
  const masked = { ...resolved };
  if (masked.apiKey) {
    masked.apiKey = masked.apiKey.slice(0, 8) + '...' + masked.apiKey.slice(-4);
  }

  return { sources, resolved, masked };
}
```

## Usage in Health Command

```bash
n8n health --mode diagnostic

# Output:
🏥 n8n Configuration Diagnostic

╭─ Configuration Sources
╰─

| Source         | Status | Fields        |
|----------------|--------|---------------|
| User Config    | ✓      | url, apiKey   |
| Project Config | ✗      | -             |
| Environment    | ✓      | N8N_API_KEY   |

╭─ Resolved Configuration
╰─

URL: https://n8n.example.com
API Key: n8n_api_...wxyz
Timeout: 30000ms
Retries: 3
```

## Security Notes

1. **Never log API keys** - Always mask in output
2. **Prefer env vars** - Don't commit `.n8nrc` with keys
3. **File permissions** - Warn if `.n8nrc` is world-readable
4. **.gitignore** - Include `.n8nrc` in default gitignore

```typescript
// Check file permissions (Unix only)
function checkFilePermissions(path: string): void {
  if (process.platform === 'win32') return;

  const stats = statSync(path);
  const mode = stats.mode & 0o777;

  if (mode & 0o044) {
    console.warn(chalk.yellow(
      `⚠️  Warning: ${path} is readable by others. ` +
      `Run: chmod 600 ${path}`
    ));
  }
}
```
