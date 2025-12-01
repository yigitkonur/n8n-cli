/**
 * Workflows Export Command
 * Export workflow to JSON file in a clean, importable format
 */

import chalk from 'chalk';
import { writeFile } from 'node:fs/promises';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import type { GlobalOptions } from '../../types/global-options.js';

interface ExportOptions extends GlobalOptions {
  output?: string;
  json?: boolean;
  full?: boolean;
}

/**
 * Fields to strip from exported workflows for clean import
 * These are server-generated or environment-specific
 */
const STRIP_FIELDS = [
  'id',
  'versionId', 
  'createdAt',
  'updatedAt',
  'meta',
  'tags',
  'tagIds',
  'pinData',
  'staticData',
  'shared',
  'homeProject',
  'sharedWithProjects',
  'usedCredentials',
];

/**
 * Clean workflow for export by removing server-generated fields
 */
function cleanWorkflowForExport(workflow: any, full = false): any {
  if (full) {
    // Return full workflow without stripping
    return workflow;
  }
  
  const cleaned = { ...workflow };
  
  // Remove top-level server fields
  for (const field of STRIP_FIELDS) {
    delete cleaned[field];
  }
  
  // Ensure required fields exist
  if (!cleaned.settings) {
    cleaned.settings = { executionOrder: 'v1' };
  }
  
  if (!cleaned.connections) {
    cleaned.connections = {};
  }
  
  return cleaned;
}

export async function workflowsExportCommand(id: string, opts: ExportOptions): Promise<void> {
  const startTime = Date.now();
  
  try {
    const client = getApiClient();
    
    // Fetch workflow
    const workflow = await client.getWorkflow(id);
    
    // Clean for export
    const exportedWorkflow = cleanWorkflowForExport(workflow, opts.full);
    
    // JSON output mode (to stdout)
    if (opts.json && !opts.output) {
      outputJson(exportedWorkflow);
      return;
    }
    
    // Save to file
    if (opts.output) {
      const jsonContent = JSON.stringify(exportedWorkflow, null, 2);
      await writeFile(opts.output, jsonContent, 'utf8');
      
      if (opts.json) {
        outputJson({
          success: true,
          id: workflow.id,
          name: workflow.name,
          path: opts.output,
          size: jsonContent.length,
        });
        return;
      }
      
      // Human-friendly output
      const durationMs = Date.now() - startTime;
      
      console.log(formatHeader({
        title: 'Workflow Exported',
        icon: icons.success,
        context: {
          'ID': workflow.id || id,
          'Name': workflow.name || 'Unnamed',
          'Nodes': `${workflow.nodes?.length || 0}`,
        },
      }));
      
      console.log('');
      console.log(chalk.green(`  ${icons.success} Saved to: ${opts.output}`));
      console.log(chalk.dim(`  Size: ${(jsonContent.length / 1024).toFixed(1)} KB`));
      console.log(chalk.dim(`  Time: ${durationMs}ms`));
      
      if (!opts.full) {
        console.log('');
        console.log(chalk.dim('  Note: Server-generated fields were stripped for clean import.'));
        console.log(chalk.dim('  Use --full to include all fields.'));
      }
      
      const outputPath = opts.output;
      console.log(formatNextActions([
        { command: `n8n workflows import ${outputPath}`, description: 'Import this workflow' },
        { command: `cat ${outputPath} | jq .nodes`, description: 'Inspect nodes' },
      ]));
      
      return;
    }
    
    // No output specified, print to stdout
    console.log(JSON.stringify(exportedWorkflow, null, 2));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, { commandContext: 'workflows export' });
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  }
}
