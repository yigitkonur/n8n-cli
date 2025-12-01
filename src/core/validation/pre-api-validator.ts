/**
 * Pre-API Validation Helper
 * 
 * Validates workflows BEFORE sending to n8n API.
 * Provides rich error messages instead of cryptic API errors.
 * 
 * Usage:
 * ```ts
 * const result = validateBeforeApi(workflow, { json: opts.json });
 * if (!result.shouldProceed) {
 *   displayValidationErrors(result, opts.json);
 *   return;
 * }
 * // Safe to call API
 * ```
 */

import chalk from 'chalk';
import { validateWorkflowStructure, type ValidateOptions } from '../validator.js';
import type { ValidationResult, ValidationIssue, ValidationMode, ValidationProfile } from '../types.js';
import { formatHeader, formatDivider } from '../formatters/header.js';
import { outputJson } from '../formatters/json.js';
import { icons } from '../formatters/theme.js';
import { ExitCode } from '../../utils/exit-codes.js';

/**
 * Options for pre-API validation
 */
export interface PreValidationOptions {
  /** Original JSON source for line number extraction */
  rawSource?: string;
  /** Skip validation and proceed to API (power user override) */
  skipValidation?: boolean;
  /** Enable expression format validation (default: true) */
  validateExpressions?: boolean;
  /** Validation profile (default: 'runtime') */
  profile?: ValidationProfile;
  /** Validation mode (default: 'operation') */
  mode?: ValidationMode;
  /** JSON output mode */
  json?: boolean;
  /** Context for error messages (e.g., 'create', 'import') */
  context?: string;
}

/**
 * Result of pre-API validation
 */
export interface PreValidationResult {
  /** Whether validation passed (no errors) */
  valid: boolean;
  /** Whether we should proceed to API call */
  shouldProceed: boolean;
  /** Validation errors */
  errors: ValidationIssue[];
  /** Validation warnings */
  warnings: ValidationIssue[];
  /** Full validation result */
  fullResult: ValidationResult;
  /** Reason for shouldProceed value */
  reason?: string;
}

/**
 * Validate workflow BEFORE sending to n8n API
 * 
 * @param workflow - Workflow to validate
 * @param options - Validation options
 * @returns Validation result with shouldProceed flag
 */
export function validateBeforeApi(
  workflow: unknown,
  options: PreValidationOptions = {}
): PreValidationResult {
  // If validation is explicitly skipped, proceed with warning
  if (options.skipValidation) {
    return {
      valid: true,
      shouldProceed: true,
      errors: [],
      warnings: [],
      fullResult: { valid: true, errors: [], warnings: [], issues: [] },
      reason: 'Validation skipped by user (--skip-validation)',
    };
  }

  // Build validation options
  const validateOptions: ValidateOptions = {
    rawSource: options.rawSource,
    validateExpressions: options.validateExpressions ?? true,
    profile: options.profile || 'runtime',
    mode: options.mode || 'operation',
  };

  // Run validation
  const result = validateWorkflowStructure(workflow, validateOptions);

  // Extract errors and warnings from issues
  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');

  // Determine if we should proceed
  // Only block on errors, not warnings
  const shouldProceed = errors.length === 0;

  return {
    valid: result.valid,
    shouldProceed,
    errors,
    warnings,
    fullResult: result,
    reason: shouldProceed ? undefined : `${errors.length} validation error(s) found`,
  };
}

/**
 * Display validation errors in human-friendly format
 */
export function displayValidationErrors(
  result: PreValidationResult,
  options: { json?: boolean; context?: string } = {}
): void {
  const { json, context: _context = 'validate' } = options;

  if (json) {
    outputJson({
      success: false,
      validationFailed: true,
      errors: result.errors.map(formatIssueForJson),
      warnings: result.warnings.map(formatIssueForJson),
      hint: 'Use --skip-validation to bypass (not recommended)',
    });
    return;
  }

  // Human-friendly output
  console.log(formatHeader({
    title: 'Validation Failed',
    icon: icons.error,
    context: {
      'Status': 'Workflow NOT sent to n8n',
      'Errors': result.errors.length.toString(),
      'Warnings': result.warnings.length.toString(),
    },
  }));

  // Show errors
  if (result.errors.length > 0) {
    console.log('');
    console.log(formatDivider(`Errors (${result.errors.length})`));
    for (const error of result.errors.slice(0, 10)) {
      printIssue(error, 'error');
    }
    if (result.errors.length > 10) {
      console.log(chalk.dim(`  ... and ${result.errors.length - 10} more errors`));
    }
  }

  // Show warnings (limited)
  if (result.warnings.length > 0) {
    console.log('');
    console.log(formatDivider(`Warnings (${result.warnings.length})`));
    for (const warning of result.warnings.slice(0, 5)) {
      printIssue(warning, 'warning');
    }
    if (result.warnings.length > 5) {
      console.log(chalk.dim(`  ... and ${result.warnings.length - 5} more warnings`));
    }
  }

  // Guidance
  console.log('');
  console.log(chalk.cyan(`${icons.info} Fix the errors above and try again.`));
  console.log(chalk.dim(`  Use n8n workflows validate <file> for detailed analysis.`));
  console.log(chalk.dim(`  Use --skip-validation to bypass (not recommended).`));

  // Set exit code
  process.exitCode = ExitCode.DATAERR;
}

/**
 * Print a single validation issue
 */
function printIssue(issue: ValidationIssue, type: 'error' | 'warning'): void {
  const color = type === 'error' ? chalk.red : chalk.yellow;
  const icon = type === 'error' ? icons.error : icons.warning;

  // Main message
  let msg = `  ${icon} `;
  
  // Add code
  msg += `${chalk.bold(`[${issue.code}]`)  } `;
  
  // Add message
  msg += issue.message;

  console.log(color(msg));

  // Add location info
  if (issue.location?.nodeName || issue.sourceLocation?.line) {
    let locInfo = chalk.dim('    ');
    if (issue.location?.nodeName) {
      locInfo += `Node: "${issue.location.nodeName}"`;
    }
    if (issue.sourceLocation?.line) {
      locInfo += issue.location?.nodeName ? ', ' : '';
      locInfo += `Line ${issue.sourceLocation.line}`;
    }
    console.log(locInfo);
  }

  // Add hint
  if (issue.hint) {
    console.log(chalk.dim(`    💡 ${issue.hint}`));
  }

  // Add expected value
  if (issue.context?.expected && typeof issue.context.expected === 'string') {
    const expected = issue.context.expected.length > 60 
      ? `${issue.context.expected.slice(0, 57)  }...`
      : issue.context.expected;
    console.log(chalk.dim(`    Expected: ${expected}`));
  }
}

/**
 * Format issue for JSON output
 */
function formatIssueForJson(issue: ValidationIssue): Record<string, unknown> {
  return {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    nodeName: issue.location?.nodeName,
    nodeType: issue.location?.nodeType,
    path: issue.location?.path,
    line: issue.sourceLocation?.line,
    column: issue.sourceLocation?.column,
    hint: issue.hint,
    expected: issue.context?.expected,
    suggestions: issue.suggestions,
  };
}

/**
 * Check if workflow has critical errors that would fail at API
 * This is a quick check that doesn't do full validation
 */
export function hasStructuralErrors(workflow: unknown): boolean {
  if (!workflow || typeof workflow !== 'object') {return true;}
  const wf = workflow as Record<string, unknown>;
  
  // Must have nodes array
  if (!Array.isArray(wf.nodes)) {return true;}
  
  // Must have connections object
  if (!wf.connections || typeof wf.connections !== 'object') {return true;}
  
  // Each node must have type, typeVersion, position, parameters
  for (const node of wf.nodes) {
    if (!node || typeof node !== 'object') {return true;}
    const n = node as Record<string, unknown>;
    if (!n.type) {return true;}
    if (n.typeVersion === undefined) {return true;}
    if (!Array.isArray(n.position)) {return true;}
    if (!n.parameters || typeof n.parameters !== 'object') {return true;}
  }
  
  return false;
}
