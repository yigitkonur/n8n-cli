/**
 * Nodes Breaking Changes Command
 * Analyze breaking changes between n8n node versions
 * 
 * This command uses the bundled breaking changes registry to detect
 * known breaking changes and provide migration guidance.
 */

import chalk from 'chalk';
import { NodeTypeNormalizer } from '../../utils/node-type-normalizer.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { theme, icons } from '../../core/formatters/theme.js';
import {
  BreakingChangeDetector,
  NodeVersionService,
  type DetectedChange,
  type Severity,
} from '../../core/versioning/index.js';
import { getLatestRegistryVersion } from '../../core/versioning/breaking-changes-registry.js';

interface BreakingChangesOptions {
  from?: string;
  to?: string;
  severity?: string;
  autoOnly?: boolean;
  save?: string;
  json?: boolean;
  verbose?: boolean;
}

/**
 * Get severity icon and color
 */
function getSeverityDisplay(severity: Severity): { icon: string; color: typeof chalk } {
  switch (severity) {
    case 'HIGH':
      return { icon: '🔴', color: chalk.red };
    case 'MEDIUM':
      return { icon: '🟡', color: chalk.yellow };
    case 'LOW':
      return { icon: '🔵', color: chalk.blue };
    default:
      return { icon: '⚪', color: chalk.gray };
  }
}

/**
 * Format a single breaking change for display
 */
function formatChange(change: DetectedChange, index: number): void {
  const { icon, color } = getSeverityDisplay(change.severity);
  
  console.log(color(`  ${index}. ${icon} ${change.propertyName}`));
  console.log(chalk.dim(`     Type: ${change.changeType}`));
  console.log(chalk.dim(`     Breaking: ${change.isBreaking ? 'Yes' : 'No'}`));
  console.log(chalk.dim(`     Auto-migratable: ${change.autoMigratable ? '✓ Yes' : '✗ No'}`));
  
  // Wrap long hints
  const hintLines = change.migrationHint.match(/.{1,70}/g) || [change.migrationHint];
  console.log(chalk.cyan(`     Hint: ${hintLines[0]}`));
  hintLines.slice(1).forEach(line => {
    console.log(chalk.cyan(`           ${line}`));
  });
  
  console.log('');
}

/**
 * Format breaking changes with box-drawing characters
 */
function formatBreakingChangesBox(
  nodeType: string,
  fromVersion: string,
  toVersion: string,
  changes: DetectedChange[],
  overallSeverity: Severity
): void {
  const { icon: severityIcon, color: severityColor } = getSeverityDisplay(overallSeverity);
  
  // Header box
  console.log('');
  console.log(chalk.bold('╔═══════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold(`║ ${severityIcon} Breaking Changes: ${nodeType} v${fromVersion} → v${toVersion}`.padEnd(76) + '║'));
  console.log(chalk.bold('╠═══════════════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.bold('║                                                                           ║'));
  
  // Group by severity
  const highChanges = changes.filter(c => c.severity === 'HIGH');
  const mediumChanges = changes.filter(c => c.severity === 'MEDIUM');
  const lowChanges = changes.filter(c => c.severity === 'LOW');
  
  let changeIndex = 1;
  
  if (highChanges.length > 0) {
    console.log(chalk.bold.red(`║ HIGH Severity (${highChanges.length}):`.padEnd(76) + '║'));
    console.log(chalk.bold('║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║'));
    
    for (const change of highChanges) {
      console.log(chalk.bold(`║ ${changeIndex}. Property ${change.changeType === 'added' ? 'Added' : change.changeType === 'removed' ? 'Removed' : 'Changed'}: ${change.propertyName}`.padEnd(76) + '║'));
      console.log(chalk.bold(`║    Change: ${change.changeType}`.padEnd(76) + '║'));
      console.log(chalk.bold(`║    Migration: ${change.autoMigratable ? '✓ Auto-migratable' : '✗ Manual review required'}`.padEnd(76) + '║'));
      
      // Wrap hint lines
      const hintPrefix = '║    Hint: ';
      const maxLen = 76 - hintPrefix.length;
      const hintLines = change.migrationHint.match(new RegExp(`.{1,${maxLen}}`, 'g')) || [change.migrationHint];
      console.log(chalk.bold(`${hintPrefix}${hintLines[0]}`.padEnd(76) + '║'));
      hintLines.slice(1).forEach(line => {
        console.log(chalk.bold(`║          ${line}`.padEnd(76) + '║'));
      });
      console.log(chalk.bold('║                                                                           ║'));
      changeIndex++;
    }
  }
  
  if (mediumChanges.length > 0) {
    console.log(chalk.bold.yellow(`║ MEDIUM Severity (${mediumChanges.length}):`.padEnd(76) + '║'));
    console.log(chalk.bold('║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║'));
    
    for (const change of mediumChanges) {
      console.log(chalk.bold(`║ ${changeIndex}. ${change.changeType}: ${change.propertyName}`.padEnd(76) + '║'));
      console.log(chalk.bold(`║    Migration: ${change.autoMigratable ? '✓ Auto-migratable' : '✗ Manual'}`.padEnd(76) + '║'));
      console.log(chalk.bold('║                                                                           ║'));
      changeIndex++;
    }
  }
  
  if (lowChanges.length > 0) {
    console.log(chalk.bold.blue(`║ LOW Severity (${lowChanges.length}):`.padEnd(76) + '║'));
    console.log(chalk.bold('║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║'));
    
    for (const change of lowChanges) {
      console.log(chalk.bold(`║ ${changeIndex}. ${change.changeType}: ${change.propertyName}`.padEnd(76) + '║'));
      changeIndex++;
    }
    console.log(chalk.bold('║                                                                           ║'));
  }
  
  // Summary
  const autoMigratableCount = changes.filter(c => c.autoMigratable).length;
  const manualCount = changes.length - autoMigratableCount;
  
  console.log(chalk.bold('╠═══════════════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.bold('║ Summary:                                                                  ║'));
  console.log(chalk.bold(`║   Total changes: ${changes.length}`.padEnd(76) + '║'));
  console.log(chalk.bold(`║   Auto-migratable: ${autoMigratableCount}`.padEnd(76) + '║'));
  console.log(chalk.bold(`║   Manual required: ${manualCount}`.padEnd(76) + '║'));
  console.log(chalk.bold(`║   Overall severity: ${overallSeverity}`.padEnd(76) + '║'));
  console.log(chalk.bold('║                                                                           ║'));
  console.log(chalk.bold('╚═══════════════════════════════════════════════════════════════════════════╝'));
}

export async function nodesBreakingChangesCommand(nodeType: string, opts: BreakingChangesOptions): Promise<void> {
  try {
    // Normalize node type
    let normalizedType = nodeType;
    if (!nodeType.includes('.')) {
      normalizedType = `n8n-nodes-base.${nodeType.toLowerCase()}`;
    } else {
      normalizedType = NodeTypeNormalizer.normalizeToFullForm(nodeType);
    }
    
    // Create detector and service
    const detector = new BreakingChangeDetector();
    const versionService = new NodeVersionService(detector);
    
    // Determine versions
    const fromVersion = opts.from || '1.0';
    let toVersion = opts.to;
    
    if (!toVersion) {
      // Get latest from registry
      const latestVersion = getLatestRegistryVersion(normalizedType);
      toVersion = latestVersion ?? '2.0'; // Default fallback if not in registry
    }
    
    // Analyze the upgrade
    const analysis = detector.analyzeVersionUpgrade(normalizedType, fromVersion, toVersion);
    
    // Apply filters
    let filteredChanges = analysis.changes;
    
    if (opts.severity) {
      const severityFilter = opts.severity.toUpperCase() as Severity;
      filteredChanges = filteredChanges.filter(c => c.severity === severityFilter);
    }
    
    if (opts.autoOnly) {
      filteredChanges = filteredChanges.filter(c => c.autoMigratable);
    }
    
    // Build output data
    const outputData = {
      nodeType: normalizedType,
      fromVersion,
      toVersion,
      hasBreakingChanges: analysis.hasBreakingChanges,
      overallSeverity: analysis.overallSeverity,
      changes: filteredChanges,
      autoMigratableCount: filteredChanges.filter(c => c.autoMigratable).length,
      manualRequiredCount: filteredChanges.filter(c => !c.autoMigratable).length,
      recommendations: analysis.recommendations,
    };
    
    // JSON output
    if (opts.json) {
      outputJson(outputData);
      process.exitCode = analysis.hasBreakingChanges ? 65 : 0; // DATAERR if breaking changes
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(outputData, { path: opts.save });
    }
    
    // Human-friendly output
    if (filteredChanges.length === 0) {
      console.log(formatHeader({
        title: 'Breaking Changes Analysis',
        icon: icons.success,
        context: {
          'Node': normalizedType,
          'Version Range': `${fromVersion} → ${toVersion}`,
          'Status': chalk.green('No breaking changes found'),
        },
      }));
      
      console.log('');
      console.log(chalk.green(`  ${icons.success} No breaking changes detected for this version range.`));
      console.log(chalk.dim('  This node can likely be upgraded without issues.'));
      console.log('');
      
      // Check if node is in registry at all
      if (!versionService.isNodeTracked(normalizedType)) {
        console.log(chalk.yellow(`  ${icons.warning} Note: This node is not in the breaking changes registry.`));
        console.log(chalk.dim('  It may be a custom or community node without tracked changes.'));
        console.log('');
      }
      
      process.exitCode = 0;
      return;
    }
    
    // Show breaking changes in box format
    formatBreakingChangesBox(
      normalizedType,
      fromVersion,
      toVersion,
      filteredChanges,
      analysis.overallSeverity
    );
    
    console.log('');
    
    // Recommendations
    console.log(formatDivider('Recommendations'));
    analysis.recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n workflows autofix <file> --upgrade-versions`, description: 'Apply auto-migrations' },
      { command: `n8n nodes show ${nodeType} --schema`, description: 'View full schema' },
      { command: `n8n workflows validate <file> --check-upgrades`, description: 'Check workflow for upgrades' },
    ]));
    
    // Save notification
    if (opts.save) {
      console.log(chalk.dim(`\n  Saved to: ${opts.save}`));
    }
    
    // Set exit code based on breaking changes
    process.exitCode = analysis.hasBreakingChanges ? 65 : 0; // DATAERR if breaking changes
    
  } catch (error: any) {
    console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    process.exitCode = 1;
  }
}
