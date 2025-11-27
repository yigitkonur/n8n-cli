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
}

export interface ValidationResult {
  valid: boolean;
  errors: string[]; // Legacy, kept for simple checks
  warnings: string[]; // Legacy
  issues: ValidationIssue[]; // New rich issues
  nodeTypeIssues?: string[];
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
