/**
 * Expression Validator for n8n expressions
 * 
 * Validates n8n expressions based on universal rules that apply to ALL expressions.
 * Provides 100% reliable detection of expression format issues.
 * 
 * Ported from n8n-mcp/src/services/universal-expression-validator.ts
 */

import type { 
  ExpressionValidationResult, 
  ExpressionFormatIssue,
  ValidationContext 
} from './types.js';

/**
 * Universal Expression Validator
 * 
 * Validates n8n expressions based on universal rules that apply to ALL expressions,
 * regardless of node type or field. This provides 100% reliable detection of
 * expression format issues without needing node-specific knowledge.
 */
export class ExpressionValidator {
  /** Pattern to match n8n expressions {{ ... }} */
  private static readonly EXPRESSION_PATTERN = /\{\{[\s\S]+?\}\}/;
  
  /** Required prefix for expression evaluation */
  private static readonly EXPRESSION_PREFIX = '=';
  
  /** Maximum recursion depth for nested parameter validation */
  private static readonly MAX_RECURSION_DEPTH = 100;

  /**
   * Universal Rule 1: Any field containing {{ }} MUST have = prefix to be evaluated
   * 
   * Examples:
   * - "{{ $json.value }}" -> literal text (NOT evaluated)
   * - "={{ $json.value }}" -> evaluated expression
   * - "Hello {{ $json.name }}!" -> literal text (NOT evaluated)
   * - "=Hello {{ $json.name }}!" -> evaluated (expression in mixed content)
   */
  static validateExpressionPrefix(value: unknown): ExpressionValidationResult {
    // Only validate strings
    if (typeof value !== 'string') {
      return {
        isValid: true,
        hasExpression: false,
        needsPrefix: false,
        isMixedContent: false,
        confidence: 1.0,
        explanation: 'Not a string value',
      };
    }

    const hasExpression = this.EXPRESSION_PATTERN.test(value);

    if (!hasExpression) {
      return {
        isValid: true,
        hasExpression: false,
        needsPrefix: false,
        isMixedContent: false,
        confidence: 1.0,
        explanation: 'No n8n expression found',
      };
    }

    const hasPrefix = value.startsWith(this.EXPRESSION_PREFIX);
    const isMixedContent = this.hasMixedContent(value);

    if (!hasPrefix) {
      return {
        isValid: false,
        hasExpression: true,
        needsPrefix: true,
        isMixedContent,
        confidence: 1.0,
        suggestion: `${this.EXPRESSION_PREFIX}${value}`,
        explanation: isMixedContent
          ? 'Mixed literal text and expression requires = prefix for expression evaluation'
          : 'Expression requires = prefix to be evaluated',
      };
    }

    return {
      isValid: true,
      hasExpression: true,
      needsPrefix: false,
      isMixedContent,
      confidence: 1.0,
      explanation: 'Expression is properly formatted with = prefix',
    };
  }

  /**
   * Check if a string contains both literal text and expressions
   */
  private static hasMixedContent(value: string): boolean {
    // Remove the = prefix if present for analysis
    const content = value.startsWith(this.EXPRESSION_PREFIX)
      ? value.substring(1)
      : value;

    // Check if there's any content outside of {{ }}
    const withoutExpressions = content.replace(/\{\{[\s\S]+?\}\}/g, '');
    return withoutExpressions.trim().length > 0;
  }

  /**
   * Universal Rule 2: Expression syntax validation
   * Check for common syntax errors that prevent evaluation
   */
  static validateExpressionSyntax(value: string): ExpressionValidationResult {
    const hasAnyBrackets = value.includes('{{') || value.includes('}}');

    if (!hasAnyBrackets) {
      return {
        isValid: true,
        hasExpression: false,
        needsPrefix: false,
        isMixedContent: false,
        confidence: 1.0,
        explanation: 'No expression to validate',
      };
    }

    // Check for unclosed brackets
    const openCount = (value.match(/\{\{/g) || []).length;
    const closeCount = (value.match(/\}\}/g) || []).length;

    if (openCount !== closeCount) {
      return {
        isValid: false,
        hasExpression: true,
        needsPrefix: false,
        isMixedContent: false,
        confidence: 1.0,
        explanation: `Unmatched expression brackets: ${openCount} opening, ${closeCount} closing`,
      };
    }

    // Check for empty expressions
    const expressions = value.match(/\{\{[\s\S]+?\}\}/g) || [];

    for (const expr of expressions) {
      const content = expr.slice(2, -2).trim();
      if (!content) {
        return {
          isValid: false,
          hasExpression: true,
          needsPrefix: false,
          isMixedContent: false,
          confidence: 1.0,
          explanation: 'Empty expression {{ }} is not valid',
        };
      }
    }

    return {
      isValid: true,
      hasExpression: expressions.length > 0,
      needsPrefix: false,
      isMixedContent: this.hasMixedContent(value),
      confidence: 1.0,
      explanation: 'Expression syntax is valid',
    };
  }

  /**
   * Universal Rule 3: Common n8n expression patterns
   * Validate against known n8n expression patterns
   */
  static validateCommonPatterns(value: string): ExpressionValidationResult {
    if (!this.EXPRESSION_PATTERN.test(value)) {
      return {
        isValid: true,
        hasExpression: false,
        needsPrefix: false,
        isMixedContent: false,
        confidence: 1.0,
        explanation: 'No expression to validate',
      };
    }

    const expressions = value.match(/\{\{[\s\S]+?\}\}/g) || [];
    const warnings: string[] = [];

    for (const expr of expressions) {
      const content = expr.slice(2, -2).trim();

      // Check for common mistakes
      if (content.includes('${') && content.includes('}')) {
        warnings.push(`Template literal syntax \${} found - use n8n syntax instead`);
      }

      if (content.startsWith('=')) {
        warnings.push(`Double prefix detected in expression`);
      }

      if (content.includes('{{') || content.includes('}}')) {
        warnings.push(`Nested brackets detected`);
      }
    }

    if (warnings.length > 0) {
      return {
        isValid: false,
        hasExpression: true,
        needsPrefix: false,
        isMixedContent: false,
        confidence: 1.0,
        explanation: warnings.join('; '),
      };
    }

    return {
      isValid: true,
      hasExpression: true,
      needsPrefix: false,
      isMixedContent: this.hasMixedContent(value),
      confidence: 1.0,
      explanation: 'Expression patterns are valid',
    };
  }

  /**
   * Perform all universal validations
   */
  static validate(value: unknown): ExpressionValidationResult[] {
    const results: ExpressionValidationResult[] = [];

    // Run all universal validators
    const prefixResult = this.validateExpressionPrefix(value);
    if (!prefixResult.isValid) {
      results.push(prefixResult);
    }

    if (typeof value === 'string') {
      const syntaxResult = this.validateExpressionSyntax(value);
      if (!syntaxResult.isValid) {
        results.push(syntaxResult);
      }

      const patternResult = this.validateCommonPatterns(value);
      if (!patternResult.isValid) {
        results.push(patternResult);
      }
    }

    // If no issues found, return a success result
    if (results.length === 0) {
      results.push({
        isValid: true,
        hasExpression: prefixResult.hasExpression,
        needsPrefix: false,
        isMixedContent: prefixResult.isMixedContent,
        confidence: 1.0,
        explanation: prefixResult.hasExpression
          ? 'Expression is valid'
          : 'No expression found',
      });
    }

    return results;
  }

  /**
   * Get a corrected version of the value (add = prefix if needed)
   */
  static getCorrectedValue(value: string): string {
    if (!this.EXPRESSION_PATTERN.test(value)) {
      return value;
    }

    if (!value.startsWith(this.EXPRESSION_PREFIX)) {
      return `${this.EXPRESSION_PREFIX}${value}`;
    }

    return value;
  }

  /**
   * Validate and generate fix for a single value
   */
  static validateAndFix(
    value: unknown,
    fieldPath: string,
    _context: ValidationContext
  ): ExpressionFormatIssue | null {
    // Skip non-string values
    if (typeof value !== 'string') {
      return null;
    }

    // Use universal validator
    const results = this.validate(value);
    const invalidResults = results.filter(r => !r.isValid);

    if (invalidResults.length === 0) {
      return null;
    }

    // Prioritize prefix issues
    const prefixIssue = invalidResults.find(r => r.needsPrefix);
    if (prefixIssue) {
      return {
        fieldPath,
        currentValue: value,
        correctedValue: this.getCorrectedValue(value),
        issueType: 'missing-prefix',
        explanation: prefixIssue.explanation,
        severity: 'error',
      };
    }

    // Report other validation issues
    const firstIssue = invalidResults[0];
    return {
      fieldPath,
      currentValue: value,
      correctedValue: value,
      issueType: 'invalid-syntax',
      explanation: firstIssue.explanation,
      severity: 'error',
    };
  }

  /**
   * Validate all expressions in a node's parameters recursively
   */
  static validateNodeParameters(
    parameters: unknown,
    context: ValidationContext
  ): ExpressionFormatIssue[] {
    const issues: ExpressionFormatIssue[] = [];
    const visited = new WeakSet<object>();

    this.validateRecursive(parameters, '', context, issues, visited);

    return issues;
  }

  /**
   * Recursively validate parameters for expression format issues
   */
  private static validateRecursive(
    obj: unknown,
    path: string,
    context: ValidationContext,
    issues: ExpressionFormatIssue[],
    visited: WeakSet<object>,
    depth = 0
  ): void {
    // Prevent excessive recursion
    if (depth > this.MAX_RECURSION_DEPTH) {
      issues.push({
        fieldPath: path,
        currentValue: obj,
        correctedValue: obj,
        issueType: 'mixed-format',
        explanation: `Maximum recursion depth (${this.MAX_RECURSION_DEPTH}) exceeded`,
        severity: 'warning',
      });
      return;
    }

    // Handle circular references
    if (obj && typeof obj === 'object') {
      if (visited.has(obj as object)) {return;}
      visited.add(obj as object);
    }

    // Check current value
    const issue = this.validateAndFix(obj, path, context);
    if (issue) {
      issues.push(issue);
    }

    // Recurse into objects and arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const newPath = path ? `${path}[${index}]` : `[${index}]`;
        this.validateRecursive(item, newPath, context, issues, visited, depth + 1);
      });
    } else if (obj && typeof obj === 'object') {
      // Skip special keys
      Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
        if (key.startsWith('__')) {return;}

        const newPath = path ? `${path}.${key}` : key;
        this.validateRecursive(value, newPath, context, issues, visited, depth + 1);
      });
    }
  }
}
