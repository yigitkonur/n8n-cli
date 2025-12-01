/**
 * Enhanced Validation Types
 * 
 * Type definitions for the enhanced configuration validation system.
 * Supports multiple validation modes and profiles for flexible validation.
 */

// ========== Validation Modes & Profiles ==========

/**
 * Validation modes control which properties are validated
 * 
 * - minimal: Only validate required properties that are currently visible
 * - operation: Validate properties relevant to current resource/operation (DEFAULT)
 * - full: Validate all properties regardless of visibility
 */
export type ValidationMode = 'full' | 'operation' | 'minimal';

/**
 * Validation profiles control strictness and output filtering
 * 
 * - minimal: Only missing_required errors, security/deprecated warnings only
 * - runtime: Critical runtime errors, no visibility noise (CLI DEFAULT)
 * - ai-friendly: Balanced for AI agents, includes best practice warnings (MCP DEFAULT)
 * - strict: Everything including style checks, enforced error handling
 */
export type ValidationProfile = 'strict' | 'runtime' | 'ai-friendly' | 'minimal';

// ========== Validation Error Types ==========

/**
 * Types of validation errors
 */
export type ValidationErrorType = 
  | 'missing_required'      // Required property is missing
  | 'invalid_type'          // Property has wrong type
  | 'invalid_value'         // Property value is invalid
  | 'incompatible'          // Property incompatible with other settings
  | 'invalid_configuration' // General configuration error
  | 'syntax_error';         // Syntax error (e.g., in Code node)

/**
 * Types of validation warnings
 */
export type ValidationWarningType =
  | 'missing_common'   // Common property not set
  | 'deprecated'       // Using deprecated feature
  | 'inefficient'      // Suboptimal configuration
  | 'security'         // Potential security issue
  | 'best_practice'    // Best practice recommendation
  | 'invalid_value';   // Value may cause issues

// ========== Validation Result Structures ==========

/**
 * Validation error with actionable fix suggestions
 */
export interface ValidationError {
  type: ValidationErrorType;
  property: string;
  message: string;
  fix?: string;
  suggestion?: string;
}

/**
 * Validation warning with suggested improvements
 */
export interface ValidationWarning {
  type: ValidationWarningType;
  property?: string;
  message: string;
  suggestion?: string;
}

/**
 * Operation context extracted from node configuration
 */
export interface OperationContext {
  resource?: string;
  operation?: string;
  action?: string;
  mode?: string;
}

/**
 * Base validation result from ConfigValidator
 */
export interface BaseValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  visibleProperties: string[];
  hiddenProperties: string[];
  autofix?: Record<string, unknown>;
}

/**
 * Enhanced validation result with mode, profile, and actionable guidance
 */
export interface EnhancedValidationResult extends BaseValidationResult {
  mode: ValidationMode;
  profile?: ValidationProfile;
  operation?: OperationContext;
  examples?: Array<{
    description: string;
    config: Record<string, unknown>;
  }>;
  nextSteps?: string[];
}

// ========== Node Validation Context ==========

/**
 * Context passed to node-specific validators
 */
export interface NodeValidationContext {
  config: Record<string, unknown>;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  autofix: Record<string, unknown>;
}

// ========== FixedCollection Validation ==========

/**
 * Pattern definition for fixedCollection validation
 */
export interface FixedCollectionPattern {
  nodeType: string;
  property: string;
  subProperty?: string;
  expectedStructure: string;
  invalidPatterns: string[];
}

/**
 * Type definitions for node configurations
 */
export type NodeConfigValue = string | number | boolean | null | undefined | NodeConfig | NodeConfigValue[];

export interface NodeConfig {
  [key: string]: NodeConfigValue;
}

/**
 * Result from fixedCollection validation
 */
export interface FixedCollectionValidationResult {
  isValid: boolean;
  errors: Array<{
    pattern: string;
    message: string;
    fix: string;
  }>;
  autofix?: NodeConfig | NodeConfigValue[];
}

// ========== Property Schema Types ==========

/**
 * Display options for conditional property visibility
 */
export interface DisplayOptions {
  show?: Record<string, unknown[]>;
  hide?: Record<string, unknown[]>;
}

/**
 * Node property definition (simplified from n8n schema)
 */
export interface NodeProperty {
  name: string;
  displayName?: string;
  type: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ name?: string; value: unknown }>;
  displayOptions?: DisplayOptions;
  modes?: Array<{ name: string }> | Record<string, unknown>;
  description?: string;
}
