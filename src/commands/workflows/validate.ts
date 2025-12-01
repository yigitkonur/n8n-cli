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

interface ValidateOptions {
  file?: string;
  profile?: string;
  repair?: boolean;
  fix?: boolean;
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
    
    // Validate
    // TODO: Profile parameter not yet fully implemented - all profiles currently run the same validation
    // Future: differentiate between minimal (structure only), runtime (+ node params), and strict (+ best practices)
    const result = validateWorkflowStructure(workflow, { rawSource });
    
    // Warn if non-default profile selected (not yet differentiated)
    if (opts.profile && opts.profile !== 'runtime' && !opts.json) {
      console.log(chalk.yellow(`\n${icons.warning} Note: Validation profiles are not yet fully differentiated.`));
      console.log(chalk.dim(`   Profile '${opts.profile}' currently runs the same checks as 'runtime'.`));
    }
    
    // Collect all issues
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    
    if (result.nodeTypeIssues) {
      errors.push(...result.nodeTypeIssues);
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
        if (issue.nodeName) {
          console.log(chalk.dim(`     Node: ${issue.nodeName}`));
        }
        if (issue.suggestion) {
          console.log(chalk.cyan(`     💡 ${issue.suggestion}`));
        }
        console.log('');
      });
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
