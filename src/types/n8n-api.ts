/**
 * n8n API Types
 * Copied from n8n-mcp/src/types/n8n-api.ts
 */

// Resource Locator Types
export interface ResourceLocatorValue {
  __rl: true;
  value: string;
  mode: 'id' | 'url' | 'expression' | string;
}

// Expression Format Types
export type ExpressionValue = string | ResourceLocatorValue;

// Workflow Node Types
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  continueOnFail?: boolean;
  onError?: 'continueRegularOutput' | 'continueErrorOutput' | 'stopWorkflow';
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
}

export interface WorkflowConnection {
  [sourceNodeId: string]: {
    [outputType: string]: Array<Array<{
      node: string;
      type: string;
      index: number;
    }>>;
  };
}

export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  timezone?: string;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  saveExecutionProgress?: boolean;
  executionTimeout?: number;
  errorWorkflow?: string;
}

export interface Workflow {
  id?: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection;
  active?: boolean;
  isArchived?: boolean;
  settings?: WorkflowSettings;
  staticData?: Record<string, unknown>;
  tags?: string[];
  updatedAt?: string;
  createdAt?: string;
  versionId?: string;
  versionCounter?: number;
  meta?: {
    instanceId?: string;
  };
}

// Execution Types
export enum ExecutionStatus {
  NEW = 'new',
  QUEUED = 'queued',
  RUNNING = 'running',
  WAITING = 'waiting',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELED = 'canceled',
}

export interface ExecutionSummary {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  status: ExecutionStatus;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowName?: string;
  waitTill?: string;
}

export interface ExecutionData {
  startData?: Record<string, unknown>;
  resultData: {
    runData: Record<string, unknown>;
    lastNodeExecuted?: string;
    error?: Record<string, unknown>;
  };
  executionData?: Record<string, unknown>;
}

export interface Execution extends ExecutionSummary {
  data?: ExecutionData;
}

// Credential Types
export interface Credential {
  id?: string;
  name: string;
  type: string;
  data?: Record<string, unknown>;
  nodesAccess?: Array<{
    nodeType: string;
    date?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// Tag Types
export interface Tag {
  id?: string;
  name: string;
  workflowIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Variable Types
export interface Variable {
  id?: string;
  key: string;
  value: string;
  type?: 'string';
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  instanceId?: string;
  n8nVersion?: string;
  features?: {
    sourceControl?: boolean;
    externalHooks?: boolean;
    workers?: boolean;
    [key: string]: boolean | undefined;
  };
}

// Request Parameter Types
export interface WorkflowListParams {
  limit?: number;
  cursor?: string;
  active?: boolean;
  tags?: string | null;
  projectId?: string;
  excludePinnedData?: boolean;
}

export interface WorkflowListResponse {
  data: Workflow[];
  nextCursor?: string | null;
}

export interface ExecutionListParams {
  limit?: number;
  cursor?: string;
  workflowId?: string;
  projectId?: string;
  status?: ExecutionStatus;
  includeData?: boolean;
}

export interface ExecutionListResponse {
  data: Execution[];
  nextCursor?: string | null;
}

export interface CredentialListParams {
  limit?: number;
  cursor?: string;
  filter?: Record<string, unknown>;
}

export interface CredentialListResponse {
  data: Credential[];
  nextCursor?: string | null;
}

export interface TagListParams {
  limit?: number;
  cursor?: string;
  withUsageCount?: boolean;
}

export interface TagListResponse {
  data: Tag[];
  nextCursor?: string | null;
}

// Webhook Request Type
export interface WebhookRequest {
  webhookUrl: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  headers?: Record<string, string>;
  waitForResponse?: boolean;
}

// Execution Filtering Types
export type ExecutionMode = 'preview' | 'summary' | 'filtered' | 'full';

export interface ExecutionPreview {
  totalNodes: number;
  executedNodes: number;
  estimatedSizeKB: number;
  nodes: Record<string, NodePreview>;
}

export interface NodePreview {
  status: 'success' | 'error';
  itemCounts: {
    input: number;
    output: number;
  };
  dataStructure: Record<string, any>;
  estimatedSizeKB: number;
  error?: string;
}

export interface ExecutionFilterOptions {
  mode?: ExecutionMode;
  nodeNames?: string[];
  itemsLimit?: number;
  includeInputData?: boolean;
}

export interface FilteredExecutionResponse {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  startedAt: string;
  stoppedAt?: string;
  duration?: number;
  finished: boolean;
  preview?: ExecutionPreview;
  summary?: {
    totalNodes: number;
    executedNodes: number;
    totalItems: number;
    hasMoreData: boolean;
  };
  nodes?: Record<string, FilteredNodeData>;
  error?: Record<string, unknown>;
}

export interface FilteredNodeData {
  executionTime?: number;
  itemsInput: number;
  itemsOutput: number;
  status: 'success' | 'error';
  error?: string;
  data?: {
    input?: any[][];
    output?: any[][];
    metadata: {
      totalItems: number;
      itemsShown: number;
      truncated: boolean;
    };
  };
}

// Variable List Types
export interface VariableListParams {
  limit?: number;
  cursor?: string;
}

export interface VariableListResponse {
  data: Variable[];
  nextCursor?: string | null;
}

// Credential Schema Types
export interface CredentialSchema {
  additionalProperties?: boolean;
  type: string;
  properties: Record<string, {
    type: string;
    description?: string;
    default?: unknown;
  }>;
  required?: string[];
}

// Audit Types
export type AuditCategory = 'credentials' | 'database' | 'nodes' | 'filesystem' | 'instance';

export interface AuditParams {
  additionalOptions?: {
    daysAbandonedWorkflow?: number;
    categories?: AuditCategory[];
  };
}

export interface AuditLocation {
  kind: string;
  id?: string;
  name?: string;
  workflowId?: string;
  workflowName?: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  packageUrl?: string;
}

export interface AuditSection {
  title: string;
  description: string;
  recommendation: string;
  location: AuditLocation[];
}

export interface AuditRiskReport {
  risk: string;
  sections: AuditSection[];
}

export interface AuditReport {
  'Credentials Risk Report'?: AuditRiskReport;
  'Database Risk Report'?: AuditRiskReport;
  'Nodes Risk Report'?: AuditRiskReport;
  'Filesystem Risk Report'?: AuditRiskReport;
  'Instance Risk Report'?: AuditRiskReport;
}

// Execution Retry Types
export interface ExecutionRetryParams {
  loadWorkflow?: boolean;
}
