/**
 * Variables Command Index
 * Manages n8n environment variables from CLI
 */

import chalk from 'chalk';
import { formatHeader } from '../../core/formatters/header.js';
import { icons } from '../../core/formatters/theme.js';

// Re-export command handlers for CLI registration
export { variablesListCommand, type ListOptions as VariablesListOptions } from './list.js';
export { variablesCreateCommand, type CreateOptions as VariablesCreateOptions } from './create.js';
export { variablesUpdateCommand, type UpdateOptions as VariablesUpdateOptions } from './update.js';
export { variablesDeleteCommand, type DeleteOptions as VariablesDeleteOptions } from './delete.js';

/**
 * Show comprehensive variables help when no subcommand is provided
 */
export function showVariablesHelp(): void {
  console.log(formatHeader({
    title: 'n8n Variables',
    icon: icons.variable,
    context: {},
  }));
  console.log('');
  
  console.log(chalk.bold('Commands:'));
  console.log('');
  console.log(`  ${chalk.cyan('n8n variables list')}                    List all variables`);
  console.log(`  ${chalk.cyan('n8n variables create')}                  Create a new variable`);
  console.log(`  ${chalk.cyan('n8n variables update <id>')}             Update a variable`);
  console.log(`  ${chalk.cyan('n8n variables delete <id>')}             Delete a variable`);
  console.log('');
  
  console.log(chalk.bold('Examples:'));
  console.log('');
  console.log(chalk.dim('  List all variables:'));
  console.log(chalk.cyan('    n8n variables list'));
  console.log('');
  console.log(chalk.dim('  Create a variable:'));
  console.log(chalk.cyan('    n8n variables create --key API_URL --value "https://api.example.com"'));
  console.log('');
  console.log(chalk.dim('  Update a variable:'));
  console.log(chalk.cyan('    n8n variables update abc123 --key API_URL --value "https://new-api.example.com"'));
  console.log('');
  console.log(chalk.dim('  Delete a variable:'));
  console.log(chalk.cyan('    n8n variables delete abc123'));
  console.log('');
  
  console.log(chalk.bold.yellow('Key Format:'));
  console.log('');
  console.log(chalk.dim('  Variable keys must:'));
  console.log(chalk.dim('    • Start with a letter or underscore'));
  console.log(chalk.dim('    • Contain only letters, numbers, and underscores'));
  console.log(chalk.dim('    • Example: MY_API_KEY, config_value_1'));
  console.log('');
  
  console.log(chalk.bold.red('⚠️  License Requirement:'));
  console.log('');
  console.log(chalk.dim('  Variables require n8n Enterprise or Pro license with feat:variables.'));
  console.log(chalk.dim('  Community edition will return HTTP 403 (license error).'));
  console.log('');
}
