## Phase 25: Template & Credential Transformation

**Goal:** Test credential stripping, template node resolution, and deployment pipeline.
**Source Truth:** `commands/workflows/deploy-template.ts`, `core/credential-utils.ts`, `utils/template-node-resolver.ts`

### 25.1 Credential Stripping

**Target:** `stripCredentials` in `core/credential-utils.ts`

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| TPL-009 | Default Stripping | Deploy template | Credentials removed |
| TPL-010 | Keep Credentials | `--keep-credentials` | Credentials preserved |
| TPL-011 | Credential Extraction | Deploy with creds | Lists required types |
| TPL-012 | Multiple Credential Types | Template with 3 cred types | All listed |

```bash
echo "=== TPL-009: Credential Stripping (Default) ==="
# Deploy a template and verify credentials are stripped
DEPLOYED=$(n8n workflows deploy-template 3121 --dry-run --json)
echo "$DEPLOYED" | jq '.data.workflow.nodes[] | select(.credentials != null) | {name, credentials}'
# Should be empty or null (credentials stripped)

echo "=== TPL-010: Keep Credentials ==="
DEPLOYED_KEEP=$(n8n workflows deploy-template 3121 --dry-run --keep-credentials --json)
echo "$DEPLOYED_KEEP" | jq '.data.workflow.nodes[] | select(.credentials != null) | {name, hasCredentials: (.credentials != null)}'

echo "=== TPL-011: Credential Extraction ==="
# Should list all credential types required
n8n workflows deploy-template 3121 --dry-run --json | jq '.data.credentialsRequired'

echo "=== TPL-012: Multiple Credential Types ==="
# Find a template with multiple credential types
n8n templates get 3121 --json | jq '[.data.workflow.nodes[].credentials // {} | keys[]] | unique'
```

### 25.2 Template Node Resolution

**Target:** `utils/template-node-resolver.ts` (Lines 180-220)

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| TNR-001 | Single Node Expansion | `slack` | `[slack, slackTrigger]` |
| TNR-002 | Multiple Nodes | `slack,googleSheets` | All variations |
| TNR-003 | Case Normalization | `Slack,WEBHOOK` | Normalized lookup |
| TNR-004 | Unknown Node | `unknownNode123` | Graceful handling |

```bash
echo "=== TNR-001: Single Node Expansion ==="
# Search by node should find all related templates
n8n templates search --by-nodes slack --json | jq '.data | length'

echo "=== TNR-002: Multiple Nodes ==="
n8n templates search --by-nodes slack,webhook --json | jq '.data[:3] | .[].name'

echo "=== TNR-003: Case Normalization ==="
# Should work regardless of case
n8n templates search --by-nodes SLACK --json | jq '.data | length'
n8n templates search --by-nodes Webhook --json | jq '.data | length'

echo "=== TNR-004: Unknown Node ==="
n8n templates search --by-nodes "unknownNode123xyz" --json | jq '.data | length'
# Should return 0 results, not error
```

### 25.3 Template Autofix Pipeline

**Target:** `deploy-template.ts` autofix integration

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| TAF-001 | Expression Fix | Template with `{{ }}` | Fixed to `={{ }}` |
| TAF-002 | Switch Fix | Template with Switch v3 | Rules fixed |
| TAF-003 | No Autofix Flag | `--no-autofix` | Issues preserved |
| TAF-004 | Multiple Fixes | Template with 5+ issues | All auto-fixed |

```bash
echo "=== TAF-001: Expression Format Fix ==="
# Templates often have expression format issues
TEMPLATE_ISSUES=$(n8n templates get 3121 --json | jq '[.data.workflow.nodes[].parameters | .. | strings | select(test("\\{\\{ .* \\}\\}"))] | length')
echo "Template has $TEMPLATE_ISSUES potential expression issues"

# Deploy with autofix (default)
DEPLOYED=$(n8n workflows deploy-template 3121 --dry-run --json)
FIXED_ISSUES=$(echo "$DEPLOYED" | jq '[.data.workflow.nodes[].parameters | .. | strings | select(test("\\{\\{ .* \\}\\}"))] | length')
echo "After autofix: $FIXED_ISSUES issues remain"

echo "=== TAF-003: No Autofix Flag ==="
DEPLOYED_RAW=$(n8n workflows deploy-template 3121 --dry-run --no-autofix --json)
RAW_ISSUES=$(echo "$DEPLOYED_RAW" | jq '[.data.workflow.nodes[].parameters | .. | strings | select(test("\\{\\{ .* \\}\\}"))] | length')
echo "Without autofix: $RAW_ISSUES issues"
```

### 25.4 Template Metadata Handling

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| TMH-001 | Name Override | `--name "Custom Name"` | Name changed |
| TMH-002 | Default Name | No name flag | Uses template name |
| TMH-003 | Created Inactive | Default behavior | `active: false` |
| TMH-004 | Preserve Description | Template description | Kept in workflow |

```bash
echo "=== TMH-001: Name Override ==="
n8n workflows deploy-template 3121 --name "QA Custom Name" --dry-run --json | jq '.data.workflow.name'

echo "=== TMH-002: Default Name ==="
n8n workflows deploy-template 3121 --dry-run --json | jq '.data.workflow.name'

echo "=== TMH-003: Created Inactive ==="
# Verify deployed workflow is inactive by default
n8n workflows deploy-template 3121 --dry-run --json | jq '.data.active // false'
```

### 25.5 Full Deployment Pipeline

```bash
#!/bin/bash
# Complete template deployment test

TEMPLATE_ID=3121
CUSTOM_NAME="QA Pipeline Test $(date +%s)"

echo "=== Full Template Deployment Pipeline ==="

# Step 1: Get template info
echo "Step 1: Fetching template info..."
TEMPLATE_INFO=$(n8n templates get $TEMPLATE_ID --json)
ORIGINAL_NAME=$(echo "$TEMPLATE_INFO" | jq -r '.data.name')
NODE_COUNT=$(echo "$TEMPLATE_INFO" | jq '.data.workflow.nodes | length')
echo "Template: $ORIGINAL_NAME ($NODE_COUNT nodes)"

# Step 2: Preview deployment
echo "Step 2: Preview deployment..."
PREVIEW=$(n8n workflows deploy-template $TEMPLATE_ID --name "$CUSTOM_NAME" --dry-run --json)
CREDS_REQUIRED=$(echo "$PREVIEW" | jq '.data.credentialsRequired | length')
echo "Credentials required: $CREDS_REQUIRED"

# Step 3: Deploy (if dry-run looks good)
if [ "$CREDS_REQUIRED" -gt 0 ]; then
    echo "Step 3: Skipping actual deploy (credentials required)"
    echo "Required credentials:"
    echo "$PREVIEW" | jq '.data.credentialsRequired'
else
    echo "Step 3: Deploying..."
    DEPLOY_RESULT=$(n8n workflows deploy-template $TEMPLATE_ID --name "$CUSTOM_NAME" --json)
    WF_ID=$(echo "$DEPLOY_RESULT" | jq -r '.data.id')
    echo "Deployed as: $WF_ID"
    
    # Step 4: Verify
    echo "Step 4: Verifying..."
    n8n workflows get $WF_ID --mode minimal --json | jq '{name, nodeCount: (.nodes | length), active}'
    
    # Cleanup
    echo "Step 5: Cleanup..."
    n8n workflows delete --ids $WF_ID --force --json > /dev/null
    echo "Deleted test workflow"
fi

echo "=== Pipeline Complete ==="
```

---

## Source Code Reference

**`commands/workflows/deploy-template.ts`:**
```typescript
// Fetches template from n8n.io API
// Applies autofix pipeline (expression format, switch conditions)
// Extracts credential requirements
// Strips credentials before deployment
// Creates workflow as inactive
```

**`core/credential-utils.ts`:**
```typescript
// extractCredentials(): Lists all credential types in workflow
// stripCredentials(): Removes credential references from nodes
// Returns { credentialsRequired: string[], workflow: {...} }
```

**`utils/template-node-resolver.ts`:**
```typescript
// Lines 180-220: expandNodeTypes()
// Expands short names to all variations:
// - slack → [n8n-nodes-base.slack, n8n-nodes-base.slackTrigger]
// - googleSheets → [n8n-nodes-base.googleSheets]
// Case-insensitive matching
```
