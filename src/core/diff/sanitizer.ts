/**
 * Node Sanitizer Service
 * Ported from n8n-mcp/src/services/node-sanitizer.ts
 *
 * Ensures nodes have complete metadata required by n8n UI.
 * Based on n8n AI Workflow Builder patterns:
 * - Merges node type defaults with user parameters
 * - Auto-adds required metadata for filter-based nodes (IF v2.2+, Switch v3.2+)
 * - Fixes operator structure
 * - Prevents "Could not find property option" errors
 */

import type { WorkflowNode } from '../../types/n8n-api.js';
import { debug } from '../debug.js';

/**
 * Sanitize a single node by adding required metadata
 */
export function sanitizeNode(node: WorkflowNode): WorkflowNode {
  const sanitized = { ...node };

  // Apply node-specific sanitization
  if (isFilterBasedNode(node.type, node.typeVersion)) {
    sanitized.parameters = sanitizeFilterBasedNode(
      sanitized.parameters,
      node.type,
      node.typeVersion
    );
  }

  return sanitized;
}

/**
 * Check if node is filter-based (IF v2.2+, Switch v3.2+)
 */
function isFilterBasedNode(nodeType: string, typeVersion: number): boolean {
  if (nodeType === 'n8n-nodes-base.if') {
    return typeVersion >= 2.2;
  }
  if (nodeType === 'n8n-nodes-base.switch') {
    return typeVersion >= 3.2;
  }
  return false;
}

/**
 * Sanitize filter-based nodes (IF v2.2+, Switch v3.2+)
 * Ensures conditions.options has complete structure
 */
function sanitizeFilterBasedNode(
  parameters: any,
  nodeType: string,
  typeVersion: number
): any {
  const sanitized = { ...parameters };

  // Handle IF node
  if (nodeType === 'n8n-nodes-base.if' && typeVersion >= 2.2) {
    sanitized.conditions = sanitizeFilterConditions(sanitized.conditions);
  }

  // Handle Switch node
  if (nodeType === 'n8n-nodes-base.switch' && typeVersion >= 3.2) {
    if (sanitized.rules && typeof sanitized.rules === 'object') {
      const {rules} = sanitized;
      if (rules.rules && Array.isArray(rules.rules)) {
        rules.rules = rules.rules.map((rule: any) => ({
          ...rule,
          conditions: sanitizeFilterConditions(rule.conditions)
        }));
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize filter conditions structure
 */
function sanitizeFilterConditions(conditions: any): any {
  if (!conditions || typeof conditions !== 'object') {
    return conditions;
  }

  const sanitized = { ...conditions };

  // Ensure options has complete structure
  if (!sanitized.options) {
    sanitized.options = {};
  }

  // Add required filter options metadata
  const requiredOptions = {
    version: 2,
    leftValue: '',
    caseSensitive: true,
    typeValidation: 'strict'
  };

  // Merge with existing options, preserving user values
  sanitized.options = {
    ...requiredOptions,
    ...sanitized.options
  };

  // Sanitize conditions array
  if (sanitized.conditions && Array.isArray(sanitized.conditions)) {
    sanitized.conditions = sanitized.conditions.map((condition: any) =>
      sanitizeCondition(condition)
    );
  }

  return sanitized;
}

/**
 * Sanitize a single condition
 */
function sanitizeCondition(condition: any): any {
  if (!condition || typeof condition !== 'object') {
    return condition;
  }

  const sanitized = { ...condition };

  // Ensure condition has an ID
  if (!sanitized.id) {
    sanitized.id = generateConditionId();
  }

  // Sanitize operator structure
  if (sanitized.operator) {
    sanitized.operator = sanitizeOperator(sanitized.operator);
  }

  return sanitized;
}

/**
 * Sanitize operator structure
 * Ensures operator has correct format: {type, operation, singleValue?}
 */
function sanitizeOperator(operator: any): any {
  if (!operator || typeof operator !== 'object') {
    return operator;
  }

  const sanitized = { ...operator };

  // Fix common mistake: type field used for operation name
  // WRONG: {type: "isNotEmpty"}
  // RIGHT: {type: "string", operation: "isNotEmpty"}
  if (sanitized.type && !sanitized.operation) {
    // Check if type value looks like an operation (lowercase, no dots)
    const typeValue = sanitized.type as string;
    if (isOperationName(typeValue)) {
      debug('diff', `Fixing operator structure: converting type="${typeValue}" to operation`);

      // Infer data type from operation
      const dataType = inferDataType(typeValue);
      sanitized.type = dataType;
      sanitized.operation = typeValue;
    }
  }

  // Set singleValue based on operator type
  if (sanitized.operation) {
    if (isUnaryOperator(sanitized.operation)) {
      // Unary operators require singleValue: true
      sanitized.singleValue = true;
    } else {
      // Binary operators should NOT have singleValue (or it should be false/undefined)
      // Remove it to prevent UI errors
      delete sanitized.singleValue;
    }
  }

  return sanitized;
}

/**
 * Check if string looks like an operation name (not a data type)
 */
function isOperationName(value: string): boolean {
  // Operation names are lowercase and don't contain dots
  // Data types are: string, number, boolean, dateTime, array, object
  const dataTypes = ['string', 'number', 'boolean', 'dateTime', 'array', 'object'];
  return !dataTypes.includes(value) && /^[a-z][a-zA-Z]*$/.test(value);
}

/**
 * Infer data type from operation name
 */
function inferDataType(operation: string): string {
  // Boolean operations
  const booleanOps = ['true', 'false', 'isEmpty', 'isNotEmpty'];
  if (booleanOps.includes(operation)) {
    return 'boolean';
  }

  // Number operations
  const numberOps = ['isNumeric', 'gt', 'gte', 'lt', 'lte'];
  if (numberOps.some(op => operation.includes(op))) {
    return 'number';
  }

  // Date operations
  const dateOps = ['after', 'before', 'afterDate', 'beforeDate'];
  if (dateOps.some(op => operation.includes(op))) {
    return 'dateTime';
  }

  // Default to string
  return 'string';
}

/**
 * Check if operator is unary (requires singleValue: true)
 */
function isUnaryOperator(operation: string): boolean {
  const unaryOps = [
    'isEmpty',
    'isNotEmpty',
    'true',
    'false',
    'isNumeric'
  ];
  return unaryOps.includes(operation);
}

/**
 * Generate unique condition ID
 */
function generateConditionId(): string {
  return `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

