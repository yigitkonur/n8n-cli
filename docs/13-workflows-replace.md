# Command: n8n workflows replace

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/workflows.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/services/n8n-api-client.ts` → `N8nApiClient.updateWorkflow()` method (PUT request)
- `n8n-mcp/src/services/node-sanitizer.ts` → `sanitizeWorkflowNodes()` for pre-update cleanup
- `n8n-mcp/src/services/n8n-validation.ts` → `cleanWorkflowForUpdate()` function
- `n8n-mcp/src/services/workflow-versioning-service.ts` → Create backup before replace

**⚠️ Warning:** Full replacement deletes any nodes/connections not in the new JSON.
Prefer `n8n workflows update` (partial update) when possible.

**MCP Tool Doc:** `n8n-mcp/mcp-tools/011-n8n_update_full_workflow.md`

## CLI Command

```bash
n8n workflows replace <id> [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<id>` | positional | required | Workflow ID to replace |
| `--from-file, -f` | string | required | Complete workflow JSON file |
| `--intent` | string | - | Reason for replacement (ALWAYS provide) |
| `--validate-first` | boolean | true | Validate before replacing |
| `--dry-run` | boolean | true | Preview only (DEFAULT) |
| `--confirm-with` | string | - | Confirmation phrase to execute |
| `--save, -s` | string | - | Save result to JSON |

## Important Design Decisions

1. **Default is DRY-RUN** - Must provide `--confirm-with` to actually replace
2. **Always validate first** - `--validate-first` defaults to true
3. **Intent required** - Must describe why replacing entire workflow
4. **DESTRUCTIVE** - Missing nodes/connections are DELETED

## ⚠️ WARNING

This command **replaces the ENTIRE workflow**. Any nodes or connections not in the provided JSON will be **permanently deleted**.

**Prefer `n8n workflows update`** for targeted changes. Only use `replace` when:
- Major restructuring of workflow
- Restoring from backup
- Migrating from another system

## Implementation

### 1. Read Replace Logic

From `n8n-mcp/src/mcp/tools/workflows.ts`:
- Full workflow update API
- Validation before replace
- Response handling

From `n8n-mcp/src/api/n8n-client.ts`:
- PUT /api/v1/workflows/:id
- Complete workflow payload

### 2. Output Format

**Terminal (dry-run - default):**
```
⚠️  PREVIEW: Replace workflow wf-abc123 (DRY RUN)

Intent: "Restore from backup after failed migration"

╭─ Current Workflow
╰─
Name: "Webhook to Slack"
Nodes: 5
Active: Yes

╭─ Replacement Workflow
╰─
File: backup-workflow.json (8.2KB)
Nodes: 4

╭─ Changes Preview
╰─

NODES REMOVED (1):
  ❌ "Debug Logger" (n8n-nodes-base.set) - WILL BE DELETED

NODES ADDED (0):
  (none)

NODES MODIFIED (2):
  📝 "HTTP Request" - URL changed
  📝 "Slack" - Channel changed

CONNECTIONS CHANGED:
  ❌ Removed: Set → Debug Logger
  ✓ Kept: Webhook → Set → HTTP Request → Slack

Validation:
  ✓ Replacement workflow is valid
  ⚠️  1 node will be permanently deleted

⚠️  DESTRUCTIVE OPERATION
    This will DELETE nodes/connections not in the replacement file.
    
⚠️  To replace, run:
    n8n workflows replace wf-abc123 --from-file backup.json --intent "Restore backup" --confirm-with "REPLACE WEBHOOK WORKFLOW"

💡 Prefer targeted updates:
   n8n workflows update wf-abc123 --from-file ops.json --intent "..."
```

**Terminal (after --confirm-with):**
```
🔄 Workflow Replaced Successfully

╭─ Updated Workflow
╰─

ID: wf-abc123
Name: "Webhook to Slack"
Nodes: 4 (was 5)
Active: Yes

Changes Applied:
  • Removed 1 node
  • Modified 2 nodes
  • Updated connections

⚠️  Remember to verify the workflow:
   n8n workflows validate --id wf-abc123
   n8n workflows get wf-abc123

💡 If this was a mistake, restore from version:
   n8n workflows versions list --workflow-id wf-abc123
   n8n workflows versions rollback --workflow-id wf-abc123 --version-id <previous>
```

## Files to Create

1. `src/commands/workflows/ReplaceCommand.ts` - Clipanion command
2. Add to `src/core/api/workflows.ts` - Full update API

## Code Outline

```typescript
// src/commands/workflows/ReplaceCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class WorkflowsReplaceCommand extends BaseCommand {
  static paths = [['workflows', 'replace']];
  
  static usage = {
    description: 'Replace entire workflow with new definition',
    details: `
      ⚠️  DESTRUCTIVE: Replaces the entire workflow.
      Missing nodes/connections are permanently deleted.
      
      Default: PREVIEW mode (dry-run).
      
      ⚠️  Prefer n8n workflows update for targeted changes!
      
      Examples:
        $ n8n workflows replace wf-abc123 --from-file backup.json --intent "Restore backup"
        $ n8n workflows replace wf-abc123 --from-file new.json --intent "Major restructure" --confirm-with "REPLACE MY WORKFLOW"
    `,
    category: 'Workflow Management',
  };

  id = Option.String({ required: true });
  fromFile = Option.String('-f,--from-file', { required: true });
  intent = Option.String('--intent');
  validateFirst = Option.Boolean('--validate-first', { default: true });
  dryRun = Option.Boolean('--dry-run', { default: true });
  confirmWith = Option.String('--confirm-with');
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Always warn about destructive nature
    if (!this.intent) {
      this.context.stderr.write('⚠️  Warning: Consider providing --intent to document this change\n\n');
    }

    const isPreview = !this.confirmWith || this.dryRun;

    if (isPreview) {
      // Show detailed diff preview
      return 0;
    }

    // Validate confirmation phrase matches expected pattern
    // Read replace logic from n8n-mcp/src/mcp/tools/workflows.ts
    return 0;
  }
}
```

## When to Use Replace vs Update

| Scenario | Command |
|----------|---------|
| Add/modify a few nodes | `n8n workflows update` |
| Change node settings | `n8n workflows update` |
| Add/remove connections | `n8n workflows update` |
| Major workflow restructure | `n8n workflows replace` |
| Restore from backup | `n8n workflows replace` |
| Import from another system | `n8n workflows replace` |

## API Integration (Steal from MCP)

Read `n8n-mcp/src/api/n8n-client.ts` for:
- `updateFullWorkflow()` - PUT /api/v1/workflows/:id
- Complete workflow payload structure
- Version snapshot before replace
