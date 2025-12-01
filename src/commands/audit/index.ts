/**
 * Audit Command
 * Generate security audit for n8n instance
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { getConfig } from '../../core/config/loader.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import type { AuditCategory, AuditReport, AuditSection } from '../../types/n8n-api.js';

export interface AuditOptions {
  categories?: string;
  daysAbandoned?: string;
  save?: string;
  json?: boolean;
}

const VALID_CATEGORIES: AuditCategory[] = ['credentials', 'database', 'nodes', 'filesystem', 'instance'];

function parseCategories(categoriesStr?: string): AuditCategory[] | undefined {
  if (!categoriesStr) return undefined;
  
  const categories = categoriesStr.split(',').map(c => c.trim().toLowerCase());
  const valid: AuditCategory[] = [];
  
  for (const cat of categories) {
    if (VALID_CATEGORIES.includes(cat as AuditCategory)) {
      valid.push(cat as AuditCategory);
    } else {
      console.warn(chalk.yellow(`  Warning: Unknown category "${cat}" - skipping`));
    }
  }
  
  return valid.length > 0 ? valid : undefined;
}

function getRiskColor(risk: string) {
  switch (risk.toLowerCase()) {
    case 'credentials': return chalk.red;
    case 'database': return chalk.yellow;
    case 'nodes': return chalk.magenta;
    case 'filesystem': return chalk.blue;
    case 'instance': return chalk.cyan;
    default: return chalk.white;
  }
}

function formatSection(section: AuditSection, index: number): string {
  const lines: string[] = [];
  
  lines.push(chalk.bold(`    ${index + 1}. ${section.title}`));
  lines.push(chalk.dim(`       ${section.description}`));
  lines.push(chalk.green(`       → ${section.recommendation}`));
  
  if (section.location && section.location.length > 0) {
    const locs = section.location.slice(0, 3);
    for (const loc of locs) {
      if (loc.workflowName) {
        lines.push(chalk.dim(`         • Workflow: ${loc.workflowName} (${loc.workflowId})`));
      } else if (loc.name) {
        lines.push(chalk.dim(`         • ${loc.kind}: ${loc.name}`));
      }
    }
    if (section.location.length > 3) {
      lines.push(chalk.dim(`         ... and ${section.location.length - 3} more`));
    }
  }
  
  return lines.join('\n');
}

export async function auditCommand(opts: AuditOptions): Promise<void> {
  const startTime = Date.now();
  
  try {
    const client = getApiClient();
    const config = getConfig();
    
    const categories = parseCategories(opts.categories);
    const daysAbandoned = opts.daysAbandoned ? parseInt(opts.daysAbandoned, 10) : undefined;
    
    console.log(chalk.dim('  Generating security audit...'));
    
    const report = await client.generateAudit({
      additionalOptions: {
        categories,
        daysAbandonedWorkflow: daysAbandoned,
      },
    });
    
    // JSON output mode
    if (opts.json) {
      outputJson(report);
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(report, { path: opts.save });
    }
    
    // Count total issues
    let totalIssues = 0;
    const reportEntries = Object.entries(report) as [string, { risk: string; sections: AuditSection[] }][];
    for (const [, riskReport] of reportEntries) {
      if (riskReport && riskReport.sections) {
        totalIssues += riskReport.sections.length;
      }
    }
    
    const durationMs = Date.now() - startTime;
    
    // Human-friendly output
    console.log(formatHeader({
      title: 'Security Audit Report',
      icon: icons.audit,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'Issues Found': `${totalIssues}`,
        'Categories': categories ? categories.join(', ') : 'all',
        'Duration': `${durationMs}ms`,
      },
    }));
    
    console.log('');
    
    if (totalIssues === 0) {
      console.log(chalk.green(`  ${icons.success} No security issues found!`));
      console.log('');
      return;
    }
    
    // Display each risk report
    for (const [reportName, riskReport] of reportEntries) {
      if (!riskReport || !riskReport.sections || riskReport.sections.length === 0) {
        continue;
      }
      
      const color = getRiskColor(riskReport.risk);
      console.log(color.bold(`  ${reportName} (${riskReport.sections.length} issues)`));
      console.log('');
      
      for (let i = 0; i < riskReport.sections.length; i++) {
        console.log(formatSection(riskReport.sections[i], i));
        console.log('');
      }
    }
    
    // Summary
    if (totalIssues > 0) {
      console.log(chalk.yellow(`  ⚠️  Found ${totalIssues} security issues to review`));
      console.log('');
    }
    
    // Next actions
    console.log(formatNextActions([
      { command: 'n8n audit --save audit-report.json', description: 'Save full report to file' },
      { command: 'n8n workflows list', description: 'Review workflows' },
      { command: 'n8n credentials list', description: 'Review credentials' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'audit');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
