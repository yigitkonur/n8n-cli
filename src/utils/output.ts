import type { ValidationSummary, ValidationIssue, SourceSnippet } from '../core/types.js';

const SEPARATOR = '─'.repeat(80);
const HEAVY_SEPARATOR = '━'.repeat(80);

export function outputSummary(summary: ValidationSummary, jsonOutput: boolean): void {
  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const prefix = summary.valid ? '✅ VALID' : '❌ INVALID';
  console.log(`\n${prefix}: ${summary.input}`);
  console.log(HEAVY_SEPARATOR);

  if (summary.fixed && summary.fixed > 0) {
    console.log(`🔧 Fixed ${summary.fixed} issue(s)`);
  }

  if (summary.issues && summary.issues.length > 0) {
    const errors = summary.issues.filter(i => i.severity === 'error');
    const warnings = summary.issues.filter(i => i.severity === 'warning');

    if (errors.length > 0) {
      console.log(`\n🛑 ERRORS (${errors.length})\n`);
      errors.forEach((issue, idx) => {
        printRichIssue(issue, idx + 1);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${warnings.length})\n`);
      warnings.forEach((issue, idx) => {
        printRichIssue(issue, idx + 1);
      });
    }
  } else if (summary.errors.length || summary.warnings.length) {
    // Legacy fallback
    if (summary.errors.length) {
      console.log('\nErrors:');
      summary.errors.forEach(err => console.log(`  - ${err}`));
    }
    if (summary.warnings.length) {
      console.log('\nWarnings:');
      summary.warnings.forEach(warn => console.log(`  - ${warn}`));
    }
  }

  console.log('\n' + HEAVY_SEPARATOR + '\n');
}

function printRichIssue(issue: ValidationIssue, index: number): void {
  console.log(SEPARATOR);
  
  // Header: Error code and location
  const locationLine = issue.sourceLocation 
    ? `Line ${issue.sourceLocation.line}, Column ${issue.sourceLocation.column}`
    : '';
  const pathStr = issue.location?.path || '';
  
  console.log(`[${index}] ${issue.code}`);
  if (pathStr) {
    console.log(`    Path: ${pathStr}`);
  }
  if (locationLine) {
    console.log(`    Location: ${locationLine}`);
  }
  
  // Node info if available
  if (issue.location?.nodeName || issue.location?.nodeType) {
    const nodeInfo = [
      issue.location.nodeName ? `"${issue.location.nodeName}"` : null,
      issue.location.nodeType ? `(${issue.location.nodeType})` : null,
      issue.location.nodeId ? `[id: ${issue.location.nodeId}]` : null,
    ].filter(Boolean).join(' ');
    if (nodeInfo) {
      console.log(`    Node: ${nodeInfo}`);
    }
  }
  
  // Main message
  console.log(`\n    Message: ${issue.message}`);
  
  // Source snippet (the key part for understanding root cause)
  if (issue.sourceSnippet) {
    console.log('\n    Source:');
    printSourceSnippet(issue.sourceSnippet);
  }
  
  // Context information - this is where we explain the root cause
  if (issue.context) {
    console.log('\n    Root Cause Analysis:');
    
    if (issue.context.n8nError) {
      console.log(`      • n8n Runtime Error: "${issue.context.n8nError}"`);
    }
    
    if (issue.context.expected) {
      console.log(`      • Expected: ${formatContextValue(issue.context.expected)}`);
    }
    
    if (issue.context.value !== undefined) {
      console.log(`      • Found: ${formatContextValue(issue.context.value)}`);
    }
    
    // Full object context - show the entire problematic structure
    if (issue.context.fullObject !== undefined) {
      console.log('\n    Full Context (the problematic object):');
      printFullObject(issue.context.fullObject);
    }
    // Schema-based expected usage (narrowed to relevant path + delta)
    if (issue.context.expectedSchema !== undefined) {
      const schemaPath = issue.context.schemaPath || 'parameters';
      const narrowedSchema = getByPath(issue.context.expectedSchema, schemaPath) 
        ?? issue.context.expectedSchema;
      const narrowedUser = getByPath(issue.context.fullObject, schemaPath);

      // Compute shallow delta
      const delta = computeSchemaDelta(narrowedUser, narrowedSchema);
      if (delta.missing.length || delta.extra.length) {
        console.log('\n    Schema Delta:');
        if (delta.missing.length) {
          console.log(`      • Missing keys: ${delta.missing.join(', ')}`);
        }
        if (delta.extra.length) {
          console.log(`      • Extra keys: ${delta.extra.join(', ')}`);
        }
      }

      console.log('\n    Correct Usage:');
      printFullObject(narrowedSchema);
    }
  }
  
  // Valid alternatives - helps understand what SHOULD be there
  if (issue.validAlternatives && issue.validAlternatives.length > 0) {
    console.log(`\n    Valid Alternatives: [${issue.validAlternatives.join(', ')}]`);
  }
  
  // Hint for additional context
  if (issue.hint) {
    console.log(`\n    Note: ${issue.hint}`);
  }
  
  console.log('');
}

function printSourceSnippet(snippet: SourceSnippet): void {
  const maxLineNumWidth = String(snippet.endLine).length;
  
  console.log('    ┌' + '─'.repeat(maxLineNumWidth + 3) + '┬' + '─'.repeat(60));
  
  for (const line of snippet.lines) {
    const lineNum = String(line.lineNumber).padStart(maxLineNumWidth, ' ');
    const marker = line.isHighlighted ? '>' : ' ';
    const prefix = line.isHighlighted ? '>>>' : '   ';
    
    // Truncate long lines for display
    let content = line.content;
    if (content.length > 70) {
      content = content.substring(0, 67) + '...';
    }
    
    console.log(`    │ ${lineNum} │${prefix} ${content}`);
  }
  
  console.log('    └' + '─'.repeat(maxLineNumWidth + 3) + '┴' + '─'.repeat(60));
}

function printFullObject(obj: unknown): void {
  try {
    const formatted = JSON.stringify(obj, null, 2);
    const lines = formatted.split('\n');
    
    // Limit to reasonable size
    const maxLines = 25;
    const truncated = lines.length > maxLines;
    const displayLines = truncated ? lines.slice(0, maxLines) : lines;
    
    console.log('    ```json');
    displayLines.forEach(line => {
      console.log('    ' + line);
    });
    if (truncated) {
      console.log(`    ... (${lines.length - maxLines} more lines)`);
    }
    console.log('    ```');
  } catch {
    console.log(`    ${String(obj)}`);
  }
}

function formatContextValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    try {
      const str = JSON.stringify(value);
      return str.length > 100 ? str.substring(0, 97) + '...' : str;
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Walk an object by dot-separated path, treating arrays by picking index 0.
 */
function getByPath(obj: unknown, path: string): unknown {
  if (!path || !obj || typeof obj !== 'object') return obj;
  const parts = path.replace(/^parameters\.?/, '').split('.').filter(Boolean);
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      current = current[0];
      if (current === null || current === undefined) return undefined;
    }
    if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Compute shallow delta between user object and schema at the same path.
 * Returns { missing: string[], extra: string[] }
 */
function computeSchemaDelta(
  userObj: unknown,
  schemaObj: unknown,
): { missing: string[]; extra: string[] } {
  const missing: string[] = [];
  const extra: string[] = [];

  if (
    !userObj || typeof userObj !== 'object' ||
    !schemaObj || typeof schemaObj !== 'object' ||
    Array.isArray(userObj) || Array.isArray(schemaObj)
  ) {
    return { missing, extra };
  }

  const userKeys = new Set(Object.keys(userObj as Record<string, unknown>));
  const schemaKeys = new Set(Object.keys(schemaObj as Record<string, unknown>));

  for (const k of schemaKeys) {
    if (!userKeys.has(k)) missing.push(k);
  }
  for (const k of userKeys) {
    if (!schemaKeys.has(k)) extra.push(k);
  }

  return { missing, extra };
}

