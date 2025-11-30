# Command: n8n nodes get

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/nodes.ts` - that's a thin MCP wrapper.

**Core Logic (COPY):**
- `n8n-mcp/src/services/node-documentation-service.ts` (710 lines) → `NodeDocumentationService` for mode=docs
- `n8n-mcp/src/database/node-repository.ts` (962 lines) → `NodeRepository.getNode()` for schema retrieval
- `n8n-mcp/src/parsers/property-extractor.ts` (238 lines) → `PropertyExtractor` for mode=search_properties

**Version comparison (mode=compare/breaking):**
- `n8n-mcp/src/services/node-version-service.ts` (10.7KB) → Version info and comparison
- `n8n-mcp/src/services/breaking-change-detector.ts` (10.4KB) → Breaking change detection

**Database:**
- `n8n-mcp/data/nodes.db` → nodes table with properties_schema JSON column

**MCP Tool Doc:** `n8n-mcp/mcp-tools/003-get_node.md`

## CLI Command

```bash
n8n nodes get <nodeType> [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<nodeType>` | positional | required | Full node type (e.g., n8n-nodes-base.webhook) |
| `--mode, -m` | string | docs | Mode: info, docs, search_properties, versions, compare |
| `--detail, -d` | string | standard | Detail: minimal, standard, full |
| `--property-query` | string | - | For mode=search_properties |
| `--from-version` | number | - | For mode=compare/breaking |
| `--to-version` | number | - | For mode=compare |
| `--include-type-info` | boolean | false | Include TypeScript types |
| `--include-examples` | boolean | false | Include template examples |
| `--save, -s` | string | - | Save to JSON file |

## Implementation

### 1. Read Query Logic

From `n8n-mcp/src/mcp/tools/nodes.ts`:
- `getNodeInfo()` - Basic node schema
- `getNodeDocs()` - Markdown documentation
- `searchNodeProperties()` - Property search
- `getNodeVersions()` - Version history
- `compareNodeVersions()` - Version diff

### 2. Output Format

**Terminal (mode=docs):**
```
╭─ Node Documentation: Webhook
│  📦 Type: n8n-nodes-base.webhook
│  🏷️  Category: Core Nodes
│  📌 Version: 2.1 (latest)
╰─

DESCRIPTION
    Starts a workflow execution when an HTTP request is received.

PARAMETERS
    HTTP Method
        • GET - Retrieve data
        • POST - Send data
        ...
    
    Webhook Path
        Custom path for webhook URL

CREDENTIALS
    • None (default)
    • Basic Auth
    • Header Auth

💡 Next steps:
   n8n nodes get n8n-nodes-base.webhook --mode search_properties --property-query "auth"
   n8n nodes get n8n-nodes-base.webhook --save webhook.json
```

**Terminal (mode=search_properties):**
```
╭─ Properties matching "auth" in n8n-nodes-base.webhook
╰─

| Path | Name | Type | Description |
|------|------|------|-------------|
| parameters.authentication | Authentication | options | Auth method |
...
```

**JSON (--save):**
Complete node schema with all properties.

## Files to Create

1. `src/commands/nodes/GetCommand.ts` - Clipanion command class
2. Add to `src/core/db/nodes.ts` - Node retrieval queries

## Code Outline

```typescript
// src/commands/nodes/GetCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class NodesGetCommand extends BaseCommand {
  static paths = [['nodes', 'get']];
  
  static usage = {
    description: 'Get node documentation with progressive detail levels',
    details: `
      Retrieve comprehensive node information.
      
      Modes:
        docs - Readable Markdown documentation (recommended)
        info - Node schema with configurable detail
        search_properties - Find specific properties
        versions - Version history
        compare - Compare two versions
      
      Examples:
        $ n8n nodes get n8n-nodes-base.webhook --mode docs
        $ n8n nodes get n8n-nodes-base.slack --mode search_properties --property-query "channel"
        $ n8n nodes get n8n-nodes-base.httpRequest --mode compare --from-version 3 --to-version 4
    `,
    category: 'Documentation',
  };

  nodeType = Option.String({ required: true });
  mode = Option.String('-m,--mode', { default: 'docs' });
  detail = Option.String('-d,--detail', { default: 'standard' });
  propertyQuery = Option.String('--property-query');
  fromVersion = Option.Number('--from-version');
  toVersion = Option.Number('--to-version');
  includeTypeInfo = Option.Boolean('--include-type-info', { default: false });
  includeExamples = Option.Boolean('--include-examples', { default: false });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Read logic from n8n-mcp/src/mcp/tools/nodes.ts
    // Different code paths based on this.mode
    return 0;
  }
}
```

## Database Queries (From MCP Services)

**Read `n8n-mcp/src/database/node-repository.ts` lines 57-79:**
```typescript
getNode(nodeType: string): any {
  // Normalizes type first via NodeTypeNormalizer.normalizeToFullForm()
  // Returns full node with JSON-parsed properties_schema
}
```

**Read `n8n-mcp/src/services/node-documentation-service.ts` for mode=docs:**
```typescript
class NodeDocumentationService {
  async getNodeDocumentation(nodeType: string): Promise<NodeInfo> {
    // Generates markdown documentation from node schema
    // Includes operations, parameters, credentials
  }
}
```

**Read `n8n-mcp/src/parsers/property-extractor.ts` for mode=search_properties:**
```typescript
class PropertyExtractor {
  extractProperties(nodeClass: NodeClass): any[] {
    // Handles versioned nodes (nodeVersions)
    // Normalizes property structures
  }
}
```
