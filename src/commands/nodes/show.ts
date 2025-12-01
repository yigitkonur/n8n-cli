/**
 * Nodes Show Command
 * Show detailed information about a specific n8n node
 * Enhanced version of 'get' with schema, minimal, and examples modes
 */

import chalk from 'chalk';
import { getNodeRepository, NodeRepository, type NodeInfo } from '../../core/db/nodes.js';
import { NodeTypeNormalizer } from '../../utils/node-type-normalizer.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatTable } from '../../core/formatters/table.js';
import { formatOperationsTree } from '../../core/formatters/tree.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { theme, icons, formatBoolean } from '../../core/formatters/theme.js';

interface ShowOptions {
  schema?: boolean;
  minimal?: boolean;
  examples?: boolean;
  mode?: string;
  detail?: string;
  save?: string;
  json?: boolean;
}

export async function nodesShowCommand(nodeType: string, opts: ShowOptions): Promise<void> {
  try {
    const repo = await getNodeRepository();
    
    // Normalize node type
    let normalizedType = nodeType;
    if (!nodeType.includes('.')) {
      normalizedType = `nodes-base.${nodeType.toLowerCase()}`;
    } else {
      normalizedType = NodeTypeNormalizer.normalizeToShortForm(nodeType);
    }
    
    let node = repo.getNode(normalizedType);
    
    // Fallback to original input
    if (!node && normalizedType !== nodeType) {
      node = repo.getNode(nodeType);
    }
    
    if (!node) {
      console.error(chalk.red(`\n${icons.error} Node not found: ${nodeType}`));
      console.log(chalk.dim('\n  Tips:'));
      console.log(chalk.dim('  • Use full node type: nodes-base.webhook'));
      console.log(chalk.dim(`  • Search for it: n8n nodes search "${nodeType}"`));
      process.exitCode = 1;
      return;
    }
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        ...node,
        fullType: NodeRepository.formatNodeType(node.nodeType),
      });
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(node, { path: opts.save });
    }
    
    // Determine output mode
    if (opts.schema) {
      outputSchema(node);
    } else if (opts.minimal) {
      outputMinimal(node);
    } else if (opts.examples) {
      outputExamples(node);
    } else {
      // Default or based on --mode
      switch (opts.mode) {
        case 'docs':
          outputDocs(node);
          break;
        case 'versions':
          outputVersions(node);
          break;
        default:
          outputInfo(node, opts.detail || 'standard');
      }
    }
    
  } catch (error: any) {
    console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    process.exitCode = 1;
  }
}

/**
 * Output detailed node info (default view)
 */
function outputInfo(node: NodeInfo, detail: string): void {
  const fullType = NodeRepository.formatNodeType(node.nodeType);
  
  console.log(formatHeader({
    title: node.displayName,
    icon: node.isTrigger ? '⚡' : icons.node,
    context: {
      'Type': fullType,
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
  
  // Operations (resource → operations tree)
  const operations = extractOperations(node);
  if (Object.keys(operations).length > 0 && detail !== 'minimal') {
    console.log(formatDivider('Operations'));
    console.log(formatOperationsTree(operations));
  }
  
  // Properties
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
      console.log(chalk.dim(`  Use --schema to view all properties\n`));
    }
  }
  
  // Credentials
  if (node.credentials && node.credentials.length > 0) {
    console.log(formatDivider('Required Credentials'));
    node.credentials.forEach((cred: any) => {
      const name = cred.name || cred;
      console.log(`  ${chalk.yellow('🔑')} ${name}`);
    });
    console.log('');
  }
  
  // Documentation link
  const docUrl = `https://docs.n8n.io/integrations/builtin/app-nodes/${node.nodeType.replace('nodes-base.', 'n8n-nodes-base.')}/`;
  console.log(chalk.dim(`  📖 Documentation: ${docUrl}\n`));
  
  // Next actions
  console.log(formatNextActions([
    { command: `n8n nodes show ${node.nodeType} --schema`, description: 'View full schema' },
    { command: `n8n nodes show ${node.nodeType} --minimal`, description: 'Operations only' },
    { command: `n8n nodes search "${node.displayName}"`, description: 'Find similar nodes' },
  ]));
  
  // Export hints
  console.log(formatExportFooter('nodes-show', `nodes show ${node.nodeType}`));
}

/**
 * Output full property schema (--schema flag)
 */
function outputSchema(node: NodeInfo): void {
  const fullType = NodeRepository.formatNodeType(node.nodeType);
  
  console.log(formatHeader({
    title: `${node.displayName} - Schema`,
    icon: '📋',
    context: {
      'Type': fullType,
      'Version': node.version || '1',
    },
  }));
  
  console.log('');
  
  if (!node.properties || node.properties.length === 0) {
    console.log(chalk.dim('  No properties defined.'));
    return;
  }
  
  // Group properties by resource/operation context
  const resourceProp = node.properties.find((p: any) => p.name === 'resource');
  const operationProp = node.properties.find((p: any) => p.name === 'operation');
  
  if (resourceProp) {
    console.log(formatDivider('Resources'));
    console.log(`  ${chalk.bold('resource')} ${chalk.dim('(required)')}`);
    console.log(`    Type: ${chalk.cyan('options')}`);
    console.log(`    Description: The resource to operate on`);
    if (resourceProp.options) {
      console.log(`    Options:`);
      resourceProp.options.forEach((opt: any) => {
        console.log(`      ${chalk.green('•')} ${opt.value || opt.name} ${chalk.dim(`- ${opt.description || opt.name}`)}`);
      });
    }
    console.log('');
  }
  
  if (operationProp) {
    console.log(formatDivider('Operations'));
    console.log(`  ${chalk.bold('operation')} ${chalk.dim('(depends on resource)')}`);
    console.log(`    Type: ${chalk.cyan('options')}`);
    console.log(`    Description: The operation to perform`);
    console.log('');
  }
  
  // All other properties
  const otherProps = node.properties.filter(
    (p: any) => p.name !== 'resource' && p.name !== 'operation'
  );
  
  if (otherProps.length > 0) {
    console.log(formatDivider('Properties'));
    
    // Separate required and optional
    const required = otherProps.filter((p: any) => p.required);
    const optional = otherProps.filter((p: any) => !p.required);
    
    if (required.length > 0) {
      console.log(chalk.bold('\n  Required Fields:\n'));
      required.forEach((prop: any) => outputPropertyDetail(prop));
    }
    
    if (optional.length > 0) {
      console.log(chalk.bold('\n  Optional Fields:\n'));
      optional.slice(0, 20).forEach((prop: any) => outputPropertyDetail(prop));
      
      if (optional.length > 20) {
        console.log(chalk.dim(`    ... and ${optional.length - 20} more optional properties\n`));
      }
    }
  }
  
  // Credentials
  if (node.credentials && node.credentials.length > 0) {
    console.log(formatDivider('Required Credentials'));
    node.credentials.forEach((cred: any) => {
      const name = cred.name || cred;
      console.log(`  ${chalk.yellow('🔑')} ${name}`);
    });
    console.log('');
  }
}

/**
 * Output minimal operations-only view (--minimal flag)
 */
function outputMinimal(node: NodeInfo): void {
  const fullType = NodeRepository.formatNodeType(node.nodeType);
  
  console.log(chalk.bold.cyan(`\n${node.displayName}`) + chalk.dim(` (${fullType})`));
  console.log('');
  
  const operations = extractOperations(node);
  
  if (Object.keys(operations).length > 0) {
    console.log(chalk.bold('Operations:'));
    Object.entries(operations).forEach(([resource, ops]) => {
      console.log(`  ${chalk.yellow(resource)}: ${ops.join(', ')}`);
    });
  } else {
    console.log(chalk.dim('  No operations defined.'));
  }
  
  console.log('');
}

/**
 * Output usage examples (--examples flag)
 */
function outputExamples(node: NodeInfo): void {
  const fullType = NodeRepository.formatNodeType(node.nodeType);
  
  console.log(formatHeader({
    title: `${node.displayName} - Examples`,
    icon: '💡',
    context: {
      'Type': fullType,
    },
  }));
  
  console.log('');
  
  // Generate example based on node structure
  const operations = extractOperations(node);
  const resources = Object.keys(operations);
  
  let exampleNum = 1;
  
  if (resources.length > 0) {
    // Generate examples for first 2 resources
    for (const resource of resources.slice(0, 2)) {
      const ops = operations[resource];
      const firstOp = ops[0] || 'get';
      
      console.log(chalk.bold(`  Example ${exampleNum}: ${capitalizeFirst(resource)} - ${capitalizeFirst(firstOp)}`));
      console.log(chalk.cyan('  ```json'));
      console.log(chalk.green(`  {`));
      console.log(chalk.green(`    "type": "${fullType}",`));
      console.log(chalk.green(`    "typeVersion": 1,`));
      console.log(chalk.green(`    "parameters": {`));
      console.log(chalk.green(`      "resource": "${resource}",`));
      console.log(chalk.green(`      "operation": "${firstOp}"`));
      console.log(chalk.green(`    }`));
      console.log(chalk.green(`  }`));
      console.log(chalk.cyan('  ```'));
      console.log('');
      exampleNum++;
    }
  } else {
    // Simple node without resource/operation
    console.log(chalk.bold(`  Example ${exampleNum}: Basic Configuration`));
    console.log(chalk.cyan('  ```json'));
    console.log(chalk.green(`  {`));
    console.log(chalk.green(`    "type": "${fullType}",`));
    console.log(chalk.green(`    "typeVersion": 1,`));
    console.log(chalk.green(`    "parameters": {}`));
    console.log(chalk.green(`  }`));
    console.log(chalk.cyan('  ```'));
    console.log('');
  }
  
  // With credentials example if applicable
  if (node.credentials && node.credentials.length > 0) {
    const credName = typeof node.credentials[0] === 'string' 
      ? node.credentials[0] 
      : node.credentials[0].name;
    
    console.log(chalk.bold(`  Example ${exampleNum}: With Credentials`));
    console.log(chalk.cyan('  ```json'));
    console.log(chalk.green(`  {`));
    console.log(chalk.green(`    "type": "${fullType}",`));
    console.log(chalk.green(`    "typeVersion": 1,`));
    console.log(chalk.green(`    "parameters": {},`));
    console.log(chalk.green(`    "credentials": {`));
    console.log(chalk.green(`      "${credName}": {`));
    console.log(chalk.green(`        "id": "your-credential-id",`));
    console.log(chalk.green(`        "name": "My ${node.displayName} Credential"`));
    console.log(chalk.green(`      }`));
    console.log(chalk.green(`    }`));
    console.log(chalk.green(`  }`));
    console.log(chalk.cyan('  ```'));
    console.log('');
  }
  
  // Next actions
  console.log(formatNextActions([
    { command: `n8n nodes show ${node.nodeType} --schema`, description: 'View full schema' },
    { command: `n8n nodes validate ${node.nodeType} --config '{...}'`, description: 'Validate configuration' },
  ]));
}

/**
 * Output documentation mode
 */
function outputDocs(node: NodeInfo): void {
  const fullType = NodeRepository.formatNodeType(node.nodeType);
  
  console.log(chalk.bold.cyan(`\n# ${node.displayName}\n`));
  console.log(chalk.dim(`Type: ${fullType}`));
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
  
  // Operations
  const operations = extractOperations(node);
  if (Object.keys(operations).length > 0) {
    console.log(chalk.bold('## Operations\n'));
    Object.entries(operations).forEach(([resource, ops]) => {
      console.log(`### ${capitalizeFirst(resource)}\n`);
      ops.forEach(op => console.log(`- ${op}`));
      console.log('');
    });
  }
  
  // Documentation link
  const docUrl = `https://docs.n8n.io/integrations/builtin/app-nodes/${node.nodeType.replace('nodes-base.', 'n8n-nodes-base.')}/`;
  console.log(chalk.bold('## Links\n'));
  console.log(`- [Official Documentation](${docUrl})`);
}

/**
 * Output version info
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract operations grouped by resource
 */
function extractOperations(node: NodeInfo): Record<string, string[]> {
  const operations: Record<string, string[]> = {};
  
  if (!node.properties) return operations;
  
  // Find resource and operation properties
  const resourceProp = node.properties.find((p: any) => p.name === 'resource');
  const operationProp = node.properties.find((p: any) => p.name === 'operation');
  
  if (resourceProp?.options && operationProp?.options) {
    // Has resource/operation pattern
    for (const resource of resourceProp.options) {
      const resourceName = resource.value || resource.name;
      operations[resourceName] = [];
      
      // Find operations for this resource
      for (const op of operationProp.options) {
        // Check if this operation applies to this resource
        const displayOptions = op.displayOptions;
        if (displayOptions?.show?.resource?.includes(resourceName)) {
          operations[resourceName].push(op.value || op.name);
        } else if (!displayOptions) {
          // No display options = applies to all
          operations[resourceName].push(op.value || op.name);
        }
      }
    }
  } else if (operationProp?.options) {
    // Only operation, no resource
    operations['operations'] = operationProp.options.map(
      (op: any) => op.value || op.name
    );
  }
  
  // Also check node.operations if available
  if (node.operations && Array.isArray(node.operations)) {
    for (const op of node.operations) {
      const name = op.name || op.value || op;
      if (!operations['other']) {
        operations['other'] = [];
      }
      if (!operations['other'].includes(name)) {
        operations['other'].push(name);
      }
    }
  }
  
  // Remove empty resources
  for (const key of Object.keys(operations)) {
    if (operations[key].length === 0) {
      delete operations[key];
    }
  }
  
  return operations;
}

/**
 * Output a single property's details
 */
function outputPropertyDetail(prop: any): void {
  const name = prop.name || prop.displayName;
  const type = prop.type || 'string';
  const required = prop.required ? chalk.red('*') : '';
  
  console.log(`    ${chalk.bold(name)}${required}`);
  console.log(`      Type: ${chalk.cyan(type)}`);
  
  if (prop.description) {
    console.log(`      Description: ${chalk.dim(prop.description.slice(0, 60))}`);
  }
  
  if (prop.default !== undefined) {
    console.log(`      Default: ${chalk.yellow(JSON.stringify(prop.default))}`);
  }
  
  if (prop.options && (type === 'options' || type === 'multiOptions')) {
    const optValues = prop.options.map((o: any) => o.value || o.name).slice(0, 5);
    console.log(`      Options: ${optValues.join(', ')}${prop.options.length > 5 ? '...' : ''}`);
  }
  
  console.log('');
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
