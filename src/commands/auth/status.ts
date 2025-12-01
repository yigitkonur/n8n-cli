/**
 * Auth Status Command (whoami)
 * Show current authentication status and verify credentials
 */

import chalk from 'chalk';
import axios from 'axios';
import { 
  getConfig, 
  maskApiKey,
  isConfigured,
  getConfigFilePath,
} from '../../core/config/loader.js';
import { formatHeader } from '../../core/formatters/header.js';
import { theme, icons } from '../../core/formatters/theme.js';

export interface StatusOptions {
  json?: boolean;
}

interface StatusResult {
  configured: boolean;
  host?: string;
  apiKeyMasked?: string;
  configPath?: string;
  connected?: boolean;
  apiKeyValid?: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Verify credentials by making a test API call
 */
async function verifyCredentials(host: string, apiKey: string): Promise<{ 
  connected: boolean; 
  apiKeyValid: boolean; 
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  
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
    
    const latencyMs = Date.now() - startTime;
    
    if (response.status === 200) {
      return { connected: true, apiKeyValid: true, latencyMs };
    } else if (response.status === 401) {
      return { connected: true, apiKeyValid: false, latencyMs, error: 'Invalid API key' };
    } else if (response.status === 403) {
      return { connected: true, apiKeyValid: false, latencyMs, error: 'API key lacks permissions' };
    } 
      return { connected: true, apiKeyValid: false, latencyMs, error: `API returned ${response.status}` };
    
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    if (error.code === 'ECONNREFUSED') {
      return { connected: false, apiKeyValid: false, latencyMs, error: 'Connection refused' };
    } else if (error.code === 'ENOTFOUND') {
      return { connected: false, apiKeyValid: false, latencyMs, error: 'Host not found' };
    }
    return { connected: false, apiKeyValid: false, latencyMs, error: error.message };
  }
}

/**
 * Main status command handler
 */
export async function authStatusCommand(opts: StatusOptions): Promise<void> {
  const config = getConfig();
  const configPath = getConfigFilePath();
  
  const result: StatusResult = {
    configured: isConfigured(),
    configPath,
  };
  
  if (result.configured) {
    result.host = config.host;
    result.apiKeyMasked = maskApiKey(config.apiKey);
    
    // Verify credentials
    const verification = await verifyCredentials(config.host, config.apiKey);
    result.connected = verification.connected;
    result.apiKeyValid = verification.apiKeyValid;
    result.latencyMs = verification.latencyMs;
    if (verification.error) {
      result.error = verification.error;
    }
  }
  
  // JSON output
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.configured && result.apiKeyValid ? 0 : 1;
    return;
  }
  
  // Pretty output
  console.log(formatHeader({
    title: 'n8n Authentication Status',
    icon: icons.user,
    context: {},
  }));
  console.log('');
  
  if (!result.configured) {
    console.log(theme.warning(`${icons.warning} Not configured`));
    console.log('');
    console.log(chalk.dim('No credentials found. Run:'));
    console.log('');
    console.log(chalk.cyan('  n8n auth login --host https://your-n8n.com --api-key YOUR_KEY'));
    console.log('');
    console.log(chalk.dim('Or for interactive setup:'));
    console.log('');
    console.log(chalk.cyan('  n8n auth login --interactive'));
    console.log('');
    process.exitCode = 1;
    return;
  }
  
  // Show configuration
  console.log(chalk.bold('Configuration'));
  console.log(chalk.dim(`  Host:       ${result.host}`));
  console.log(chalk.dim(`  API Key:    ${result.apiKeyMasked}`));
  console.log(chalk.dim(`  Config:     ${result.configPath}`));
  console.log('');
  
  // Show connection status
  console.log(chalk.bold('Connection Status'));
  
  if (result.connected) {
    console.log(theme.success(`  ${icons.success} Connected`));
  } else {
    console.log(theme.error(`  ${icons.error} Not connected`));
    if (result.error) {
      console.log(chalk.dim(`     Error: ${result.error}`));
    }
  }
  
  if (result.connected) {
    if (result.apiKeyValid) {
      console.log(theme.success(`  ${icons.success} API Key valid`));
    } else {
      console.log(theme.error(`  ${icons.error} API Key invalid`));
      if (result.error) {
        console.log(chalk.dim(`     Error: ${result.error}`));
      }
    }
  }
  
  if (result.latencyMs !== undefined) {
    console.log(chalk.dim(`  ${icons.info} Latency: ${result.latencyMs}ms`));
  }
  
  console.log('');
  
  // Next steps based on status
  if (!result.connected || !result.apiKeyValid) {
    console.log(chalk.yellow(`${icons.tip} Tips:`));
    if (!result.connected) {
      console.log(chalk.dim('  • Check that n8n is running at the configured host'));
      console.log(chalk.dim('  • Verify the URL is correct'));
    }
    if (result.connected && !result.apiKeyValid) {
      console.log(chalk.dim('  • Generate a new API key at: Settings → API'));
      console.log(chalk.dim('  • Run: n8n auth login --interactive'));
    }
    console.log('');
    process.exitCode = 1;
  } else {
    console.log(theme.success(`${icons.success} Ready to use n8n CLI`));
    console.log('');
    console.log(chalk.dim('Try:'));
    console.log(chalk.dim('  n8n workflows list'));
    console.log(chalk.dim('  n8n health'));
    console.log('');
  }
}
