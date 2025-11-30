/**
 * Templates Get Command
 * Get template details and download workflow
 */

import chalk from 'chalk';
import axios from 'axios';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { theme, icons } from '../../core/formatters/theme.js';

interface GetOptions {
  save?: string;
  json?: boolean;
}

const TEMPLATES_API = 'https://api.n8n.io/api/templates';

export async function templatesGetCommand(id: string, opts: GetOptions): Promise<void> {
  try {
    const response = await axios.get(`${TEMPLATES_API}/workflows/${id}`, {
      timeout: 10000,
    });
    
    const template = response.data.workflow;
    
    if (!template) {
      console.error(chalk.red(`\n${icons.error} Template ${id} not found`));
      process.exitCode = 1; return;
    }
    
    // JSON output mode (returns the workflow ready to import)
    if (opts.json) {
      outputJson(template);
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(template, { path: opts.save });
      console.log(chalk.green(`\n${icons.success} Template saved to ${opts.save}`));
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: template.name,
      icon: '📋',
      context: {
        'ID': id,
        'Nodes': `${template.nodes?.length || 0}`,
        'Author': template.user?.username || 'Unknown',
      },
    }));
    
    console.log('');
    
    // Description
    if (template.description) {
      console.log(theme.dim('  ' + template.description.slice(0, 200)));
      if (template.description.length > 200) {
        console.log(theme.dim('  ...'));
      }
      console.log('');
    }
    
    // Categories/Tags
    if (template.categories && template.categories.length > 0) {
      console.log(chalk.cyan('  Categories: ') + template.categories.map((c: any) => 
        chalk.dim(typeof c === 'string' ? c : c.name)
      ).join(', '));
      console.log('');
    }
    
    // Nodes
    if (template.nodes && template.nodes.length > 0) {
      console.log(formatDivider(`Nodes (${template.nodes.length})`));
      
      const nodeData = template.nodes.map((n: any) => ({
        name: n.name,
        type: n.type?.replace('n8n-nodes-base.', '').replace('nodes-base.', ''),
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
            width: 30,
            formatter: columnFormatters.truncate(29),
          },
        ],
        limit: 15,
        showIndex: true,
      });
      
      console.log(tableOutput);
    }
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n templates get ${id} --save workflow.json`, description: 'Download template' },
      { command: `n8n workflows validate workflow.json`, description: 'Validate after download' },
      { command: `open https://n8n.io/workflows/${id}`, description: 'View on n8n.io' },
    ]));
    
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(chalk.red(`\n${icons.error} Template ${id} not found`));
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error(chalk.red(`\n${icons.error} Cannot reach n8n templates API`));
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    }
    process.exitCode = 1; return;
  }
}
