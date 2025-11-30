# Command: n8n workflows create

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/workflows.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/services/n8n-api-client.ts` (530 lines) → `N8nApiClient.createWorkflow()` method
- `n8n-mcp/src/services/node-sanitizer.ts` (362 lines) → Pre-create sanitization (IF v2.2+, Switch v3.2+)
- `n8n-mcp/src/services/n8n-validation.ts` (28KB) → `cleanWorkflowForCreate()` function

**Validation (call before create):**
- `n8n-mcp/src/services/workflow-validator.ts` (1872 lines) → `WorkflowValidator.validateWorkflow()`

**Types:**
- `n8n-mcp/src/types/n8n-api.ts` → `Workflow`, `WorkflowInput` interfaces

**MCP Tool Doc:** `n8n-mcp/mcp-tools/009-n8n_create_workflow.md`

## CLI Command

```bash
n8n workflows create [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--from-file, -f` | string | required | Path to workflow JSON file |
| `--validate-first` | boolean | true | Auto-validate before creating |
| `--dry-run` | boolean | true | Preview only (DEFAULT) |
| `--confirm-with` | string | - | Confirmation phrase to execute |
| `--save, -s` | string | - | Save created workflow details to JSON |

## Important Design Decisions

1. **Default is DRY-RUN** - Must provide `--confirm-with` to actually create
2. **Always validate first** - `--validate-first` defaults to true
3. **No inline JSON** - Only file-based for safety
4. **Created INACTIVE** - User must activate in n8n UI

## Implementation

### 1. Read Create Logic

From `n8n-mcp/src/mcp/tools/workflows.ts`:
- Workflow JSON parsing
- Auto-sanitization logic
- n8n API integration

From `n8n-mcp/src/api/n8n-client.ts`:
- HTTP POST to /workflows
- Authentication
- Error handling

### 2. Output Format

**Terminal (dry-run - default):**
```
📝 PREVIEW: Create workflow (DRY RUN - no changes)

File: new-workflow.json (5.2KB)
Format: Valid JSON ✓

╭─ Workflow to be created
╰─

Name: "Webhook to Slack Notification"
Nodes: 5
Connections: 4
Tags: production, api

Nodes:
  • Webhook (n8n-nodes-base.webhook v2.1)
    └─ Trigger: POST /test-webhook
  • HTTP Request (n8n-nodes-base.httpRequest v4.2)
  • Set (n8n-nodes-base.set v3.3)
  • Slack (n8n-nodes-base.slack v2.1)
  • Error Handler (n8n-nodes-base.noOp v1.0)

Validation:
  ✓ All nodes valid
  ✓ All connections valid
  ⚠️  Credentials are placeholders
  ⚠️  Workflow will be created INACTIVE

⚠️  To create, run:
    n8n workflows create --from-file new-workflow.json --confirm-with "CREATE WEBHOOK WORKFLOW"

💡 Before creating:
   n8n workflows validate --from-file new-workflow.json
```

**Terminal (after --confirm-with):**
```
🚀 Workflow Created Successfully

╭─ Created Workflow
╰─

ID: wf-xyz789
Name: "Webhook to Slack Notification"
Status: INACTIVE
Created: 2025-11-30 15:42:18 PST

Nodes: 5
Connections: 4

⚠️  Workflow is INACTIVE
    Activate in n8n UI: https://n8n.example.com/workflow/wf-xyz789

💡 Next steps:
   n8n workflows get wf-xyz789
   n8n workflows validate --id wf-xyz789
   n8n workflows list --limit 5
```

## Files to Create

1. `src/commands/workflows/CreateCommand.ts` - Clipanion command
2. `src/core/api/workflows.ts` - Workflow API operations

## Code Outline

```typescript
// src/commands/workflows/CreateCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class WorkflowsCreateCommand extends BaseCommand {
  static paths = [['workflows', 'create']];
  
  static usage = {
    description: 'Create new workflow from JSON file',
    details: `
      Creates workflow in INACTIVE state.
      Default: PREVIEW mode (dry-run).
      
      ⚠️  CRITICAL: Always validate first!
      
      Examples:
        $ n8n workflows create --from-file workflow.json
        $ n8n workflows create --from-file workflow.json --confirm-with "CREATE MY WORKFLOW"
        $ n8n workflows create --from-file workflow.json --save created.json --confirm-with "..."
    `,
    category: 'Workflow Management',
  };

  fromFile = Option.String('-f,--from-file', { required: true });
  validateFirst = Option.Boolean('--validate-first', { default: true });
  dryRun = Option.Boolean('--dry-run', { default: true });
  confirmWith = Option.String('--confirm-with');
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // If no --confirm-with, default to dry-run
    const isPreview = !this.confirmWith || this.dryRun;

    if (isPreview) {
      // Show preview
      return 0;
    }

    // Validate confirmation phrase
    // Read create logic from n8n-mcp/src/mcp/tools/workflows.ts
    return 0;
  }
}
```

## API Integration (Steal from MCP)

Read `n8n-mcp/src/api/n8n-client.ts` for:
- `createWorkflow()` - POST /api/v1/workflows
- Request/response types
- Error handling
- Auto-sanitization before sending
