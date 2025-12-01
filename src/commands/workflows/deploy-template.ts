/**
 * Workflows Deploy Template Command
 * Deploy workflow template from n8n.io directly to your n8n instance
 *
 * Features:
 * - Fetches template from n8n.io public API
 * - Extracts required credentials (for user guidance)
 * - Strips credentials by default (security)
 * - Auto-fixes common issues (expression format, Switch v3+)
 * - Creates workflow via n8n API (always inactive initially)
 * - Supports dry-run, save, and JSON output modes
 */

import chalk from 'chalk';
import axios from 'axios';
import { writeFile } from 'node:fs/promises';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { stripReadOnlyProperties } from '../../core/sanitizer.js';
import { applyExperimentalFixes } from '../../core/fixer.js';
import {
  extractRequiredCredentials,
  stripCredentials,
  groupCredentialsByType,
  type RequiredCredential,
} from '../../core/credential-utils.js';
import { ExitCode } from '../../utils/exit-codes.js';
import type { Workflow } from '../../core/types.js';

const TEMPLATES_API = 'https://api.n8n.io/api/templates';

/**
 * Command options for deploy-template
 */
interface DeployTemplateOptions {
  /** Custom workflow name (overrides template name) */
  name?: string;
  /** Apply auto-fixes (default: true, use --no-autofix to disable) */
  autofix?: boolean;
  /** Preserve credential references (default: false) */
  keepCredentials?: boolean;
  /** Preview without creating (default: false) */
  dryRun?: boolean;
  /** Save workflow JSON locally */
  save?: string;
  /** Output as JSON */
  json?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Result structure for JSON output
 */
interface DeployResult {
  success: boolean;
  workflowId?: string;
  name?: string;
  active?: boolean;
  templateId: number;
  nodeCount: number;
  triggerType?: string;
  requiredCredentials: RequiredCredential[];
  fixesApplied: number;
  fixDetails?: string[];
  dryRun?: boolean;
}

/**
 * Deploy a workflow template from n8n.io to the user's n8n instance
 *
 * @param templateId - Template ID from n8n.io
 * @param opts - Command options
 */
export async function workflowsDeployTemplateCommand(
  templateId: string,
  opts: DeployTemplateOptions
): Promise<void> {
  try {
    // Validate templateId is numeric
    const id = parseInt(templateId, 10);
    if (isNaN(id) || id <= 0) {
      console.error(
        chalk.red(`\n${icons.error} Invalid template ID: ${templateId}`)
      );
      console.error(chalk.dim('  Template IDs are positive integers (e.g., 3121)'));
      console.error(chalk.dim('  Find templates: n8n templates search "chatbot"'));
      process.exitCode = ExitCode.USAGE;
      return;
    }

    // Step 1: Fetch template from n8n.io
    if (!opts.json) {
      console.log(chalk.dim(`  Fetching template ${id} from n8n.io...`));
    }

    let templateData: any;
    try {
      const response = await axios.get(`${TEMPLATES_API}/workflows/${id}`, {
        timeout: 15000,
      });
      templateData = response.data;
    } catch (fetchError: any) {
      if (fetchError.response?.status === 404) {
        console.error(
          chalk.red(`\n${icons.error} Template ${id} not found on n8n.io`)
        );
        console.error(chalk.dim(`  Browse templates: https://n8n.io/workflows`));
        process.exitCode = ExitCode.DATAERR;
        return;
      }
      if (fetchError.code === 'ECONNABORTED' || fetchError.code === 'ETIMEDOUT') {
        console.error(
          chalk.red(`\n${icons.error} Timeout fetching template from n8n.io`)
        );
        console.error(chalk.dim('  Check your network connection and try again'));
        process.exitCode = ExitCode.IOERR;
        return;
      }
      throw fetchError;
    }

    const templateWorkflow = templateData.workflow;
    if (!templateWorkflow || !templateWorkflow.nodes) {
      console.error(
        chalk.red(`\n${icons.error} Template ${id} has invalid workflow structure`)
      );
      process.exitCode = ExitCode.DATAERR;
      return;
    }

    // Step 2: Deep copy workflow to avoid mutations
    let workflow = JSON.parse(JSON.stringify(templateWorkflow)) as Workflow;

    // Set workflow name
    workflow.name =
      opts.name || templateData.name || templateWorkflow.name || `Template ${id}`;

    // Step 3: Extract required credentials BEFORE stripping
    const requiredCredentials = extractRequiredCredentials(workflow);
    const credentialsByType = groupCredentialsByType(requiredCredentials);

    // Step 4: Strip credentials if not keeping them (default: strip)
    if (!opts.keepCredentials) {
      workflow = stripCredentials(workflow);
    }

    // Step 5: Apply auto-fixes if enabled (default: enabled)
    let fixesApplied = 0;
    let fixDetails: string[] = [];
    if (opts.autofix !== false) {
      const fixResult = applyExperimentalFixes(workflow);
      fixesApplied = fixResult.fixed;
      fixDetails = fixResult.warnings;
    }

    // Step 6: Ensure required settings for n8n API
    if (!workflow.settings) {
      workflow.settings = { executionOrder: 'v1' };
    }
    if (!workflow.connections) {
      workflow.connections = {};
    }

    // Step 7: Sanitize for API (strip read-only properties)
    const cleanedWorkflow = stripReadOnlyProperties(
      workflow as Record<string, unknown>
    ) as Workflow;

    // Identify trigger type for output
    const triggerNode = cleanedWorkflow.nodes?.find(
      (n: any) =>
        n.type?.toLowerCase().includes('trigger') ||
        n.type?.toLowerCase().includes('webhook')
    );
    const triggerType = triggerNode?.type?.split('.').pop() || 'manual';

    // Step 8: Save locally if requested
    if (opts.save) {
      await writeFile(opts.save, JSON.stringify(cleanedWorkflow, null, 2));
      if (!opts.json) {
        console.log(chalk.green(`  ${icons.success} Saved to ${opts.save}`));
      }
    }

    // Step 9: Dry-run mode - preview without creating
    if (opts.dryRun) {
      const result: DeployResult = {
        success: true,
        dryRun: true,
        templateId: id,
        name: cleanedWorkflow.name,
        nodeCount: cleanedWorkflow.nodes?.length || 0,
        triggerType,
        requiredCredentials,
        fixesApplied,
        fixDetails: fixDetails.length > 0 ? fixDetails : undefined,
      };

      if (opts.json) {
        outputJson(result);
        return;
      }

      // Human-friendly dry-run output
      console.log(
        formatHeader({
          title: 'Dry Run Preview',
          icon: icons.info,
          context: {
            Template: `${templateData.name || 'Unknown'} (#${id})`,
            'Workflow Name': cleanedWorkflow.name || 'Unnamed',
            Nodes: `${cleanedWorkflow.nodes?.length || 0}`,
            'Trigger Type': triggerType,
            'Fixes to Apply': `${fixesApplied}`,
          },
        })
      );

      // Show fixes that would be applied
      if (fixDetails.length > 0) {
        console.log(formatDivider(`Fixes to Apply (${fixDetails.length})`));
        for (const fix of fixDetails.slice(0, 8)) {
          console.log(chalk.green(`  ${icons.success} ${fix}`));
        }
        if (fixDetails.length > 8) {
          console.log(chalk.dim(`  ... and ${fixDetails.length - 8} more`));
        }
      }

      // Show required credentials
      if (requiredCredentials.length > 0) {
        console.log(formatDivider('Required Credentials'));
        for (const [credType, nodes] of credentialsByType) {
          console.log(
            chalk.yellow(`  • ${credType}`) +
              chalk.dim(` (used by ${nodes.length} node${nodes.length > 1 ? 's' : ''})`)
          );
        }
        console.log('');
        console.log(
          chalk.dim('  ⚠️  Configure these credentials in n8n UI after deployment')
        );
      }

      console.log('');
      console.log(
        chalk.cyan(`💡 Run without --dry-run to deploy this template`)
      );
      console.log(
        formatNextActions([
          {
            command: `n8n workflows deploy-template ${id}`,
            description: 'Deploy template',
          },
          {
            command: `n8n workflows deploy-template ${id} --name "My Workflow"`,
            description: 'Deploy with custom name',
          },
        ])
      );
      return;
    }

    // Step 10: Create workflow via n8n API
    const client = getApiClient();
    // Cast to Partial<Workflow> for API - createWorkflow handles missing id fields
    const created = await client.createWorkflow(cleanedWorkflow as any);

    const result: DeployResult = {
      success: true,
      workflowId: created.id,
      name: created.name,
      active: false,
      templateId: id,
      nodeCount: cleanedWorkflow.nodes?.length || 0,
      triggerType,
      requiredCredentials,
      fixesApplied,
      fixDetails: fixDetails.length > 0 ? fixDetails : undefined,
    };

    // JSON output
    if (opts.json) {
      outputJson(result);
      return;
    }

    // Human-friendly output
    console.log(
      formatHeader({
        title: 'Template Deployed Successfully',
        icon: icons.success,
        context: {
          Template: `${templateData.name || 'Unknown'} (#${id})`,
          'Workflow ID': created.id || 'Unknown',
          Name: created.name || 'Unnamed',
          Status: 'Created (inactive)',
          'Trigger Type': triggerType,
        },
      })
    );

    // Show fixes applied
    if (fixesApplied > 0) {
      console.log(formatDivider(`Fixes Applied (${fixesApplied})`));
      for (const fix of fixDetails.slice(0, 5)) {
        console.log(chalk.green(`  ${icons.success} ${fix}`));
      }
      if (fixDetails.length > 5) {
        console.log(chalk.dim(`  ... and ${fixDetails.length - 5} more`));
      }
    }

    // Show required credentials
    if (requiredCredentials.length > 0) {
      console.log(formatDivider('Required Credentials'));
      for (const [credType, nodes] of credentialsByType) {
        console.log(
          chalk.yellow(`  • ${credType}`) +
            chalk.dim(` - Configure in n8n UI (${nodes.length} node${nodes.length > 1 ? 's' : ''})`)
        );
      }
    }

    // Next actions
    console.log(
      formatNextActions([
        {
          command: `n8n workflows get ${created.id}`,
          description: 'View workflow details',
        },
        {
          command: `n8n workflows validate ${created.id}`,
          description: 'Validate workflow',
        },
        ...(created.id
          ? [
              {
                command: `n8n workflows activate --ids ${created.id}`,
                description: 'Activate when credentials configured',
              },
            ]
          : []),
      ])
    );
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, { commandContext: 'workflows deploy-template' });
    } else if (axios.isAxiosError(error)) {
      console.error(
        chalk.red(`\n${icons.error} Network error: ${error.message}`)
      );
      process.exitCode = ExitCode.IOERR;
    } else {
      console.error(
        chalk.red(`\n${icons.error} Error: ${(error as Error).message}`)
      );
      process.exitCode = ExitCode.GENERAL;
    }
  }
}
