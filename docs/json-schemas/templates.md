# Templates Command JSON Schemas

## `templates search --json`

```typescript
interface TemplatesSearchOutput {
  total: number;
  displayed: number;
  query?: string;
  templates: TemplateSummary[];
}

interface TemplateSummary {
  id: number;
  name: string;
  description?: string;
  totalViews: number;
  createdAt: string;
  user?: {
    username: string;
  };
  nodes?: NodeInfo[];
}
```

### jq Recipes
```bash
# List template names
n8n templates search "slack" --json | jq -r '.templates[].name'

# Get most viewed
n8n templates search "automation" --json | jq '.templates | max_by(.totalViews)'

# Get template IDs
n8n templates search "email" --json | jq '[.templates[].id]'
```

---

## `templates get <id> --json`

Returns the full workflow ready to import.

```typescript
interface TemplateGetOutput {
  id: number;
  name: string;
  description?: string;
  workflow: Workflow;  // Full workflow object
  nodes: NodeInfo[];
  totalViews: number;
  createdAt: string;
}
```

### jq Recipes
```bash
# Get workflow name
n8n templates get 1234 --json | jq '.name'

# Extract workflow for import
n8n templates get 1234 --json | jq '.workflow' > template.json

# List nodes used
n8n templates get 1234 --json | jq '[.workflow.nodes[].type] | unique'
```

---

## `templates deploy-template --json`

```typescript
interface DeployTemplateOutput {
  success: boolean;
  workflow: Workflow;
  workflowId?: string;    // ID of created workflow (if not dry-run)
  nodeCount: number;
  connectionCount: number;
  credentialsRequired: string[];
  fixesApplied?: number;
  savedTo?: string;
}
```

### Dry-run output
```typescript
interface DeployTemplateDryRunOutput {
  success: boolean;
  dryRun: true;
  workflow: Workflow;
  nodeCount: number;
  connectionCount: number;
  credentialsRequired: string[];
  wouldCreate: boolean;
}
```

### jq Recipes
```bash
# Deploy and get new workflow ID
n8n workflows deploy-template 1234 --json | jq '.workflowId'

# Dry-run to check credentials needed
n8n workflows deploy-template 1234 --dry-run --json | jq '.credentialsRequired'

# Count nodes in template
n8n workflows deploy-template 1234 --dry-run --json | jq '.nodeCount'
```
