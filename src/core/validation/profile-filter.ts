/**
 * Profile-Based Filtering
 * 
 * Applies validation profile filters to results.
 * Generates actionable next steps based on validation errors.
 * Ported from n8n-mcp/src/services/enhanced-config-validator.ts
 */

import type {
  ValidationProfile,
  EnhancedValidationResult,
  ValidationError,
  ValidationWarning,
} from './types.js';
import type { ValidationIssue } from '../types.js';

/**
 * Check if a warning should be filtered out (hardcoded credentials shown only in strict mode)
 */
function shouldFilterCredentialWarning(warning: ValidationWarning): boolean {
  return (
    warning.type === 'security' &&
    warning.message !== undefined &&
    warning.message.includes('Hardcoded nodeCredentialType')
  );
}

/**
 * Apply profile-based filtering to validation results
 * 
 * @param result - The enhanced validation result to filter
 * @param profile - The validation profile to apply
 */
export function applyProfileFilters(
  result: EnhancedValidationResult,
  profile: ValidationProfile
): void {
  switch (profile) {
    case 'minimal':
      // Only keep missing required errors
      result.errors = result.errors.filter(e => e.type === 'missing_required');
      // Keep ONLY critical warnings (security and deprecated)
      // But filter out hardcoded credential type warnings (only show in strict mode)
      result.warnings = result.warnings.filter(w => {
        if (shouldFilterCredentialWarning(w)) {
          return false;
        }
        return w.type === 'security' || w.type === 'deprecated';
      });
      result.suggestions = [];
      break;

    case 'runtime':
      // Keep critical runtime errors only
      result.errors = result.errors.filter(
        e =>
          e.type === 'missing_required' ||
          e.type === 'invalid_value' ||
          (e.type === 'invalid_type' && e.message.includes('undefined'))
      );
      // Keep security and deprecated warnings, REMOVE property visibility warnings
      result.warnings = result.warnings.filter(w => {
        // Filter out hardcoded credential type warnings (only show in strict mode)
        if (shouldFilterCredentialWarning(w)) {
          return false;
        }
        if (w.type === 'security' || w.type === 'deprecated') {return true;}
        // FILTER OUT property visibility warnings (too noisy)
        if (w.type === 'inefficient' && w.message && w.message.includes('not visible')) {
          return false;
        }
        return false;
      });
      result.suggestions = [];
      break;

    case 'strict':
      // Keep everything, add more suggestions
      if (result.warnings.length === 0 && result.errors.length === 0) {
        result.suggestions.push(
          'Consider adding error handling with onError property and timeout configuration'
        );
        result.suggestions.push('Add authentication if connecting to external services');
      }
      // Require error handling for external service nodes
      enforceErrorHandlingForProfile(result, profile);
      break;

    case 'ai-friendly':
    default:
      // Current behavior - balanced for AI agents
      // Filter out noise but keep helpful warnings
      result.warnings = result.warnings.filter(w => {
        // Filter out hardcoded credential type warnings (only show in strict mode)
        if (shouldFilterCredentialWarning(w)) {
          return false;
        }
        // Keep security and deprecated warnings
        if (w.type === 'security' || w.type === 'deprecated') {return true;}
        // Keep missing common properties
        if (w.type === 'missing_common') {return true;}
        // Keep best practice warnings
        if (w.type === 'best_practice') {return true;}
        // FILTER OUT inefficient warnings about property visibility
        if (w.type === 'inefficient' && w.message && w.message.includes('not visible')) {
          return false;
        }
        // Filter out internal property warnings
        if (w.type === 'inefficient' && w.property?.startsWith('_')) {
          return false;
        }
        return true;
      });
      // Add error handling suggestions for AI-friendly profile
      addErrorHandlingSuggestions(result);
      break;
  }
}

/**
 * Enforce error handling requirements based on profile
 */
function enforceErrorHandlingForProfile(
  result: EnhancedValidationResult,
  profile: ValidationProfile
): void {
  // Only enforce for strict profile on external service nodes
  if (profile !== 'strict') {return;}

  const nodeType = result.operation?.resource || '';
  const errorProneTypes = ['httpRequest', 'webhook', 'database', 'api', 'slack', 'email', 'openai'];

  if (errorProneTypes.some(type => nodeType.toLowerCase().includes(type))) {
    result.warnings.push({
      type: 'best_practice',
      property: 'errorHandling',
      message: 'External service nodes should have error handling configured',
      suggestion:
        'Add onError: "continueRegularOutput" or "stopWorkflow" with retryOnFail: true for resilience',
    });
  }
}

/**
 * Add error handling suggestions for AI-friendly profile
 */
function addErrorHandlingSuggestions(result: EnhancedValidationResult): void {
  // Check if there are any network/API related errors
  const hasNetworkErrors = result.errors.some(
    e =>
      e.message.toLowerCase().includes('url') ||
      e.message.toLowerCase().includes('endpoint') ||
      e.message.toLowerCase().includes('api')
  );

  if (hasNetworkErrors) {
    result.suggestions.push(
      'For API calls, consider adding onError: "continueRegularOutput" with retryOnFail: true and maxTries: 3'
    );
  }

  // Check for webhook configurations
  const isWebhook =
    result.operation?.resource === 'webhook' ||
    result.errors.some(e => e.message.toLowerCase().includes('webhook'));

  if (isWebhook) {
    result.suggestions.push(
      'Webhooks should use onError: "continueRegularOutput" to ensure responses are always sent'
    );
  }
}

/**
 * Generate actionable next steps based on validation results
 */
export function generateNextSteps(result: EnhancedValidationResult): string[] {
  const steps: string[] = [];

  // Group errors by type
  const requiredErrors = result.errors.filter(e => e.type === 'missing_required');
  const typeErrors = result.errors.filter(e => e.type === 'invalid_type');
  const valueErrors = result.errors.filter(e => e.type === 'invalid_value');

  if (requiredErrors.length > 0) {
    const properties = requiredErrors.map(e => e.property).join(', ');
    steps.push(`Add required fields: ${properties}`);
  }

  if (typeErrors.length > 0) {
    const fixes = typeErrors.map(e => `${e.property} should be ${e.fix || 'correct type'}`).join(', ');
    steps.push(`Fix type mismatches: ${fixes}`);
  }

  if (valueErrors.length > 0) {
    const properties = valueErrors.map(e => e.property).join(', ');
    steps.push(`Correct invalid values: ${properties}`);
  }

  if (result.warnings.length > 0 && result.errors.length === 0) {
    steps.push('Consider addressing warnings for better reliability');
  }

  if (result.errors.length > 0) {
    steps.push('Fix the errors above following the provided suggestions');
  }

  return steps;
}

/**
 * Deduplicate errors based on property and type
 * Prefers more specific error messages over generic ones
 */
export function deduplicateErrors(errors: ValidationError[]): ValidationError[] {
  const seen = new Map<string, ValidationError>();

  for (const error of errors) {
    const key = `${error.property}-${error.type}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, error);
    } else {
      // Keep the error with more specific message or fix
      const existingLength = (existing.message?.length || 0) + (existing.fix?.length || 0);
      const newLength = (error.message?.length || 0) + (error.fix?.length || 0);

      if (newLength > existingLength) {
        seen.set(key, error);
      }
    }
  }

  return Array.from(seen.values());
}

// ========== Issue-Based Profile Filtering ==========

/**
 * Map issue codes to their category for filtering
 */
function categorizeIssue(issue: ValidationIssue): 'structural' | 'runtime' | 'security' | 'best_practice' | 'info' {
  const code = issue.code || '';
  
  // Structural errors - always included
  if (code.includes('MISSING_') || code.includes('INVALID_')) {
    return 'structural';
  }
  
  // Security issues
  if (code.includes('SECURITY') || code.includes('INJECTION') || code.includes('EVAL') || 
      issue.message?.toLowerCase().includes('security') ||
      issue.message?.toLowerCase().includes('eval')) {
    return 'security';
  }
  
  // Runtime issues (node type, connection, expression)
  if (code.includes('NODE_TYPE') || code.includes('CONNECTION') || code.includes('EXPRESSION')) {
    return 'runtime';
  }
  
  // AI validation info messages
  if (issue.severity === 'info' || code === 'AI_VALIDATION_ERROR') {
    return 'info';
  }
  
  // Best practice warnings
  if (code.includes('DEPRECATED') || code.includes('BEST_PRACTICE') || code.includes('ENHANCED_')) {
    return 'best_practice';
  }
  
  return 'runtime';
}

/**
 * Filter ValidationIssue[] based on validation profile
 * 
 * Profiles:
 * - minimal: Only structural errors + critical security warnings
 * - runtime: Structural + runtime errors, security warnings (DEFAULT for CLI)
 * - ai-friendly: All errors + best practice warnings (DEFAULT for AI agents)
 * - strict: Everything including info-level suggestions
 * 
 * @param issues - Array of validation issues to filter
 * @param profile - The validation profile to apply
 * @returns Filtered array of issues
 */
export function filterIssuesByProfile(
  issues: ValidationIssue[],
  profile: ValidationProfile
): ValidationIssue[] {
  return issues.filter(issue => {
    const category = categorizeIssue(issue);
    
    switch (profile) {
      case 'minimal':
        // Only structural errors and critical security warnings
        if (issue.severity === 'error') {
          return category === 'structural';
        }
        if (issue.severity === 'warning') {
          return category === 'security';
        }
        return false;
        
      case 'runtime':
        // Structural + runtime errors, security warnings
        if (issue.severity === 'error') {
          return category === 'structural' || category === 'runtime';
        }
        if (issue.severity === 'warning') {
          return category === 'security';
        }
        return false;
        
      case 'ai-friendly':
        // All errors + best practice warnings, skip info unless AI-related
        if (issue.severity === 'error') {
          return true;
        }
        if (issue.severity === 'warning') {
          return true;
        }
        // Include AI-specific info messages
        if (issue.severity === 'info' && issue.code?.startsWith('AI_')) {
          return true;
        }
        return false;
        
      case 'strict':
        // Everything
        return true;
        
      default:
        return true;
    }
  });
}

/**
 * Filter string arrays (errors[], warnings[]) based on profile
 * Simpler version for backward compatibility
 */
export function filterErrorsByProfile(
  errors: string[],
  warnings: string[],
  profile: ValidationProfile
): { errors: string[]; warnings: string[] } {
  // Convert strings to pseudo-issues for categorization
  const categorizeString = (msg: string, severity: 'error' | 'warning'): 'keep' | 'filter' => {
    const msgLower = msg.toLowerCase();
    
    switch (profile) {
      case 'minimal':
        if (severity === 'error') {
          return msgLower.includes('missing') || msgLower.includes('required') ? 'keep' : 'filter';
        }
        return msgLower.includes('security') ? 'keep' : 'filter';
        
      case 'runtime':
        if (severity === 'error') {
          return 'keep'; // Keep all runtime errors
        }
        return msgLower.includes('security') || msgLower.includes('deprecated') ? 'keep' : 'filter';
        
      case 'ai-friendly':
        return 'keep'; // Keep all errors and warnings
        
      case 'strict':
        return 'keep';
        
      default:
        return 'keep';
    }
  };
  
  return {
    errors: errors.filter(e => categorizeString(e, 'error') === 'keep'),
    warnings: warnings.filter(w => categorizeString(w, 'warning') === 'keep'),
  };
}
