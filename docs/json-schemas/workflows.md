# Workflows Command JSON Schemas

## `workflows list --json`

```typescript
interface WorkflowListOutput {
  total: number;        // Total workflows matching filter
  displayed: number;    // Number in current response
  workflows: Array<{
    id: string;
    name: string;
    active: boolean;
    createdAt: string;  // ISO 8601 timestamp
    updatedAt: string;  // ISO 8601 timestamp
  }>;
}
```

### Example
```json
{
  "total": 42,
  "displayed": 10,
  "workflows": [
    {
      "id": "abc123",
      "name": "My Workflow",
      "active": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-12-01T15:45:00.000Z"
    }
  ]
}
```

### jq Recipes
```bash
# List all workflow names
n8n workflows list --json | jq -r '.workflows[].name'

# Get active workflows only
n8n workflows list --json | jq '.workflows | map(select(.active))'

# Count total
n8n workflows list --json | jq '.total'
```

---

## `workflows get <id> --json`

Returns the raw workflow object directly (no wrapper).

```typescript
interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: Node[];
  connections: Connections;
  settings?: WorkflowSettings;
  staticData?: object;
  createdAt: string;
  updatedAt: string;
}
```

### jq Recipes
```bash
# Get workflow name
n8n workflows get abc123 --json | jq '.name'

# Count nodes
n8n workflows get abc123 --json | jq '.nodes | length'

# List node types
n8n workflows get abc123 --json | jq '[.nodes[].type] | unique'
```

---

## `workflows validate --json`

```typescript
interface ValidationOutput {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: ValidationIssue[];
  suggestions?: string[];
  versionIssues?: VersionIssue[];
  validation?: {
    mode: 'structure' | 'operation';
    profile: 'runtime' | 'strict' | 'ai-friendly' | 'minimal';
    enhanced: boolean;
  };
}

interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    nodeName: string;
    nodeType: string;
    nodeIndex: number;
    path: string;
  };
  hint?: string;
  suggestions?: string[];
}
```

### Example
```json
{
  "valid": false,
  "errors": ["Missing required property: nodes"],
  "warnings": [],
  "issues": [
    {
      "code": "MISSING_PROPERTY",
      "severity": "error",
      "message": "Missing required property: nodes",
      "location": {
        "path": "nodes"
      }
    }
  ]
}
```

### jq Recipes
```bash
# Check if valid
n8n workflows validate file.json --json | jq '.valid'

# Get error messages
n8n workflows validate file.json --json | jq -r '.errors[]'

# Get issues by severity
n8n workflows validate file.json --json | jq '[.issues[] | select(.severity == "error")]'

# Get issue codes
n8n workflows validate file.json --json | jq '[.issues[].code] | unique'
```

---

## `workflows export --json`

```typescript
interface ExportOutput {
  success: boolean;
  workflow: Workflow;
  savedTo?: string;  // Present if --output was specified
}
```

---

## `workflows autofix --json`

```typescript
interface AutofixOutput {
  success: boolean;
  fixesApplied: number;
  fixes: FixOperation[];
  workflow: Workflow;  // The fixed workflow
  savedTo?: string;
}

interface FixOperation {
  type: string;
  nodeName: string;
  description: string;
  before?: any;
  after?: any;
}
```

### jq Recipes
```bash
# Count fixes applied
n8n workflows autofix file.json --json | jq '.fixesApplied'

# Get fix descriptions
n8n workflows autofix file.json --json | jq -r '.fixes[].description'

# Extract fixed workflow
n8n workflows autofix file.json --json | jq '.workflow' > fixed.json
```
