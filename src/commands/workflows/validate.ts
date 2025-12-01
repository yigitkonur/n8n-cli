/**
 * Workflows Validate Command
 * Validate workflow structure and node configurations
 */

import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getApiClient } from '../../core/api/client.js';
import { validateWorkflowStructure } from '../../core/validator.js';
import { fixInvalidOptionsFields } from '../../core/fixer.js';
import { jsonParse } from '../../core/json-parser.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { getSimilarityService } from '../../core/similarity/index.js';
import { getNodeRepository } from '../../core/db/nodes.js';
import type { ValidationIssue } from '../../core/types.js';
import {
  BreakingChangeDetector,
  NodeVersionService,
  type WorkflowUpgradeAnalysis,
  type NodeUpgradeSummary,
} from '../../core/versioning/index.js';
import { getLatestRegistryVersion } from '../../core/versioning/breaking-changes-registry.js';

interface ValidateOptions {
  file?: string;
  validationProfile?: 'minimal' | 'runtime' | 'ai-friendly' | 'strict';
  validationMode?: 'minimal' | 'operation' | 'full';
  repair?: boolean;
  fix?: boolean;
  validateExpressions?: boolean;
  checkUpgrades?: boolean;
  upgradeSeverity?: string;
  checkVersions?: boolean;
  versionSeverity?: 'info' | 'warning' | 'error';
  skipCommunityNodes?: boolean;
  save?: string;
  json?: boolean;
}

export async function workflowsValidateCommand(idOrFile: string | undefined, opts: ValidateOptions): Promise<void> {
  try {
    let workflow: any;
    let source: string;
    let rawSource: string | undefined;
    
    // Determine source: file or API
    if (opts.file || (idOrFile && existsSync(idOrFile))) {
      // Load from file
      const filePath = opts.file || idOrFile!;
      source = filePath;
      rawSource = await readFile(filePath, 'utf8');
      
      workflow = jsonParse(rawSource, {
        repairJSON: opts.repair,
        acceptJSObject: true,
        fallbackValue: null,
      });
      
      if (!workflow) {
        console.error(chalk.red(`\n${icons.error} Failed to parse workflow JSON from ${filePath}`));
        process.exitCode = 1;
        return;
      }
    } else if (idOrFile) {
      // Load from API
      source = `workflow:${idOrFile}`;
      const client = getApiClient();
      workflow = await client.getWorkflow(idOrFile);
    } else {
      console.error(chalk.red(`\n${icons.error} Please provide a workflow ID or --file path`));
      process.exitCode = 1;
      return;
    }
    
    // Apply fixes if requested
    let fixedCount = 0;
    if (opts.fix) {
      const fixResult = fixInvalidOptionsFields(workflow);
      fixedCount = fixResult.fixed;
    }
    
    // Pre-compute node type suggestions for unknown/invalid node types
    const nodeSuggestions = new Map<string, ValidationIssue['suggestions']>();
    try {
      const similarityService = await getSimilarityService();
      const nodeRepository = await getNodeRepository();
      
      // Collect unique node types that might need suggestions
      if (Array.isArray(workflow.nodes)) {
        const uniqueTypes = new Set<string>();
        for (const node of workflow.nodes) {
          if (node?.type && typeof node.type === 'string') {
            // Check if node type is unknown
            const nodeInfo = nodeRepository.getNode(node.type);
            if (!nodeInfo) {
              uniqueTypes.add(node.type);
            }
          }
        }
        
        // Get suggestions for unknown types
        for (const nodeType of uniqueTypes) {
          const suggestions = await similarityService.findSimilarNodes(nodeType, 3);
          if (suggestions.length > 0) {
            nodeSuggestions.set(nodeType, suggestions.map((s: { nodeType: string; confidence: number; reason: string; autoFixable: boolean }) => ({
              value: s.nodeType,
              confidence: s.confidence,
              reason: s.reason,
              autoFixable: s.autoFixable,
            })));
          }
        }
      }
    } catch {
      // Similarity service unavailable - continue without suggestions
    }
    
    // Validate with enhanced validation when profile or mode is specified
    const useEnhanced = opts.profile !== undefined || opts.mode !== undefined;
    const result = validateWorkflowStructure(workflow, {
      rawSource,
      nodeSuggestions,
      validateExpressions: opts.validateExpressions,
      checkVersions: opts.checkVersions,
      versionSeverity: opts.versionSeverity,
      skipCommunityNodes: opts.skipCommunityNodes,
      // Enhanced validation options
      enhanced: useEnhanced,
      mode: opts.mode || 'operation',
      profile: opts.profile || 'runtime',
    });
    
    // Profile-specific messaging
    if (opts.profile && !opts.json) {
      if (opts.profile === 'ai-friendly' || opts.profile === 'strict') {
        console.log(chalk.cyan(`\n${icons.info} AI-Enhanced Validation: Profile '${opts.profile}'`));
        console.log(chalk.dim('   Checks include: LLM connections, streaming mode, tool configs, memory limits'));
        console.log(chalk.dim('   AI nodes validated: AI Agent, Chat Trigger, Basic LLM Chain, 12 AI tool types\n'));
      } else if (opts.profile === 'minimal') {
        console.log(chalk.dim(`\n${icons.info} Minimal profile: Structure checks only (AI validation skipped)\n`));
      }
    }
    
    // Collect all issues
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    
    if (result.nodeTypeIssues) {
      errors.push(...result.nodeTypeIssues);
    }
    
    // Analyze upgrade paths if requested
    let upgradeAnalysis: WorkflowUpgradeAnalysis | undefined;
    if (opts.checkUpgrades && Array.isArray(workflow.nodes)) {
      upgradeAnalysis = analyzeWorkflowUpgrades(workflow.nodes, opts.upgradeSeverity);
    }
    
    // JSON output
    if (opts.json) {
      outputJson({
        valid: result.valid && errors.length === 0,
        source,
        errors,
        warnings,
        fixed: fixedCount,
        issues: result.issues || [],
        ...(upgradeAnalysis && { upgradeAnalysis }),
        ...(result.versionIssues && { versionIssues: result.versionIssues }),
        // Enhanced validation metadata
        ...(useEnhanced && {
          validation: {
            mode: opts.mode || 'operation',
            profile: opts.profile || 'runtime',
            enhanced: true,
          },
        }),
      });
      process.exitCode = result.valid && errors.length === 0 ? 0 : 1;
      return;
    }
    
    // Human-friendly output
    const isValid = result.valid && errors.length === 0;
    
    console.log(formatHeader({
      title: 'Workflow Validation',
      icon: isValid ? icons.success : icons.error,
      context: {
        'Source': source,
        'Status': isValid ? chalk.green('Valid') : chalk.red('Invalid'),
        ...(fixedCount > 0 && { 'Fixed': `${fixedCount} issues` }),
      },
    }));
    
    console.log('');
    
    // Errors
    if (errors.length > 0) {
      console.log(formatDivider(`Errors (${errors.length})`));
      errors.slice(0, 10).forEach((err, i) => {
        console.log(chalk.red(`  ${i + 1}. ${err}`));
      });
      if (errors.length > 10) {
        console.log(chalk.dim(`  ... and ${errors.length - 10} more errors`));
      }
      console.log('');
    }
    
    // Warnings
    if (warnings.length > 0) {
      console.log(formatDivider(`Warnings (${warnings.length})`));
      warnings.slice(0, 10).forEach((warn, i) => {
        console.log(chalk.yellow(`  ${i + 1}. ${warn}`));
      });
      if (warnings.length > 10) {
        console.log(chalk.dim(`  ... and ${warnings.length - 10} more warnings`));
      }
      console.log('');
    }
    
    // Issues with locations
    if (result.issues && result.issues.length > 0) {
      console.log(formatDivider('Detailed Issues'));
      result.issues.slice(0, 5).forEach((issue: any) => {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${chalk.bold(issue.code || 'ISSUE')}`);
        console.log(`     ${issue.message}`);
        if (issue.location?.nodeName) {
          console.log(chalk.dim(`     Node: ${issue.location.nodeName}`));
        }
        if (issue.hint) {
          console.log(chalk.cyan(`     💡 ${issue.hint}`));
        }
        // Display node type suggestions if available
        if (issue.suggestions && issue.suggestions.length > 0) {
          console.log(chalk.yellow('     Did you mean:'));
          issue.suggestions.slice(0, 3).forEach((s: any) => {
            const confidence = Math.round(s.confidence * 100);
            const autoFixBadge = s.autoFixable ? chalk.green(' ✓ auto-fixable') : '';
            console.log(chalk.dim(`       • ${s.value} (${confidence}% match)${autoFixBadge}`));
          });
        }
        console.log('');
      });
    }
    
    // Display upgrade analysis if requested
    if (upgradeAnalysis && upgradeAnalysis.nodesWithUpgrades > 0) {
      console.log(formatDivider(`Upgrade Analysis (${upgradeAnalysis.nodesWithUpgrades} nodes)`));
      console.log(chalk.yellow(`  ${icons.warning} ${upgradeAnalysis.nodesWithUpgrades} node(s) have available version upgrades`));
      console.log(chalk.dim(`  Breaking changes: ${upgradeAnalysis.breakingChangesTotal}`));
      console.log(chalk.dim(`  Auto-migratable: ${upgradeAnalysis.autoMigratableTotal}`));
      console.log('');
      
      // Show per-node upgrade info
      upgradeAnalysis.nodes.slice(0, 5).forEach((node: NodeUpgradeSummary) => {
        const severityColor = node.severity === 'HIGH' ? chalk.red : node.severity === 'MEDIUM' ? chalk.yellow : chalk.blue;
        console.log(`  • ${chalk.bold(node.nodeName)} (${node.nodeType})`);
        console.log(chalk.dim(`    Version: ${node.currentVersion} → ${node.latestVersion}`));
        console.log(severityColor(`    Breaking: ${node.breakingChanges}, Auto-fix: ${node.autoMigratable}, Severity: ${node.severity}`));
      });
      
      if (upgradeAnalysis.nodes.length > 5) {
        console.log(chalk.dim(`  ... and ${upgradeAnalysis.nodes.length - 5} more nodes`));
      }
      console.log('');
    }
    
    // Display version issues if --check-versions was used
    if (result.versionIssues && result.versionIssues.length > 0) {
      console.log(formatDivider(`Version Issues (${result.versionIssues.length})`));
      console.log(chalk.yellow(`  ${icons.warning} ${result.versionIssues.length} node(s) have outdated typeVersions`));
      console.log('');
      
      result.versionIssues.slice(0, 5).forEach((issue: any) => {
        const breakingBadge = issue.hasBreakingChanges ? chalk.red(' ⚠️ breaking') : '';
        const autoFixBadge = issue.autoMigratable ? chalk.green(' ✓ auto-fix') : '';
        
        console.log(`  • ${chalk.bold(issue.nodeName)} (${issue.nodeType})`);
        console.log(chalk.dim(`    Version: v${issue.currentVersion} → v${issue.latestVersion}${breakingBadge}${autoFixBadge}`));
        console.log(chalk.dim(`    ${issue.hint}`));
        console.log('');
      });
      
      if (result.versionIssues.length > 5) {
        console.log(chalk.dim(`  ... and ${result.versionIssues.length - 5} more version issues`));
        console.log('');
      }
      
      // Suggest autofix command
      console.log(chalk.cyan('  💡 Run `n8n workflows autofix <file> --upgrade-versions` to apply auto-migrations'));
      console.log('');
    }
    
    // Summary
    if (isValid) {
      console.log(chalk.green(`\n${icons.success} Workflow is valid and ready to use!`));
      console.log(chalk.dim(`\n   Workflow: ${workflow.name || 'Unnamed'}`));
      console.log(chalk.dim(`   Nodes: ${workflow.nodes?.length || 0}`));
      console.log(chalk.dim(`   Connections: ${Object.keys(workflow.connections || {}).length}`));
    } else {
      console.log(chalk.red(`\n${icons.error} Workflow has ${errors.length} error(s) and ${warnings.length} warning(s)`));
      
      // Common causes section
      console.log(chalk.yellow('\n   This usually means:'));
      console.log(chalk.dim('   • Node types may be misspelled or unavailable'));
      console.log(chalk.dim('   • Required node parameters are missing'));
      console.log(chalk.dim('   • Connection references non-existent nodes'));
      console.log(chalk.dim('   • JSON structure is malformed'));
    }
    
    // Save workflow (fixed or original)
    if (opts.save) {
      await saveToJson(workflow, { path: opts.save });
      console.log(chalk.dim(`\n   Saved to: ${opts.save}`));
    }
    
    // Context-aware next actions
    const isFromFile = opts.file || (idOrFile && existsSync(idOrFile));
    
    if (isValid) {
      // SUCCESS: Guide to next logical steps
      console.log(formatNextActions([
        ...(isFromFile ? [
          { command: `n8n workflows create --file ${opts.file || idOrFile}`, description: '🚀 Deploy workflow to n8n' },
        ] : []),
        { command: `n8n workflows get ${idOrFile} --mode structure`, description: 'View workflow structure' },
        { command: `n8n executions list --workflow-id ${idOrFile}`, description: 'Check execution history' },
        ...(isFromFile ? [
          { command: `n8n workflows validate ${opts.file || idOrFile} --save validated.json`, description: 'Export validated version' },
        ] : []),
      ]));
      
      // Success tip for LLMs
      if (isFromFile) {
        console.log(chalk.cyan('\n💡 Ready to deploy? Run:'));
        console.log(chalk.white(`   n8n workflows create --file ${opts.file || idOrFile}\n`));
      }
    } else {
      // FAILURE: Guide to fixing
      console.log(formatNextActions([
        { command: `n8n workflows validate ${source} --fix`, description: 'Auto-fix known issues' },
        { command: `n8n workflows validate ${source} --fix --save fixed.json`, description: 'Fix and save corrected version' },
        { command: `n8n workflows autofix ${source}`, description: 'Interactive autofix with preview' },
        { command: `n8n nodes search "<node-name>"`, description: 'Find correct node type names' },
      ]));
      
      // jq tip for file-based validation
      if (isFromFile) {
        console.log(chalk.dim('\n💡 Extract error details with jq:'));
        console.log(chalk.dim(`   n8n workflows validate ${opts.file || idOrFile} --json > validation.json`));
        console.log(chalk.dim(`   jq '.errors[]' validation.json`));
      }
    }
    
    process.exitCode = isValid ? 0 : 1;
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}

/**
 * Analyze workflow nodes for available version upgrades
 */
function analyzeWorkflowUpgrades(nodes: any[], severityFilter?: string): WorkflowUpgradeAnalysis {
  const detector = new BreakingChangeDetector();
  const versionService = new NodeVersionService(detector);
  
  const nodeSummaries: NodeUpgradeSummary[] = [];
  let breakingChangesTotal = 0;
  let autoMigratableTotal = 0;
  
  for (const node of nodes) {
    if (!node?.type || !node?.typeVersion) continue;
    
    const nodeType = node.type;
    const currentVersion = String(node.typeVersion);
    const latestVersion = getLatestRegistryVersion(nodeType);
    
    if (!latestVersion) continue;
    
    // Compare versions
    const comparison = versionService.compareVersions(currentVersion, latestVersion);
    if (comparison >= 0) continue; // Already at or above latest
    
    // Analyze the upgrade
    const analysis = detector.analyzeVersionUpgrade(nodeType, currentVersion, latestVersion);
    
    // Apply severity filter if specified
    if (severityFilter) {
      const filterLevel = severityFilter.toUpperCase();
      if (filterLevel !== analysis.overallSeverity) {
        // Skip if severity doesn't match filter
        if (filterLevel === 'HIGH' && analysis.overallSeverity !== 'HIGH') continue;
        if (filterLevel === 'MEDIUM' && !['HIGH', 'MEDIUM'].includes(analysis.overallSeverity)) continue;
      }
    }
    
    if (analysis.changes.length > 0) {
      nodeSummaries.push({
        nodeName: node.name || 'unnamed',
        nodeType,
        currentVersion,
        latestVersion,
        breakingChanges: analysis.changes.filter(c => c.isBreaking).length,
        autoMigratable: analysis.autoMigratableCount,
        severity: analysis.overallSeverity,
      });
      
      breakingChangesTotal += analysis.changes.filter(c => c.isBreaking).length;
      autoMigratableTotal += analysis.autoMigratableCount;
    }
  }
  
  return {
    nodesWithUpgrades: nodeSummaries.length,
    breakingChangesTotal,
    autoMigratableTotal,
    nodes: nodeSummaries,
  };
}
