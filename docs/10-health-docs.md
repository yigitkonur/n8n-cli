# Commands: n8n health & n8n docs

## n8n health

### MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/health.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/services/n8n-api-client.ts` → `N8nApiClient.healthCheck()` method (lines 87-100)

**Error handling:**
- `n8n-mcp/src/utils/n8n-errors.ts` → Error classes for connection failures

**MCP Tool Doc:** `n8n-mcp/mcp-tools/008-n8n_health_check.md`

### CLI Command

```bash
n8n health [check] [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--mode, -m` | string | status | Mode: status, diagnostic |
| `--verbose, -v` | boolean | false | Extra details in diagnostic mode |
| `--save, -s` | string | - | Save diagnostics to JSON |

### Output Format

**Status Mode:**
```
🏥 n8n Health Check

Status: ✅ HEALTHY
API Response: 156ms
n8n Version: 1.28.0

💡 System is ready.
```

**Diagnostic Mode:**
```
🏥 n8n System Health Check

╭─ API Connectivity
╰─
Status: ✅ HEALTHY
Endpoint: https://n8n.example.com
Response time: 156ms

╭─ System Information
╰─
n8n Version: 1.28.0
Instance ID: inst-abc123
Database: PostgreSQL (connected ✓)
Queue: Redis (enabled ✓)

╭─ Performance Metrics
╰─
API Response (avg): 145ms
Active Workflows: 198
Pending Executions: 12

💡 Next steps:
   n8n workflows list --limit 5
```

### Files to Create

1. `src/commands/health/CheckCommand.ts` - Health command
2. `src/core/api/health.ts` - Health check operations

---

## n8n docs

### MCP Source Reference

**Read from:** `n8n-mcp/src/mcp/tools/docs.ts` → `getToolsDocumentation()` function
**MCP Doc:** `n8n-mcp/mcp-tools/001-tools_documentation.md`

### CLI Command

```bash
n8n docs [topic] [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `[topic]` | positional | overview | Topic name (e.g., workflows-create) |
| `--depth` | string | essentials | Depth: essentials, full |
| `--save, -s` | string | - | Save docs to JSON |

### Topics

```
overview - General guide
nodes - Node commands
templates - Template commands  
workflows - Workflow commands
workflows-create - Create workflow
workflows-update - Update workflow
workflows-validate - Validate workflow
workflows-autofix - Auto-fix workflow
executions - Execution commands
health - Health check
```

### Output Format

```
╭─ n8n CLI Documentation: workflows create
│  📚 Category: Workflow Management
│  ⚡ Criticality: CRITICAL
╰─

DESCRIPTION
    Create new workflow from JSON file.

USAGE
    n8n workflows create --from-file <path> [options]

OPTIONS
    --from-file PATH       Workflow JSON file (required)
    --validate-first       Auto-validate (default: true)
    --dry-run             Preview only (DEFAULT)
    --confirm-with TEXT   Confirmation phrase

EXAMPLES
    $ n8n workflows create --from-file workflow.json
    $ n8n workflows create --from-file workflow.json --confirm-with "CREATE"

SEE ALSO
    n8n workflows validate
    n8n workflows list
```

### Files to Create

1. `src/commands/docs/DocsCommand.ts` - Docs command
2. `src/core/docs/topics.ts` - Documentation content

### Code Outline

```typescript
// src/commands/docs/DocsCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class DocsCommand extends BaseCommand {
  static paths = [['docs']];
  
  static usage = {
    description: 'View CLI documentation',
    details: `
      Get comprehensive help for n8n CLI commands.
      
      Topics:
        overview - General guide
        nodes - Node commands
        workflows - Workflow commands
        executions - Execution commands
      
      Examples:
        $ n8n docs
        $ n8n docs workflows-create
        $ n8n docs workflows-create --depth full
    `,
    category: 'Help',
  };

  topic = Option.String({ default: 'overview' });
  depth = Option.String('--depth', { default: 'essentials' });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Read from embedded documentation or n8n-mcp/src/mcp/tools/docs.ts
    return 0;
  }
}
```
