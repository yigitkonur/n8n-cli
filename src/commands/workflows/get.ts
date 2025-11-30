/**
 * Workflows Get Command
 * Get workflow details from n8n instance
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { theme, icons, formatBoolean } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';

interface GetOptions {
  mode?: string;
  save?: string;
  json?: boolean;
}

export async function workflowsGetCommand(id: string, opts: GetOptions): Promise<void> {
  const mode = opts.mode || 'full';
  
  try {
    const client = getApiClient();
    const workflow = await client.getWorkflow(id);
    
    // JSON output mode
    if (opts.json) {
      outputJson(workflow);
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(workflow, { path: opts.save });
    }
    
    // Output based on mode
    switch (mode) {
      case 'minimal':
        outputMinimal(workflow);
        break;
      case 'structure':
        outputStructure(workflow);
        break;
      case 'details':
        outputDetails(workflow);
        break;
      default:
        outputFull(workflow);
    }
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exit(1);
  }
}

function outputMinimal(workflow: any): void {
  console.log(formatHeader({
    title: workflow.name,
    icon: icons.workflow,
    context: {
      'ID': workflow.id,
      'Active': workflow.active ? 'Yes' : 'No',
    },
  }));
}

function outputStructure(workflow: any): void {
  console.log(formatHeader({
    title: workflow.name,
    icon: icons.workflow,
    context: {
      'ID': workflow.id,
      'Nodes': `${workflow.nodes?.length || 0}`,
    },
  }));
  
  console.log('');
  
  if (workflow.nodes && workflow.nodes.length > 0) {
    console.log(formatDivider('Nodes'));
    
    const nodeData = workflow.nodes.map((n: any) => ({
      name: n.name,
      type: n.type?.split('.').pop() || n.type,
      position: `${n.position?.[0]}, ${n.position?.[1]}`,
    }));
    
    const tableOutput = formatTable(nodeData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'name', header: 'Name', width: 30 },
        { key: 'type', header: 'Type', width: 25 },
        { key: 'position', header: 'Position', width: 15 },
      ],
      limit: 30,
      showIndex: true,
    });
    
    console.log(tableOutput);
  }
}

function outputDetails(workflow: any): void {
  outputFull(workflow);
  // Could add execution stats here if needed
}

function outputFull(workflow: any): void {
  // Header
  console.log(formatHeader({
    title: workflow.name,
    icon: workflow.active ? '✅' : '⏸️',
    context: {
      'ID': workflow.id,
      'Active': workflow.active ? 'Yes' : 'No',
      'Updated': new Date(workflow.updatedAt).toLocaleString(),
    },
  }));
  
  console.log('');
  
  // Description if present
  if (workflow.description) {
    console.log(theme.dim('  ' + workflow.description));
    console.log('');
  }
  
  // Tags
  if (workflow.tags && workflow.tags.length > 0) {
    console.log(chalk.cyan('  Tags: ') + workflow.tags.map((t: any) => 
      chalk.dim(`#${typeof t === 'string' ? t : t.name}`)
    ).join(' '));
    console.log('');
  }
  
  // Nodes
  if (workflow.nodes && workflow.nodes.length > 0) {
    console.log(formatDivider(`Nodes (${workflow.nodes.length})`));
    
    const nodeData = workflow.nodes.map((n: any) => ({
      name: n.name,
      type: n.type?.replace('n8n-nodes-base.', '').replace('nodes-base.', ''),
      disabled: n.disabled,
    }));
    
    const tableOutput = formatTable(nodeData as unknown as Record<string, unknown>[], {
      columns: [
        { 
          key: 'name', 
          header: 'Name', 
          width: 35,
          formatter: columnFormatters.truncate(34),
        },
        { 
          key: 'type', 
          header: 'Type', 
          width: 25,
          formatter: columnFormatters.truncate(24),
        },
        { 
          key: 'disabled', 
          header: 'Enabled', 
          width: 9,
          formatter: (v) => v ? chalk.red('✗') : chalk.green('✓'),
        },
      ],
      limit: 20,
      showIndex: true,
    });
    
    console.log(tableOutput);
    
    if (workflow.nodes.length > 20) {
      console.log(chalk.dim(`  ... and ${workflow.nodes.length - 20} more nodes`));
    }
  }
  
  // Connections summary
  if (workflow.connections) {
    const connectionCount = Object.keys(workflow.connections).length;
    console.log(formatDivider('Connections'));
    console.log(`  ${chalk.cyan(connectionCount)} nodes with outgoing connections`);
    console.log('');
  }
  
  // Settings
  if (workflow.settings) {
    console.log(formatDivider('Settings'));
    const settings = workflow.settings;
    if (settings.executionOrder) console.log(`  Execution Order: ${settings.executionOrder}`);
    if (settings.timezone) console.log(`  Timezone: ${settings.timezone}`);
    if (settings.errorWorkflow) console.log(`  Error Workflow: ${settings.errorWorkflow}`);
    console.log('');
  }
  
  // Next actions
  console.log(formatNextActions([
    { command: `n8n workflows validate ${workflow.id}`, description: 'Validate workflow' },
    { command: `n8n executions list --workflow-id ${workflow.id}`, description: 'View executions' },
    { command: `n8n workflows get ${workflow.id} --json --save workflow.json`, description: 'Export to JSON' },
  ]));
}
