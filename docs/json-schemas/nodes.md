# Nodes Command JSON Schemas

## `nodes list --json`

```typescript
interface NodesListOutput {
  total: number;
  displayed: number;
  nodes: NodeSummary[];
}

interface NodeSummary {
  type: string;           // Full type: "n8n-nodes-base.httpRequest"
  displayName: string;    // Human name: "HTTP Request"
  version: number;        // Latest version
  category: string;       // Category: "transform", "trigger", etc.
  description?: string;   // Node description
}
```

### Example
```json
{
  "total": 544,
  "displayed": 10,
  "nodes": [
    {
      "type": "n8n-nodes-base.httpRequest",
      "displayName": "HTTP Request",
      "version": 4.2,
      "category": "transform",
      "description": "Makes HTTP requests and returns response"
    }
  ]
}
```

### jq Recipes
```bash
# List all node types
n8n nodes list --json | jq -r '.nodes[].type'

# Get nodes by category
n8n nodes list --json | jq '.nodes | group_by(.category) | map({category: .[0].category, count: length})'

# Find specific node
n8n nodes list --json | jq '.nodes[] | select(.displayName | test("HTTP"; "i"))'
```

---

## `nodes search <query> --json`

```typescript
interface NodesSearchOutput {
  total: number;
  displayed: number;
  query: string;
  mode: 'OR' | 'AND' | 'FUZZY';
  nodes: NodeSearchResult[];
}

interface NodeSearchResult extends NodeSummary {
  relevance?: number;  // Search relevance score
  matchedIn?: string[];  // Which fields matched
}
```

### jq Recipes
```bash
# Search and get types
n8n nodes search "slack" --json | jq -r '.nodes[].type'

# Get with relevance scores
n8n nodes search "http" --json | jq '.nodes[] | {type, relevance}'
```

---

## `nodes show <type> --json`

Basic output:
```typescript
interface NodeShowOutput {
  type: string;
  displayName: string;
  version: number;
  category: string;
  description: string;
}
```

With `--detail`:
```typescript
interface NodeShowDetailOutput extends NodeShowOutput {
  properties: NodeProperty[];
  credentials?: CredentialType[];
  inputs: string[];
  outputs: string[];
  codex?: {
    categories?: string[];
    subcategories?: Record<string, string[]>;
  };
}

interface NodeProperty {
  name: string;
  displayName: string;
  type: string;
  required?: boolean;
  default?: any;
  description?: string;
  options?: Array<{ name: string; value: any }>;
}
```

### jq Recipes
```bash
# Get node type
n8n nodes show n8n-nodes-base.httpRequest --json | jq '.type'

# List properties (with --detail)
n8n nodes show n8n-nodes-base.httpRequest --detail --json | jq '[.properties[].name]'

# Get required properties
n8n nodes show n8n-nodes-base.httpRequest --detail --json | jq '[.properties[] | select(.required)]'
```

---

## `nodes categories --json`

```typescript
interface CategoriesOutput {
  categories: CategoryInfo[];
}

interface CategoryInfo {
  name: string;
  count: number;
  nodes?: string[];  // Node types in category (if expanded)
}
```

### jq Recipes
```bash
# List category names
n8n nodes categories --json | jq -r '.categories[].name'

# Get category with most nodes
n8n nodes categories --json | jq '.categories | max_by(.count)'
```
