/**
 * Credential Types Command
 * List all available credential types from n8n-nodes-base
 */

import chalk from 'chalk';
import { credentialRegistry, type CredentialTypeInfo } from '../../core/credential-loader.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatAuthMethodTree } from '../../core/formatters/tree.js';
import { formatSummary } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';

interface TypesOptions {
  byAuth?: boolean;
  search?: string;
  limit?: string;
  save?: string;
  json?: boolean;
}

export async function credentialTypesCommand(opts: TypesOptions): Promise<void> {
  const limit = parseInt(opts.limit || '0', 10);
  const startTime = Date.now();
  
  try {
    let credentials: CredentialTypeInfo[];
    let title = 'Available Credential Types';
    const context: Record<string, string> = {};

    // Get credentials based on options
    if (opts.search) {
      credentials = credentialRegistry.searchCredentialTypes(opts.search, limit || 50);
      title = `Credential types matching "${opts.search}"`;
      context.Search = opts.search;
    } else {
      credentials = credentialRegistry.getAllCredentialTypes();
    }

    // Apply limit
    const totalCount = credentials.length;
    if (limit > 0 && credentials.length > limit) {
      credentials = credentials.slice(0, limit);
    }

    context.Total = `${totalCount} types`;

    // JSON output mode
    if (opts.json) {
      const jsonData = credentials.map(c => ({
        name: c.name,
        displayName: c.displayName,
        authType: c.authType,
        propertyCount: c.propertyCount,
        documentationUrl: c.documentationUrl,
      }));
      outputJson({
        total: totalCount,
        displayed: credentials.length,
        credentialTypes: jsonData,
      });
      return;
    }

    // Save to file if requested
    if (opts.save) {
      await saveToJson(credentials, { path: opts.save });
    }

    // Human-friendly output
    console.log(formatHeader({
      title,
      icon: '🔑',
      context,
    }));

    if (credentials.length === 0) {
      console.log(chalk.yellow('\n  No credential types found.'));
      if (opts.search) {
        console.log(chalk.dim('\n  Try a different search term.'));
      }
      process.exitCode = 0;
      return;
    }

    // Format output
    if (opts.byAuth) {
      // Group by auth method
      const grouped = credentialRegistry.getCredentialsByAuthType();
      
      // Convert to format expected by formatAuthMethodTree
      const items: Array<{ name: string; displayName: string; authType: string }> = [];
      for (const [authType, creds] of Object.entries(grouped)) {
        for (const cred of creds) {
          items.push({
            name: cred.name,
            displayName: cred.displayName,
            authType,
          });
        }
      }
      
      console.log(formatAuthMethodTree(items, { limit: 10 }));
      
      // Show auth method stats
      const stats = credentialRegistry.getAuthMethodStats();
      console.log(chalk.bold('\n  📊 Summary by Auth Method:\n'));
      stats.forEach(stat => {
        console.log(`    ${stat.authType.padEnd(12)} ${chalk.cyan(String(stat.count))}`);
      });
      console.log('');
    } else {
      // Table format
      const tableOutput = formatTable(credentials as unknown as Record<string, unknown>[], {
        columns: [
          { 
            key: 'displayName', 
            header: 'Name', 
            width: 30,
            formatter: columnFormatters.truncate(29),
          },
          { 
            key: 'name', 
            header: 'Type', 
            width: 30,
            formatter: (v) => chalk.cyan(String(v)),
          },
          { 
            key: 'authType', 
            header: 'Auth Method', 
            width: 12,
          },
          { 
            key: 'propertyCount', 
            header: 'Fields', 
            width: 8,
            align: 'right',
            formatter: (v) => chalk.yellow(String(v)),
          },
        ],
        limit: limit || 30,
        showIndex: true,
      });
      console.log(`\n${  tableOutput}`);
    }

    // Summary
    const durationMs = Date.now() - startTime;
    console.log(`\n${  formatSummary({
      total: totalCount,
      displayed: credentials.length,
      durationMs,
    })}`);

    // Next actions
    if (credentials.length > 0) {
      const firstCred = credentials[0];
      const actions = [
        { command: `n8n credentials show-type ${firstCred.name}`, description: 'View credential schema' },
      ];
      
      if (!opts.byAuth) {
        actions.push({ command: `n8n credentials types --by-auth`, description: 'Group by auth method' });
      }
      if (!opts.save) {
        actions.push({ command: `n8n credentials types --save creds.json`, description: 'Export all types' });
      }
      
      console.log(formatNextActions(actions.slice(0, 3)));
    }

    // Export hints
    console.log(formatExportFooter('credentials-types', 'credentials types', opts.save));

  } catch (error: any) {
    console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    if (error.message.includes('n8n-nodes-base')) {
      console.log(chalk.dim('\n  Ensure n8n-nodes-base is installed.'));
    }
    process.exitCode = 1;
  }
}
