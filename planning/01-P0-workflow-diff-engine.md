# P0: Workflow Diff Engine

## Priority: P0 (Critical)
## Status: Types Exist, Engine Missing in CLI
## MCP Source: `n8n-mcp/src/services/workflow-diff-engine.ts`

---

## Business Value

**Impact:** Enables surgical workflow modifications without full replacement, reducing API payload size by 80-95% and eliminating race conditions in concurrent editing scenarios. Critical for CI/CD pipelines where atomic node updates are required.

**Workflow Improvement:** Developers can modify single nodes, rewire connections, or batch multiple changes atomically—avoiding the "fetch entire workflow → modify → push entire workflow" anti-pattern that risks overwriting concurrent changes.

**Time Saved:** Reduces typical workflow update operations from 3 API calls (get + transform + put) to 1 call with diff payload. Estimated 2-5 seconds saved per operation in automation scripts.

---

## Current CLI Status

- **Implemented:** Partial (types only)
- **Location:** `src/types/workflow-diff.ts` (L1-L197) — Complete type definitions exist
- **Gap Reason:** Engine logic not ported. CLI has types but no `WorkflowDiffEngine` class, no diff command, and `workflows update` command only supports full replacement via `--file` or atomic `--name`/`--activate`/`--deactivate` flags.

### Existing CLI Infrastructure

| Component | File | Status |
|-----------|------|--------|
| **Diff Types** | `src/types/workflow-diff.ts` | ✅ Complete - All 17 operation types defined |
| **API Client** | `src/core/api/client.ts` | ⚠️ Partial - Has `updateWorkflow()` but no `applyDiff()` |
| **Backup System** | `src/utils/backup.ts` | ✅ Complete - `maybeBackupWorkflow()` ready |
| **Validator** | `src/core/validator.ts` | ✅ Complete - `validateWorkflowStructure()` ready |
| **Sanitizer** | `src/core/sanitizer.ts` | ⚠️ Basic - Missing operator sanitization from MCP |
| **Fixer** | `src/core/fixer.ts` | ⚠️ Basic - Only 3 experimental fixes vs MCP's full sanitizer |
| **Update Command** | `src/commands/workflows/update.ts` | ⚠️ Full replacement only |

### Why Not Yet Implemented

1. **No diff engine class** — The `WorkflowDiffEngine` (1,197 LOC in MCP) handles operation validation, application, connection reference updates, and smart parameters. CLI has no equivalent.
2. **No diff command** — `workflows update` only accepts `--file` for full replacement.
3. **Sanitization gap** — MCP's `node-sanitizer.ts` auto-fixes operator structures and missing metadata; CLI's `fixer.ts` is limited.
4. **No versioning integration** — MCP creates backups via `WorkflowVersioningService` before mutations; CLI backup is file-based only.

---

## MCP Reference Implementation

### Source Files (Complete Reference)

| File | Lines | Purpose |
|------|-------|---------|
| `n8n-mcp/src/services/workflow-diff-engine.ts` | 1-1197 | Core diff engine with 17 operation types |
| `n8n-mcp/src/types/workflow-diff.ts` | 1-216 | Type definitions + type guards |
| `n8n-mcp/src/mcp/handlers-workflow-diff.ts` | 1-513 | Handler with validation, backup, telemetry |
| `n8n-mcp/src/mcp/tool-docs/workflow_management/n8n-update-partial-workflow.ts` | 1-418 | Tool documentation + examples |
| `n8n-mcp/src/services/node-sanitizer.ts` | 1-362 | Auto-fixes operator structures |
| `n8n-mcp/src/services/workflow-versioning-service.ts` | 1-461 | Backup/restore before mutations |

### Key Classes/Functions

```typescript
// n8n-mcp/src/services/workflow-diff-engine.ts:41-249
export class WorkflowDiffEngine {
  private renameMap: Map<string, string> = new Map();  // Tracks node renames for connection updates
  private warnings: WorkflowDiffValidationError[] = [];

  // Main entry point
  async applyDiff(workflow: Workflow, request: WorkflowDiffRequest): Promise<WorkflowDiffResult>
  
  // Two-pass processing: nodes first, then connections/metadata
  // Atomic mode (default): all succeed or none applied
  // Best-effort mode (continueOnError): apply what works, report failures
  
  private validateOperation(workflow: Workflow, operation: WorkflowDiffOperation): string | null
  private applyOperation(workflow: Workflow, operation: WorkflowDiffOperation): void
  private updateConnectionReferences(workflow: Workflow): void  // Auto-updates after renames
  
  // Smart parameter resolution for IF/Switch nodes
  private resolveSmartParameters(workflow, operation): { sourceOutput, sourceIndex }
  
  // Node lookup with name normalization (handles special chars)
  private findNode(workflow, nodeId?, nodeName?): WorkflowNode | null
  private normalizeNodeName(name: string): string
}
```

### Supported Operation Types (17 Total)

```typescript
// n8n-mcp/src/types/workflow-diff.ts:147-164
type WorkflowDiffOperation =
  // Node Operations (6)
  | AddNodeOperation       // Add new node with name, type, position
  | RemoveNodeOperation    // Remove by ID or name, auto-cleans connections
  | UpdateNodeOperation    // Dot notation updates: "parameters.url"
  | MoveNodeOperation      // Change [x, y] position
  | EnableNodeOperation    // Set disabled=false
  | DisableNodeOperation   // Set disabled=true
  
  // Connection Operations (5)
  | AddConnectionOperation     // source→target with smart params (branch, case)
  | RemoveConnectionOperation  // Optional ignoreErrors for cleanup
  | RewireConnectionOperation  // Atomic: remove old + add new
  | CleanStaleConnectionsOperation  // Auto-remove broken refs
  | ReplaceConnectionsOperation     // Full connections replacement
  
  // Metadata Operations (4)
  | UpdateSettingsOperation    // Workflow settings
  | UpdateNameOperation        // Rename workflow
  | AddTagOperation            // Add tag string
  | RemoveTagOperation         // Remove tag string
  
  // Activation Operations (2)
  | ActivateWorkflowOperation    // Validates activatable triggers exist
  | DeactivateWorkflowOperation  // Always valid
```

### Smart Parameters for Multi-Output Nodes

```typescript
// n8n-mcp/src/services/workflow-diff-engine.ts:703-748
// IF nodes: branch="true"|"false" → sourceIndex 0|1
// Switch nodes: case=N → sourceIndex N
// Eliminates error-prone raw sourceIndex usage

// Example: Connect to IF node's true branch
{ type: "addConnection", source: "IF", target: "Success", branch: "true" }

// Example: Connect to Switch case 2
{ type: "addConnection", source: "Switch", target: "Handler", case: 2 }
```

### Auto-Sanitization (Critical for CLI Port)

```typescript
// n8n-mcp/src/services/node-sanitizer.ts:19-32
export function sanitizeNode(node: WorkflowNode): WorkflowNode {
  // Fixes operator structures:
  // - Binary ops (equals, contains): removes singleValue
  // - Unary ops (isEmpty, isNotEmpty): adds singleValue: true
  // - Corrects {type: "isNotEmpty"} → {type: "boolean", operation: "isNotEmpty"}
  
  // Adds missing conditions.options for IF v2.2+, Switch v3.2+:
  // { version: 2, leftValue: "", caseSensitive: true, typeValidation: "strict" }
}

// Called on ALL nodes after any diff operation — prevents UI rendering errors
```

### Data Flow

```
Input: WorkflowDiffRequest { id, operations[], validateOnly?, continueOnError? }
  ↓
1. Fetch workflow from n8n API (client.getWorkflow)
  ↓
2. Create backup via WorkflowVersioningService (auto-prunes to 10 versions)
  ↓
3. Clone workflow (JSON parse/stringify for isolation)
  ↓
4. Two-pass processing:
   Pass 1: Node operations (addNode, removeNode, updateNode, etc.)
   Pass 2: Connection + metadata operations (after node graph is stable)
  ↓
5. Auto-update connection references if nodes were renamed
  ↓
6. Sanitize ALL nodes (fix operators, add missing metadata)
  ↓
7. Validate final workflow structure
  ↓
8. If validateOnly: return validation result
   Else: client.updateWorkflow + optional activate/deactivate
  ↓
Output: WorkflowDiffResult { success, workflow?, errors?, operationsApplied }
```

---

## CLI Architecture Overview

### Entry Point & Command Routing

| Component | File | Purpose |
|-----------|------|---------|
| **Entry Point** | `src/cli.ts` | Commander.js setup, global options, command registration |
| **Index Export** | `src/index.ts` | Programmatic API export |

**Command Registration Pattern:**
```typescript
// src/cli.ts — Commands are registered as subcommands of resource groups
const workflows = program.command('workflows').description('Manage n8n workflows');
workflows.command('list').action(listWorkflows);
workflows.command('diff').action(diffWorkflow);  // ← New command
```

### Existing workflows Commands (Reference Pattern)

| Command | File | Purpose |
|---------|------|---------|
| `workflows list` | `src/commands/workflows/list.ts` | List workflows with filters |
| `workflows get` | `src/commands/workflows/get.ts` | Get workflow by ID |
| `workflows validate` | `src/commands/workflows/validate.ts` | Validate workflow JSON |
| `workflows create` | `src/commands/workflows/create.ts` | Create new workflow |
| `workflows import` | `src/commands/workflows/import.ts` | Import from JSON file |
| `workflows export` | `src/commands/workflows/export.ts` | Export to JSON file |
| `workflows update` | `src/commands/workflows/update.ts` | Update existing workflow (full replacement) |
| `workflows autofix` | `src/commands/workflows/autofix.ts` | Auto-fix validation issues |
| `workflows trigger` | `src/commands/workflows/trigger.ts` | Trigger via webhook |
| `workflows tags` | `src/commands/workflows/tags.ts` | Manage workflow tags |
| `workflows bulk` | `src/commands/workflows/bulk.ts` | Bulk activate/deactivate/delete |

### Shared Core Modules

| Module | File | Used By |
|--------|------|---------|
| **API Client** | `src/core/api/client.ts` | All API commands |
| **Validator** | `src/core/validator.ts` | `validate`, `import`, `create` |
| **Fixer** | `src/core/fixer.ts` | `validate --fix`, `autofix` |
| **Sanitizer** | `src/core/sanitizer.ts` | `create`, `import` |
| **Backup** | `src/utils/backup.ts` | `update`, `autofix`, `bulk` |
| **Formatters** | `src/core/formatters/*.ts` | All commands for output |
| **Config Loader** | `src/core/config/loader.ts` | All API commands |
| **Prompts** | `src/utils/prompts.ts` | Destructive commands |
| **Output** | `src/utils/output.ts` | All commands |

### Global Options (All Commands)

Per README.md pattern, all commands inherit:

| Option | Type | Description |
|--------|------|-------------|
| `--json` | flag | Machine-readable JSON output |
| `-s, --save <path>` | string | Save output to file |
| `--profile <name>` | string | Use config profile |
| `-v, --verbose` | flag | Debug output |
| `-q, --quiet` | flag | Suppress non-essential output |
| `--no-color` | flag | Disable colors |

---

## CLI Command Design

### `workflows diff` — Primary Command

Apply incremental diff operations to a workflow.

```bash
n8n workflows diff <id> [options]
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `-o, --operations <json>` | string | Diff operations (JSON string or @file.json) | - |
| `-f, --file <path>` | string | Alternative: path to operations JSON file | - |
| `--dry-run` | flag | Validate without applying | `false` |
| `--continue-on-error` | flag | Best-effort mode: apply valid ops | `false` |
| `--force, --yes` | flag | Skip confirmation prompts | - |
| `--no-backup` | flag | Skip pre-mutation backup | - |
| `-s, --save <path>` | string | Save result workflow to file | - |
| `--json` | flag | Output as JSON | - |

**Examples (following README.md @file.json convention):**

```bash
# Apply diff operations from file (follows credentials --data @file.json pattern)
n8n workflows diff abc123 --operations @diff.json

# Preview changes without applying (follows create --dry-run pattern)
n8n workflows diff abc123 --operations @diff.json --dry-run

# Apply with best-effort mode
n8n workflows diff abc123 --operations @diff.json --continue-on-error

# Force without confirmation (follows update --force pattern)
n8n workflows diff abc123 --operations @diff.json --force

# Save modified workflow locally (follows validate --save pattern)
n8n workflows diff abc123 --operations @diff.json --save modified.json

# JSON output for automation (universal pattern)
n8n workflows diff abc123 --operations @diff.json --json
```

### Operations JSON Schema

```json
{
  "operations": [
    { "type": "addNode", "node": { "name": "HTTP", "type": "n8n-nodes-base.httpRequest", "position": [400, 300] } },
    { "type": "removeNode", "nodeName": "Old Node" },
    { "type": "updateNode", "nodeName": "Slack", "updates": { "parameters.channel": "#alerts" } },
    { "type": "addConnection", "source": "IF", "target": "Success", "branch": "true" },
    { "type": "activateWorkflow" }
  ]
}
```

### JSON Output Format

**Success response (follows README.md pattern):**
```json
{
  "success": true,
  "data": {
    "workflowId": "abc123",
    "operationsApplied": 5,
    "operationsFailed": 0,
    "workflow": { ... }
  }
}
```

**Validation error response:**
```json
{
  "success": false,
  "error": {
    "code": "DIFF_VALIDATION_FAILED",
    "message": "2 operations failed validation",
    "details": [
      { "index": 1, "operation": "removeNode", "error": "Node 'Unknown' not found" },
      { "index": 3, "operation": "addConnection", "error": "Source node 'Missing' not found" }
    ]
  }
}
```

**Dry-run response:**
```json
{
  "valid": true,
  "operations": [
    { "index": 0, "type": "addNode", "status": "valid" },
    { "index": 1, "type": "removeNode", "status": "valid" }
  ],
  "warnings": []
}
```

---

## CLI Integration Path

### 1. Files to Create

| File | Purpose | LOC |
|------|---------|-----|
| `src/commands/workflows/diff.ts` | Command handler | 150-200 |
| `src/core/diff/engine.ts` | Port WorkflowDiffEngine | 400-500 |
| `src/core/diff/validators.ts` | Operation validators | 150-200 |
| `src/core/diff/sanitizer.ts` | Port node-sanitizer.ts | 200-250 |
| `src/core/diff/index.ts` | Public exports | 20 |

### 2. Files to Modify

| File | Changes | Complexity |
|------|---------|------------|
| `src/cli.ts` | Register `workflows.command('diff')` | Low (5 lines) |
| `src/core/api/client.ts` | No change needed — use existing `updateWorkflow()` | None |
| `src/types/index.ts` | Add `export * from './workflow-diff.js'` if missing | Low (1 line) |

### 3. Command Implementation Pattern

Follow existing `src/commands/workflows/update.ts` structure:

```typescript
// src/commands/workflows/diff.ts
import { Command } from 'commander';
import { getApiClient } from '../../core/api/client.js';
import { WorkflowDiffEngine } from '../../core/diff/engine.js';
import { maybeBackupWorkflow } from '../../utils/backup.js';
import { output } from '../../utils/output.js';
import { confirm } from '../../utils/prompts.js';
import type { WorkflowDiffRequest } from '../../types/workflow-diff.js';

export function registerDiffCommand(workflows: Command): void {
  workflows
    .command('diff <id>')
    .description('Apply incremental diff operations to a workflow')
    .option('-o, --operations <json>', 'Diff operations (JSON or @file.json)')
    .option('-f, --file <path>', 'Path to operations JSON file')
    .option('--dry-run', 'Validate without applying', false)
    .option('--continue-on-error', 'Apply valid operations, report failures', false)
    .option('--force, --yes', 'Skip confirmation prompts')
    .option('--no-backup', 'Skip pre-mutation backup')
    .option('-s, --save <path>', 'Save result to file')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options) => {
      // 1. Parse operations from --operations or --file
      // 2. Get workflow from API
      // 3. Create backup (unless --no-backup)
      // 4. Apply diff via WorkflowDiffEngine
      // 5. If --dry-run: return validation result
      // 6. Confirm (unless --force)
      // 7. Push update via client.updateWorkflow()
      // 8. Output result
    });
}
```

### 4. Core Engine Pattern

```typescript
// src/core/diff/engine.ts
import type { Workflow } from '../types.js';
import type { 
  WorkflowDiffRequest, 
  WorkflowDiffResult,
  WorkflowDiffOperation 
} from '../../types/workflow-diff.js';

export class WorkflowDiffEngine {
  private renameMap = new Map<string, string>();
  private warnings: Array<{ index: number; message: string }> = [];

  /**
   * Apply diff operations to workflow.
   * Two-pass: nodes first, then connections/metadata.
   */
  async applyDiff(
    workflow: Workflow, 
    request: WorkflowDiffRequest
  ): Promise<WorkflowDiffResult> {
    // Clone to avoid mutation
    const copy = JSON.parse(JSON.stringify(workflow)) as Workflow;
    
    // Categorize operations
    const nodeOps = request.operations.filter(op => this.isNodeOperation(op));
    const otherOps = request.operations.filter(op => !this.isNodeOperation(op));
    
    // Pass 1: Node operations
    for (const [i, op] of nodeOps.entries()) {
      const error = this.validateOperation(copy, op);
      if (error && !request.continueOnError) {
        return { success: false, errors: [{ operation: i, message: error }] };
      }
      if (!error) this.applyOperation(copy, op);
    }
    
    // Update connection references if nodes were renamed
    if (this.renameMap.size > 0) {
      this.updateConnectionReferences(copy);
    }
    
    // Pass 2: Connection + metadata operations
    for (const [i, op] of otherOps.entries()) {
      const error = this.validateOperation(copy, op);
      if (error && !request.continueOnError) {
        return { success: false, errors: [{ operation: i, message: error }] };
      }
      if (!error) this.applyOperation(copy, op);
    }
    
    return { 
      success: true, 
      workflow: copy, 
      operationsApplied: request.operations.length,
      warnings: this.warnings.length > 0 ? this.warnings : undefined
    };
  }

  private isNodeOperation(op: WorkflowDiffOperation): boolean {
    return ['addNode', 'removeNode', 'updateNode', 'moveNode', 'enableNode', 'disableNode'].includes(op.type);
  }
  
  // ... validateOperation, applyOperation, updateConnectionReferences
}
```

### 5. Dependencies Matrix

| Dependency | File | Status | Notes |
|------------|------|--------|-------|
| **Diff Types** | `src/types/workflow-diff.ts` | ✅ Ready | All 17 operation types defined |
| **Backup Utility** | `src/utils/backup.ts` | ✅ Ready | `maybeBackupWorkflow()` |
| **API Client** | `src/core/api/client.ts` | ✅ Ready | `getWorkflow()`, `updateWorkflow()` |
| **Validator** | `src/core/validator.ts` | ✅ Ready | Post-diff validation |
| **Output Helper** | `src/utils/output.ts` | ✅ Ready | JSON/table output |
| **Prompts** | `src/utils/prompts.ts` | ✅ Ready | Confirmation dialogs |
| **Formatters** | `src/core/formatters/*.ts` | ✅ Ready | Table/tree output |
| **Node.js crypto** | Built-in | ✅ Ready | `crypto.randomUUID()` for node IDs |

---

## Acceptance Criteria

### Command Functionality
- [ ] `n8n workflows diff <id> --operations @file.json` applies operations
- [ ] `n8n workflows diff <id> --dry-run` validates without applying (follows `create --dry-run` pattern)
- [ ] `n8n workflows diff <id> --continue-on-error` applies valid ops, reports failures
- [ ] `n8n workflows diff <id> --force` skips confirmation (follows `update --force` pattern)
- [ ] Backup created before mutation (unless `--no-backup`)
- [ ] Exit code 0 on success, 65 on validation error (follows POSIX pattern)

### Output Format (follows README.md JSON patterns)
- [ ] Default: Human-readable summary with operation count
- [ ] `--json`: `{ "success": true, "data": {...} }` or `{ "success": false, "error": {...} }`
- [ ] `-s, --save <path>`: Saves result workflow to file

### Error Handling (matches CLI error patterns)
- [ ] Invalid operation type → `{ "error": { "code": "INVALID_OPERATION", ... } }`
- [ ] Node not found → Lists available nodes with hint
- [ ] Connection already exists → Context with existing connection
- [ ] Validation failure → `correctUsage` showing valid schema (like `workflows validate`)

### Edge Cases
- [ ] Node rename auto-updates all connection references
- [ ] Special characters in node names handled (normalization)
- [ ] Empty operations array → no-op success
- [ ] Mixed valid/invalid operations in `--continue-on-error` mode

---

## Testing Requirements

### Unit Tests (`src/core/diff/*.test.ts`)

| Test Category | Test Cases |
|---------------|------------|
| **Operation Validation** | All 17 types: addNode, removeNode, updateNode, moveNode, enableNode, disableNode, addConnection, removeConnection, rewireConnection, cleanStaleConnections, replaceConnections, updateSettings, updateName, addTag, removeTag, activateWorkflow, deactivateWorkflow |
| **Connection References** | Node rename → all connections updated |
| **Smart Parameters** | `branch: "true"` → sourceIndex 0 for IF nodes; `case: 2` → sourceIndex 2 for Switch |
| **Name Normalization** | Special chars, unicode, leading/trailing whitespace |
| **Error Modes** | Atomic (fail-fast) vs best-effort (`--continue-on-error`) |

### Integration Tests

| Test | Command Pattern |
|------|-----------------|
| **Apply to live workflow** | `n8n workflows diff <id> --operations @test.json --json` |
| **Dry-run validation** | `n8n workflows diff <id> --operations @test.json --dry-run --json` |
| **Backup verification** | Check `~/.n8n-cli/backups/` after `--no-backup` vs default |
| **Multi-op batch** | 10+ operations in single request |
| **Error recovery** | Invalid op in middle of batch, verify partial apply in best-effort |

### Example Test Cases

```bash
# test: Apply addNode operation
echo '{"operations":[{"type":"addNode","node":{"name":"Test","type":"n8n-nodes-base.set","position":[400,300]}}]}' > /tmp/diff.json
n8n workflows diff abc123 --operations @/tmp/diff.json --dry-run --json
# expect: { "valid": true, "operations": [{ "index": 0, "type": "addNode", "status": "valid" }] }

# test: Error on missing node
echo '{"operations":[{"type":"removeNode","nodeName":"NonExistent"}]}' > /tmp/diff.json
n8n workflows diff abc123 --operations @/tmp/diff.json --json
# expect: exit code 65, { "success": false, "error": { "code": "NODE_NOT_FOUND", ... } }

# test: Continue on error mode
echo '{"operations":[{"type":"removeNode","nodeName":"Valid"},{"type":"removeNode","nodeName":"Invalid"}]}' > /tmp/diff.json
n8n workflows diff abc123 --operations @/tmp/diff.json --continue-on-error --json
# expect: { "success": true, "data": { "operationsApplied": 1, "operationsFailed": 1, ... } }
```

---

## Estimated Effort

| Component | File | Complexity | LOC | Time |
|-----------|------|------------|-----|------|
| **Command Handler** | `src/commands/workflows/diff.ts` | Medium | 150-200 | 0.5 days |
| **Diff Engine** | `src/core/diff/engine.ts` | High | 400-500 | 1.5 days |
| **Operation Validators** | `src/core/diff/validators.ts` | Medium | 150-200 | 0.5 days |
| **Node Sanitizer** | `src/core/diff/sanitizer.ts` | Medium | 200-250 | 0.5 days |
| **Exports** | `src/core/diff/index.ts` | Low | 20 | - |
| **CLI Registration** | `src/cli.ts` (modify) | Low | 5 | - |
| **Unit Tests** | `src/core/diff/*.test.ts` | Medium | 300-400 | 1 day |
| **Total** | | **High** | **~1,200-1,500** | **4 days** |

---

## Related Features

| Relationship | Feature | Impact |
|--------------|---------|--------|
| **Benefits From** | `02-P0 Workflow Versioning` | Rollback on diff failure |
| **Used By** | `04-P0 Advanced Autofix` | Autofix uses diff operations |
| **Used By** | `13-P2 Post-Update Validator` | Validates after diff application |
| **Integrates** | `src/commands/workflows/update.ts` | Alternative to full replacement |
| **Integrates** | `src/commands/workflows/autofix.ts` | Applies fixes as diff ops |

---

## Implementation Checklist

### Phase 1: Core Engine
- [ ] Create `src/core/diff/` directory structure
- [ ] Port `WorkflowDiffEngine` class from MCP
- [ ] Implement all 17 operation validators
- [ ] Implement all 17 operation appliers
- [ ] Port node sanitizer from MCP
- [ ] Unit tests for engine

### Phase 2: CLI Command
- [ ] Create `src/commands/workflows/diff.ts`
- [ ] Register in `src/cli.ts`
- [ ] Implement `@file.json` parsing (follow `credentials --data` pattern)
- [ ] Integrate with backup system
- [ ] Integrate with confirmation prompts
- [ ] JSON output following README patterns

### Phase 3: Documentation
- [ ] Update README.md with `workflows diff` command
- [ ] Add examples to README.md Agent Integration section
- [ ] Add to `--help` descriptions

---

## README.md Documentation to Add

```markdown
#### `workflows diff`

Apply incremental diff operations to a workflow.

\`\`\`bash
n8n workflows diff <id> [options]
\`\`\`

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --operations <json>` | Diff operations (JSON string or @file.json) | - |
| `--dry-run` | Validate without applying | `false` |
| `--continue-on-error` | Apply valid operations, report failures | `false` |
| `--force, --yes` | Skip confirmation prompts | - |
| `--no-backup` | Skip pre-mutation backup | - |
| `-s, --save <path>` | Save result workflow to file | - |
| `--json` | Output as JSON | - |

**Example:**
\`\`\`bash
# Add a node and connect it
n8n workflows diff abc123 --operations @diff.json --json

# Preview changes without applying
n8n workflows diff abc123 --operations @diff.json --dry-run
\`\`\`
```
