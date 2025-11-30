# Command: n8n workflows trigger

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/workflows.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/services/n8n-api-client.ts` → HTTP POST/GET to webhook URL
- Uses standard `axios` for HTTP requests (not the n8n API)

**Security (CRITICAL):**
- `n8n-mcp/src/utils/ssrf-protection.ts` (188 lines) → `SSRFProtection.validateWebhookUrl()`
  - Blocks localhost (in strict/moderate modes)
  - Blocks private IP ranges (10.x, 192.168.x, 172.16-31.x)
  - Blocks cloud metadata endpoints (169.254.169.254, etc.)
  - Uses DNS resolution to prevent DNS rebinding attacks

**MCP Tool Doc:** `n8n-mcp/mcp-tools/017-n8n_trigger_webhook_workflow.md`

## CLI Command

```bash
n8n workflows trigger <webhookUrl> [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<webhookUrl>` | positional | required | Full webhook URL |
| `--method, -m` | string | POST | HTTP method: GET, POST, PUT, DELETE |
| `--data, -d` | string | - | Request body JSON (string or @file) |
| `--headers` | string | - | Custom headers JSON |
| `--wait-for-response` | boolean | true | Wait for workflow completion |
| `--timeout` | number | 30 | Response timeout in seconds |
| `--save, -s` | string | - | Save execution result to JSON |

## Prerequisites

1. **Workflow must be ACTIVE** - Inactive webhooks return 404
2. **HTTP method must match** - Webhook node configuration
3. **Path must be correct** - From webhook node settings

## Implementation

### 1. Read Trigger Logic

From `n8n-mcp/src/mcp/tools/workflows.ts`:
- Webhook URL validation
- HTTP request construction
- Response handling

### 2. Output Format

**Terminal (success):**
```
🚀 Triggering webhook...

URL: https://n8n.example.com/webhook/abc-123-xyz
Method: POST
Body: {"event": "test", "data": {...}}

╭─ Execution Result
╰─

Status: ✅ SUCCESS
Duration: 1.234s
Execution ID: exec-abc123

Response:
{
  "success": true,
  "message": "Notification sent",
  "timestamp": "2025-11-30T15:45:00Z"
}

💡 Next steps:
   n8n executions get exec-abc123 --mode summary
   n8n workflows trigger <url> --data @payload.json
```

**Terminal (error):**
```
🚀 Triggering webhook...

URL: https://n8n.example.com/webhook/abc-123-xyz
Method: POST

╭─ Execution Result
╰─

Status: ❌ FAILED
Duration: 0.856s
Execution ID: exec-def456

Error: Workflow execution failed
  Node: HTTP Request
  Message: ECONNREFUSED - Connection refused

💡 Debug:
   n8n executions get exec-def456 --mode summary
   n8n workflows validate --id <workflow-id>
```

**Terminal (webhook not found):**
```
❌ Webhook not found or not active

URL: https://n8n.example.com/webhook/abc-123-xyz
Status: 404 Not Found

Possible causes:
  • Webhook path is incorrect
  • Workflow is not active
  • Webhook node was removed

💡 To check:
   n8n workflows list --active true
   n8n workflows get <workflow-id>
```

## Data Input Formats

### Inline JSON
```bash
n8n workflows trigger <url> --data '{"event": "test"}'
```

### From File
```bash
n8n workflows trigger <url> --data @payload.json
```

### With Headers
```bash
n8n workflows trigger <url> \
  --data '{"event": "test"}' \
  --headers '{"X-Custom-Header": "value"}'
```

## Files to Create

1. `src/commands/workflows/TriggerCommand.ts` - Clipanion command
2. Add to `src/core/api/workflows.ts` - Webhook trigger logic

## Code Outline

```typescript
// src/commands/workflows/TriggerCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';
import { triggerWebhook } from '../../core/api/workflows.js';
import { readFile } from '../../core/utils/file.js';

export class WorkflowsTriggerCommand extends BaseCommand {
  static paths = [['workflows', 'trigger']];
  
  static usage = {
    description: 'Trigger workflow via webhook',
    details: `
      Execute workflows that have a Webhook trigger node.
      Workflow must be ACTIVE with matching HTTP method.
      
      Data formats:
        --data '{"key": "value"}'       # Inline JSON
        --data @payload.json            # From file
      
      Examples:
        $ n8n workflows trigger https://n8n.example.com/webhook/abc
        $ n8n workflows trigger <url> --method GET
        $ n8n workflows trigger <url> --data '{"event": "test"}'
        $ n8n workflows trigger <url> --data @payload.json
        $ n8n workflows trigger <url> --save result.json
    `,
    category: 'Execution',
  };

  webhookUrl = Option.String({ required: true });
  method = Option.String('-m,--method', { default: 'POST' });
  data = Option.String('-d,--data');
  headers = Option.String('--headers');
  waitForResponse = Option.Boolean('--wait-for-response', { default: true });
  timeout = Option.Number('--timeout', { default: 30 });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Parse data - check for @file syntax
    let payload = {};
    if (this.data) {
      if (this.data.startsWith('@')) {
        const filePath = this.data.slice(1);
        const content = await readFile(filePath);
        payload = JSON.parse(content);
      } else {
        payload = JSON.parse(this.data);
      }
    }

    // Parse headers
    const headers = this.headers ? JSON.parse(this.headers) : {};

    // Trigger webhook using logic from n8n-mcp/src/mcp/tools/workflows.ts
    const result = await triggerWebhook({
      url: this.webhookUrl,
      method: this.method,
      data: payload,
      headers,
      waitForResponse: this.waitForResponse,
      timeout: this.timeout,
    });

    // Output result
    return 0;
  }
}
```

## HTTP Method Matching

The HTTP method must match what's configured in the Webhook node:

| Webhook Config | Valid CLI Methods |
|----------------|-------------------|
| GET | `--method GET` |
| POST | `--method POST` (default) |
| PUT | `--method PUT` |
| DELETE | `--method DELETE` |
| All Methods | Any of the above |

## API Integration (Steal from MCP)

Read `n8n-mcp/src/mcp/tools/workflows.ts` for:
- `triggerWebhookWorkflow()` - HTTP request logic
- Response type handling
- Timeout management
- Wait vs no-wait execution
