/**
 * Post-Update Guidance Formatter
 * 
 * Formats PostUpdateGuidance objects for terminal display.
 * Uses box-drawing characters and colors from the theme for consistent CLI styling.
 */

import chalk from 'chalk';
import { icons } from './theme.js';
import type {
  PostUpdateGuidance,
  MigrationStatus,
  GuidanceConfidence,
} from '../autofix/types.js';

/**
 * Format migration status with icon and color
 */
function formatStatus(status: MigrationStatus): string {
  switch (status) {
    case 'complete':
      return chalk.green('✓ Complete');
    case 'partial':
      return chalk.yellow('◐ Partial');
    case 'manual_required':
      return chalk.red('✋ Manual Required');
    default:
      return status;
  }
}

/**
 * Format confidence level with color
 */
function formatConfidence(confidence: GuidanceConfidence): string {
  switch (confidence) {
    case 'HIGH':
      return chalk.green('HIGH');
    case 'MEDIUM':
      return chalk.yellow('MEDIUM');
    case 'LOW':
      return chalk.red('LOW');
    default:
      return confidence;
  }
}

/**
 * Truncate and pad a string to fit within a box
 */
function padLine(content: string, width: number): string {
  // Strip ANSI codes for length calculation
  // eslint-disable-next-line no-control-regex -- ANSI escape code matching is intentional
  const stripped = content.replace(/\x1b\[[0-9;]*m/g, '');
  if (stripped.length > width) {
    return `${content.slice(0, width - 3)  }...`;
  }
  const padding = width - stripped.length;
  return content + ' '.repeat(padding);
}

/**
 * Format a single PostUpdateGuidance item for terminal display
 */
function formatSingleGuidance(guidance: PostUpdateGuidance, boxWidth: number = 70): string {
  const lines: string[] = [];
  const innerWidth = boxWidth - 4; // Account for box borders and padding
  
  // Box top
  lines.push(chalk.cyan(`╔${  '═'.repeat(boxWidth - 2)  }╗`));
  
  // Title
  const title = `${icons.info} Post-Update Guidance`;
  lines.push(chalk.cyan('║ ') + chalk.bold(padLine(title, innerWidth)) + chalk.cyan(' ║'));
  
  // Separator
  lines.push(chalk.cyan(`╠${  '═'.repeat(boxWidth - 2)  }╣`));
  
  // Node info
  const nodeIdShort = guidance.nodeId.length > 8 ? `${guidance.nodeId.slice(0, 8)  }...` : guidance.nodeId;
  lines.push(chalk.cyan('║ ') + padLine(`Node: ${guidance.nodeName} (${nodeIdShort})`, innerWidth) + chalk.cyan(' ║'));
  lines.push(chalk.cyan('║ ') + padLine(`Type: ${guidance.nodeType}`, innerWidth) + chalk.cyan(' ║'));
  lines.push(chalk.cyan('║ ') + padLine(`Version: v${guidance.oldVersion} → v${guidance.newVersion}`, innerWidth) + chalk.cyan(' ║'));
  
  // Separator
  lines.push(chalk.cyan(`╟${  '─'.repeat(boxWidth - 2)  }╢`));
  
  // Status info
  lines.push(chalk.cyan('║ ') + padLine(`Status: ${formatStatus(guidance.migrationStatus)}`, innerWidth) + chalk.cyan(' ║'));
  lines.push(chalk.cyan('║ ') + padLine(`Confidence: ${formatConfidence(guidance.confidence)}`, innerWidth) + chalk.cyan(' ║'));
  lines.push(chalk.cyan('║ ') + padLine(`Est. Time: ${guidance.estimatedTime}`, innerWidth) + chalk.cyan(' ║'));
  
  // Required actions
  if (guidance.requiredActions.length > 0) {
    lines.push(chalk.cyan(`╟${  '─'.repeat(boxWidth - 2)  }╢`));
    lines.push(chalk.cyan('║ ') + chalk.yellow(padLine(`${icons.warning} Required Actions (${guidance.requiredActions.length}):`, innerWidth)) + chalk.cyan(' ║'));
    
    for (const action of guidance.requiredActions.slice(0, 5)) {
      const actionLine = `  [${action.priority}] ${action.property}`;
      lines.push(chalk.cyan('║ ') + padLine(actionLine, innerWidth) + chalk.cyan(' ║'));
      
      // Wrap reason text if needed
      const reasonText = `    → ${action.reason}`;
      if (reasonText.length > innerWidth) {
        lines.push(chalk.cyan('║ ') + chalk.dim(padLine(reasonText.slice(0, innerWidth), innerWidth)) + chalk.cyan(' ║'));
      } else {
        lines.push(chalk.cyan('║ ') + chalk.dim(padLine(reasonText, innerWidth)) + chalk.cyan(' ║'));
      }
    }
    
    if (guidance.requiredActions.length > 5) {
      lines.push(chalk.cyan('║ ') + chalk.dim(padLine(`  ... and ${guidance.requiredActions.length - 5} more`, innerWidth)) + chalk.cyan(' ║'));
    }
  }
  
  // Behavior changes
  if (guidance.behaviorChanges.length > 0) {
    lines.push(chalk.cyan(`╟${  '─'.repeat(boxWidth - 2)  }╢`));
    lines.push(chalk.cyan('║ ') + chalk.blue(padLine(`${icons.info} Behavior Changes (${guidance.behaviorChanges.length}):`, innerWidth)) + chalk.cyan(' ║'));
    
    for (const change of guidance.behaviorChanges.slice(0, 3)) {
      const changeLine = `  • ${change.aspect}`;
      lines.push(chalk.cyan('║ ') + padLine(changeLine, innerWidth) + chalk.cyan(' ║'));
      
      const recText = `    ${change.recommendation}`.slice(0, innerWidth);
      lines.push(chalk.cyan('║ ') + chalk.dim(padLine(recText, innerWidth)) + chalk.cyan(' ║'));
    }
    
    if (guidance.behaviorChanges.length > 3) {
      lines.push(chalk.cyan('║ ') + chalk.dim(padLine(`  ... and ${guidance.behaviorChanges.length - 3} more`, innerWidth)) + chalk.cyan(' ║'));
    }
  }
  
  // Migration steps (abbreviated)
  if (guidance.migrationSteps.length > 0) {
    lines.push(chalk.cyan(`╟${  '─'.repeat(boxWidth - 2)  }╢`));
    lines.push(chalk.cyan('║ ') + chalk.green(padLine(`${icons.check} Migration Steps:`, innerWidth)) + chalk.cyan(' ║'));
    
    // Show just the main steps (lines starting with "Step")
    const mainSteps = guidance.migrationSteps.filter(s => s.startsWith('Step'));
    for (const step of mainSteps.slice(0, 4)) {
      lines.push(chalk.cyan('║ ') + padLine(`  ${step}`, innerWidth) + chalk.cyan(' ║'));
    }
    
    if (mainSteps.length > 4) {
      lines.push(chalk.cyan('║ ') + chalk.dim(padLine(`  ... and ${mainSteps.length - 4} more steps`, innerWidth)) + chalk.cyan(' ║'));
    }
  }
  
  // Box bottom
  lines.push(chalk.cyan(`╚${  '═'.repeat(boxWidth - 2)  }╝`));
  
  return lines.join('\n');
}

/**
 * Format multiple PostUpdateGuidance items for terminal display
 */
export function formatPostUpdateGuidance(guidanceList: PostUpdateGuidance[]): string {
  if (!guidanceList || guidanceList.length === 0) {
    return '';
  }

  const formattedItems = guidanceList.map(g => formatSingleGuidance(g));
  return formattedItems.join('\n\n');
}

/**
 * Format guidance summary header (shows count and overall status)
 */
export function formatGuidanceSummary(guidanceList: PostUpdateGuidance[]): string {
  if (!guidanceList || guidanceList.length === 0) {
    return '';
  }

  const complete = guidanceList.filter(g => g.migrationStatus === 'complete').length;
  const partial = guidanceList.filter(g => g.migrationStatus === 'partial').length;
  const manual = guidanceList.filter(g => g.migrationStatus === 'manual_required').length;
  
  const totalActions = guidanceList.reduce((sum, g) => sum + g.requiredActions.length, 0);
  const totalBehaviorChanges = guidanceList.reduce((sum, g) => sum + g.behaviorChanges.length, 0);

  const parts: string[] = [];
  
  parts.push(`${icons.info} Post-Update Guidance: ${guidanceList.length} node(s)`);
  
  if (complete > 0) {parts.push(chalk.green(`  ✓ ${complete} complete`));}
  if (partial > 0) {parts.push(chalk.yellow(`  ◐ ${partial} partial`));}
  if (manual > 0) {parts.push(chalk.red(`  ✋ ${manual} manual required`));}
  
  if (totalActions > 0) {
    parts.push(chalk.dim(`  ${totalActions} action(s) recommended`));
  }
  
  if (totalBehaviorChanges > 0) {
    parts.push(chalk.dim(`  ${totalBehaviorChanges} behavior change(s) to review`));
  }

  return parts.join('\n');
}
