/**
 * Nodes Get Command
 * Get detailed information about a specific n8n node
 */

import chalk from 'chalk';
import { getNodeRepository, type NodeInfo } from '../../core/db/nodes.js';
import { NodeTypeNormalizer } from '../../utils/node-type-normalizer.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatTable } from '../../core/formatters/table.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { theme, icons, formatBoolean } from '../../core/formatters/theme.js';

interface GetOptions {
  mode?: string;
  detail?: string;
  save?: string;
  json?: boolean;
}

export async function nodesGetCommand(nodeType: string, opts: GetOptions): Promise<void> {
  const mode = opts.mode || 'info';
  const detail = opts.detail || 'standard';
  
  try {
    const repo = await getNodeRepository();
    
    // Try to normalize the node type
    let normalizedType = nodeType;
    
    // If it doesn't contain a dot, assume it's a short name
    if (!nodeType.includes('.')) {
      // Try nodes-base first
      normalizedType = `nodes-base.${nodeType.toLowerCase()}`;
    } else {
      normalizedType = NodeTypeNormalizer.normalizeToShortForm(nodeType);
    }
    
    let node = repo.getNode(normalizedType);
    
    // If not found, try the original input
    if (!node && normalizedType !== nodeType) {
      node = repo.getNode(nodeType);
    }
    
    if (!node) {
      console.error(chalk.red(`\n${icons.error} Node not found: ${nodeType}`));
      console.log(chalk.dim('\n  Tips:'));
      console.log(chalk.dim('  • Use full node type: nodes-base.webhook'));
      console.log(chalk.dim(`  • Search for it: n8n nodes search "${nodeType}"`));
      process.exit(1);
    }
    
    // JSON output mode
    if (opts.json) {
      outputJson(node);
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(node, { path: opts.save });
    }
    
    // Output based on mode
    switch (mode) {
      case 'docs':
        outputDocs(node);
        break;
      case 'versions':
        outputVersions(node);
        break;
      default:
        outputInfo(node, detail);
    }
    
  } catch (error: any) {
    console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    process.exit(1);
  }
}

function outputInfo(node: NodeInfo, detail: string): void {
  // Header
  console.log(formatHeader({
    title: node.displayName,
    icon: node.isTrigger ? '⚡' : icons.node,
    context: {
      'Type': node.nodeType,
      'Category': node.category,
      'Package': node.package,
    },
  }));
  
  console.log('');
  
  // Description
  if (node.description) {
    console.log(theme.dim('  ' + node.description));
    console.log('');
  }
  
  // Quick info
  console.log(chalk.cyan('  Flags:'));
  console.log(`    ${formatBoolean(node.isTrigger)} Trigger   ${formatBoolean(node.isWebhook)} Webhook   ${formatBoolean(node.isAITool)} AI Tool`);
  console.log('');
  
  // Properties (based on detail level)
  if (node.properties && node.properties.length > 0) {
    const propsToShow = detail === 'minimal' ? 5 : detail === 'full' ? 50 : 15;
    
    console.log(formatDivider('Properties'));
    
    const propData = node.properties.slice(0, propsToShow).map((p: any) => ({
      name: p.name || p.displayName,
      type: p.type || 'unknown',
      required: p.required ? 'Yes' : 'No',
      default: p.default !== undefined ? String(p.default).slice(0, 20) : '-',
    }));
    
    const tableOutput = formatTable(propData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'name', header: 'Property', width: 25 },
        { key: 'type', header: 'Type', width: 12 },
        { key: 'required', header: 'Required', width: 10 },
        { key: 'default', header: 'Default', width: 20 },
      ],
      limit: propsToShow,
    });
    
    console.log(tableOutput);
    
    if (node.properties.length > propsToShow) {
      console.log(chalk.dim(`  ... and ${node.properties.length - propsToShow} more properties`));
    }
  }
  
  // Operations
  if (node.operations && node.operations.length > 0 && detail !== 'minimal') {
    console.log(formatDivider('Operations'));
    
    const opsToShow = detail === 'full' ? node.operations.length : 10;
    node.operations.slice(0, opsToShow).forEach((op: any) => {
      const name = op.name || op.value || op;
      const desc = op.description || '';
      console.log(`  ${chalk.green('•')} ${chalk.bold(name)}${desc ? chalk.dim(': ' + desc.slice(0, 50)) : ''}`);
    });
    
    if (node.operations.length > opsToShow) {
      console.log(chalk.dim(`  ... and ${node.operations.length - opsToShow} more operations`));
    }
    console.log('');
  }
  
  // Credentials
  if (node.credentials && node.credentials.length > 0) {
    console.log(formatDivider('Credentials'));
    node.credentials.forEach((cred: any) => {
      const name = cred.name || cred;
      console.log(`  ${chalk.yellow('🔑')} ${name}`);
    });
    console.log('');
  }
  
  // Next actions
  console.log(formatNextActions([
    { command: `n8n nodes get ${node.nodeType} --mode docs`, description: 'View documentation' },
    { command: `n8n nodes get ${node.nodeType} --detail full`, description: 'View all properties' },
    { command: `n8n nodes search "${node.displayName}"`, description: 'Find similar nodes' },
  ]));
}

function outputDocs(node: NodeInfo): void {
  // Markdown-style documentation output
  console.log(chalk.bold.cyan(`\n# ${node.displayName}\n`));
  console.log(chalk.dim(`Type: ${node.nodeType}`));
  console.log(chalk.dim(`Category: ${node.category}\n`));
  
  if (node.description) {
    console.log(node.description + '\n');
  }
  
  // Features
  console.log(chalk.bold('## Features\n'));
  if (node.isTrigger) console.log('- ⚡ Can trigger workflows');
  if (node.isWebhook) console.log('- 🌐 Supports webhooks');
  if (node.isAITool) console.log('- 🤖 Available as AI tool');
  console.log('');
  
  // Properties section
  if (node.properties && node.properties.length > 0) {
    console.log(chalk.bold('## Properties\n'));
    node.properties.slice(0, 20).forEach((prop: any) => {
      console.log(`### ${prop.displayName || prop.name}`);
      console.log(`- **Type:** ${prop.type || 'unknown'}`);
      if (prop.description) console.log(`- **Description:** ${prop.description}`);
      if (prop.default !== undefined) console.log(`- **Default:** \`${prop.default}\``);
      console.log('');
    });
  }
}

function outputVersions(node: NodeInfo): void {
  console.log(formatHeader({
    title: `${node.displayName} - Version Info`,
    icon: '📦',
    context: {
      'Current Version': node.version || 'Unknown',
      'Versioned': node.isVersioned ? 'Yes' : 'No',
    },
  }));
  
  console.log('');
  console.log(chalk.dim('  Note: Detailed version history requires API access.'));
  console.log(chalk.dim('  Use n8n workflows validate to check version compatibility.'));
}
