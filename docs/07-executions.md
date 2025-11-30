# Commands: n8n executions

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/executions.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/services/n8n-api-client.ts` (530 lines) → `N8nApiClient.listExecutions()`, `getExecution()`, `deleteExecution()`
- `n8n-mcp/src/services/execution-processor.ts` (520 lines) → Mode handling (preview/summary/filtered/full)

**Key functions in execution-processor.ts:**
- `extractStructure()` - Extract JSON schema-like structure for preview mode
- `estimateDataSize()` - Size estimation in KB
- Smart recommendations for retrieval strategy

**Types:**
- `n8n-mcp/src/types/n8n-api.ts` → `Execution`, `ExecutionListParams`, `ExecutionListResponse`, `ExecutionMode`

**MCP Tool Doc:** `n8n-mcp/mcp-tools/018-n8n_executions.md`

## CLI Commands

### n8n executions list

```bash
n8n executions list [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--workflow-id` | string | - | Filter by workflow |
| `--status` | string | - | Filter: success, error, waiting, running |
| `--limit, -l` | number | 10 | Display limit |
| `--cursor` | string | - | Pagination cursor |
| `--include-data` | boolean | false | Include execution data |
| `--save, -s` | string | - | Save ALL to JSON |

### n8n executions get

```bash
n8n executions get <id> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<id>` | positional | required | Execution ID |
| `--mode, -m` | string | summary | Mode: preview, summary, filtered, full |
| `--node-names` | string[] | - | Filter to specific nodes (mode=filtered) |
| `--items-limit` | number | 2 | Items per node (mode=filtered) |
| `--include-input-data` | boolean | false | Include input data |
| `--save, -s` | string | - | Save to JSON |

### n8n executions delete

```bash
n8n executions delete <id> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<id>` | positional | required | Execution ID |
| `--confirm` | boolean | false | Confirm deletion |

## Detail Modes

| Mode | Content | Response Time | Use Case |
|------|---------|---------------|----------|
| `preview` | Structure only | ~30ms | Quick error check |
| `summary` | 2 items/node | ~50ms | Debugging (DEFAULT) |
| `filtered` | Custom items | ~50-100ms | Large workflows |
| `full` | All data | ~100-500ms | Complete analysis |

## Output Formats

**List Terminal:**
```
╭─ Executions (showing 10 of 1,247 results)
│  🔍 Filters: workflow=all, status=all
╰─

| ID       | Workflow         | Status | Started   | Duration |
|----------|------------------|--------|-----------|----------|
| exec-001 | Webhook to Slack | ✓      | 5 min ago | 1.2s     |
| exec-002 | Data Sync        | ✓      | 15 min ago| 3.5s     |
| exec-003 | Email Processor  | ❌     | 1h ago    | 0.5s     |

📊 Summary: 1,247 total | 1,198 success (96%), 49 failed (4%)

💡 Next steps:
   n8n executions get exec-003 --mode summary
   n8n executions list --status error
```

**Get Terminal (error):**
```
🐛 Execution Details: exec-abc123

Workflow: "Webhook to Slack" (wf-abc123)
Status: ❌ ERROR
Duration: 0.856s

╭─ Execution Flow
╰─

1. ✓ Webhook (0.012s)
   Output: {"payload": {"test": true}}

2. ❌ HTTP Request (0.844s) - FAILED
   Error: ECONNREFUSED - Connection refused
   
   Details:
     • Target: https://api.example.com/data
     • Method: GET
   
   Likely causes:
     • API server is down
     • Network connectivity issue

3. ⊘ Set - Not executed
4. ⊘ Slack - Not executed

💡 Debug steps:
   curl https://api.example.com/data
   n8n executions get exec-abc123 --mode full
```

## Files to Create

1. `src/commands/executions/ListCommand.ts` - List executions
2. `src/commands/executions/GetCommand.ts` - Get execution details
3. `src/commands/executions/DeleteCommand.ts` - Delete execution
4. `src/core/api/executions.ts` - Execution API operations

## Code Outline

```typescript
// src/commands/executions/ListCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class ExecutionsListCommand extends BaseCommand {
  static paths = [['executions', 'list']];
  
  static usage = {
    description: 'List workflow executions',
    details: `
      View execution history with filtering.
      
      Examples:
        $ n8n executions list
        $ n8n executions list --workflow-id abc123 --status error
        $ n8n executions list --save executions.json
    `,
    category: 'Debugging',
  };

  workflowId = Option.String('--workflow-id');
  status = Option.String('--status');
  limit = Option.Number('-l,--limit', { default: 10 });
  cursor = Option.String('--cursor');
  includeData = Option.Boolean('--include-data', { default: false });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Read from n8n-mcp/src/mcp/tools/executions.ts
    return 0;
  }
}
```

## Debugging Flow

Recommended pattern:

```bash
# 1. List recent errors
n8n executions list --workflow-id xxx --status error --limit 5

# 2. Quick error preview
n8n executions get exec-id --mode preview

# 3. More detail if needed
n8n executions get exec-id --mode summary

# 4. Full data if necessary
n8n executions get exec-id --mode full --save debug.json
```
