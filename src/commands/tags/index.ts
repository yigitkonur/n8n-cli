/**
 * Tags Command Index
 * Manages n8n tags from CLI
 */

import chalk from 'chalk';
import { formatHeader } from '../../core/formatters/header.js';
import { icons } from '../../core/formatters/theme.js';

// Re-export command handlers for CLI registration
export { tagsListCommand, type ListOptions as TagsListOptions } from './list.js';
export { tagsGetCommand, type GetOptions as TagsGetOptions } from './get.js';
export { tagsCreateCommand, type CreateOptions as TagsCreateOptions } from './create.js';
export { tagsUpdateCommand, type UpdateOptions as TagsUpdateOptions } from './update.js';
export { tagsDeleteCommand, type DeleteOptions as TagsDeleteOptions } from './delete.js';

/**
 * Show comprehensive tags help when no subcommand is provided
 */
export function showTagsHelp(): void {
  console.log(formatHeader({
    title: 'n8n Tags',
    icon: icons.tag,
    context: {},
  }));
  console.log('');
  
  console.log(chalk.bold('Commands:'));
  console.log('');
  console.log(`  ${chalk.cyan('n8n tags list')}              List all tags`);
  console.log(`  ${chalk.cyan('n8n tags get <id>')}          Get tag by ID`);
  console.log(`  ${chalk.cyan('n8n tags create')}            Create a new tag`);
  console.log(`  ${chalk.cyan('n8n tags update <id>')}       Update a tag`);
  console.log(`  ${chalk.cyan('n8n tags delete <id>')}       Delete a tag`);
  console.log('');
  
  console.log(chalk.bold('Examples:'));
  console.log('');
  console.log(chalk.dim('  List all tags:'));
  console.log(chalk.cyan('    n8n tags list'));
  console.log('');
  console.log(chalk.dim('  Create a tag:'));
  console.log(chalk.cyan('    n8n tags create --name "Production"'));
  console.log('');
  console.log(chalk.dim('  Update a tag:'));
  console.log(chalk.cyan('    n8n tags update abc123 --name "Staging"'));
  console.log('');
  console.log(chalk.dim('  Delete a tag:'));
  console.log(chalk.cyan('    n8n tags delete abc123'));
  console.log('');
  
  console.log(chalk.bold('Workflow Tags:'));
  console.log('');
  console.log(chalk.dim('  To manage tags on workflows, use:'));
  console.log(chalk.cyan('    n8n workflows tags <workflowId>              # View workflow tags'));
  console.log(chalk.cyan('    n8n workflows tags <workflowId> --set id1,id2  # Set workflow tags'));
  console.log('');
}
