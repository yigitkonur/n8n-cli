/**
 * Enhanced Configuration Validator
 * 
 * Provides operation-aware validation for n8n nodes with reduced false positives.
 * Supports multiple validation modes and profiles.
 * Ported from n8n-mcp/src/services/enhanced-config-validator.ts
 */

import type {
  ValidationMode,
  ValidationProfile,
  EnhancedValidationResult,
  OperationContext,
  ValidationError,
  ValidationWarning,
  NodeValidationContext,
  NodeProperty,
  NodeConfig,
} from './types.js';

import {
  isPropertyVisible,
  isPropertyRelevantToOperation,
  applyNodeDefaults,
  extractOperationContext,
} from './property-visibility.js';

import { applyProfileFilters, generateNextSteps, deduplicateErrors } from './profile-filter.js';
import { FixedCollectionValidator } from './fixed-collection.js';
import { NodeSpecificValidators } from './node-specific.js';
import { shouldSkipLiteralValidation } from './expression-utils.js';

export class EnhancedConfigValidator {
  /**
   * Validate with operation awareness
   * 
   * @param nodeType - The node type (e.g., 'nodes-base.slack')
   * @param config - The node configuration/parameters
   * @param properties - The node property definitions from schema
   * @param mode - Validation mode: 'minimal', 'operation', or 'full'
   * @param profile - Validation profile: 'minimal', 'runtime', 'ai-friendly', or 'strict'
   */
  static validateWithMode(
    nodeType: string,
    config: Record<string, unknown>,
    properties: NodeProperty[],
    mode: ValidationMode = 'operation',
    profile: ValidationProfile = 'runtime'
  ): EnhancedValidationResult {
    // Input validation
    if (typeof nodeType !== 'string') {
      throw new Error(`Invalid nodeType: expected string, got ${typeof nodeType}`);
    }
    if (!config || typeof config !== 'object') {
      throw new Error(`Invalid config: expected object, got ${typeof config}`);
    }
    if (!Array.isArray(properties)) {
      throw new Error(`Invalid properties: expected array, got ${typeof properties}`);
    }

    // Extract operation context from config
    const operationContext = extractOperationContext(config);

    // Track user-provided keys before applying defaults
    const userProvidedKeys = new Set(Object.keys(config));

    // Filter properties based on mode and operation, and get config with defaults
    const { properties: filteredProperties, configWithDefaults } = this.filterPropertiesByMode(
      properties,
      config,
      mode,
      operationContext
    );

    // Perform base validation on filtered properties
    const baseResult = this.validateBase(
      nodeType,
      configWithDefaults,
      filteredProperties,
      userProvidedKeys
    );

    // Build enhanced result
    const enhancedResult: EnhancedValidationResult = {
      ...baseResult,
      mode,
      profile,
      operation: operationContext,
      examples: [],
      nextSteps: [],
    };

    // Apply profile-based filtering
    applyProfileFilters(enhancedResult, profile);

    // Add operation-specific enhancements
    this.addOperationSpecificEnhancements(nodeType, config, filteredProperties, enhancedResult);

    // Deduplicate errors
    enhancedResult.errors = deduplicateErrors(enhancedResult.errors);

    // Generate next steps based on errors
    enhancedResult.nextSteps = generateNextSteps(enhancedResult);

    // Recalculate validity after all enhancements
    enhancedResult.valid = enhancedResult.errors.length === 0;

    return enhancedResult;
  }

  /**
   * Filter properties based on validation mode and operation
   */
  private static filterPropertiesByMode(
    properties: NodeProperty[],
    config: Record<string, unknown>,
    mode: ValidationMode,
    operation: OperationContext
  ): { properties: NodeProperty[]; configWithDefaults: Record<string, unknown> } {
    // Apply defaults for visibility checking
    const configWithDefaults = applyNodeDefaults(properties, config);

    let filteredProperties: NodeProperty[];
    switch (mode) {
      case 'minimal':
        // Only required properties that are visible
        filteredProperties = properties.filter(
          prop => prop.required && isPropertyVisible(prop, configWithDefaults)
        );
        break;

      case 'operation':
        // Only properties relevant to the current operation
        filteredProperties = properties.filter(prop =>
          isPropertyRelevantToOperation(prop, configWithDefaults, operation)
        );
        break;

      case 'full':
      default:
        // All properties
        filteredProperties = properties;
        break;
    }

    return { properties: filteredProperties, configWithDefaults };
  }

  /**
   * Base validation for properties
   */
  private static validateBase(
    nodeType: string,
    config: Record<string, unknown>,
    properties: NodeProperty[],
    userProvidedKeys: Set<string>
  ): EnhancedValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    const visibleProperties: string[] = [];
    const hiddenProperties: string[] = [];
    const autofix: Record<string, unknown> = {};

    // Check required properties
    for (const prop of properties) {
      if (!prop || !prop.name) continue;

      // Track visibility
      if (isPropertyVisible(prop, config)) {
        visibleProperties.push(prop.name);
      } else {
        hiddenProperties.push(prop.name);
        continue; // Skip validation for hidden properties
      }

      if (prop.required) {
        const value = config[prop.name];

        // Check if property is missing or has null/undefined value
        if (!(prop.name in config)) {
          errors.push({
            type: 'missing_required',
            property: prop.name,
            message: `Required property '${prop.displayName || prop.name}' is missing`,
            fix: `Add ${prop.name} to your configuration`,
          });
        } else if (value === null || value === undefined) {
          errors.push({
            type: 'invalid_type',
            property: prop.name,
            message: `Required property '${prop.displayName || prop.name}' cannot be null or undefined`,
            fix: `Provide a valid value for ${prop.name}`,
          });
        } else if (typeof value === 'string' && value.trim() === '') {
          errors.push({
            type: 'missing_required',
            property: prop.name,
            message: `Required property '${prop.displayName || prop.name}' cannot be empty`,
            fix: `Provide a valid value for ${prop.name}`,
          });
        }
      }
    }

    // Validate property types
    for (const [key, value] of Object.entries(config)) {
      const prop = properties.find(p => p.name === key);
      if (!prop) continue;

      // Skip expression values
      if (shouldSkipLiteralValidation(value)) continue;

      // Type validation
      if (prop.type === 'string' && typeof value !== 'string') {
        errors.push({
          type: 'invalid_type',
          property: key,
          message: `Property '${key}' must be a string, got ${typeof value}`,
          fix: `Change ${key} to a string value`,
        });
      } else if (prop.type === 'number' && typeof value !== 'number') {
        errors.push({
          type: 'invalid_type',
          property: key,
          message: `Property '${key}' must be a number, got ${typeof value}`,
          fix: `Change ${key} to a number`,
        });
      } else if (prop.type === 'boolean' && typeof value !== 'boolean') {
        errors.push({
          type: 'invalid_type',
          property: key,
          message: `Property '${key}' must be a boolean, got ${typeof value}`,
          fix: `Change ${key} to true or false`,
        });
      }

      // Options validation
      if (prop.type === 'options' && prop.options) {
        const validValues = prop.options.map(opt =>
          typeof opt === 'string' ? opt : opt.value
        );
        if (!validValues.includes(value)) {
          errors.push({
            type: 'invalid_value',
            property: key,
            message: `Invalid value for '${key}'. Must be one of: ${validValues.join(', ')}`,
            fix: `Change ${key} to one of the valid options`,
          });
        }
      }

      // resourceLocator validation
      if (prop.type === 'resourceLocator') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push({
            type: 'invalid_type',
            property: key,
            message: `Property '${key}' is a resourceLocator and must be an object with 'mode' and 'value' properties`,
            fix: `Change ${key} to { mode: "list", value: "..." }`,
          });
        } else {
          const locator = value as Record<string, unknown>;
          if (!locator.mode) {
            errors.push({
              type: 'missing_required',
              property: `${key}.mode`,
              message: `resourceLocator '${key}' is missing required property 'mode'`,
              fix: `Add mode property: { mode: "list", value: "..." }`,
            });
          }
          if (locator.value === undefined) {
            errors.push({
              type: 'missing_required',
              property: `${key}.value`,
              message: `resourceLocator '${key}' is missing required property 'value'`,
              fix: `Add value property to specify the ${prop.displayName || key}`,
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      visibleProperties,
      hiddenProperties,
      autofix: Object.keys(autofix).length > 0 ? autofix : undefined,
      mode: 'operation',
      operation: undefined,
    };
  }

  /**
   * Add operation-specific enhancements to validation result
   */
  private static addOperationSpecificEnhancements(
    nodeType: string,
    config: Record<string, unknown>,
    properties: NodeProperty[],
    result: EnhancedValidationResult
  ): void {
    // Type safety check
    if (typeof nodeType !== 'string') {
      result.errors.push({
        type: 'invalid_type',
        property: 'nodeType',
        message: `Invalid nodeType: expected string, got ${typeof nodeType}`,
        fix: 'Provide a valid node type string (e.g., "nodes-base.webhook")',
      });
      return;
    }

    // Validate fixedCollection structures
    this.validateFixedCollectionStructures(nodeType, config as NodeConfig, result);

    // Create context for node-specific validators
    const context: NodeValidationContext = {
      config,
      errors: result.errors,
      warnings: result.warnings,
      suggestions: result.suggestions,
      autofix: (result.autofix || {}) as Record<string, unknown>,
    };

    // Normalize node type
    const normalizedNodeType = nodeType.replace('n8n-nodes-base.', 'nodes-base.');

    // Dispatch to node-specific validators
    switch (normalizedNodeType) {
      case 'nodes-base.slack':
        NodeSpecificValidators.validateSlack(context);
        break;

      case 'nodes-base.googleSheets':
        NodeSpecificValidators.validateGoogleSheets(context);
        break;

      case 'nodes-base.httpRequest':
        NodeSpecificValidators.validateHttpRequest(context);
        break;

      case 'nodes-base.code':
        NodeSpecificValidators.validateCode(context);
        break;

      case 'nodes-base.openAi':
        NodeSpecificValidators.validateOpenAI(context);
        break;

      case 'nodes-base.mongoDb':
        NodeSpecificValidators.validateMongoDB(context);
        break;

      case 'nodes-base.webhook':
        NodeSpecificValidators.validateWebhook(context);
        break;

      case 'nodes-base.postgres':
        NodeSpecificValidators.validatePostgres(context);
        break;

      case 'nodes-base.mysql':
        NodeSpecificValidators.validateMySQL(context);
        break;

      case 'nodes-base.set':
        NodeSpecificValidators.validateSet(context);
        break;

      case 'nodes-langchain.agent':
        NodeSpecificValidators.validateAIAgent(context);
        break;
    }

    // Update autofix if changes were made
    if (Object.keys(context.autofix).length > 0) {
      result.autofix = context.autofix;
    }
  }

  /**
   * Validate fixedCollection structures for known problematic nodes
   */
  private static validateFixedCollectionStructures(
    nodeType: string,
    config: NodeConfig,
    result: EnhancedValidationResult
  ): void {
    const validationResult = FixedCollectionValidator.validate(nodeType, config);

    if (!validationResult.isValid) {
      // Add errors to the result
      for (const error of validationResult.errors) {
        result.errors.push({
          type: 'invalid_value',
          property: error.pattern.split('.')[0],
          message: error.message,
          fix: error.fix,
        });
      }

      // Apply autofix if available
      if (validationResult.autofix) {
        if (typeof validationResult.autofix === 'object' && !Array.isArray(validationResult.autofix)) {
          result.autofix = {
            ...(result.autofix || {}),
            ...validationResult.autofix,
          };
        } else {
          const firstError = validationResult.errors[0];
          if (firstError) {
            const rootProperty = firstError.pattern.split('.')[0];
            result.autofix = {
              ...(result.autofix || {}),
              [rootProperty]: validationResult.autofix,
            };
          }
        }
      }
    }
  }

  /**
   * Validate a single node configuration (convenience method)
   */
  static validate(
    nodeType: string,
    config: Record<string, unknown>,
    properties: NodeProperty[]
  ): EnhancedValidationResult {
    return this.validateWithMode(nodeType, config, properties, 'operation', 'runtime');
  }
}
