/**
 * Nodes Show Command
 * Show detailed information about a specific n8n node
 * Enhanced version with detail levels, modes, and property search
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
import { PropertyFilter, type SimplifiedProperty } from '../../core/services/property-filter.js';
import { BreakingChangeDetector, type DetectedChange, getTrackedVersionsForNode, getLatestRegistryVersion } from '../../core/versioning/index.js';
import type { 
  ShowOptions, 
  DetailLevel, 
  NodeShowMode,
  NodeMinimalInfo,
  NodeStandardInfo 
} from '../../types/node-detail.js';

// Re-export ShowOptions for cli.ts
export type { ShowOptions };

export async function nodesShowCommand(nodeType: string, opts: ShowOptions): Promise<void> {
  try {
    const repo = await getNodeRepository();
    
    // Resolve short-form node types to full form
    let node: NodeInfo | null = null;
    const searchPrefixes = [
      'nodes-base.',
      'nodes-langchain.',
      'nodes-langchain.tool',
    ];
    
    // Try direct lookup first (full type or already normalized)
    let normalizedType = nodeType.includes('.') 
      ? NodeTypeNormalizer.normalizeToShortForm(nodeType)
      : nodeType;
    
    node = repo.getNode(normalizedType);
    
    // If not found and short-form, try common prefixes
    if (!node && !nodeType.includes('.')) {
      for (const prefix of searchPrefixes) {
        // Try exact case first
        const candidate = `${prefix}${nodeType}`;
        node = repo.getNode(candidate);
        if (node) {
          normalizedType = candidate;
          break;
        }
        // Try lowercase
        const candidateLower = `${prefix}${nodeType.toLowerCase()}`;
        node = repo.getNode(candidateLower);
        if (node) {
          normalizedType = candidateLower;
          break;
        }
      }
    }
    
    // Final fallback to original input
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
    
    // Normalize legacy flags to new options (backwards compatibility)
    const detail: DetailLevel = opts.schema ? 'full' 
      : opts.minimal ? 'minimal' 
      : (opts.detail as DetailLevel) || 'standard';
    const mode: NodeShowMode = (opts.mode as NodeShowMode) || 'info';
    const includeExamples = opts.examples || opts.includeExamples;
    
    // Save to file if requested (before any output)
    if (opts.save) {
      await saveToJson(node, { path: opts.save });
    }
    
    // Route by mode
    switch (mode) {
      case 'info':
        await handleInfoMode(node, detail, opts.includeTypeInfo, includeExamples, opts);
        break;
      case 'docs':
        outputDocs(node);
        break;
      case 'search-properties':
        if (!opts.query) {
          console.error(chalk.red(`\n${icons.error} --query required for search-properties mode`));
          console.log(chalk.dim('  Example: n8n nodes show httpRequest --mode search-properties --query "auth"'));
          process.exitCode = 1;
          return;
        }
        handlePropertySearch(node, opts.query, opts.maxResults || 20, opts);
        break;
      case 'versions':
        outputVersions(node);
        break;
      case 'compare':
        if (!opts.from) {
          console.error(chalk.red(`\n${icons.error} --from required for compare mode`));
          console.log(chalk.dim('  Example: n8n nodes show httpRequest --mode compare --from 3 --to 4'));
          process.exitCode = 1;
          return;
        }
        // Use breaking changes for comparison (same underlying data)
        outputBreaking(node, opts.from, opts.to);
        break;
      case 'breaking':
        outputBreaking(node, opts.from, opts.to);
        break;
      case 'migrations':
        if (!opts.from || !opts.to) {
          console.error(chalk.red(`\n${icons.error} --from and --to required for migrations mode`));
          console.log(chalk.dim('  Example: n8n nodes show httpRequest --mode migrations --from 3 --to 4'));
          process.exitCode = 1;
          return;
        }
        outputVersionStub(node, 'migrations', opts.from, opts.to);
        break;
      default:
        console.error(chalk.red(`\n${icons.error} Unknown mode: ${mode}`));
        console.log(chalk.dim('  Valid modes: info, docs, search-properties, versions, compare, breaking, migrations'));
        process.exitCode = 1;
    }
    
  } catch (error: any) {
    console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    process.exitCode = 1;
  }
}

/**
 * Handle info mode with detail levels
 */
async function handleInfoMode(
  node: NodeInfo,
  detail: DetailLevel,
  includeTypeInfo?: boolean,
  includeExamples?: boolean,
  opts?: ShowOptions
): Promise<void> {
  const fullType = NodeRepository.formatNodeType(node.nodeType);
  
  switch (detail) {
    case 'minimal': {
      // ~200 tokens: basic metadata only
      const minimalOutput: NodeMinimalInfo = {
        nodeType: node.nodeType,
        workflowNodeType: fullType,
        displayName: node.displayName,
        description: node.description,
        category: node.category,
        package: node.package,
        isAITool: node.isAITool,
        isTrigger: node.isTrigger,
        isWebhook: node.isWebhook
      };
      
      if (opts?.json) {
        outputJson(minimalOutput);
        return;
      }
      
      // Human-readable minimal output
      console.log(chalk.bold.cyan(`\n${node.displayName}`) + chalk.dim(` (${fullType})`));
      console.log(chalk.dim(`  ${node.description || 'No description'}`));
      console.log('');
      console.log(`  Category: ${chalk.yellow(node.category)}  Package: ${chalk.yellow(node.package)}`);
      console.log(`  ${formatBoolean(node.isTrigger)} Trigger   ${formatBoolean(node.isWebhook)} Webhook   ${formatBoolean(node.isAITool)} AI Tool`);
      console.log('');
      break;
    }
      
    case 'standard': {
      // ~1-2K tokens: essential properties + operations
      const essentials = PropertyFilter.getEssentials(node.properties, node.nodeType);
      const operations = extractOperations(node);
      
      const standardOutput: NodeStandardInfo = {
        nodeType: node.nodeType,
        workflowNodeType: fullType,
        displayName: node.displayName,
        description: node.description,
        category: node.category,
        package: node.package,
        isAITool: node.isAITool,
        isTrigger: node.isTrigger,
        isWebhook: node.isWebhook,
        requiredProperties: essentials.required,
        commonProperties: essentials.common,
        operations,
        credentials: node.credentials || [],
        versionInfo: {
          currentVersion: node.version || '1',
          totalVersions: 0,
          hasVersionHistory: false
        }
      };
      
      if (opts?.json) {
        outputJson(standardOutput);
        return;
      }
      
      // Human-readable standard output
      outputInfo(node, 'standard');
      
      // Show essential properties
      if (essentials.required.length > 0 || essentials.common.length > 0) {
        console.log(formatDivider('Essential Properties'));
        
        if (essentials.required.length > 0) {
          console.log(chalk.bold('  Required:'));
          essentials.required.forEach(prop => {
            console.log(`    ${chalk.cyan(prop.name)} ${chalk.dim(`(${prop.type})`)} - ${chalk.dim(prop.description.slice(0, 50))}`);
          });
        }
        
        if (essentials.common.length > 0) {
          console.log(chalk.bold('  Common:'));
          essentials.common.forEach(prop => {
            console.log(`    ${chalk.cyan(prop.name)} ${chalk.dim(`(${prop.type})`)} - ${chalk.dim(prop.description.slice(0, 50))}`);
          });
        }
        console.log('');
      }
      break;
    }
      
    case 'full':
      // ~3-8K tokens: everything
      if (opts?.json) {
        outputJson({
          ...node,
          fullType,
          versionInfo: {
            currentVersion: node.version || '1',
            totalVersions: 0,
            hasVersionHistory: false
          }
        });
        return;
      }
      
      outputSchema(node);
      break;
    
    default:
      // Unknown detail level - show minimal
      break;
  }
}

/**
 * Handle property search mode
 */
function handlePropertySearch(
  node: NodeInfo,
  query: string,
  maxResults: number,
  opts: ShowOptions
): void {
  const matches = PropertyFilter.searchProperties(node.properties || [], query, maxResults);
  
  if (opts.json) {
    outputJson({
      nodeType: node.nodeType,
      query,
      matches,
      totalMatches: matches.length
    });
    return;
  }
  
  console.log(formatHeader({
    title: `Property Search: "${query}" in ${node.displayName}`,
    icon: '🔍',
    context: { 'Results': `${matches.length} found` }
  }));
  
  console.log('');
  
  if (matches.length === 0) {
    console.log(chalk.yellow('  No properties found matching your query.'));
    console.log(chalk.dim('  Try a different search term or use --mode info to see all properties.'));
    return;
  }
  
  matches.forEach((match, i) => {
    const prop = match as SimplifiedProperty & { path?: string };
    console.log(`  ${i + 1}. ${chalk.cyan(prop.path || prop.name)}`);
    console.log(`     Type: ${chalk.yellow(prop.type)}`);
    if (prop.description) {
      console.log(`     ${chalk.dim(prop.description.slice(0, 80))}`);
    }
    if (prop.showWhen) {
      console.log(`     Shows when: ${chalk.dim(JSON.stringify(prop.showWhen))}`);
    }
    if (prop.options && prop.options.length > 0) {
      const optValues = prop.options.slice(0, 5).map(o => o.value).join(', ');
      console.log(`     Options: ${chalk.dim(optValues)}${prop.options.length > 5 ? '...' : ''}`);
    }
    console.log('');
  });
}

/**
 * Output stub for version modes (requires P1-08 implementation)
 */
function outputVersionStub(
  node: NodeInfo,
  mode: 'compare' | 'breaking' | 'migrations',
  from: string,
  to?: string
): void {
  console.log(formatHeader({
    title: `${node.displayName} - Version ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
    icon: '📦',
    context: { 
      'From': from, 
      'To': to || 'latest',
      'Status': 'Pending'
    },
  }));
  
  console.log('');
  console.log(chalk.yellow('  ⚠️  Version data not yet available.'));
  console.log(chalk.dim(''));
  console.log(chalk.dim('  Version comparison features require the node_versions database table'));
  console.log(chalk.dim('  which will be implemented in P1-08 (Node Version Service).'));
  console.log('');
  console.log(chalk.dim('  For now, you can:'));
  console.log(chalk.dim('  • Use --mode info to see current node configuration'));
  console.log(chalk.dim('  • Check n8n documentation for version history'));
  console.log('');
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
    console.log(theme.dim(`  ${  node.description}`));
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
function _outputMinimal(node: NodeInfo): void {
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
function _outputExamples(node: NodeInfo): void {
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
    console.log(`${node.description  }\n`);
  }
  
  // Features
  console.log(chalk.bold('## Features\n'));
  if (node.isTrigger) {console.log('- ⚡ Can trigger workflows');}
  if (node.isWebhook) {console.log('- 🌐 Supports webhooks');}
  if (node.isAITool) {console.log('- 🤖 Available as AI tool');}
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
 * Output version info with registry data
 */
function outputVersions(node: NodeInfo): void {
  const fullType = NodeRepository.formatNodeType(node.nodeType);
  const detector = new BreakingChangeDetector();
  
  // Get tracked versions from registry
  const trackedVersions = getTrackedVersionsForNode(fullType);
  const latestVersion = getLatestRegistryVersion(fullType);
  
  console.log(formatHeader({
    title: `${node.displayName} - Version Info`,
    icon: '📦',
    context: {
      'Type': fullType,
      'DB Version': node.version || 'Unknown',
      'Latest Tracked': latestVersion || 'Not tracked',
      'Tracked Versions': trackedVersions.length > 0 ? trackedVersions.join(', ') : 'None',
    },
  }));
  
  console.log('');
  
  if (trackedVersions.length === 0) {
    console.log(chalk.dim('  This node is not tracked in the breaking changes registry.'));
    console.log(chalk.dim('  It may be a community node or have no known breaking changes.'));
    console.log('');
    return;
  }
  
  // Show version history with breaking changes
  console.log(formatDivider('Version History'));
  
  for (let i = 0; i < trackedVersions.length; i++) {
    const version = trackedVersions[i];
    const isLatest = version === latestVersion;
    const _nextVersion = trackedVersions[i + 1];
    
    // Check for breaking changes TO this version
    let breakingChanges = 0;
    if (i > 0) {
      const prevVersion = trackedVersions[i - 1];
      const analysis = detector.analyzeVersionUpgrade(fullType, prevVersion, version);
      breakingChanges = analysis.changes.filter(c => c.isBreaking).length;
    }
    
    const marker = isLatest ? chalk.green('●') : chalk.dim('○');
    const versionLabel = isLatest ? chalk.green.bold(`v${version} (latest)`) : `v${version}`;
    const breakingBadge = breakingChanges > 0 
      ? chalk.red(` ⚠️ ${breakingChanges} breaking change${breakingChanges > 1 ? 's' : ''}`)
      : '';
    
    console.log(`  ${marker} ${versionLabel}${breakingBadge}`);
  }
  
  console.log('');
  
  // Next actions
  console.log(formatNextActions([
    { command: `n8n nodes show ${node.nodeType} --mode breaking`, description: 'View breaking changes' },
    { command: `n8n nodes show ${node.nodeType} --mode breaking --from 1.0 --to ${latestVersion || '2.0'}`, description: 'Compare specific versions' },
    { command: `n8n workflows validate <file> --check-versions`, description: 'Check workflow version issues' },
  ]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract operations grouped by resource
 */
function extractOperations(node: NodeInfo): Record<string, string[]> {
  const operations: Record<string, string[]> = {};
  
  if (!node.properties) {return operations;}
  
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
        const {displayOptions} = op;
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
    operations.operations = operationProp.options.map(
      (op: any) => op.value || op.name
    );
  }
  
  // Also check node.operations if available
  if (node.operations && Array.isArray(node.operations)) {
    for (const op of node.operations) {
      const name = op.name || op.value || op;
      if (!operations.other) {
        operations.other = [];
      }
      if (!operations.other.includes(name)) {
        operations.other.push(name);
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
  if (!str) {return str;}
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Output breaking changes between versions (--mode breaking)
 */
function outputBreaking(node: NodeInfo, fromVersion?: string, toVersion?: string): void {
  const fullType = NodeRepository.formatNodeType(node.nodeType);
  const detector = new BreakingChangeDetector();
  
  // Determine versions
  const from = fromVersion || '1.0';
  const to = toVersion || getLatestRegistryVersion(fullType) || node.version || '2.0';
  
  // Analyze upgrade
  const analysis = detector.analyzeVersionUpgrade(fullType, from, to);
  
  console.log(formatHeader({
    title: `${node.displayName} - Breaking Changes`,
    icon: analysis.hasBreakingChanges ? '⚠️' : '✅',
    context: {
      'Type': fullType,
      'Version Range': `${from} → ${to}`,
      'Breaking Changes': String(analysis.changes.filter(c => c.isBreaking).length),
      'Severity': analysis.overallSeverity,
    },
  }));
  
  console.log('');
  
  if (analysis.changes.length === 0) {
    console.log(chalk.green('  ✓ No breaking changes detected for this version range.'));
    console.log(chalk.dim('  This node can likely be upgraded without issues.'));
    console.log('');
    return;
  }
  
  // Group changes by severity
  const bySeverity = {
    HIGH: analysis.changes.filter(c => c.severity === 'HIGH'),
    MEDIUM: analysis.changes.filter(c => c.severity === 'MEDIUM'),
    LOW: analysis.changes.filter(c => c.severity === 'LOW'),
  };
  
  for (const [severity, changes] of Object.entries(bySeverity)) {
    if (changes.length === 0) {continue;}
    
    const color = severity === 'HIGH' ? chalk.red : severity === 'MEDIUM' ? chalk.yellow : chalk.blue;
    console.log(formatDivider(`${severity} Severity (${changes.length})`));
    
    changes.forEach((change: DetectedChange, index: number) => {
      console.log(color(`  ${index + 1}. ${change.propertyName}`));
      console.log(chalk.dim(`     Type: ${change.changeType}`));
      console.log(chalk.dim(`     Auto-migratable: ${change.autoMigratable ? '✓ Yes' : '✗ No'}`));
      
      // Wrap hint
      const hintLines = change.migrationHint.match(/.{1,65}/g) || [change.migrationHint];
      console.log(chalk.cyan(`     Hint: ${hintLines[0]}`));
      hintLines.slice(1).forEach((line: string) => {
        console.log(chalk.cyan(`           ${line}`));
      });
      console.log('');
    });
  }
  
  // Summary
  console.log(formatDivider('Summary'));
  console.log(`  Total changes: ${analysis.changes.length}`);
  console.log(`  Auto-migratable: ${chalk.green(String(analysis.autoMigratableCount))}`);
  console.log(`  Manual required: ${chalk.yellow(String(analysis.manualRequiredCount))}`);
  console.log('');
  
  // Recommendations
  console.log(formatDivider('Recommendations'));
  analysis.recommendations.forEach(rec => {
    console.log(`  ${rec}`);
  });
  console.log('');
  
  // Next actions
  console.log(formatNextActions([
    { command: `n8n nodes breaking-changes ${node.nodeType} --from ${from} --to ${to} --json`, description: 'Get JSON output' },
    { command: `n8n workflows autofix <file> --upgrade-versions`, description: 'Apply auto-migrations' },
    { command: `n8n nodes show ${node.nodeType} --schema`, description: 'View full schema' },
  ]));
}
