# Command: n8n nodes search

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/nodes.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/database/node-repository.ts` (962 lines) → `NodeRepository.searchNodes()` method
- `n8n-mcp/src/services/node-similarity-service.ts` (17.6KB) → `NodeSimilarityService.findSimilarNodes()` for relevance scoring

**Database:**
- `n8n-mcp/data/nodes.db` → Copy directly (500+ nodes pre-indexed)
- `n8n-mcp/src/database/database-adapter.ts` (16KB) → SQLite wrapper with FTS5 support

**Utilities:**
- `n8n-mcp/src/utils/node-type-normalizer.ts` (7.2KB) → Normalize "webhook" → "n8n-nodes-base.webhook"

**MCP Tool Doc:** `n8n-mcp/mcp-tools/002-search_nodes.md`

## CLI Command

```bash
n8n nodes search <query> [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<query>` | positional | required | Search terms |
| `--limit, -l` | number | 10 | Display limit (0=unlimited) |
| `--mode, -m` | string | OR | Search mode: OR, AND, FUZZY |
| `--include-examples` | boolean | false | Include template examples |
| `--save, -s` | string | - | Save ALL results to JSON file |

## Implementation

### 1. Read Query Logic

From `n8n-mcp/src/mcp/tools/nodes.ts`:
- FTS5 query builder
- Relevance scoring
- Example fetching from templates table

### 2. Output Format

**Terminal (Markdown):**
```
╭─ Nodes matching "webhook" (showing 10 of 47 results)
│  💡 Tip: Use --save webhook-nodes.json for complete dataset
│  🔍 Search mode: OR | Include examples: false
╰─

| Node Type                  | Display Name | Category    | Score |
|----------------------------|--------------|-------------|-------|
| n8n-nodes-base.webhook     | Webhook      | Core Nodes  | 98.5  |
...

📊 Summary: 47 nodes found | 10 displayed

⚡ Next steps:
   n8n nodes get n8n-nodes-base.webhook --mode docs
   n8n nodes search webhook --save webhook-nodes.json

💡 jq recipes (after --save):
   jq -r '.[].nodeType' nodes.json
```

**JSON (--save):**
```json
{
  "nodes": [
    {
      "nodeType": "n8n-nodes-base.webhook",
      "displayName": "Webhook",
      "description": "Starts workflow on HTTP requests",
      "category": "Core Nodes",
      "relevanceScore": 98.5,
      "examples": []
    }
  ],
  "totalFound": 47,
  "searchMode": "OR",
  "query": "webhook"
}
```

## Files to Create

1. `src/commands/nodes/SearchCommand.ts` - Clipanion command class
2. `src/core/db/nodes.ts` - Node database queries (steal from MCP)

## Code Outline

```typescript
// src/commands/nodes/SearchCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';
import { searchNodes } from '../../core/db/nodes.js';
import { formatNodesTable } from '../../core/formatters/markdown.js';
import { saveJson } from '../../core/formatters/json.js';

export class NodesSearchCommand extends BaseCommand {
  static paths = [['nodes', 'search']];
  
  static usage = {
    description: 'Search n8n nodes by keyword',
    details: `
      Full-text search across 500+ n8n nodes.
      
      Examples:
        $ n8n nodes search webhook
        $ n8n nodes search "slack notification" --mode AND
        $ n8n nodes search database --include-examples --save db-nodes.json
    `,
    category: 'Discovery',
  };

  query = Option.String({ required: true });
  limit = Option.Number('-l,--limit', { default: 10 });
  mode = Option.String('-m,--mode', { default: 'OR' });
  includeExamples = Option.Boolean('--include-examples', { default: false });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // 1. Search nodes using logic from n8n-mcp/src/mcp/tools/nodes.ts
    const results = await searchNodes({
      query: this.query,
      mode: this.mode,
      includeExamples: this.includeExamples,
    });

    // 2. If --save, write ALL to JSON and exit
    if (this.save) {
      await saveJson(this.save, results);
      this.context.stdout.write(`✅ Saved ${results.nodes.length} nodes to ${this.save}\n`);
      return 0;
    }

    // 3. Otherwise, display truncated Markdown table
    const output = formatNodesTable(results, { limit: this.limit });
    this.context.stdout.write(output);
    return 0;
  }
}
```

## Database Query (From MCP Services)

**Read `n8n-mcp/src/database/node-repository.ts` lines 138-180:**
```typescript
searchNodes(query: string, mode: 'OR' | 'AND' | 'FUZZY', limit: number): any[] {
  // Contains SQL with LIKE-based search
  // OR mode: query split by spaces, any match
  // AND mode: all terms must match
  // FUZZY mode: partial matching with wildcards
}
```

**For FTS5 search (production):** The actual FTS5 implementation is in `n8n-mcp/src/mcp/server.ts` lines 1135-1148.
For CLI, implement FTS5 queries directly using `DatabaseAdapter.checkFTS5Support()`.

**For examples:** Read `n8n-mcp/src/templates/template-repository.ts` to join node results with template examples.
