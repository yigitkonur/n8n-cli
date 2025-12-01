/**
 * Credentials Schema Command
 * Get schema for a credential type
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { formatHeader } from '../../core/formatters/header.js';
import { getConfig } from '../../core/config/loader.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';

export interface SchemaOptions {
  save?: string;
  json?: boolean;
}

export async function credentialsSchemaCommand(typeName: string, opts: SchemaOptions): Promise<void> {
  try {
    const client = getApiClient();
    const config = getConfig();
    
    const schema = await client.getCredentialSchema(typeName);
    
    // JSON output mode
    if (opts.json) {
      outputJson(schema);
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(schema, { path: opts.save });
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: `Credential Schema: ${typeName}`,
      icon: icons.credential,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'Type': typeName,
      },
    }));
    
    console.log('');
    
    // Display properties
    console.log(chalk.bold('  Required Fields:'));
    const required = schema.required || [];
    if (required.length > 0) {
      for (const field of required) {
        const prop = schema.properties[field];
        console.log(chalk.red(`    • ${field}`) + chalk.dim(` (${prop?.type || 'unknown'})`));
        if (prop?.description) {
          console.log(chalk.dim(`      ${prop.description}`));
        }
      }
    } else {
      console.log(chalk.dim('    None'));
    }
    
    console.log('');
    console.log(chalk.bold('  Optional Fields:'));
    const optional = Object.keys(schema.properties).filter(k => !required.includes(k));
    if (optional.length > 0) {
      for (const field of optional) {
        const prop = schema.properties[field];
        console.log(chalk.green(`    • ${field}`) + chalk.dim(` (${prop?.type || 'unknown'})`));
        if (prop?.description) {
          console.log(chalk.dim(`      ${prop.description}`));
        }
        if (prop?.default !== undefined) {
          console.log(chalk.dim(`      Default: ${JSON.stringify(prop.default)}`));
        }
      }
    } else {
      console.log(chalk.dim('    None'));
    }
    
    console.log('');
    
    // Example JSON structure
    console.log(chalk.bold('  Example Data Structure:'));
    const example: Record<string, string> = {};
    for (const field of Object.keys(schema.properties)) {
      example[field] = `<${schema.properties[field]?.type || 'value'}>`;
    }
    console.log(chalk.cyan('    ' + JSON.stringify(example, null, 2).split('\n').join('\n    ')));
    
    console.log('');
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n credentials create --type ${typeName} --name "My ${typeName}" --data @creds.json`, description: 'Create credential with this type' },
      { command: `n8n credentials list`, description: 'List existing credentials' },
    ]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'credentials schema');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
