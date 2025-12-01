/**
 * Workflows Import Command
 * Import workflow from JSON file
 */

import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getApiClient } from '../../core/api/client.js';
import { jsonParse } from '../../core/json-parser.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { stripReadOnlyProperties } from '../../core/sanitizer.js';
import { validateBeforeApi, displayValidationErrors } from '../../core/validation/index.js';
import type { GlobalOptions } from '../../types/global-options.js';

interface ImportOptions extends GlobalOptions {
  name?: string;
  dryRun?: boolean;
  activate?: boolean;
  skipValidation?: boolean;
  json?: boolean;
}

export async function workflowsImportCommand(filePath: string, opts: ImportOptions): Promise<void> {
  try {
    // Check file exists
    if (!existsSync(filePath)) {
      console.error(chalk.red(`\n${icons.error} File not found: ${filePath}`));
      process.exitCode = 1;
      return;
    }
    
    // Read and parse file
    const content = await readFile(filePath, 'utf8');
    const workflow = jsonParse(content, { repairJSON: true }) as any;
    
    if (!workflow) {
      console.error(chalk.red(`\n${icons.error} Failed to parse workflow from ${filePath}`));
      process.exitCode = 1;
      return;
    }
    
    // Override name if provided
    if (opts.name) {
      workflow.name = opts.name;
    }
    
    // Ensure workflow has a name
    if (!workflow.name) {
      workflow.name = `Imported Workflow ${new Date().toISOString().split('T')[0]}`;
    }
    
    // Ensure workflow has required settings
    if (!workflow.settings) {
      workflow.settings = { executionOrder: 'v1' };
    }
    
    // Ensure workflow has connections object
    if (!workflow.connections) {
      workflow.connections = {};
    }
    
    // Strip read-only properties
    const cleanedWorkflow = stripReadOnlyProperties(workflow);
    
    // Validate workflow before API call
    const validation = validateBeforeApi(cleanedWorkflow, {
      rawSource: content,
      skipValidation: opts.skipValidation,
      json: opts.json,
    });
    
    // Dry-run mode: validate and preview without creating
    if (opts.dryRun) {
      if (opts.json) {
        outputJson({
          dryRun: true,
          valid: validation.valid,
          file: filePath,
          name: cleanedWorkflow.name,
          nodes: cleanedWorkflow.nodes?.length || 0,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        process.exitCode = validation.valid ? 0 : 1;
        return;
      }
      
      console.log(formatHeader({
        title: 'Import Preview (Dry Run)',
        icon: icons.info,
        context: {
          'File': filePath,
          'Name': cleanedWorkflow.name,
          'Validation': validation.valid ? '✓ Passed' : '✗ Failed',
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
      console.log(chalk.cyan(`💡 To import this workflow, run without --dry-run`));
      console.log(formatNextActions([
        { command: `n8n workflows import ${filePath}`, description: 'Import workflow' },
        { command: `n8n workflows import ${filePath} --activate`, description: 'Import and activate' },
      ]));
      
      process.exitCode = validation.valid ? 0 : 1;
      return;
    }
    
    // Block on validation errors (unless --skip-validation)
    if (!validation.shouldProceed) {
      displayValidationErrors(validation, { json: opts.json, context: 'import' });
      return;
    }
    
    // Show warnings but proceed
    if (validation.warnings.length > 0 && !opts.json) {
      console.log(chalk.yellow(`  ⚠️  ${validation.warnings.length} validation warning(s) - proceeding anyway`));
    }
    
    // Create the workflow
    const client = getApiClient();
    const created = await client.createWorkflow(cleanedWorkflow);
    
    // Activate if requested
    if (opts.activate && created.id) {
      await client.activateWorkflow(created.id);
      created.active = true;
    }
    
    // JSON output
    if (opts.json) {
      outputJson({
        success: true,
        id: created.id,
        name: created.name,
        active: created.active,
        file: filePath,
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Workflow Imported',
      icon: icons.success,
      context: {
        'ID': created.id || 'Unknown',
        'Name': created.name || 'Unnamed',
        'Active': created.active ? 'Yes' : 'No',
      },
    }));
    
    console.log('');
    console.log(chalk.green(`  ${icons.success} Workflow imported successfully from ${filePath}`));
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n workflows get ${created.id}`, description: 'View workflow' },
      ...(!created.active ? [{ command: `n8n workflows update ${created.id} --activate`, description: 'Activate workflow' }] : []),
      { command: `n8n executions list --workflow-id ${created.id}`, description: 'View executions' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, { commandContext: 'workflows import' });
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  }
}
