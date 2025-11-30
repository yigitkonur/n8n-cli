# Commands: n8n templates

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/templates.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/templates/template-repository.ts` (948 lines) → `TemplateRepository` class with FTS5 search
- `n8n-mcp/src/templates/template-service.ts` (13KB) → Higher-level template logic

**Database:**
- `n8n-mcp/data/nodes.db` → templates table with FTS5 virtual table (templates_fts)

**Utilities:**
- `n8n-mcp/src/utils/template-sanitizer.ts` (5KB) → Clean template data
- `n8n-mcp/src/utils/template-node-resolver.ts` (9.2KB) → Resolve node types in templates

**MCP Tool Docs:** 
- `n8n-mcp/mcp-tools/006-search_templates.md`
- `n8n-mcp/mcp-tools/007-get_template.md`

## CLI Commands

### n8n templates search

```bash
n8n templates search <query> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<query>` | positional | - | Search terms (optional for some modes) |
| `--mode` | string | keyword | Mode: keyword, by_nodes, by_task, by_metadata |
| `--node-types` | string[] | - | For mode=by_nodes |
| `--task` | string | - | For mode=by_task |
| `--category` | string | - | Filter by category |
| `--complexity` | string | - | Filter: beginner, intermediate, advanced |
| `--limit, -l` | number | 10 | Display limit |
| `--save, -s` | string | - | Save ALL to JSON |

### n8n templates get

```bash
n8n templates get <templateId> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<templateId>` | positional | required | Template ID from search |
| `--mode` | string | full | Mode: nodes_only, structure, full |
| `--save, -s` | string | - | Save workflow JSON to file |

## Search Modes

| Mode | Description | Query Required |
|------|-------------|----------------|
| `keyword` | Full-text search | Yes |
| `by_nodes` | Find templates using specific nodes | No (use --node-types) |
| `by_task` | Find by task type | No (use --task) |
| `by_metadata` | Filter by metadata fields | No |

## Task Types

Available task types for `--task`:
- `webhook_processing` - Handle webhooks
- `data_transformation` - Transform data
- `api_integration` - Connect APIs
- `notification` - Send notifications
- `scheduling` - Scheduled tasks
- `error_handling` - Error workflows
- `file_processing` - File operations
- `database_operations` - DB queries
- `ai_automation` - AI/ML tasks

## Output Formats

**Search Terminal:**
```
╭─ Templates matching "slack notification" (showing 10 of 124)
│  🔍 Mode: keyword | Category: all
╰─

| ID   | Name                     | Nodes | Views | Complexity   |
|------|--------------------------|-------|-------|--------------|
| 1234 | Webhook to Slack         | 3     | 12.5K | beginner     |
| 1235 | GitHub to Slack Notifier | 5     | 8.2K  | intermediate |

📊 Summary: 124 templates found | 10 displayed

💡 Next steps:
   n8n templates get 1234 --mode full
   n8n templates get 1234 --save template-1234.json
```

**Get Terminal:**
```
╭─ Template: Webhook to Slack Notification
│  📦 ID: 1234
│  👤 Author: n8n-team (verified ✓)
│  👁️  Views: 12,547
╰─

DESCRIPTION
    Receives webhook requests and posts to Slack.

NODES (3)
    • Webhook (n8n-nodes-base.webhook v2.1)
    • Set (n8n-nodes-base.set v3.3)
    • Slack (n8n-nodes-base.slack v2.1)

USE CASES
    • GitHub notifications
    • Form submission alerts

💡 Next steps:
   n8n templates get 1234 --save webhook-slack.json
   n8n workflows create --from-file webhook-slack.json --dry-run
```

## Files to Create

1. `src/commands/templates/SearchCommand.ts` - Search templates
2. `src/commands/templates/GetCommand.ts` - Get template
3. `src/core/db/templates.ts` - Template database queries

## Code Outline

```typescript
// src/commands/templates/SearchCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class TemplatesSearchCommand extends BaseCommand {
  static paths = [['templates', 'search']];
  
  static usage = {
    description: 'Search workflow templates',
    details: `
      Find real-world workflow examples from 2,700+ templates.
      
      Examples:
        $ n8n templates search "slack notification"
        $ n8n templates search --mode by_nodes --node-types '["n8n-nodes-base.slack"]'
        $ n8n templates search --mode by_task --task webhook_processing
        $ n8n templates search --complexity beginner --save templates.json
    `,
    category: 'Discovery',
  };

  query = Option.String();
  mode = Option.String('--mode', { default: 'keyword' });
  nodeTypes = Option.Array('--node-types');
  task = Option.String('--task');
  category = Option.String('--category');
  complexity = Option.String('--complexity');
  limit = Option.Number('-l,--limit', { default: 10 });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Read from n8n-mcp/src/mcp/tools/templates.ts
    return 0;
  }
}
```
