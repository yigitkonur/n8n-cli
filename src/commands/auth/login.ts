/**
 * Auth Login Command
 * Configure n8n credentials with non-interactive first design
 */

import chalk from 'chalk';
import axios from 'axios';
import { 
  getConfig, 
  saveConfig, 
  normalizeUrl, 
  maskApiKey,
  getConfigFilePath,
} from '../../core/config/loader.js';
import { formatHeader } from '../../core/formatters/header.js';
import { theme, icons } from '../../core/formatters/theme.js';
import { 
  isNonInteractive, 
  isInteractive,
  promptInput, 
  promptSecret,
  openBrowser,
} from '../../utils/prompts.js';

export interface LoginOptions {
  host?: string;
  apiKey?: string;
  json?: boolean;
  interactive?: boolean;
}

interface LoginResult {
  success: boolean;
  host?: string;
  apiKeyMasked?: string;
  configPath?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Verify credentials by making a test API call
 */
async function verifyCredentials(host: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const apiUrl = host.endsWith('/api/v1') 
      ? host 
      : `${host.replace(/\/$/, '')}/api/v1`;
    
    const response = await axios.get(`${apiUrl}/workflows`, {
      timeout: 10000,
      headers: {
        'X-N8N-API-KEY': apiKey,
      },
      params: { limit: 1 },
      validateStatus: () => true,
    });
    
    if (response.status === 200) {
      return { valid: true };
    } else if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    } else if (response.status === 403) {
      return { valid: false, error: 'API key lacks required permissions' };
    } else if (response.status === 404) {
      return { valid: false, error: 'API endpoint not found - check n8n version' };
    } else {
      return { valid: false, error: `API returned status ${response.status}` };
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return { valid: false, error: 'Connection refused - is n8n running at this host?' };
    } else if (error.code === 'ENOTFOUND') {
      return { valid: false, error: 'Host not found - check the URL' };
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return { valid: false, error: 'Connection timed out' };
    }
    return { valid: false, error: error.message || 'Unknown error' };
  }
}

interface UsageOptions {
  /** If true, shows error message and sets exit code 1. If false, shows friendly options. */
  isError?: boolean;
}

/**
 * Show usage instructions
 * @param options.isError - If true (default), shows error message for CI/missing creds. If false, shows friendly options for TTY.
 */
function showUsageInstructions(options: UsageOptions = {}): void {
  const { isError = true } = options;
  
  console.log(formatHeader({
    title: 'n8n Authentication',
    icon: icons.auth,
    context: {},
  }));
  
  console.log('');
  
  if (isError) {
    console.log(theme.error(`${icons.error} Missing required credentials`));
    console.log('');
  } else {
    console.log(chalk.bold('Choose your authentication method:'));
    console.log('');
  }
  
  console.log(chalk.bold('Non-interactive login (recommended for CI/agents):'));
  console.log('');
  console.log(chalk.dim('  # Using flags:'));
  console.log(chalk.cyan('  n8n auth login --host https://your-n8n.com --api-key YOUR_API_KEY'));
  console.log('');
  console.log(chalk.dim('  # Using environment variables:'));
  console.log(chalk.cyan('  export N8N_HOST=https://your-n8n.com'));
  console.log(chalk.cyan('  export N8N_API_KEY=your-api-key'));
  console.log(chalk.cyan('  n8n auth login'));
  console.log('');
  
  console.log(chalk.bold('Interactive login (requires terminal):'));
  console.log('');
  console.log(chalk.cyan('  n8n auth login --interactive'));
  console.log('');
  
  console.log(chalk.bold('Get your API key:'));
  console.log('');
  console.log(chalk.dim('  1. Open your n8n instance'));
  console.log(chalk.dim('  2. Go to Settings → API'));
  console.log(chalk.dim('  3. Create a new API key'));
  console.log('');
  
  if (isError) {
    process.exitCode = 1;
  }
}

/**
 * Handle non-interactive login with flags/env vars
 */
async function handleNonInteractiveLogin(opts: LoginOptions): Promise<LoginResult> {
  // Try to get credentials from options or environment
  let host = opts.host || process.env.N8N_HOST || process.env.N8N_URL;
  let apiKey = opts.apiKey || process.env.N8N_API_KEY;
  
  // Check if we have the required values
  if (!host || !apiKey) {
    return {
      success: false,
      error: 'Missing required credentials',
      errorCode: 'MISSING_CREDENTIALS',
    };
  }
  
  // Normalize URL
  try {
    host = normalizeUrl(host);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      errorCode: 'INVALID_URL',
    };
  }
  
  // Verify credentials
  const verification = await verifyCredentials(host, apiKey);
  if (!verification.valid) {
    return {
      success: false,
      host,
      error: verification.error,
      errorCode: 'VERIFICATION_FAILED',
    };
  }
  
  // Save config
  const configPath = saveConfig({ host, apiKey });
  
  return {
    success: true,
    host,
    apiKeyMasked: maskApiKey(apiKey),
    configPath,
  };
}

/**
 * Handle interactive login with prompts
 */
async function handleInteractiveLogin(): Promise<LoginResult> {
  console.log(formatHeader({
    title: 'n8n Authentication Setup',
    icon: icons.auth,
    context: {},
  }));
  console.log('');
  
  // Prompt for host
  console.log(chalk.dim('Enter your n8n instance URL (e.g., https://your-n8n.com or localhost:5678)'));
  const hostInput = await promptInput('n8n URL');
  
  if (!hostInput) {
    return {
      success: false,
      error: 'No URL provided',
      errorCode: 'MISSING_HOST',
    };
  }
  
  // Normalize URL
  let host: string;
  try {
    host = normalizeUrl(hostInput);
    console.log(chalk.dim(`  → Normalized to: ${host}`));
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      errorCode: 'INVALID_URL',
    };
  }
  
  console.log('');
  
  // Open browser for API key page
  const apiKeyUrl = `${host}/settings/api`;
  console.log(chalk.dim(`Opening ${apiKeyUrl} to create an API key...`));
  
  if (openBrowser(apiKeyUrl)) {
    console.log(theme.success(`${icons.success} Browser opened`));
  } else {
    console.log(chalk.yellow(`${icons.warning} Could not open browser. Visit: ${apiKeyUrl}`));
  }
  
  console.log('');
  console.log(chalk.dim('Create an API key in Settings → API, then paste it below.'));
  
  // Prompt for API key (use regular prompt since secret input can be tricky)
  const apiKey = await promptInput('API Key');
  
  if (!apiKey) {
    return {
      success: false,
      error: 'No API key provided',
      errorCode: 'MISSING_API_KEY',
    };
  }
  
  console.log('');
  console.log(chalk.dim('Verifying credentials...'));
  
  // Verify credentials
  const verification = await verifyCredentials(host, apiKey);
  if (!verification.valid) {
    console.log(theme.error(`${icons.error} ${verification.error}`));
    return {
      success: false,
      host,
      error: verification.error,
      errorCode: 'VERIFICATION_FAILED',
    };
  }
  
  // Save config
  const configPath = saveConfig({ host, apiKey });
  
  return {
    success: true,
    host,
    apiKeyMasked: maskApiKey(apiKey),
    configPath,
  };
}

/**
 * Main login command handler
 */
export async function authLoginCommand(opts: LoginOptions): Promise<void> {
  let result: LoginResult;
  
  // Determine mode: interactive vs non-interactive
  const hasCredentials = opts.host || opts.apiKey || process.env.N8N_HOST || process.env.N8N_API_KEY;
  const wantsInteractive = opts.interactive;
  const canBeInteractive = isInteractive();
  
  if (wantsInteractive) {
    // User explicitly requested interactive mode
    if (!canBeInteractive) {
      result = {
        success: false,
        error: 'Interactive mode not available (no TTY)',
        errorCode: 'NO_TTY',
      };
    } else {
      result = await handleInteractiveLogin();
    }
  } else if (hasCredentials) {
    // Has credentials via flags or env - use non-interactive
    result = await handleNonInteractiveLogin(opts);
  } else if (isNonInteractive()) {
    // No credentials and non-interactive environment - show usage
    if (opts.json) {
      console.log(JSON.stringify({
        success: false,
        error: 'Missing required credentials (--host and --api-key)',
        errorCode: 'MISSING_CREDENTIALS',
        usage: {
          flags: 'n8n auth login --host <url> --api-key <key>',
          env: 'N8N_HOST=<url> N8N_API_KEY=<key> n8n auth login',
        },
      }, null, 2));
      process.exitCode = 1;
      return;
    }
    showUsageInstructions();
    return;
  } else {
    // TTY terminal without credentials - show usage, require explicit -i flag
    if (opts.json) {
      console.log(JSON.stringify({
        success: false,
        message: 'Choose an authentication method',
        usage: {
          interactive: 'n8n auth login --interactive',
          flags: 'n8n auth login --host <url> --api-key <key>',
          env: 'N8N_HOST=<url> N8N_API_KEY=<key> n8n auth login',
        },
      }, null, 2));
      return;
    }
    showUsageInstructions({ isError: false });
    return;
  }
  
  // Output result
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.success ? 0 : 1;
    return;
  }
  
  if (result.success) {
    console.log('');
    console.log(theme.success(`${icons.success} Authentication configured successfully!`));
    console.log('');
    console.log(chalk.dim(`  Host:       ${result.host}`));
    console.log(chalk.dim(`  API Key:    ${result.apiKeyMasked}`));
    console.log(chalk.dim(`  Config:     ${result.configPath}`));
    console.log('');
    console.log(chalk.dim('Run `n8n auth status` to verify or `n8n health` to test connectivity.'));
    console.log('');
    
    // Always show non-interactive usage for agent reference
    console.log(chalk.bold('For CI/agents, use:'));
    console.log(chalk.cyan(`  n8n auth login --host ${result.host} --api-key YOUR_API_KEY`));
    console.log('');
  } else {
    console.log('');
    console.log(theme.error(`${icons.error} Authentication failed`));
    if (result.error) {
      console.log(chalk.dim(`  Error: ${result.error}`));
    }
    console.log('');
    process.exitCode = 1;
  }
}
