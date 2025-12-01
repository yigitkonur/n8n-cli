/**
 * Property Visibility Logic
 * 
 * Handles displayOptions-based property visibility and operation-aware filtering.
 * Ported from n8n-mcp/src/services/enhanced-config-validator.ts
 */

import type { OperationContext, NodeProperty } from './types.js';

/**
 * Check if a property is visible given current configuration
 * Evaluates displayOptions.show and displayOptions.hide conditions
 */
export function isPropertyVisible(prop: NodeProperty, config: Record<string, unknown>): boolean {
  if (!prop.displayOptions) {return true;}
  
  // Check show conditions - ALL must match
  if (prop.displayOptions.show) {
    for (const [key, values] of Object.entries(prop.displayOptions.show)) {
      const configValue = config[key];
      const expectedValues = Array.isArray(values) ? values : [values];
      
      if (!expectedValues.includes(configValue)) {
        return false;
      }
    }
  }
  
  // Check hide conditions - ANY match hides the property
  if (prop.displayOptions.hide) {
    for (const [key, values] of Object.entries(prop.displayOptions.hide)) {
      const configValue = config[key];
      const expectedValues = Array.isArray(values) ? values : [values];
      
      if (expectedValues.includes(configValue)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Check if property is relevant to current operation
 * Used for operation-aware validation mode
 */
export function isPropertyRelevantToOperation(
  prop: NodeProperty,
  config: Record<string, unknown>,
  operation: OperationContext
): boolean {
  // First check if visible
  if (!isPropertyVisible(prop, config)) {
    return false;
  }
  
  // If no operation context, include all visible properties
  if (!operation.resource && !operation.operation && !operation.action) {
    return true;
  }
  
  // Check if property has operation-specific display options
  if (prop.displayOptions?.show) {
    const {show} = prop.displayOptions;
    
    // Check resource filter
    if (operation.resource && show.resource) {
      const expectedResources = Array.isArray(show.resource) ? show.resource : [show.resource];
      if (!expectedResources.includes(operation.resource)) {
        return false;
      }
    }
    
    // Check operation filter
    if (operation.operation && show.operation) {
      const expectedOps = Array.isArray(show.operation) ? show.operation : [show.operation];
      if (!expectedOps.includes(operation.operation)) {
        return false;
      }
    }
    
    // Check action filter
    if (operation.action && show.action) {
      const expectedActions = Array.isArray(show.action) ? show.action : [show.action];
      if (!expectedActions.includes(operation.action)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Apply node property defaults to configuration
 * Used for accurate visibility checking
 */
export function applyNodeDefaults(
  properties: NodeProperty[],
  config: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...config };

  for (const prop of properties) {
    if (prop.name && prop.default !== undefined && result[prop.name] === undefined) {
      result[prop.name] = prop.default;
    }
  }

  return result;
}

/**
 * Extract operation context from node configuration
 * Returns resource, operation, action, and mode if present
 */
export function extractOperationContext(config: Record<string, unknown>): OperationContext {
  return {
    resource: config.resource as string | undefined,
    operation: config.operation as string | undefined,
    action: config.action as string | undefined,
    mode: config.mode as string | undefined,
  };
}

/**
 * Get visibility requirement explanation for a property
 * Useful for error messages explaining why a property is hidden
 */
export function getVisibilityRequirement(
  prop: NodeProperty,
  config: Record<string, unknown>
): string | undefined {
  if (!prop || !prop.displayOptions?.show) {
    return undefined;
  }

  const requirements: string[] = [];
  for (const [field, values] of Object.entries(prop.displayOptions.show)) {
    const expectedValues = Array.isArray(values) ? values : [values];
    const currentValue = config[field];

    // Only include if the current value doesn't match
    if (!expectedValues.includes(currentValue)) {
      const valueStr = expectedValues.length === 1
        ? `"${expectedValues[0]}"`
        : expectedValues.map(v => `"${v}"`).join(' or ');
      requirements.push(`${field}=${valueStr}`);
    }
  }

  if (requirements.length === 0) {
    return undefined;
  }

  return `Requires: ${requirements.join(', ')}`;
}
