/**
 * Workflows Autofix Command
 * 
 * Advanced autofix engine with confidence-based filtering,
 * multiple fix types, and comprehensive validation.
 */

import chalk from 'chalk';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getApiClient } from '../../core/api/client.js';
import { validateWorkflowStructure } from '../../core/validator.js';
import { sanitizeWorkflow } from '../../core/sanitizer.js';
import { jsonParse } from '../../core/json-parser.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { confirmAction, displayChangeSummary } from '../../utils/prompts.js';
import { maybeBackupFile, maybeBackupWorkflow } from '../../utils/backup.js';
import { getUserDatabase } from '../../core/user-db/index.js';
import { WorkflowVersioningService } from '../../core/versioning/service.js';
import { getNodeRepository } from '../../core/db/nodes.js';
import { 
  WorkflowAutoFixer,
  generateGuidanceFromFixes,
  type FixType,
  type FixConfidenceLevel,
  type FixOperation,
  type AutoFixResult,
  type FixDetail,
} from '../../core/autofix/index.js';
import { 
  formatPostUpdateGuidance, 
  formatGuidanceSummary,
} from '../../core/formatters/guidance.js';

interface AutofixOptions {
  file?: string;
  apply?: boolean;
  preview?: boolean;
  confidence?: string;
  fixTypes?: string;
  upgradeVersions?: boolean;  // Shortcut for version-migration fixes
  targetVersion?: string;     // Target version for upgrades
  maxFixes?: string;
  save?: string;
  json?: boolean;
  force?: boolean;
  yes?: boolean;
  backup?: boolean;
  guidance?: boolean;  // --no-guidance sets this to false
  quiet?: boolean;     // From global options
}

/**
 * Parse fix types from comma-separated string
 */
function parseFixTypes(input: string | undefined): FixType[] | undefined {
  if (!input) {return undefined;}
  
  const validTypes: FixType[] = [
    'expression-format',
    'typeversion-correction',
    'error-output-config',
    'node-type-correction',
    'webhook-missing-path',
    'switch-options',
    'typeversion-upgrade',
    'version-migration',
  ];
  
  const types = input.split(',').map(t => t.trim()) as FixType[];
  const invalid = types.filter(t => !validTypes.includes(t));
  
  if (invalid.length > 0) {
    console.error(chalk.yellow(`⚠️  Unknown fix types: ${invalid.join(', ')}`));
    console.error(chalk.dim(`   Valid types: ${validTypes.join(', ')}`));
  }
  
  return types.filter(t => validTypes.includes(t));
}

/**
 * Parse confidence level
 */
function parseConfidence(input: string | undefined): FixConfidenceLevel {
  if (input === 'high' || input === 'medium' || input === 'low') {
    return input;
  }
  return 'medium';
}

/**
 * Group fixes by confidence level for display
 */
function groupFixesByConfidence(fixes: FixOperation[]): Record<FixConfidenceLevel, FixOperation[]> {
  return {
    high: fixes.filter(f => f.confidence === 'high'),
    medium: fixes.filter(f => f.confidence === 'medium'),
    low: fixes.filter(f => f.confidence === 'low'),
  };
}

/**
 * Format fix for display
 */
function formatFix(fix: FixOperation): string {
  const icon = fix.confidence === 'high' ? '✓' : fix.confidence === 'medium' ? '?' : '○';
  const color = fix.confidence === 'high' ? chalk.green : fix.confidence === 'medium' ? chalk.yellow : chalk.dim;
  
  let output = color(`  ${icon} [${fix.type}] "${fix.node}" node`);
  output += chalk.dim(`\n     └─ ${fix.field}: `);
  
  const beforeStr = fix.before === undefined ? '(missing)' : JSON.stringify(fix.before);
  const afterStr = fix.after === undefined ? '(removed)' : JSON.stringify(fix.after);
  
  output += `${chalk.red(truncate(beforeStr, 40))  } → ${  chalk.green(truncate(afterStr, 40))}`;
  
  if (fix.description) {
    output += chalk.dim(`\n     └─ ${fix.description}`);
  }
  
  return output;
}

/**
 * Truncate string for display
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {return str;}
  return `${str.slice(0, maxLen - 3)  }...`;
}

/**
 * Convert FixOperation[] to FixDetail[] for guidance generation
 */
function convertFixesToDetails(fixes: FixOperation[]): FixDetail[] {
  return fixes.map(fix => ({
    nodeId: fix.nodeId || 'unknown',
    nodeName: fix.node,
    nodeType: 'unknown', // FixOperation doesn't have nodeType, set as unknown
    nodeVersion: undefined,
    fixType: fix.type,
    propertyPath: fix.field,
    oldValue: fix.before,
    newValue: fix.after,
    description: fix.description,
    confidence: fix.confidence,
  }));
}

export async function workflowsAutofixCommand(idOrFile: string, opts: AutofixOptions): Promise<void> {
  try {
    let workflow: any;
    let source: string;
    let isFile = false;
    let rawSource: string | undefined;
    
    // Determine source
    if (opts.file || existsSync(idOrFile)) {
      const filePath = opts.file || idOrFile;
      source = filePath;
      isFile = true;
      rawSource = await readFile(filePath, 'utf8');
      workflow = jsonParse(rawSource, { repairJSON: true });
      
      if (!workflow) {
        console.error(chalk.red(`\n${icons.error} Failed to parse workflow from ${filePath}`));
        process.exitCode = 1;
        return;
      }
    } else {
      source = `workflow:${idOrFile}`;
      const client = getApiClient();
      workflow = await client.getWorkflow(idOrFile);
    }
    
    // Parse options
    const confidenceThreshold = parseConfidence(opts.confidence);
    let fixTypes = parseFixTypes(opts.fixTypes);
    const maxFixes = parseInt(opts.maxFixes || '50', 10);
    const shouldApply = opts.apply && !opts.preview;
    
    // Handle --upgrade-versions shortcut
    if (opts.upgradeVersions) {
      if (!fixTypes) {
        fixTypes = ['version-migration', 'typeversion-upgrade'];
      } else if (!fixTypes.includes('version-migration')) {
        fixTypes.push('version-migration');
      }
      if (!fixTypes.includes('typeversion-upgrade')) {
        fixTypes.push('typeversion-upgrade');
      }
    }
    
    // Get node repository for similarity service
    let repository;
    try {
      repository = await getNodeRepository();
    } catch {
      // Node repository not available - some fixes won't work
    }
    
    // Create autofix engine
    const engine = new WorkflowAutoFixer(repository);
    
    // Validate workflow to get issues
    const validationResult = validateWorkflowStructure(workflow, { rawSource });
    
    // Sanitize workflow
    sanitizeWorkflow(workflow, { regenerateIds: false });
    
    // Generate fixes
    const result: AutoFixResult = await engine.generateFixes(
      workflow,
      validationResult,
      {
        applyFixes: shouldApply,
        fixTypes,
        confidenceThreshold,
        maxFixes,
      }
    );
    
    // Use the modified workflow if fixes were applied
    if (shouldApply && result.workflow) {
      workflow = result.workflow;
    }
    
    // Save to file if --save option provided (works with both --json and human output)
    let savedPath: string | undefined;
    if (opts.save) {
      const workflowToSave = result.workflow || workflow;
      const saveResult = await saveToJson(workflowToSave, { path: opts.save, silent: opts.json });
      savedPath = saveResult.path;
    }
    
    // JSON output
    if (opts.json) {
      // Generate guidance for JSON output
      const fixDetails = convertFixesToDetails(result.fixes);
      const guidance = opts.guidance !== false ? generateGuidanceFromFixes(fixDetails) : [];
      
      outputJson({
        success: true,
        savedTo: savedPath,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          source: isFile ? 'file' : 'api',
        },
        fixes: {
          total: result.stats.total,
          applied: shouldApply ? result.stats.total : 0,
          skipped: shouldApply ? 0 : result.stats.total,
          byConfidence: result.stats.byConfidence,
          byType: result.stats.byType,
        },
        operations: result.fixes.map(f => ({
          node: f.node,
          field: f.field,
          type: f.type,
          before: f.before,
          after: f.after,
          confidence: f.confidence,
          description: f.description,
        })),
        postUpdateGuidance: guidance.length > 0 ? guidance : undefined,
        nextActions: [
          shouldApply ? null : `n8n workflows autofix ${isFile ? source : idOrFile} --apply`,
          `n8n workflows validate ${isFile ? source : idOrFile}`,
        ].filter(Boolean),
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Autofix Results',
      icon: result.stats.total > 0 ? icons.fix : icons.success,
      context: {
        'Source': source,
        'Workflow': workflow.name || 'unnamed',
        'Fixes Found': `${result.stats.total} (${result.stats.byConfidence.high} high, ${result.stats.byConfidence.medium} medium, ${result.stats.byConfidence.low} low)`,
        'Mode': shouldApply ? 'Apply' : 'Preview',
      },
    }));
    
    console.log('');
    
    if (result.fixes.length === 0) {
      console.log(chalk.green('  ✓ No issues found to fix!'));
      console.log('');
    } else {
      const grouped = groupFixesByConfidence(result.fixes);
      
      // High confidence fixes
      if (grouped.high.length > 0) {
        console.log(formatDivider(`HIGH CONFIDENCE (${grouped.high.length} fix${grouped.high.length === 1 ? '' : 'es'}) - Safe to auto-apply`));
        for (const fix of grouped.high) {
          console.log(formatFix(fix));
          console.log('');
        }
      }
      
      // Medium confidence fixes
      if (grouped.medium.length > 0) {
        console.log(formatDivider(`MEDIUM CONFIDENCE (${grouped.medium.length} fix${grouped.medium.length === 1 ? '' : 'es'}) - Review recommended`));
        for (const fix of grouped.medium) {
          console.log(formatFix(fix));
          console.log('');
        }
      }
      
      // Low confidence fixes
      if (grouped.low.length > 0) {
        console.log(formatDivider(`LOW CONFIDENCE (${grouped.low.length} fix${grouped.low.length === 1 ? '' : 'es'}) - Informational`));
        for (const fix of grouped.low) {
          console.log(formatFix(fix));
          console.log('');
        }
      }
      
      // Summary
      console.log(formatDivider('Summary'));
      console.log(`  ${result.summary}`);
      console.log('');
      
      // Post-Update Guidance (unless --no-guidance or --quiet)
      if (opts.guidance !== false && !opts.quiet) {
        const fixDetails = convertFixesToDetails(result.fixes);
        const guidance = generateGuidanceFromFixes(fixDetails);
        
        if (guidance.length > 0) {
          console.log(formatDivider('Post-Update Guidance'));
          console.log(formatGuidanceSummary(guidance));
          console.log('');
          console.log(formatPostUpdateGuidance(guidance));
          console.log('');
        }
      }
    }
    
    // Determine if --force or --yes was passed
    const forceFlag = opts.force || opts.yes;
    
    // Show save confirmation (save already happened above, just show message for human output)
    if (savedPath) {
      console.log(chalk.green(`  ${icons.success} Saved to ${savedPath}`));
    } else if (isFile && shouldApply && result.fixes.length > 0) {
      // Confirm before file mutation
      displayChangeSummary({
        action: 'About to overwrite local file',
        target: source,
        details: result.fixes.map(f => `[${f.type}] ${f.node}: ${f.description}`),
      });
      
      const confirmed = await confirmAction('Apply changes to file?', { force: forceFlag });
      if (!confirmed) {
        console.log(chalk.yellow('  Aborted.'));
        return;
      }
      
      // Backup before mutation
      await maybeBackupFile(source, { noBackup: opts.backup === false });
      
      const workflowToSave = result.workflow || workflow;
      await writeFile(source, JSON.stringify(workflowToSave, null, 2));
      console.log(chalk.green(`  ${icons.success} Updated ${source}`));
    }
    
    // Apply to API if requested
    if (shouldApply && !isFile && result.fixes.length > 0) {
      const client = getApiClient();
      
      // Confirm before API mutation
      displayChangeSummary({
        action: 'About to update workflow on n8n server',
        target: `Workflow ID: ${idOrFile}`,
        details: result.fixes.map(f => `[${f.type}] ${f.node}: ${f.description}`),
      });
      
      const confirmed = await confirmAction('Apply changes to n8n?', { force: forceFlag });
      if (!confirmed) {
        console.log(chalk.yellow('  Aborted.'));
        return;
      }
      
      // Backup original workflow before mutation (using versioning service)
      const original = await client.getWorkflow(idOrFile);
      if (opts.backup !== false) {
        try {
          const db = await getUserDatabase();
          const versioningService = new WorkflowVersioningService(db);
          const backupResult = await versioningService.createBackup(idOrFile, original, {
            trigger: 'autofix',
            fixTypes: result.fixes.map(f => f.type),
            metadata: { fixes: result.fixes.length, confidence: opts.confidence }
          });
          console.log(chalk.dim(`  📦 ${backupResult.message}`));
        } catch {
          // Fall back to file backup if versioning fails
          await maybeBackupWorkflow(original, idOrFile, { noBackup: false });
        }
      }
      
      const workflowToUpdate = result.workflow || workflow;
      await client.updateWorkflow(idOrFile, workflowToUpdate);
      console.log(chalk.green(`  ${icons.success} Updated workflow on n8n`));
    }
    
    // Next actions
    const nextActions = [];
    
    if (!shouldApply && result.fixes.length > 0) {
      if (isFile) {
        nextActions.push({ 
          command: `n8n workflows autofix ${source} --apply`, 
          description: 'Apply fixes to file' 
        });
        nextActions.push({ 
          command: `n8n workflows autofix ${source} --apply --confidence high`, 
          description: 'Apply only high-confidence fixes' 
        });
      } else {
        nextActions.push({ 
          command: `n8n workflows autofix ${idOrFile} --apply`, 
          description: 'Apply fixes to n8n' 
        });
        nextActions.push({ 
          command: `n8n workflows autofix ${idOrFile} --apply --confidence high`, 
          description: 'Apply only high-confidence fixes' 
        });
      }
    }
    
    nextActions.push({ 
      command: `n8n workflows validate ${isFile ? source : idOrFile}`, 
      description: 'Validate workflow' 
    });
    
    console.log(formatNextActions(nextActions));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else if ((error as Error).message?.includes('non-interactive')) {
      console.error(chalk.red(`\n${icons.error} ${(error as Error).message}`));
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
