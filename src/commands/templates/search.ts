/**
 * Templates Search Command
 * Search n8n workflow templates (uses n8n.io public API)
 */

import chalk from 'chalk';
import axios from 'axios';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatSummary } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';

interface SearchOptions {
  category?: string;
  limit?: string;
  save?: string;
  json?: boolean;
}

const TEMPLATES_API = 'https://api.n8n.io/api/templates';

export async function templatesSearchCommand(query: string, opts: SearchOptions): Promise<void> {
  const limit = parseInt(opts.limit || '10', 10);
  
  try {
    const params: any = {
      search: query,
      rows: limit,
    };
    
    if (opts.category) {
      params.category = opts.category;
    }
    
    const response = await axios.get(`${TEMPLATES_API}/search`, { 
      params,
      timeout: 10000,
    });
    
    const templates = response.data.workflows || [];
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        query,
        total: templates.length,
        templates,
      });
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(templates, { path: opts.save });
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: `Templates matching "${query}"`,
      icon: '📋',
      context: {
        'Found': `${templates.length} templates`,
        ...(opts.category && { 'Category': opts.category }),
      },
    }));
    
    console.log('');
    
    if (templates.length === 0) {
      console.log(chalk.yellow('  No templates found matching your query.'));
      console.log(chalk.dim('\n  Tips:'));
      console.log(chalk.dim('  • Try broader search terms'));
      console.log(chalk.dim('  • Browse by category: --category marketing'));
      process.exitCode = 0; return;
    }
    
    // Format as table
    const tableData = templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      nodes: t.totalViews || t.nodes?.length || '-',
      user: t.user?.username || '-',
    }));
    
    const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'id', header: 'ID', width: 8 },
        { 
          key: 'name', 
          header: 'Name', 
          width: 45,
          formatter: columnFormatters.truncate(44),
        },
        { key: 'nodes', header: 'Views', width: 8, align: 'right' },
        { key: 'user', header: 'Author', width: 15 },
      ],
      limit: 15,
      showIndex: true,
    });
    
    console.log(tableOutput);
    
    // Summary
    console.log('\n' + formatSummary({ total: templates.length }));
    
    // Next actions
    if (templates.length > 0) {
      console.log(formatNextActions([
        { command: `n8n templates get ${templates[0].id}`, description: 'View template details' },
        { command: `n8n templates get ${templates[0].id} --save workflow.json`, description: 'Download template' },
      ]));
    }
    
    // Export & jq filter hints
    if (templates.length > 0) {
      console.log(formatExportFooter('templates-search', `templates search "${query}"`, opts.save));
    }
    
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error(chalk.red(`\n${icons.error} Cannot reach n8n templates API`));
      console.log(chalk.dim('  Check your internet connection'));
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    }
    process.exitCode = 1; return;
  }
}
