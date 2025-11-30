# Command: n8n workflows update

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/workflows.ts` or `src/operations/` - they don't exist or are thin wrappers.

**Core Logic (COPY):**
- `n8n-mcp/src/services/workflow-diff-engine.ts` (1197 lines) → Main `WorkflowDiffEngine.applyDiff()` method
- `n8n-mcp/src/services/n8n-api-client.ts` (530 lines) → `N8nApiClient.updateWorkflow()` method
- `n8n-mcp/src/services/workflow-versioning-service.ts` (461 lines) → Auto-backup before update

**Types (COPY ENTIRELY):**
- `n8n-mcp/src/types/workflow-diff.ts` (216 lines) → All 17 operation type definitions
- `n8n-mcp/src/types/n8n-api.ts` → `WorkflowNode`, `WorkflowConnection` interfaces

**Validation (for continueOnError mode):**
- `n8n-mcp/src/services/n8n-validation.ts` → `validateWorkflowNode()`, `validateWorkflowConnections()`

**MCP Tool Doc:** `n8n-mcp/mcp-tools/012-n8n_update_partial_workflow.md`

## CLI Command

```bash
n8n workflows update <id> [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<id>` | positional | required | Workflow ID to update |
| `--from-file, -f` | string | - | Path to operations JSON file |
| `--operations, -o` | string | - | Inline operations JSON |
| `--intent` | string | - | Description of change (ALWAYS provide) |
| `--validate-only` | boolean | true | Preview only (DEFAULT) |
| `--continue-on-error` | boolean | false | Best-effort mode |
| `--save, -s` | string | - | Save updated workflow to JSON |

## Important Design Decisions

1. **Default is VALIDATE-ONLY** - Preview operations before applying
2. **Intent required** - Must describe what the change does
3. **Atomic by default** - All ops succeed or none applied
4. **Smart parameters** - Use `branch="true"` for IF, `case=N` for Switch

## Operation Types (17 total)

### Node Operations (6)
- `addNode` - Add new node
- `removeNode` - Remove node by name/id
- `updateNode` - Update node properties
- `moveNode` - Change node position
- `enableNode` - Enable disabled node
- `disableNode` - Disable node

### Connection Operations (5)
- `addConnection` - Connect nodes (supports branch/case)
- `removeConnection` - Remove connection
- `rewireConnection` - Change connection target
- `cleanStaleConnections` - Remove broken connections
- `replaceConnections` - Replace all connections

### Metadata Operations (4)
- `updateSettings` - Modify workflow settings
- `updateName` - Rename workflow
- `addTag` - Add tag
- `removeTag` - Remove tag

### Activation Operations (2)
- `activateWorkflow` - Activate
- `deactivateWorkflow` - Deactivate

## Implementation

### 1. Read Operation Logic

From `n8n-mcp/src/mcp/tools/workflows.ts`:
- Operation parsing
- Validation before apply
- API integration

From `n8n-mcp/src/operations/`:
- `NodeOperations` - addNode, removeNode, updateNode, etc.
- `ConnectionOperations` - addConnection, removeConnection, etc.
- `MetadataOperations` - updateName, addTag, etc.

### 2. Output Format

**Terminal (validate-only - default):**
```
📝 Preview: Update workflow abc123

Mode: VALIDATE-ONLY (no changes)
Intent: "Add error handling to HTTP Request"
Operations: 3

╭─ Operations to apply
╰─

1. addNode
   Type: n8n-nodes-base.noOp
   Name: "Error Handler"
   Position: [600, 400]

2. addConnection
   Source: "HTTP Request" (error output)
   Target: "Error Handler"

3. updateNode
   Node: "HTTP Request"
   Updates: onError → "continueErrorOutput"

Validation:
  ✓ All operations valid
  ✓ No conflicts

⚠️  To apply, remove --validate-only flag:
    n8n workflows update abc123 --from-file ops.json --intent "Add error handling"
```

## Operations JSON Format

```json
[
  {
    "type": "addNode",
    "node": {
      "name": "Error Handler",
      "type": "n8n-nodes-base.noOp",
      "position": [600, 400],
      "parameters": {}
    }
  },
  {
    "type": "addConnection",
    "source": "HTTP Request",
    "target": "Error Handler",
    "branch": "false"
  },
  {
    "type": "updateNode",
    "nodeName": "HTTP Request",
    "updates": {
      "onError": "continueErrorOutput"
    }
  }
]
```

## Files to Create

1. `src/commands/workflows/UpdateCommand.ts` - Clipanion command
2. `src/core/operations/` - Operation implementations
3. `src/core/operations/nodes.ts` - Node operations
4. `src/core/operations/connections.ts` - Connection operations
5. `src/core/operations/metadata.ts` - Metadata operations

## Code Outline

```typescript
// src/commands/workflows/UpdateCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class WorkflowsUpdateCommand extends BaseCommand {
  static paths = [['workflows', 'update']];
  
  static usage = {
    description: 'Apply targeted changes to workflows via diff operations',
    details: `
      Surgical workflow updates. Preferred over full replacement.
      Default: VALIDATE-ONLY mode.
      
      17 operation types:
        Node: addNode, removeNode, updateNode, moveNode, enableNode, disableNode
        Connection: addConnection, removeConnection, rewireConnection, cleanStaleConnections
        Metadata: updateSettings, updateName, addTag, removeTag
        Activation: activateWorkflow, deactivateWorkflow
      
      Examples:
        $ n8n workflows update abc123 --from-file ops.json --intent "Add error handling"
        $ n8n workflows update abc123 --from-file ops.json --intent "..." # (applies changes)
    `,
    category: 'Workflow Management',
  };

  id = Option.String({ required: true });
  fromFile = Option.String('-f,--from-file');
  operations = Option.String('-o,--operations');
  intent = Option.String('--intent');
  validateOnly = Option.Boolean('--validate-only', { default: true });
  continueOnError = Option.Boolean('--continue-on-error', { default: false });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Read operation logic from n8n-mcp/src/operations/
    return 0;
  }
}
```

## Smart Parameters (Steal from MCP)

Read `n8n-mcp/src/operations/connections.ts` for:
- `branch` parameter for IF nodes (instead of sourceIndex)
- `case` parameter for Switch nodes
- AI connection type handling (`ai_languageModel`, `ai_tool`, etc.)
