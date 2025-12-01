/**
 * Templates List-Tasks Command
 * Lists available task types for --by-task template search
 */

import { formatHeader } from '../../core/formatters/header.js';
import { formatTable } from '../../core/formatters/table.js';
import { outputJson } from '../../core/formatters/json.js';
import { TASK_DEFINITIONS } from '../../types/templates.js';

interface ListTasksOptions {
  json?: boolean;
}

export async function templatesListTasksCommand(opts: ListTasksOptions): Promise<void> {
  // JSON output mode
  if (opts.json) {
    outputJson({
      tasks: TASK_DEFINITIONS.map(t => ({
        task: t.task,
        description: t.description,
        keyNodes: t.nodes.split(', '),
      })),
    });
    return;
  }
  
  // Human-friendly output
  console.log(formatHeader({
    title: 'Available Template Tasks',
    icon: '📋',
    context: {
      'Total': `${TASK_DEFINITIONS.length} tasks`,
    },
  }));
  
  console.log('');
  
  const tableData = TASK_DEFINITIONS.map(t => ({
    task: t.task,
    description: t.description,
    nodes: t.nodes,
  }));
  
  const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
    columns: [
      { key: 'task', header: 'Task', width: 22 },
      { key: 'description', header: 'Description', width: 42 },
      { key: 'nodes', header: 'Key Nodes', width: 26 },
    ],
    showIndex: true,
  });
  
  console.log(tableOutput);
  
  console.log('\n💡 Usage: n8n templates search --by-task <task_name>');
  console.log('   Example: n8n templates search --by-task ai_automation');
}
