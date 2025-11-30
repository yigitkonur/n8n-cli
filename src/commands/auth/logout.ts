/**
 * Auth Logout Command
 * Clear stored credentials
 */

import chalk from 'chalk';
import { 
  getConfig, 
  clearAuthConfig,
  isConfigured,
  getConfigFilePath,
  maskApiKey,
} from '../../core/config/loader.js';
import { formatHeader } from '../../core/formatters/header.js';
import { theme, icons } from '../../core/formatters/theme.js';

export interface LogoutOptions {
  json?: boolean;
  force?: boolean;
}

interface LogoutResult {
  success: boolean;
  wasConfigured: boolean;
  host?: string;
  configPath?: string;
  message?: string;
}

/**
 * Main logout command handler
 */
export async function authLogoutCommand(opts: LogoutOptions): Promise<void> {
  const config = getConfig();
  const configPath = getConfigFilePath();
  const wasConfigured = isConfigured();
  
  const result: LogoutResult = {
    success: true,
    wasConfigured,
    configPath,
  };
  
  if (wasConfigured) {
    result.host = config.host;
    
    // Clear credentials
    clearAuthConfig();
    result.message = 'Credentials cleared successfully';
  } else {
    result.message = 'No credentials were configured';
  }
  
  // JSON output
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  // Pretty output
  console.log(formatHeader({
    title: 'n8n Logout',
    icon: icons.logout,
    context: {},
  }));
  console.log('');
  
  if (wasConfigured) {
    console.log(theme.success(`${icons.success} Credentials cleared`));
    console.log('');
    console.log(chalk.dim(`  Host:       ${result.host}`));
    console.log(chalk.dim(`  Config:     ${result.configPath}`));
    console.log('');
    console.log(chalk.dim('To log in again:'));
    console.log('');
    console.log(chalk.cyan('  n8n auth login --host https://your-n8n.com --api-key YOUR_KEY'));
    console.log('');
  } else {
    console.log(chalk.dim('No credentials were configured.'));
    console.log('');
  }
}
