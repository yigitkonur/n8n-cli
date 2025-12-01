export interface WorkflowNode {
  id?: string;
  name?: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  disabled?: boolean;
  webhookId?: string;
  [key: string]: unknown;
}

export interface Workflow {
  name?: string;
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
  active?: boolean;
  settings?: Record<string, unknown>;
  pinData?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Reverse Connection for AI Validation
 * 
 * AI connections flow TO the consumer node (reversed from standard n8n pattern).
 * This type represents an incoming connection to a node.
 * 
 * @example
 * Standard n8n: [Source] --main--> [Target]
 * AI pattern: [Language Model] --ai_languageModel--> [AI Agent]
 * Reverse map: reverseMap.get("AI Agent") = [{sourceName: "Language Model", type: "ai_languageModel", ...}]
 */
export interface ReverseConnection {
  /** Name of the source node that connects to this node */
  sourceName: string;
  /** Output type from the source node (main, ai_tool, ai_languageModel, etc.) */
  sourceType: string;
  /** Connection type (same as sourceType for clarity) */
  type: string;
  /** Output index from the source node */
  index: number;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface SourceLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  offset?: number;
  length?: number;
}

export interface SourceSnippet {
  lines: Array<{
    lineNumber: number;
    content: string;
    isHighlighted: boolean;
  }>;
  startLine: number;
  endLine: number;
  highlightLine: number;
}

export interface ValidationIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  
  // Location in the workflow structure
  location?: {
    nodeName?: string;
    nodeId?: string;
    nodeType?: string;
    nodeIndex?: number;
    path?: string;
  };
  
  // Source file location (line/column)
  sourceLocation?: SourceLocation;
  
  // Actual source code snippet around the error
  sourceSnippet?: SourceSnippet;
  
  // Contextual information about the error
  context?: {
    value?: unknown;
    expected?: string;
    n8nError?: string;
    fullObject?: unknown;
    // Schema-based hints: expected structure and where it applies
    expectedSchema?: unknown;
    schemaPath?: string;
  };
  
  // Valid alternatives for the problematic value
  validAlternatives?: string[];
  
  // Additional context hint
  hint?: string;
  
  // Suggestions for similar valid values (e.g., node type suggestions)
  suggestions?: Array<{
    /** The suggested value (e.g., correct node type) */
    value: string;
    /** Confidence score from 0.0 to 1.0 */
    confidence: number;
    /** Reason for the suggestion (e.g., 'Likely typo') */
    reason: string;
    /** Whether this can be auto-fixed (confidence >= 0.9) */
    autoFixable: boolean;
  }>;
}

/**
 * Version issue for a node (used by --check-versions)
 */
export interface VersionIssue {
  code: 'OUTDATED_TYPE_VERSION';
  severity: 'info' | 'warning' | 'error';
  nodeName: string;
  nodeType: string;
  currentVersion: string;
  latestVersion: string;
  hasBreakingChanges: boolean;
  autoMigratable: boolean;
  hint: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[]; // Legacy, kept for simple checks
  warnings: string[]; // Legacy
  issues: ValidationIssue[]; // New rich issues
  nodeTypeIssues?: string[];
  versionIssues?: VersionIssue[]; // Version checking results
}

export interface ValidationSummary {
  input: string;
  sourceType: 'file' | 'url' | 'stdin';
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: ValidationIssue[]; // New rich issues
  sanitized: boolean;
  fixed?: number;
}

// Re-export expression validation types for convenience
export type {
  ExpressionFormatIssue,
  ResourceLocatorField,
  ExpressionValidationContext,
} from './validation/index.js';

// Re-export enhanced validation types
export type {
  ValidationMode,
  ValidationProfile,
  ValidationError as EnhancedValidationError,
  ValidationWarning as EnhancedValidationWarning,
  EnhancedValidationResult,
  NodeValidationContext,
  OperationContext,
  NodeProperty,
} from './validation/index.js';

// Re-export enhanced validator
export { EnhancedConfigValidator } from './validation/index.js';
