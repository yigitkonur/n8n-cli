# Audit Command JSON Schema

## `audit --json`

The audit command returns a risk report organized by category.

```typescript
interface AuditReport {
  "Credentials Risk Report": RiskSection;
  "Database Risk Report"?: RiskSection;
  "Nodes Risk Report"?: RiskSection;
  "Filesystem Risk Report"?: RiskSection;
  "Instance Risk Report"?: RiskSection;
}

interface RiskSection {
  risk: string;  // Category name
  sections: AuditFinding[];
}

interface AuditFinding {
  title: string;
  description: string;
  recommendation: string;
  location?: AuditLocation[];
}

interface AuditLocation {
  workflowId?: string;
  workflowName?: string;
  kind?: string;
  name?: string;
}
```

### Example
```json
{
  "Credentials Risk Report": {
    "risk": "credentials",
    "sections": [
      {
        "title": "Credentials not used in any workflow",
        "description": "Some credentials are defined but not being used",
        "recommendation": "Review and remove unused credentials",
        "location": [
          {
            "kind": "credential",
            "name": "Old API Key"
          }
        ]
      }
    ]
  },
  "Instance Risk Report": {
    "risk": "instance",
    "sections": []
  }
}
```

### jq Recipes
```bash
# Get all risk categories
n8n audit --json | jq 'keys'

# Count issues per category
n8n audit --json | jq 'to_entries | map({category: .key, issues: .value.sections | length})'

# Get credentials issues
n8n audit --json | jq '.["Credentials Risk Report"].sections'

# Get all recommendations
n8n audit --json | jq '[.. | .recommendation? // empty] | unique'

# Find issues in specific workflow
n8n audit --json | jq '.. | .location? // empty | .[] | select(.workflowName == "My Workflow")'
```

## Categories

| Category | Checks |
|----------|--------|
| `credentials` | Unused credentials, shared credentials, insecure storage |
| `database` | Database access patterns, query risks |
| `nodes` | Deprecated nodes, security-sensitive operations |
| `filesystem` | File access patterns, path traversal risks |
| `instance` | Instance configuration, public exposure |
