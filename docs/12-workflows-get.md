# Command: n8n workflows get

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/workflows.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/services/n8n-api-client.ts` → `N8nApiClient.getWorkflow()` method

**Mode handling (minimal/structure/full/details):**
- Modes are implemented in the MCP tool layer, not in the API client
- For CLI, filter the API response based on mode

**Types:**
- `n8n-mcp/src/types/n8n-api.ts` → `Workflow` interface

**MCP Tool Doc:** `n8n-mcp/mcp-tools/010-n8n_get_workflow.md`

## CLI Command

```bash
n8n workflows get <id> [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<id>` | positional | required | Workflow ID |
| `--mode, -m` | string | full | Mode: minimal, structure, full, details |
| `--save, -s` | string | - | Save workflow to JSON |

## Detail Modes

| Mode | Content | Use Case |
|------|---------|----------|
| `minimal` | id, name, active, tags | Quick list/filtering |
| `structure` | nodes/connections topology | Workflow graph analysis |
| `full` | Complete workflow | Export/backup (DEFAULT) |
| `details` | full + execution stats | Debug & analysis |

## Implementation

### 1. Read Get Logic

From `n8n-mcp/src/mcp/tools/workflows.ts`:
- Workflow retrieval by ID
- Mode-based response shaping

From `n8n-mcp/src/api/n8n-client.ts`:
- GET /api/v1/workflows/:id
- Response transformation

### 2. Output Format

**Terminal (mode=full - default):**
```
╭─ Workflow: Webhook to Slack
│  📦 ID: wf-abc123
│  ⚡ Status: ACTIVE
│  📅 Updated: 2 hours ago
╰─

OVERVIEW
    Name: Webhook to Slack
    Active: Yes
    Nodes: 5
    Connections: 4
    Tags: production, api

NODES
    1. Webhook (n8n-nodes-base.webhook v2.1)
       └─ Trigger: POST /webhook-abc123
    
    2. Set (n8n-nodes-base.set v3.3)
       └─ Transform incoming data
    
    3. IF (n8n-nodes-base.if v2.1)
       └─ Check status field
    
    4. Slack (n8n-nodes-base.slack v2.1)
       └─ Post to #notifications
    
    5. NoOp (n8n-nodes-base.noOp v1.0)
       └─ Error handler

CONNECTIONS
    Webhook → Set → IF
                    ├─ true → Slack
                    └─ false → NoOp

💡 Next steps:
   n8n workflows get wf-abc123 --save workflow.json
   n8n workflows validate --id wf-abc123
   n8n executions list --workflow-id wf-abc123

💡 jq recipes (after --save):
   jq '.nodes[].name' workflow.json
   jq '.nodes[] | {name, type}' workflow.json
```

**Terminal (mode=structure):**
```
╭─ Workflow Structure: wf-abc123
╰─

Nodes (5):
  • Webhook → Set → IF → Slack
                    └─→ NoOp

Connections:
  Webhook[main:0] → Set[main:0]
  Set[main:0] → IF[main:0]
  IF[main:0] → Slack[main:0]
  IF[main:1] → NoOp[main:0]
```

**Terminal (mode=details):**
```
╭─ Workflow Details: Webhook to Slack
╰─

... (same as full) ...

EXECUTION STATS
    Total executions: 1,247
    Last 24h: 156
    Success rate: 96.2%
    Avg duration: 1.23s
    Last run: 5 minutes ago (✓ success)
```

**JSON (--save):**
Complete workflow JSON as returned by n8n API.

## Files to Create

1. `src/commands/workflows/GetCommand.ts` - Clipanion command class
2. Add to `src/core/api/workflows.ts` - Workflow API operations

## Code Outline

```typescript
// src/commands/workflows/GetCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';
import { getWorkflow } from '../../core/api/workflows.js';
import { formatWorkflowDetail } from '../../core/formatters/markdown.js';
import { saveJson } from '../../core/formatters/json.js';

export class WorkflowsGetCommand extends BaseCommand {
  static paths = [['workflows', 'get']];
  
  static usage = {
    description: 'Get workflow by ID with different detail levels',
    details: `
      Retrieve comprehensive workflow information.
      
      Modes:
        minimal - Metadata only (id, name, active, tags)
        structure - Nodes and connections topology
        full - Complete workflow (DEFAULT)
        details - Full workflow + execution statistics
      
      Examples:
        $ n8n workflows get wf-abc123
        $ n8n workflows get wf-abc123 --mode structure
        $ n8n workflows get wf-abc123 --mode details
        $ n8n workflows get wf-abc123 --save workflow.json
    `,
    category: 'Workflow Management',
  };

  id = Option.String({ required: true });
  mode = Option.String('-m,--mode', { default: 'full' });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // 1. Get workflow using logic from n8n-mcp/src/mcp/tools/workflows.ts
    const workflow = await getWorkflow(this.id, { mode: this.mode });

    // 2. If --save, write to JSON and exit
    if (this.save) {
      await saveJson(this.save, workflow);
      this.context.stdout.write(`✅ Saved workflow to ${this.save}\n`);
      return 0;
    }

    // 3. Otherwise, display formatted output
    const output = formatWorkflowDetail(workflow, { mode: this.mode });
    this.context.stdout.write(output);
    return 0;
  }
}
```

## API Integration (Steal from MCP)

Read `n8n-mcp/src/api/n8n-client.ts` for:
- `getWorkflow()` - GET /api/v1/workflows/:id
- Mode-based response transformation
- Execution stats fetching (for mode=details)
