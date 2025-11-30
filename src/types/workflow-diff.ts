/**
 * Workflow Diff Types
 * Copied from n8n-mcp/src/types/workflow-diff.ts
 * Defines the structure for partial workflow updates using diff operations
 */

import type { WorkflowNode } from './n8n-api.js';

// Base operation interface
export interface DiffOperation {
  type: string;
  description?: string;
}

// Node Operations
export interface AddNodeOperation extends DiffOperation {
  type: 'addNode';
  node: Partial<WorkflowNode> & {
    name: string;
    type: string;
    position: [number, number];
  };
}

export interface RemoveNodeOperation extends DiffOperation {
  type: 'removeNode';
  nodeId?: string;
  nodeName?: string;
}

export interface UpdateNodeOperation extends DiffOperation {
  type: 'updateNode';
  nodeId?: string;
  nodeName?: string;
  updates: {
    [path: string]: any;
  };
}

export interface MoveNodeOperation extends DiffOperation {
  type: 'moveNode';
  nodeId?: string;
  nodeName?: string;
  position: [number, number];
}

export interface EnableNodeOperation extends DiffOperation {
  type: 'enableNode';
  nodeId?: string;
  nodeName?: string;
}

export interface DisableNodeOperation extends DiffOperation {
  type: 'disableNode';
  nodeId?: string;
  nodeName?: string;
}

// Connection Operations
export interface AddConnectionOperation extends DiffOperation {
  type: 'addConnection';
  source: string;
  target: string;
  sourceOutput?: string;
  targetInput?: string;
  sourceIndex?: number;
  targetIndex?: number;
  branch?: 'true' | 'false';
  case?: number;
}

export interface RemoveConnectionOperation extends DiffOperation {
  type: 'removeConnection';
  source: string;
  target: string;
  sourceOutput?: string;
  targetInput?: string;
  ignoreErrors?: boolean;
}

export interface RewireConnectionOperation extends DiffOperation {
  type: 'rewireConnection';
  source: string;
  from: string;
  to: string;
  sourceOutput?: string;
  targetInput?: string;
  sourceIndex?: number;
  branch?: 'true' | 'false';
  case?: number;
}

// Workflow Metadata Operations
export interface UpdateSettingsOperation extends DiffOperation {
  type: 'updateSettings';
  settings: {
    [key: string]: any;
  };
}

export interface UpdateNameOperation extends DiffOperation {
  type: 'updateName';
  name: string;
}

export interface AddTagOperation extends DiffOperation {
  type: 'addTag';
  tag: string;
}

export interface RemoveTagOperation extends DiffOperation {
  type: 'removeTag';
  tag: string;
}

export interface ActivateWorkflowOperation extends DiffOperation {
  type: 'activateWorkflow';
}

export interface DeactivateWorkflowOperation extends DiffOperation {
  type: 'deactivateWorkflow';
}

// Connection Cleanup Operations
export interface CleanStaleConnectionsOperation extends DiffOperation {
  type: 'cleanStaleConnections';
  dryRun?: boolean;
}

export interface ReplaceConnectionsOperation extends DiffOperation {
  type: 'replaceConnections';
  connections: {
    [nodeName: string]: {
      [outputName: string]: Array<Array<{
        node: string;
        type: string;
        index: number;
      }>>;
    };
  };
}

// Union type for all operations
export type WorkflowDiffOperation =
  | AddNodeOperation
  | RemoveNodeOperation
  | UpdateNodeOperation
  | MoveNodeOperation
  | EnableNodeOperation
  | DisableNodeOperation
  | AddConnectionOperation
  | RemoveConnectionOperation
  | RewireConnectionOperation
  | UpdateSettingsOperation
  | UpdateNameOperation
  | AddTagOperation
  | RemoveTagOperation
  | ActivateWorkflowOperation
  | DeactivateWorkflowOperation
  | CleanStaleConnectionsOperation
  | ReplaceConnectionsOperation;

// Main diff request structure
export interface WorkflowDiffRequest {
  id: string;
  operations: WorkflowDiffOperation[];
  validateOnly?: boolean;
  continueOnError?: boolean;
}

// Response types
export interface WorkflowDiffValidationError {
  operation: number;
  message: string;
  details?: any;
}

export interface WorkflowDiffResult {
  success: boolean;
  workflow?: any;
  errors?: WorkflowDiffValidationError[];
  warnings?: WorkflowDiffValidationError[];
  operationsApplied?: number;
  message?: string;
  applied?: number[];
  failed?: number[];
  staleConnectionsRemoved?: Array<{ from: string; to: string }>;
  shouldActivate?: boolean;
  shouldDeactivate?: boolean;
}

// Helper type for node reference
export interface NodeReference {
  id?: string;
  name?: string;
}
