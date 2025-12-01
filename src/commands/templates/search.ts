/**
 * Templates Search Command
 * Supports 4 search modes: keyword, by_nodes, by_task, by_metadata
 * 
 * - Keyword mode (default): Uses n8n.io public API for backward compatibility
 * - By Nodes mode: Local SQLite database search by node types
 * - By Task mode: Local search using predefined task-to-nodes mappings
 * - By Metadata mode: Local search filtering by complexity, setup time, etc.
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
import { getDatabase } from '../../core/db/adapter.js';
import { TemplateService } from '../../core/templates/service.js';
import { type TemplateInfo, type PaginatedResponse, type MetadataFilters, TEMPLATE_TASKS } from '../../types/templates.js';

export interface SearchOptions {
  // Existing options
  category?: string;
  limit?: string;
  save?: string;
  json?: boolean;
  
  // New: Search mode flags
  byNodes?: string;      // Comma-separated node types
  byTask?: string;       // Task name
  
  // New: Metadata filters (trigger by_metadata mode)
  complexity?: 'simple' | 'medium' | 'complex';
  maxSetup?: string;     // Max setup minutes
  minSetup?: string;     // Min setup minutes
  service?: string;      // Required service
  audience?: string;     // Target audience
  
  // New: Force local database
  local?: boolean;
}

const TEMPLATES_API = 'https://api.n8n.io/api/templates';

/**
 * Determine search mode based on options
 */
type SearchMode = 'keyword' | 'by_nodes' | 'by_task' | 'by_metadata';

function determineSearchMode(opts: SearchOptions): SearchMode {
  if (opts.byNodes) {return 'by_nodes';}
  if (opts.byTask) {return 'by_task';}
  if (opts.complexity || opts.maxSetup || opts.minSetup || opts.service || opts.audience) {
    return 'by_metadata';
  }
  return 'keyword';
}

/**
 * Check if local search should be used
 */
function shouldUseLocalSearch(opts: SearchOptions): boolean {
  return opts.local || 
    Boolean(opts.byNodes) || 
    Boolean(opts.byTask) || 
    Boolean(opts.complexity) || 
    Boolean(opts.maxSetup) || 
    Boolean(opts.minSetup) || 
    Boolean(opts.service) || 
    Boolean(opts.audience);
}

export async function templatesSearchCommand(query: string | undefined, opts: SearchOptions): Promise<void> {
  const useLocal = shouldUseLocalSearch(opts);
  
  if (useLocal) {
    return localTemplateSearch(query, opts);
  }
  
  // Default: Remote n8n.io API (existing behavior for backward compatibility)
  if (!query) {
    console.error(chalk.red(`\n${icons.error} Query is required for keyword search`));
    console.log(chalk.dim('  Use --by-nodes, --by-task, or metadata filters for local search'));
    console.log(chalk.dim('  Example: n8n templates search --by-task ai_automation'));
    process.exitCode = 1;
    return;
  }
  
  return remoteTemplateSearch(query, opts);
}

/**
 * Local template search using SQLite database
 */
async function localTemplateSearch(query: string | undefined, opts: SearchOptions): Promise<void> {
  const limit = parseInt(opts.limit || '10', 10);
  const mode = determineSearchMode(opts);
  
  try {
    const db = await getDatabase();
    const service = new TemplateService(db);
    
    let result: PaginatedResponse<TemplateInfo>;
    let modeLabel: string;
    let modeContext: Record<string, string> = {};
    
    switch (mode) {
      case 'by_nodes': {
        const nodeTypes = opts.byNodes!.split(',').map(n => n.trim());
        result = await service.listNodeTemplates(nodeTypes, limit);
        modeLabel = 'By Nodes';
        modeContext = { 'Nodes': nodeTypes.join(', ') };
        break;
      }
      
      case 'by_task': {
        const task = opts.byTask!;
        if (!TEMPLATE_TASKS.includes(task as any)) {
          console.error(chalk.red(`\n${icons.error} Unknown task: ${task}`));
          console.log(chalk.dim(`  Available tasks: ${  TEMPLATE_TASKS.join(', ')}`));
          console.log(chalk.dim('  Run: n8n templates list-tasks'));
          process.exitCode = 1;
          return;
        }
        result = await service.getTemplatesForTask(task, limit);
        modeLabel = 'By Task';
        modeContext = { 'Task': task };
        break;
      }
      
      case 'by_metadata': {
        const filters: MetadataFilters = {
          complexity: opts.complexity,
          maxSetupMinutes: opts.maxSetup ? parseInt(opts.maxSetup, 10) : undefined,
          minSetupMinutes: opts.minSetup ? parseInt(opts.minSetup, 10) : undefined,
          requiredService: opts.service,
          targetAudience: opts.audience,
        };
        result = await service.searchTemplatesByMetadata(filters, limit);
        modeLabel = 'By Metadata';
        const filterParts: string[] = [];
        if (opts.complexity) {filterParts.push(`complexity=${opts.complexity}`);}
        if (opts.maxSetup) {filterParts.push(`max-setup=${opts.maxSetup}min`);}
        if (opts.service) {filterParts.push(`service=${opts.service}`);}
        if (opts.audience) {filterParts.push(`audience=${opts.audience}`);}
        modeContext = { 'Filters': filterParts.join(', ') || 'none' };
        break;
      }
      
      default: {
        // Local keyword search
        result = await service.searchTemplates(query || '', limit);
        modeLabel = 'Local Keyword';
        modeContext = query ? { 'Query': query } : {};
        break;
      }
    }
    
    formatLocalSearchOutput(result, opts, modeLabel, modeContext);
    
  } catch (error: any) {
    if (error.message?.includes('Database not found')) {
      console.error(chalk.red(`\n${icons.error} Template database not found`));
      console.log(chalk.dim('  The local template database is required for this search mode.'));
      console.log(chalk.dim('  Use keyword search for n8n.io API: n8n templates search "query"'));
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    }
    process.exitCode = 1;
  }
}

/**
 * Format and output local search results
 */
function formatLocalSearchOutput(
  result: PaginatedResponse<TemplateInfo>, 
  opts: SearchOptions,
  modeLabel: string,
  modeContext: Record<string, string>
): void {
  // JSON output mode
  if (opts.json) {
    outputJson({
      searchMode: modeLabel.toLowerCase().replace(' ', '_'),
      ...modeContext,
      total: result.total,
      templates: result.items,
      hasMore: result.hasMore,
    });
    return;
  }
  
  // Save to file if requested
  if (opts.save) {
    saveToJson(result.items, { path: opts.save });
  }
  
  // Human-friendly output
  console.log(formatHeader({
    title: `Template Search (${modeLabel})`,
    icon: '📋',
    context: {
      'Found': `${result.total} templates`,
      ...modeContext,
    },
  }));
  
  console.log('');
  
  if (result.items.length === 0) {
    console.log(chalk.yellow('  No templates found matching your criteria.'));
    console.log(chalk.dim('\n  Tips:'));
    console.log(chalk.dim('  • Try broader search terms or fewer filters'));
    console.log(chalk.dim('  • Use --by-task to search by common tasks'));
    console.log(chalk.dim('  • List available tasks: n8n templates list-tasks'));
    return;
  }
  
  // Format as table with metadata if available
  const tableData = result.items.map((t: TemplateInfo) => ({
    id: t.id,
    name: t.name,
    complexity: t.metadata?.complexity || '-',
    views: t.views,
    author: t.author?.username || '-',
  }));
  
  const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
    columns: [
      { key: 'id', header: 'ID', width: 8 },
      { 
        key: 'name', 
        header: 'Name', 
        width: 40,
        formatter: columnFormatters.truncate(39),
      },
      { key: 'complexity', header: 'Complexity', width: 12 },
      { key: 'views', header: 'Views', width: 8, align: 'right' },
      { key: 'author', header: 'Author', width: 12 },
    ],
    limit: 15,
    showIndex: true,
  });
  
  console.log(tableOutput);
  
  // Summary
  console.log(`\n${  formatSummary({ total: result.total, showing: result.items.length })}`);
  
  // Next actions
  if (result.items.length > 0) {
    console.log(formatNextActions([
      { command: `n8n templates get ${result.items[0].id}`, description: 'View template details' },
      { command: `n8n templates get ${result.items[0].id} --save workflow.json`, description: 'Download template' },
    ]));
  }
  
  // Export footer
  if (result.items.length > 0 && !opts.save) {
    console.log(formatExportFooter('templates-search', 'templates search ...', opts.save));
  }
}

/**
 * Remote template search using n8n.io API (original implementation)
 */
async function remoteTemplateSearch(query: string, opts: SearchOptions): Promise<void> {
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
        searchMode: 'keyword',
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
      console.log(chalk.dim('  • Use local search: --by-task ai_automation'));
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
    console.log(`\n${  formatSummary({ total: templates.length })}`);
    
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
      console.log(chalk.dim('  Or use local search: n8n templates search --by-task ai_automation'));
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    }
    process.exitCode = 1; 
  }
}
