/**
 * Config Commands
 * Display and manage CLI configuration
 */

import chalk from 'chalk';
import { 
  getConfig, 
  maskApiKey, 
  getActiveProfile, 
  getLoadedConfigPath,
  listProfiles,
  validateConfig,
} from '../../core/config/loader.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons, theme } from '../../core/formatters/theme.js';
import type { GlobalOptions } from '../../types/global-options.js';

interface ConfigShowOptions extends GlobalOptions {
  json?: boolean;
}

/**
 * Show current configuration
 */
export async function configShowCommand(opts: ConfigShowOptions): Promise<void> {
  const config = getConfig();
  const activeProfile = getActiveProfile();
  const configPath = getLoadedConfigPath();
  const profiles = listProfiles();
  const validation = validateConfig(config);
  
  // JSON output
  if (opts.json) {
    outputJson({
      host: config.host,
      apiKey: maskApiKey(config.apiKey),
      timeout: config.timeout,
      dbPath: config.dbPath,
      debug: config.debug,
      profile: activeProfile,
      configFile: configPath,
      availableProfiles: profiles.length > 0 ? profiles : undefined,
      valid: validation.valid,
      errors: validation.errors.length > 0 ? validation.errors : undefined,
    });
    return;
  }
  
  // Human-friendly output
  console.log(formatHeader({
    title: 'Current Configuration',
    icon: icons.auth,
    context: configPath ? { 'Source': configPath } : { 'Source': 'Environment/Defaults' },
  }));
  
  console.log('');
  
  // Connection settings
  console.log(formatDivider('Connection'));
  console.log(`  ${theme.key('Host:')}     ${theme.value(config.host)}`);
  console.log(`  ${theme.key('API Key:')}  ${theme.value(maskApiKey(config.apiKey))}`);
  console.log(`  ${theme.key('Timeout:')}  ${theme.value(`${config.timeout}ms`)}`);
  
  // Profile info
  if (profiles.length > 0) {
    console.log('');
    console.log(formatDivider('Profiles'));
    console.log(`  ${theme.key('Active:')}    ${theme.value(activeProfile || 'default')}`);
    console.log(`  ${theme.key('Available:')} ${theme.dim(profiles.join(', '))}`);
  }
  
  // Debug settings
  console.log('');
  console.log(formatDivider('Settings'));
  console.log(`  ${theme.key('Debug:')}   ${config.debug ? chalk.green('enabled') : chalk.dim('disabled')}`);
  console.log(`  ${theme.key('DB Path:')} ${theme.dim(config.dbPath || 'Not configured')}`);
  
  // Validation status
  console.log('');
  console.log(formatDivider('Validation'));
  if (validation.valid) {
    console.log(chalk.green(`  ${icons.success} Configuration is valid`));
  } else {
    console.log(chalk.red(`  ${icons.error} Configuration has errors:`));
    validation.errors.forEach(err => {
      console.log(chalk.dim(`    • ${err}`));
    });
  }
  
  // Environment overrides info
  const envOverrides: string[] = [];
  if (process.env.N8N_HOST) {envOverrides.push('N8N_HOST');}
  if (process.env.N8N_API_KEY) {envOverrides.push('N8N_API_KEY');}
  if (process.env.N8N_TIMEOUT) {envOverrides.push('N8N_TIMEOUT');}
  if (process.env.N8N_DEBUG) {envOverrides.push('N8N_DEBUG');}
  if (process.env.N8N_PROFILE) {envOverrides.push('N8N_PROFILE');}
  
  if (envOverrides.length > 0) {
    console.log('');
    console.log(formatDivider('Environment Overrides'));
    console.log(chalk.dim(`  Active: ${envOverrides.join(', ')}`));
  }
  
  // Next actions
  console.log(formatNextActions([
    { command: 'n8n auth login', description: 'Configure credentials' },
    { command: 'n8n health', description: 'Test connection' },
    ...(profiles.length > 0 
      ? [{ command: 'n8n --profile <name> config show', description: 'Switch profile' }]
      : []
    ),
  ]));
}

/**
 * Show config help
 */
export function showConfigHelp(): void {
  console.log(formatHeader({
    title: 'Config Commands',
    icon: icons.auth,
  }));
  
  console.log(`
  ${chalk.cyan('n8n config show')}       Display current configuration
  
${chalk.dim('Options:')}
  --json                 Output as JSON
  --profile <name>       Use specific profile

${chalk.dim('Examples:')}
  n8n config show
  n8n config show --json
  n8n --profile prod config show
`);
}
