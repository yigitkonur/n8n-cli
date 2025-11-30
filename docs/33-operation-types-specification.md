# Operation Types Specification

## Overview

The 17 operation types for `n8n workflows update` with smart parameter handling.

## Operation Categories

```
┌──────────────────────────────────────────────────────────────────────┐
│                        OPERATION TYPES (17)                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  NODE OPERATIONS (6)        CONNECTION OPERATIONS (5)                │
│  ├── addNode                ├── addConnection                        │
│  ├── removeNode             ├── removeConnection                     │
│  ├── updateNode             ├── rewireConnection                     │
│  ├── moveNode               ├── cleanStaleConnections                │
│  ├── enableNode             └── replaceConnections                   │
│  └── disableNode                                                     │
│                                                                      │
│  METADATA OPERATIONS (4)    ACTIVATION OPERATIONS (2)                │
│  ├── updateSettings         ├── activateWorkflow                     │
│  ├── updateName             └── deactivateWorkflow                   │
│  ├── addTag                                                          │
│  └── removeTag                                                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Node Operations

### addNode

```typescript
interface AddNodeOperation {
  type: 'addNode';
  node: {
    name: string;           // Required: Unique name
    type: string;           // Required: e.g., "n8n-nodes-base.slack"
    position: [number, number]; // Required: [x, y] coordinates
    typeVersion?: number;   // Optional: defaults to latest
    parameters?: object;    // Optional: node configuration
    credentials?: object;   // Optional: credential references
    disabled?: boolean;     // Optional: create disabled
  };
}

// Example
{
  "type": "addNode",
  "node": {
    "name": "Send to Slack",
    "type": "n8n-nodes-base.slack",
    "position": [600, 300],
    "typeVersion": 2,
    "parameters": {
      "resource": "message",
      "operation": "create",
      "channel": { "mode": "id", "value": "C01234567" },
      "text": "Hello from n8n!"
    }
  }
}
```

**Validation Rules**:
- Name must be unique in workflow
- Type must exist in node database
- Position must be [number, number]
- typeVersion must be valid for type

### removeNode

```typescript
interface RemoveNodeOperation {
  type: 'removeNode';
  nodeName?: string;        // Remove by name
  nodeId?: string;          // Or by ID
  removeConnections?: boolean; // Default: true
}

// Example
{
  "type": "removeNode",
  "nodeName": "Old HTTP Request",
  "removeConnections": true
}
```

**Behavior**:
- Removes node from workflow.nodes
- If `removeConnections: true`, also removes all connections to/from node
- If `removeConnections: false`, leaves dangling connections (not recommended)

### updateNode

```typescript
interface UpdateNodeOperation {
  type: 'updateNode';
  nodeName?: string;        // Target by name
  nodeId?: string;          // Or by ID
  updates: {
    name?: string;          // Rename node
    position?: [number, number];
    disabled?: boolean;
    parameters?: object;    // Merge with existing
    credentials?: object;
    onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';
    retryOnFail?: boolean;
    maxTries?: number;
    waitBetweenTries?: number;
    notes?: string;
  };
}

// Example: Add error handling
{
  "type": "updateNode",
  "nodeName": "HTTP Request",
  "updates": {
    "onError": "continueErrorOutput",
    "retryOnFail": true,
    "maxTries": 3,
    "waitBetweenTries": 1000
  }
}

// Example: Update parameters (MERGE, not replace)
{
  "type": "updateNode",
  "nodeName": "Slack",
  "updates": {
    "parameters": {
      "text": "Updated message"
    }
  }
}
```

**Behavior**:
- `updates.parameters` is MERGED with existing parameters
- To remove a parameter, set it to `null`
- Other fields are replaced

### moveNode

```typescript
interface MoveNodeOperation {
  type: 'moveNode';
  nodeName?: string;
  nodeId?: string;
  position: [number, number];
  relative?: boolean;       // Default: false (absolute position)
}

// Example: Absolute move
{
  "type": "moveNode",
  "nodeName": "Slack",
  "position": [800, 400]
}

// Example: Relative move (+100 x, +50 y)
{
  "type": "moveNode",
  "nodeName": "Slack",
  "position": [100, 50],
  "relative": true
}
```

### enableNode / disableNode

```typescript
interface EnableNodeOperation {
  type: 'enableNode';
  nodeName?: string;
  nodeId?: string;
}

interface DisableNodeOperation {
  type: 'disableNode';
  nodeName?: string;
  nodeId?: string;
}

// Example
{ "type": "disableNode", "nodeName": "Debug Logger" }
{ "type": "enableNode", "nodeName": "Debug Logger" }
```

---

## Connection Operations

### addConnection

```typescript
interface AddConnectionOperation {
  type: 'addConnection';
  source: string;           // Source node name
  target: string;           // Target node name
  
  // For standard nodes:
  sourceOutput?: number;    // Output index (default: 0)
  targetInput?: number;     // Input index (default: 0)
  
  // SMART PARAMETERS (preferred):
  branch?: 'true' | 'false';  // For IF nodes
  case?: number;              // For Switch nodes (0-indexed)
  
  // For AI nodes:
  aiConnectionType?: 'ai_languageModel' | 'ai_tool' | 'ai_memory' | 'ai_outputParser';
}

// Example: Standard connection
{
  "type": "addConnection",
  "source": "HTTP Request",
  "target": "Slack"
}

// Example: IF node - true branch
{
  "type": "addConnection",
  "source": "IF",
  "target": "Success Handler",
  "branch": "true"
}

// Example: IF node - false branch
{
  "type": "addConnection",
  "source": "IF",
  "target": "Error Handler",
  "branch": "false"
}

// Example: Switch node - case 2
{
  "type": "addConnection",
  "source": "Switch",
  "target": "Case 2 Handler",
  "case": 2
}

// Example: AI Agent - connect language model
{
  "type": "addConnection",
  "source": "OpenAI Model",
  "target": "AI Agent",
  "aiConnectionType": "ai_languageModel"
}

// Example: AI Agent - connect tool
{
  "type": "addConnection",
  "source": "Calculator Tool",
  "target": "AI Agent",
  "aiConnectionType": "ai_tool"
}
```

**Smart Parameter Resolution**:

```typescript
// Internal: Convert smart params to indices
function resolveConnectionParams(op: AddConnectionOperation, workflow: Workflow): ResolvedConnection {
  const sourceNode = findNode(workflow, op.source);
  
  // Handle branch parameter
  if (op.branch !== undefined) {
    if (sourceNode.type !== 'n8n-nodes-base.if') {
      throw new Error('branch parameter only valid for IF nodes');
    }
    return {
      sourceOutput: op.branch === 'true' ? 0 : 1,
      targetInput: op.targetInput ?? 0,
    };
  }
  
  // Handle case parameter
  if (op.case !== undefined) {
    if (sourceNode.type !== 'n8n-nodes-base.switch') {
      throw new Error('case parameter only valid for Switch nodes');
    }
    return {
      sourceOutput: op.case,
      targetInput: op.targetInput ?? 0,
    };
  }
  
  // Handle AI connection type
  if (op.aiConnectionType) {
    return {
      sourceOutput: 0,
      targetInput: 0,
      connectionType: op.aiConnectionType,
    };
  }
  
  // Default
  return {
    sourceOutput: op.sourceOutput ?? 0,
    targetInput: op.targetInput ?? 0,
  };
}
```

### removeConnection

```typescript
interface RemoveConnectionOperation {
  type: 'removeConnection';
  source: string;
  target: string;
  sourceOutput?: number;
  targetInput?: number;
  branch?: 'true' | 'false';
  case?: number;
  aiConnectionType?: string;
}

// Example
{
  "type": "removeConnection",
  "source": "IF",
  "target": "Old Handler",
  "branch": "false"
}
```

### rewireConnection

```typescript
interface RewireConnectionOperation {
  type: 'rewireConnection';
  source: string;
  oldTarget: string;
  newTarget: string;
  sourceOutput?: number;
  newTargetInput?: number;
}

// Example: Change where IF.false goes
{
  "type": "rewireConnection",
  "source": "IF",
  "oldTarget": "Old Error Handler",
  "newTarget": "New Error Handler",
  "branch": "false"
}
```

### cleanStaleConnections

```typescript
interface CleanStaleConnectionsOperation {
  type: 'cleanStaleConnections';
  // No parameters - removes connections to/from non-existent nodes
}

// Example
{ "type": "cleanStaleConnections" }
```

**Use Case**: After removing nodes, clean up any broken connections.

### replaceConnections

```typescript
interface ReplaceConnectionsOperation {
  type: 'replaceConnections';
  connections: WorkflowConnections; // Complete replacement
}

// Example (dangerous - replaces ALL connections)
{
  "type": "replaceConnections",
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Set", "type": "main", "index": 0 }]]
    },
    "Set": {
      "main": [[{ "node": "Slack", "type": "main", "index": 0 }]]
    }
  }
}
```

⚠️ **Warning**: This replaces the entire connections object. Use with caution.

---

## Metadata Operations

### updateSettings

```typescript
interface UpdateSettingsOperation {
  type: 'updateSettings';
  settings: Partial<WorkflowSettings>;
}

interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  timezone?: string;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveExecutionProgress?: boolean;
  saveManualExecutions?: boolean;
  executionTimeout?: number;
  errorWorkflow?: string;
}

// Example
{
  "type": "updateSettings",
  "settings": {
    "executionTimeout": 300,
    "saveDataErrorExecution": "all",
    "errorWorkflow": "wf-error-handler-123"
  }
}
```

### updateName

```typescript
interface UpdateNameOperation {
  type: 'updateName';
  name: string;
}

// Example
{ "type": "updateName", "name": "Production Data Sync v2" }
```

### addTag / removeTag

```typescript
interface AddTagOperation {
  type: 'addTag';
  tag: string;
}

interface RemoveTagOperation {
  type: 'removeTag';
  tag: string;
}

// Example
{ "type": "addTag", "tag": "production" }
{ "type": "removeTag", "tag": "deprecated" }
```

---

## Activation Operations

### activateWorkflow / deactivateWorkflow

```typescript
interface ActivateWorkflowOperation {
  type: 'activateWorkflow';
}

interface DeactivateWorkflowOperation {
  type: 'deactivateWorkflow';
}

// Example
{ "type": "deactivateWorkflow" }
```

---

## Operation Validation

```typescript
// src/core/operations/validator.ts

export interface OperationValidationResult {
  valid: boolean;
  errors: OperationError[];
}

export function validateOperation(
  op: Operation,
  workflow: Workflow
): OperationValidationResult {
  const errors: OperationError[] = [];
  
  switch (op.type) {
    case 'addNode':
      // Check name uniqueness
      if (workflow.nodes.some(n => n.name === op.node.name)) {
        errors.push({ code: 'DUPLICATE_NAME', message: `Node "${op.node.name}" already exists` });
      }
      // Validate node type exists
      if (!nodeTypeExists(op.node.type)) {
        errors.push({ code: 'UNKNOWN_TYPE', message: `Unknown node type: ${op.node.type}` });
      }
      break;
      
    case 'removeNode':
    case 'updateNode':
    case 'moveNode':
    case 'enableNode':
    case 'disableNode':
      // Check node exists
      const node = findNode(workflow, op.nodeName, op.nodeId);
      if (!node) {
        errors.push({ code: 'NODE_NOT_FOUND', message: `Node not found: ${op.nodeName || op.nodeId}` });
      }
      break;
      
    case 'addConnection':
      // Check both nodes exist
      if (!findNode(workflow, op.source)) {
        errors.push({ code: 'SOURCE_NOT_FOUND', message: `Source node not found: ${op.source}` });
      }
      if (!findNode(workflow, op.target)) {
        errors.push({ code: 'TARGET_NOT_FOUND', message: `Target node not found: ${op.target}` });
      }
      // Validate branch/case for specific node types
      if (op.branch !== undefined) {
        const sourceNode = findNode(workflow, op.source);
        if (sourceNode?.type !== 'n8n-nodes-base.if') {
          errors.push({ code: 'INVALID_BRANCH', message: 'branch only valid for IF nodes' });
        }
      }
      break;
      
    // ... other operation types
  }
  
  return { valid: errors.length === 0, errors };
}
```

## Error Recovery

```typescript
// src/core/operations/applier.ts

export interface ApplyOptions {
  continueOnError?: boolean;  // Default: false (atomic)
  validateOnly?: boolean;     // Default: false
}

export interface ApplyResult {
  success: boolean;
  workflow: Workflow;
  appliedIndices: number[];
  failedIndices: number[];
  errors: Array<{ index: number; error: string }>;
}

export function applyOperations(
  workflow: Workflow,
  operations: Operation[],
  options: ApplyOptions = {}
): ApplyResult {
  const { continueOnError = false, validateOnly = false } = options;
  
  // Validate all first
  const validationResults = operations.map(op => validateOperation(op, workflow));
  const hasErrors = validationResults.some(r => !r.valid);
  
  if (hasErrors && !continueOnError) {
    return {
      success: false,
      workflow,
      appliedIndices: [],
      failedIndices: validationResults.map((r, i) => r.valid ? -1 : i).filter(i => i >= 0),
      errors: validationResults.flatMap((r, i) => r.errors.map(e => ({ index: i, error: e.message }))),
    };
  }
  
  if (validateOnly) {
    return {
      success: !hasErrors,
      workflow,
      appliedIndices: [],
      failedIndices: [],
      errors: [],
    };
  }
  
  // Apply operations
  let result = structuredClone(workflow);
  const appliedIndices: number[] = [];
  const failedIndices: number[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  
  for (let i = 0; i < operations.length; i++) {
    try {
      result = applySingleOperation(result, operations[i]);
      appliedIndices.push(i);
    } catch (error) {
      if (!continueOnError) {
        // Rollback all changes
        return {
          success: false,
          workflow,  // Original
          appliedIndices: [],
          failedIndices: [i],
          errors: [{ index: i, error: error.message }],
        };
      }
      failedIndices.push(i);
      errors.push({ index: i, error: error.message });
    }
  }
  
  return {
    success: failedIndices.length === 0,
    workflow: result,
    appliedIndices,
    failedIndices,
    errors,
  };
}
```
