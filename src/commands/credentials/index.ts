/**
 * Credentials Command Index
 * Manages n8n credentials from CLI
 */

import chalk from 'chalk';
import { formatHeader } from '../../core/formatters/header.js';
import { icons } from '../../core/formatters/theme.js';

// Re-export command handlers for CLI registration
export { credentialsListCommand, type ListOptions as CredentialsListOptions } from './list.js';
export { credentialsSchemaCommand, type SchemaOptions as CredentialsSchemaOptions } from './schema.js';
export { credentialsCreateCommand, type CreateOptions as CredentialsCreateOptions } from './create.js';
export { credentialsDeleteCommand, type DeleteOptions as CredentialsDeleteOptions } from './delete.js';

/**
 * Show comprehensive credentials help when no subcommand is provided
 */
export function showCredentialsHelp(): void {
  console.log(formatHeader({
    title: 'n8n Credentials',
    icon: icons.credential,
    context: {},
  }));
  console.log('');
  
  console.log(chalk.bold('Commands:'));
  console.log('');
  console.log(`  ${chalk.cyan('n8n credentials list')}              List all credentials`);
  console.log(`  ${chalk.cyan('n8n credentials schema <type>')}     Get credential type schema`);
  console.log(`  ${chalk.cyan('n8n credentials create')}            Create a new credential`);
  console.log(`  ${chalk.cyan('n8n credentials delete <id>')}       Delete a credential`);
  console.log('');
  
  console.log(chalk.bold('Examples:'));
  console.log('');
  console.log(chalk.dim('  List all credentials:'));
  console.log(chalk.cyan('    n8n credentials list'));
  console.log('');
  console.log(chalk.dim('  View schema for a credential type:'));
  console.log(chalk.cyan('    n8n credentials schema githubApi'));
  console.log('');
  console.log(chalk.dim('  Create credential from file:'));
  console.log(chalk.cyan('    n8n credentials create --type githubApi --name "My GitHub" --data @creds.json'));
  console.log('');
  console.log(chalk.dim('  Delete a credential:'));
  console.log(chalk.cyan('    n8n credentials delete abc123'));
  console.log('');
  
  console.log(chalk.bold.yellow('Security Notes:'));
  console.log('');
  console.log(chalk.dim('  • Credential values are masked in output for security'));
  console.log(chalk.dim('  • Use --data @file.json to avoid secrets in shell history'));
  console.log(chalk.dim('  • Credentials are stored encrypted in n8n'));
  console.log('');
}
