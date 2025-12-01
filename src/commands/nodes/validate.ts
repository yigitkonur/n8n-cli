/**
 * Nodes Validate Command
 * Validate node configuration against schema with enhanced validation
 */

import chalk from 'chalk';
import { getNodeRepository } from '../../core/db/nodes.js';
import { NodeTypeNormalizer } from '../../utils/node-type-normalizer.js';
import { formatHeader, formatDivider } from '../../core/formatters/header.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { EnhancedConfigValidator, type ValidationMode, type ValidationProfile } from '../../core/validation/index.js';

interface ValidateOptions {
  config?: string;
  profile?: ValidationProfile;
  mode?: ValidationMode;
  json?: boolean;
}

export async function nodesValidateCommand(nodeType: string, opts: ValidateOptions): Promise<void> {
  try {
    const repo = await getNodeRepository();
    
    // Normalize node type
    let normalizedType = nodeType;
    if (!nodeType.includes('.')) {
      normalizedType = `nodes-base.${nodeType.toLowerCase()}`;
    } else {
      normalizedType = NodeTypeNormalizer.normalizeToShortForm(nodeType);
    }
    
    const node = repo.getNode(normalizedType) || repo.getNode(nodeType);
    
    if (!node) {
      console.error(chalk.red(`\n${icons.error} Node not found: ${nodeType}`));
      console.log(chalk.dim(`\n  Search for it: n8n nodes search "${nodeType}"`));
      process.exitCode = 1; return;
    }
    
    // Parse config if provided
    let config: Record<string, any> = {};
    if (opts.config) {
      try {
        config = JSON.parse(opts.config);
      } catch {
        console.error(chalk.red(`\n${icons.error} Invalid JSON config`));
        process.exitCode = 1; return;
      }
    }
    
    // Validate configuration using EnhancedConfigValidator
    const profile = opts.profile || 'runtime';
    const mode = opts.mode || 'operation';
    
    // Use enhanced validation
    const result = EnhancedConfigValidator.validateWithMode(
      normalizedType,
      config,
      node.properties || [],
      mode,
      profile
    );
    
    // Convert enhanced errors/warnings to string arrays for output
    const errors: string[] = result.errors.map(e => 
      e.fix ? `${e.message} (Fix: ${e.fix})` : e.message
    );
    const warnings: string[] = result.warnings.map(w => 
      w.suggestion ? `${w.message} (${w.suggestion})` : w.message
    );
    const suggestions: string[] = [...result.suggestions];
    
    // Add credential suggestions if not already present
    if (node.credentials && node.credentials.length > 0 && !config.credentials) {
      const credSuggestion = `This node requires credentials: ${node.credentials.map((c: any) => c.name || c).join(', ')}`;
      if (!suggestions.includes(credSuggestion)) {
        suggestions.push(credSuggestion);
      }
    }
    
    // Add next steps from enhanced result
    if (result.nextSteps) {
      for (const step of result.nextSteps) {
        if (!suggestions.includes(step)) {
          suggestions.push(step);
        }
      }
    }
    
    const isValid = errors.length === 0;
    
    // JSON output
    if (opts.json) {
      outputJson({
        nodeType: node.nodeType,
        profile,
        valid: isValid,
        errors,
        warnings,
        suggestions,
        requiredProperties: node.properties?.filter((p: any) => p.required).map((p: any) => p.name) || [],
      });
      process.exitCode = isValid ? 0 : 1;
      return;
    }
    
    // Human-friendly output
    console.log(formatHeader({
      title: `Validate: ${node.displayName}`,
      icon: isValid ? icons.success : icons.error,
      context: {
        'Node Type': node.nodeType,
        'Profile': profile,
        'Status': isValid ? chalk.green('Valid') : chalk.red('Invalid'),
      },
    }));
    
    console.log('');
    
    // Errors
    if (errors.length > 0) {
      console.log(formatDivider(`Errors (${errors.length})`));
      errors.forEach((err, i) => {
        console.log(chalk.red(`  ${i + 1}. ${err}`));
      });
      console.log('');
    }
    
    // Warnings
    if (warnings.length > 0) {
      console.log(formatDivider(`Warnings (${warnings.length})`));
      warnings.forEach((warn, i) => {
        console.log(chalk.yellow(`  ${i + 1}. ${warn}`));
      });
      console.log('');
    }
    
    // Suggestions
    if (suggestions.length > 0) {
      console.log(formatDivider('Suggestions'));
      suggestions.forEach((sug) => {
        console.log(chalk.cyan(`  💡 ${sug}`));
      });
      console.log('');
    }
    
    // Required properties
    const requiredProps = node.properties?.filter((p: any) => p.required) || [];
    if (requiredProps.length > 0 && Object.keys(config).length === 0) {
      console.log(formatDivider('Required Properties'));
      requiredProps.forEach((prop: any) => {
        console.log(`  • ${prop.name} (${prop.type})`);
      });
      console.log('');
    }
    
    // Summary
    if (isValid) {
      console.log(chalk.green(`\n${icons.success} Node configuration is valid!`));
    } else {
      console.log(chalk.red(`\n${icons.error} Node has ${errors.length} error(s)`));
    }
    
    // Next actions
    console.log(formatNextActions([
      { command: `n8n nodes get ${node.nodeType}`, description: 'View node schema' },
      { command: `n8n nodes validate ${node.nodeType} --config '{"key":"value"}'`, description: 'Validate with config' },
    ]));
    
    process.exitCode = isValid ? 0 : 1;
    
  } catch (error: any) {
    console.error(chalk.red(`\n${icons.error} Error: ${error.message}`));
    process.exitCode = 1; return;
  }
}
