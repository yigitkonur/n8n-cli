/**
 * Credential Type Show Command
 * Show detailed schema for a specific credential type
 */

import chalk from 'chalk';
import { credentialRegistry, type CredentialTypeInfo, type CredentialProperty } from '../../core/credential-loader.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatTable } from '../../core/formatters/table.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatExportFooter } from '../../core/formatters/jq-recipes.js';
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';

interface ShowTypeOptions {
  save?: string;
  json?: boolean;
}

export async function credentialTypeShowCommand(typeName: string, opts: ShowTypeOptions): Promise<void> {
  try {
    const credType = credentialRegistry.getCredentialType(typeName);
    
    if (!credType) {
      // Try to find similar
      const similar = credentialRegistry.searchCredentialTypes(typeName, 3);
      
      console.error(chalk.red(`\n${icons.error} Credential type not found: ${typeName}`));
      
      if (similar.length > 0) {
        console.log(chalk.dim('\n  Did you mean:'));
        similar.forEach(s => {
          console.log(chalk.dim(`    • ${s.name} (${s.displayName})`));
        });
      }
      
      console.log(chalk.dim(`\n  Search for it: n8n credentials types --search "${typeName}"`));
      process.exitCode = 1;
      return;
    }

    // JSON output mode
    if (opts.json) {
      outputJson(credType);
      return;
    }

    // Save to file if requested
    if (opts.save) {
      await saveToJson(credType, { path: opts.save });
    }

    // Human-friendly output
    outputCredentialSchema(credType);

    // Next actions
    console.log(formatNextActions([
      { command: `n8n credentials types --search "${credType.displayName}"`, description: 'Find similar credentials' },
      { command: `n8n credentials list`, description: 'List your credentials' },
      { command: `n8n credentials create --type ${credType.name}`, description: 'Create credential' },
    ]));

    // Export hints
    console.log(formatExportFooter('credentials-type-show', `credentials show-type ${typeName}`, opts.save));

  } catch (error: any) {
    console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    if (error.message.includes('n8n-nodes-base')) {
      console.log(chalk.dim('\n  Ensure n8n-nodes-base is installed.'));
    }
    process.exitCode = 1;
  }
}

/**
 * Output credential type schema
 */
function outputCredentialSchema(credType: CredentialTypeInfo): void {
  // Auth method icons
  const authIcons: Record<string, string> = {
    'OAuth2': '🔐',
    'API Key': '🔑',
    'Basic Auth': '👤',
    'Bearer': '🎫',
    'Custom': '⚙️',
  };

  console.log(formatHeader({
    title: credType.displayName,
    icon: authIcons[credType.authType] || '🔑',
    context: {
      'Type': credType.name,
      'Auth Method': credType.authType,
      'Fields': `${credType.propertyCount} properties`,
    },
  }));

  console.log('');

  // Properties
  if (credType.properties.length === 0) {
    console.log(chalk.dim('  No properties defined.'));
    return;
  }

  // Separate required and optional
  const required = credType.properties.filter(p => p.required);
  const optional = credType.properties.filter(p => !p.required);

  // Required fields
  if (required.length > 0) {
    console.log(formatDivider('Required Fields'));
    required.forEach(prop => outputPropertyDetail(prop, true));
  }

  // Optional fields
  if (optional.length > 0) {
    console.log(formatDivider('Optional Fields'));
    optional.slice(0, 10).forEach(prop => outputPropertyDetail(prop, false));
    
    if (optional.length > 10) {
      console.log(chalk.dim(`    ... and ${optional.length - 10} more optional fields\n`));
    }
  }

  // Example data structure
  console.log(formatDivider('Example Data Structure'));
  const example: Record<string, string> = {};
  for (const prop of credType.properties.slice(0, 8)) {
    const placeholder = getPlaceholder(prop);
    example[prop.name] = placeholder;
  }
  if (credType.properties.length > 8) {
    example['...'] = '(more fields)';
  }
  console.log(chalk.cyan('  ' + JSON.stringify(example, null, 2).split('\n').join('\n  ')));
  console.log('');

  // Setup guide based on auth type
  if (credType.authType === 'OAuth2') {
    console.log(formatDivider('OAuth2 Setup Guide'));
    console.log(chalk.dim('  1. Create an OAuth app in the service\'s developer console'));
    console.log(chalk.dim('  2. Copy the Client ID and Client Secret'));
    console.log(chalk.dim('  3. Set the callback URL to your n8n instance'));
    console.log(chalk.dim('  4. Add credentials in n8n and complete OAuth flow'));
    console.log('');
  } else if (credType.authType === 'API Key') {
    console.log(formatDivider('API Key Setup'));
    console.log(chalk.dim('  1. Log into the service and find API settings'));
    console.log(chalk.dim('  2. Generate a new API key'));
    console.log(chalk.dim('  3. Copy the key and add it to n8n credentials'));
    console.log('');
  }

  // Documentation link if available
  if (credType.documentationUrl) {
    console.log(chalk.dim(`  📖 Documentation: ${credType.documentationUrl}\n`));
  }
}

/**
 * Output a single property detail
 */
function outputPropertyDetail(prop: CredentialProperty, isRequired: boolean): void {
  const name = prop.displayName || prop.name;
  const type = prop.type || 'string';
  const indicator = isRequired ? chalk.red('*') : '';
  
  console.log(`  ${chalk.bold(name)}${indicator} ${chalk.dim(`(${prop.name})`)}`);
  console.log(`    Type: ${chalk.cyan(type)}`);
  
  if (prop.description) {
    const desc = prop.description.length > 60 
      ? prop.description.slice(0, 57) + '...'
      : prop.description;
    console.log(`    ${chalk.dim(desc)}`);
  }
  
  if (prop.default !== undefined && prop.default !== '') {
    console.log(`    Default: ${chalk.yellow(JSON.stringify(prop.default))}`);
  }
  
  if (prop.options && prop.options.length > 0) {
    const optValues = prop.options.map(o => o.value || o.name).slice(0, 4);
    const moreCount = prop.options.length - 4;
    console.log(`    Options: ${optValues.join(', ')}${moreCount > 0 ? ` (+${moreCount} more)` : ''}`);
  }
  
  // Special indicators
  if (prop.typeOptions?.password) {
    console.log(`    ${chalk.yellow('🔒 Sensitive (will be encrypted)')}`);
  }
  
  console.log('');
}

/**
 * Get placeholder value for example
 */
function getPlaceholder(prop: CredentialProperty): string {
  if (prop.typeOptions?.password) {
    return '<secret>';
  }
  
  switch (prop.type) {
    case 'boolean':
      return prop.default !== undefined ? String(prop.default) : 'true/false';
    case 'number':
      return prop.default !== undefined ? String(prop.default) : '<number>';
    case 'options':
      if (prop.options && prop.options.length > 0) {
        return prop.default || prop.options[0]?.value || '<option>';
      }
      return '<option>';
    default:
      if (prop.name.toLowerCase().includes('url')) {
        return 'https://...';
      }
      if (prop.name.toLowerCase().includes('id')) {
        return '<your-id>';
      }
      if (prop.name.toLowerCase().includes('key') || prop.name.toLowerCase().includes('secret')) {
        return '<your-key>';
      }
      return `<${prop.type || 'value'}>`;
  }
}
