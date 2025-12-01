/**
 * Workflow Tags Command
 * Get or set tags on a workflow
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable } from '../../core/formatters/table.js';
import { getConfig } from '../../core/config/loader.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { confirmAction } from '../../utils/prompts.js';

export interface TagsOptions {
  set?: string;
  force?: boolean;
  json?: boolean;
}

export async function workflowsTagsCommand(workflowId: string, opts: TagsOptions): Promise<void> {
  try {
    const client = getApiClient();
    const config = getConfig();
    
    // If --set is provided, update tags
    if (opts.set !== undefined) {
      const tagIds = opts.set.split(',').map(id => id.trim()).filter(id => id);
      
      // Confirm unless --force is used
      if (!opts.force && !opts.json) {
        const confirmed = await confirmAction(
          `Replace tags on workflow "${workflowId}" with ${tagIds.length} tag(s)?`,
          { force: opts.force }
        );
        if (!confirmed) {
          console.log(chalk.yellow('  Operation cancelled.'));
          return;
        }
      }
      
      const tags = await client.updateWorkflowTags(workflowId, tagIds);
      
      // JSON output mode
      if (opts.json) {
        outputJson({
          success: true,
          workflowId,
          tags,
        });
        return;
      }
      
      // Human-friendly output
      console.log(formatHeader({
        title: 'Workflow Tags Updated',
        icon: icons.success,
        host: config.host ? new URL(config.host).host : undefined,
        context: {
          'Workflow ID': workflowId,
          'Tags Count': `${tags.length}`,
        },
      }));
      
      console.log('');
      console.log(chalk.green(`  ${icons.success} Workflow tags updated successfully!`));
      console.log('');
      
      if (tags.length > 0) {
        console.log(chalk.bold('  Applied Tags:'));
        for (const tag of tags) {
          console.log(`    • ${chalk.cyan(tag.name)} (${chalk.dim(tag.id)})`);
        }
        console.log('');
      }
      
      return;
    }
    
    // Otherwise, get current tags
    const tags = await client.getWorkflowTags(workflowId);
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        workflowId,
        tags,
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Workflow Tags',
      icon: icons.tag,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'Workflow ID': workflowId,
        'Tags Count': `${tags.length}`,
      },
    }));
    
    console.log('');
    
    if (tags.length === 0) {
      console.log(chalk.yellow('  No tags assigned to this workflow.'));
      console.log('');
      console.log(formatNextActions([
        { command: 'n8n tags list', description: 'View available tags' },
        { command: `n8n workflows tags ${workflowId} --set tagId1,tagId2`, description: 'Assign tags to this workflow' },
      ]));
      return;
    }
    
    // Display tags
    const tableData = tags.map((t: any) => ({
      id: t.id,
      name: t.name,
    }));
    
    const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'id', header: 'ID', width: 20 },
        { key: 'name', header: 'Name', width: 30 },
      ],
      showIndex: true,
    });
    
    console.log(tableOutput);
    console.log('');
    
    // Next actions
    const tagIds = tags.map(t => t.id).join(',');
    console.log(formatNextActions([
      { command: `n8n workflows tags ${workflowId} --set ${tagIds},newTagId`, description: 'Add a tag' },
      { command: `n8n workflows tags ${workflowId} --set ""`, description: 'Remove all tags' },
      { command: `n8n workflows get ${workflowId}`, description: 'View workflow details' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'workflows tags');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
