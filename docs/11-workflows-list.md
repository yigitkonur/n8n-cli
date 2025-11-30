# Command: n8n workflows list

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/workflows.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/services/n8n-api-client.ts` → `N8nApiClient.listWorkflows()` method

**Types:**
- `n8n-mcp/src/types/n8n-api.ts` → `WorkflowListParams`, `WorkflowListResponse`

**MCP Tool Doc:** `n8n-mcp/mcp-tools/014-n8n_list_workflows.md`

## CLI Command

```bash
n8n workflows list [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--limit, -l` | number | 10 | Display limit (0=unlimited) |
| `--active` | boolean | - | Filter by active status |
| `--tags` | string[] | - | Filter by tags (exact match) |
| `--project-id` | string | - | Filter by project (enterprise) |
| `--cursor` | string | - | Pagination cursor |
| `--exclude-pinned-data` | boolean | true | Exclude pinned data |
| `--save, -s` | string | - | Save ALL to JSON |

## Implementation

### 1. Read List Logic

From `n8n-mcp/src/mcp/tools/workflows.ts`:
- Workflow listing API call
- Pagination handling
- Filter application

From `n8n-mcp/src/api/n8n-client.ts`:
- GET /api/v1/workflows
- Query parameter building
- Response pagination

### 2. Output Format

**Terminal (Markdown):**
```
╭─ Workflows (showing 10 of 198 results)
│  💡 Tip: Use --save workflows.json for complete dataset
│  🔍 Filters: active=all, tags=all
╰─

| ID        | Name                  | Active | Nodes | Updated         |
|-----------|-----------------------|--------|-------|-----------------|
| wf-abc123 | Webhook to Slack      | ✓      | 5     | 2 hours ago     |
| wf-def456 | Data Sync Pipeline    | ✓      | 12    | 1 day ago       |
| wf-ghi789 | Email Processor       | ✗      | 8     | 3 days ago      |
...

📊 Summary: 198 workflows | 156 active (79%), 42 inactive (21%)

⚡ Next steps:
   n8n workflows get wf-abc123
   n8n workflows list --active true
   n8n workflows list --save all-workflows.json

💡 jq recipes (after --save):
   jq -r '.[] | select(.active) | .id' workflows.json
   jq -r '.[] | "\(.id)\t\(.name)"' workflows.json
```

**JSON (--save):**
```json
{
  "workflows": [
    {
      "id": "wf-abc123",
      "name": "Webhook to Slack",
      "active": true,
      "nodeCount": 5,
      "createdAt": "2025-11-28T10:00:00Z",
      "updatedAt": "2025-11-30T15:30:00Z",
      "tags": ["production", "api"]
    }
  ],
  "totalFound": 198,
  "hasMore": true,
  "nextCursor": "cursor-xyz"
}
```

## Files to Create

1. `src/commands/workflows/ListCommand.ts` - Clipanion command class
2. Add to `src/core/api/workflows.ts` - Workflow API operations

## Code Outline

```typescript
// src/commands/workflows/ListCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';
import { listWorkflows } from '../../core/api/workflows.js';
import { formatWorkflowsTable } from '../../core/formatters/markdown.js';
import { saveJson } from '../../core/formatters/json.js';

export class WorkflowsListCommand extends BaseCommand {
  static paths = [['workflows', 'list']];
  
  static usage = {
    description: 'List workflows from n8n instance',
    details: `
      Retrieve workflows with filtering and pagination.
      
      Examples:
        $ n8n workflows list
        $ n8n workflows list --active true
        $ n8n workflows list --tags production,api
        $ n8n workflows list --save workflows.json
    `,
    category: 'Workflow Management',
  };

  limit = Option.Number('-l,--limit', { default: 10 });
  active = Option.Boolean('--active');
  tags = Option.Array('--tags');
  projectId = Option.String('--project-id');
  cursor = Option.String('--cursor');
  excludePinnedData = Option.Boolean('--exclude-pinned-data', { default: true });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // 1. Call API using logic from n8n-mcp/src/mcp/tools/workflows.ts
    const results = await listWorkflows({
      active: this.active,
      tags: this.tags,
      projectId: this.projectId,
      cursor: this.cursor,
      limit: this.limit,
      excludePinnedData: this.excludePinnedData,
    });

    // 2. If --save, write ALL to JSON and exit
    if (this.save) {
      await saveJson(this.save, results);
      this.context.stdout.write(`✅ Saved ${results.workflows.length} workflows to ${this.save}\n`);
      return 0;
    }

    // 3. Otherwise, display truncated Markdown table
    const output = formatWorkflowsTable(results, { limit: this.limit });
    this.context.stdout.write(output);
    return 0;
  }
}
```

## API Integration (Steal from MCP)

Read `n8n-mcp/src/api/n8n-client.ts` for:
- `listWorkflows()` - GET /api/v1/workflows
- Query parameter handling
- Pagination cursor logic
- Response type definitions
