/**
 * Workflows Create Command
 * Create new workflow from file or stdin
 */

import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { getApiClient } from '../../core/api/client.js';
import { jsonParse } from '../../core/json-parser.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { stripReadOnlyProperties } from '../../core/sanitizer.js';
import { validateBeforeApi, displayValidationErrors } from '../../core/validation/index.js';

interface CreateOptions {
  file?: string;
  name?: string;
  active?: boolean;
  dryRun?: boolean;
  skipValidation?: boolean;
  json?: boolean;
}

export async function workflowsCreateCommand(opts: CreateOptions): Promise<void> {
  try {
    if (!opts.file) {
      console.error(chalk.red(`\n${icons.error} Please provide --file with workflow JSON`));
      process.exitCode = 1; return;
    }
    
    const content = await readFile(opts.file, 'utf8');
    const workflow = jsonParse(content, { repairJSON: true }) as any;
    
    if (!workflow) {
      console.error(chalk.red(`\n${icons.error} Failed to parse workflow from ${opts.file}`));
      process.exitCode = 1; return;
    }
    
    // Override name if provided
    if (opts.name) {
      workflow.name = opts.name;
    }
    
    // Ensure workflow has a name
    if (!workflow.name) {
      workflow.name = `Imported Workflow ${new Date().toISOString().split('T')[0]}`;
    }
    
    // Ensure workflow has required settings (n8n API requires this)
    if (!workflow.settings) {
      workflow.settings = { executionOrder: 'v1' };
    }
    
    // Ensure workflow has connections object
    if (!workflow.connections) {
      workflow.connections = {};
    }
    
    // Validate workflow before API call
    const validation = validateBeforeApi(workflow, {
      rawSource: content,
      skipValidation: opts.skipValidation,
      json: opts.json,
    });
    const cleanedWorkflow = stripReadOnlyProperties(workflow);
    
    // Dry-run mode: preview what would be created without actually creating
    if (opts.dryRun) {
      if (opts.json) {
        outputJson({
          dryRun: true,
          valid: validation.valid,
          payload: cleanedWorkflow,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        process.exitCode = validation.valid ? 0 : 1;
        return;
      }
      
      console.log(formatHeader({
        title: 'Dry Run Preview',
        icon: icons.info,
        context: {
          'Mode': 'Preview only (no workflow created)',
          'Validation': validation.valid ? 'Passed' : 'Failed',
        },
      }));
      
      console.log('');
      console.log(formatDivider('Workflow Details'));
      console.log(chalk.dim(`  Name: ${cleanedWorkflow.name}`));
      console.log(chalk.dim(`  Nodes: ${cleanedWorkflow.nodes?.length || 0}`));
      console.log(chalk.dim(`  Connections: ${Object.keys(cleanedWorkflow.connections || {}).length}`));
      
      if (validation.errors.length > 0) {
        console.log('');
        console.log(formatDivider(`Validation Errors (${validation.errors.length})`));
        validation.errors.slice(0, 5).forEach((err, i) => {
          console.log(chalk.red(`  ${i + 1}. ${err}`));
        });
      }
      
      if (validation.warnings.length > 0) {
        console.log('');
        console.log(formatDivider(`Warnings (${validation.warnings.length})`));
        validation.warnings.slice(0, 5).forEach((warn, i) => {
          console.log(chalk.yellow(`  ${i + 1}. ${warn}`));
        });
      }
      
      console.log('');
      console.log(formatDivider('Payload Preview'));
      console.log(chalk.dim(JSON.stringify(cleanedWorkflow, null, 2).slice(0, 500)));
      if (JSON.stringify(cleanedWorkflow).length > 500) {
        console.log(chalk.dim('  ... (truncated)'));
      }
      
      console.log('');
      console.log(chalk.cyan(`💡 To create this workflow, run without --dry-run`));
      console.log(formatNextActions([
        { command: `n8n workflows create --file ${opts.file}`, description: 'Create workflow' },
        { command: `n8n workflows validate --file ${opts.file}`, description: 'Full validation' },
      ]));
      
      process.exitCode = validation.valid ? 0 : 1;
      return;
    }
    
    // Block on validation errors (unless --skip-validation)
    if (!validation.shouldProceed) {
      displayValidationErrors(validation, { json: opts.json, context: 'create' });
      return;
    }
    
    // Show warnings but proceed
    if (validation.warnings.length > 0 && !opts.json) {
      console.log(chalk.yellow(`  ${icons.warning} ${validation.warnings.length} validation warning(s) - proceeding anyway`));
    }
    
    const client = getApiClient();
    const created = await client.createWorkflow(cleanedWorkflow);
    
    // Activate if requested
    if (opts.active && created.id) {
      await client.activateWorkflow(created.id);
      created.active = true;
    }
    
    // JSON output
    if (opts.json) {
      outputJson(created);
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Workflow Created',
      icon: icons.success,
      context: {
        'ID': created.id || 'Unknown',
        'Name': created.name || 'Unnamed',
        'Active': created.active ? 'Yes' : 'No',
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Workflow created successfully!`));
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n workflows get ${created.id}`, description: 'View workflow' },
      ...(!created.active ? [{ command: `n8n workflows activate ${created.id}`, description: 'Activate workflow' }] : []),
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1; 
  }
}
