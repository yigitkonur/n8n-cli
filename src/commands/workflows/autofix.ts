/**
 * Workflows Autofix Command
 * Automatically fix common workflow issues
 */

import chalk from 'chalk';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getApiClient } from '../../core/api/client.js';
import { fixInvalidOptionsFields, applyExperimentalFixes } from '../../core/fixer.js';
import { sanitizeWorkflow } from '../../core/sanitizer.js';
import { jsonParse } from '../../core/json-parser.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { theme, icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';

interface AutofixOptions {
  file?: string;
  apply?: boolean;
  experimental?: boolean;
  save?: string;
  json?: boolean;
}

export async function workflowsAutofixCommand(idOrFile: string, opts: AutofixOptions): Promise<void> {
  try {
    let workflow: any;
    let source: string;
    let isFile = false;
    
    // Determine source
    if (opts.file || existsSync(idOrFile)) {
      const filePath = opts.file || idOrFile;
      source = filePath;
      isFile = true;
      const content = await readFile(filePath, 'utf8');
      workflow = jsonParse(content, { repairJSON: true });
      
      if (!workflow) {
        console.error(chalk.red(`\n${icons.error} Failed to parse workflow from ${filePath}`));
        process.exit(1);
      }
    } else {
      source = `workflow:${idOrFile}`;
      const client = getApiClient();
      workflow = await client.getWorkflow(idOrFile);
    }
    
    // Apply fixes
    const fixes: any[] = [];
    
    // Standard fixes
    const standardResult = fixInvalidOptionsFields(workflow);
    if (standardResult.fixed > 0) {
      fixes.push({
        type: 'invalidOptions',
        count: standardResult.fixed,
        description: 'Fixed invalid options fields',
      });
    }
    
    // Sanitize workflow
    const sanitizeResult = sanitizeWorkflow(workflow, { regenerateIds: false });
    if (sanitizeResult.warnings.length > 0) {
      fixes.push({
        type: 'sanitize',
        count: sanitizeResult.warnings.length,
        description: 'Sanitized workflow structure',
      });
    }
    
    // Experimental fixes
    if (opts.experimental) {
      const expResult = applyExperimentalFixes(workflow);
      if (expResult.fixed > 0) {
        fixes.push({
          type: 'experimental',
          count: expResult.fixed,
          description: `Applied ${expResult.fixed} experimental fixes`,
        });
      }
    }
    
    const totalFixes = fixes.reduce((sum, f) => sum + f.count, 0);
    
    // JSON output
    if (opts.json) {
      outputJson({
        source,
        totalFixes,
        fixes,
        workflow: opts.apply ? workflow : undefined,
      });
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Workflow Autofix',
      icon: totalFixes > 0 ? icons.success : icons.info,
      context: {
        'Source': source,
        'Fixes Applied': `${totalFixes}`,
      },
    }));
    
    console.log('');
    
    if (fixes.length === 0) {
      console.log(chalk.green('  No issues found to fix!'));
    } else {
      console.log(formatDivider('Fixes Applied'));
      fixes.forEach((fix) => {
        console.log(chalk.green(`  ✓ ${fix.description}`));
        if (fix.details) {
          fix.details.slice(0, 5).forEach((d: any) => {
            console.log(chalk.dim(`     - ${d.description || d.type}`));
          });
        }
      });
      console.log('');
    }
    
    // Save if requested
    if (opts.save) {
      await saveToJson(workflow, { path: opts.save });
      console.log(chalk.green(`  ${icons.success} Saved to ${opts.save}`));
    } else if (isFile && opts.apply) {
      await writeFile(source, JSON.stringify(workflow, null, 2));
      console.log(chalk.green(`  ${icons.success} Updated ${source}`));
    }
    
    // Apply to API if requested
    if (opts.apply && !isFile) {
      const client = getApiClient();
      await client.updateWorkflow(idOrFile, workflow);
      console.log(chalk.green(`  ${icons.success} Updated workflow on n8n`));
    }
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n workflows validate ${source}`, description: 'Validate fixed workflow' },
      ...(isFile && !opts.apply ? [{ command: `n8n workflows autofix ${source} --apply`, description: 'Apply fixes to file' }] : []),
      ...(!isFile && !opts.apply ? [{ command: `n8n workflows autofix ${idOrFile} --apply`, description: 'Apply fixes to n8n' }] : []),
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exit(1);
  }
}
