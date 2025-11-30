/**
 * Auth Command Index
 * Manages n8n CLI authentication with non-interactive first design
 */

import chalk from 'chalk';
import { formatHeader } from '../../core/formatters/header.js';
import { theme, icons } from '../../core/formatters/theme.js';

// Re-export command handlers for CLI registration
export { authLoginCommand, type LoginOptions } from './login.js';
export { authStatusCommand, type StatusOptions } from './status.js';
export { authLogoutCommand, type LogoutOptions } from './logout.js';

/**
 * Show comprehensive auth help when no subcommand is provided
 * Emphasizes non-interactive usage for agents/CI
 */
export function showAuthHelp(): void {
  console.log(formatHeader({
    title: 'n8n Authentication',
    icon: icons.auth,
    context: {},
  }));
  console.log('');
  
  console.log(chalk.bold('Commands:'));
  console.log('');
  console.log(`  ${chalk.cyan('n8n auth login')}     Configure n8n credentials`);
  console.log(`  ${chalk.cyan('n8n auth status')}    Show current authentication status`);
  console.log(`  ${chalk.cyan('n8n auth logout')}    Clear stored credentials`);
  console.log('');
  
  console.log(chalk.bold.yellow('Non-Interactive Login (Recommended for CI/Agents):'));
  console.log('');
  console.log(chalk.dim('  Using command-line flags:'));
  console.log(chalk.cyan('    n8n auth login --host https://your-n8n.com --api-key YOUR_API_KEY'));
  console.log('');
  console.log(chalk.dim('  Using environment variables:'));
  console.log(chalk.cyan('    export N8N_HOST=https://your-n8n.com'));
  console.log(chalk.cyan('    export N8N_API_KEY=your-api-key'));
  console.log(chalk.cyan('    n8n auth login'));
  console.log('');
  console.log(chalk.dim('  JSON output for automation:'));
  console.log(chalk.cyan('    n8n auth login --host https://n8n.com --api-key KEY --json'));
  console.log('');
  
  console.log(chalk.bold('Interactive Login:'));
  console.log('');
  console.log(chalk.dim('  For manual setup with prompts (opens browser for API key):'));
  console.log(chalk.cyan('    n8n auth login --interactive'));
  console.log('');
  
  console.log(chalk.bold('Configuration Storage:'));
  console.log('');
  console.log(chalk.dim('  Credentials are stored in ~/.n8nrc.json with secure permissions (600).'));
  console.log(chalk.dim('  You can also use environment variables which take precedence.'));
  console.log('');
  
  console.log(chalk.bold('Supported n8n Instances:'));
  console.log('');
  console.log(chalk.dim('  • n8n Cloud: https://app.n8n.cloud'));
  console.log(chalk.dim('  • Self-hosted: https://your-domain.com or http://localhost:5678'));
  console.log('');
  
  console.log(chalk.bold('Getting an API Key:'));
  console.log('');
  console.log(chalk.dim('  1. Open your n8n instance'));
  console.log(chalk.dim('  2. Navigate to Settings → API'));
  console.log(chalk.dim('  3. Create a new API key with appropriate permissions'));
  console.log('');
}
