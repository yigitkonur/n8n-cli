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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  nodeTypeIssues?: string[];
}

export interface ValidationSummary {
  input: string;
  sourceType: 'file' | 'url' | 'stdin';
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized: boolean;
  fixed?: number;
}
