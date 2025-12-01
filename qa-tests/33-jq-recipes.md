## Phase 32: JQ Recipe Integrity

**Goal:** Test that JQ recipes match actual command output schemas.
**Source Truth:** `core/formatters/jq-recipes.ts` (Lines 35-150)

### 32.1 Recipe Validation per Command

| Test ID | Test Case | Command | Recipe | Validation |
|---------|-----------|---------|--------|------------|
| JQR-001 | Workflows List | `workflows list` | `.data[] \| {id, name, active}` | Fields exist |
| JQR-002 | Nodes Search | `nodes search` | `.data[] \| {name, type}` | Fields exist |
| JQR-003 | Executions List | `executions list` | `.data[] \| {id, status}` | Fields exist |
| JQR-004 | Credentials List | `credentials list` | `.data[] \| {id, type}` | Fields exist |
| JQR-005 | Templates Search | `templates search` | `.data[] \| {id, name}` | Fields exist |

```bash
echo "=== JQR-001: Workflows List Recipe ==="
# Get JSON output
n8n workflows list --limit 1 --json > /tmp/wf-list.json
# Verify the recipe fields exist
cat /tmp/wf-list.json | jq '.data[] | {id, name, active}' > /dev/null 2>&1
echo "Exit: $?"  # Expected: 0

echo "=== JQR-002: Nodes Search Recipe ==="
n8n nodes search "slack" --limit 3 --json > /tmp/nodes-search.json
cat /tmp/nodes-search.json | jq '.data[] | {name, type: .type}' > /dev/null 2>&1
echo "Exit: $?"  # Expected: 0

echo "=== JQR-003: Executions List Recipe ==="
n8n executions list --limit 1 --json > /tmp/exec-list.json 2>/dev/null
if [ -s /tmp/exec-list.json ]; then
    cat /tmp/exec-list.json | jq '.data[] | {id, status}' > /dev/null 2>&1
    echo "Exit: $?"
else
    echo "No executions to test"
fi

echo "=== JQR-004: Credentials List Recipe ==="
n8n credentials list --json > /tmp/creds-list.json 2>/dev/null
if [ -s /tmp/creds-list.json ]; then
    cat /tmp/creds-list.json | jq '.data[] | {id, type}' > /dev/null 2>&1
    echo "Exit: $?"
else
    echo "No credentials to test"
fi

echo "=== JQR-005: Templates Search Recipe ==="
n8n templates search "openai" --limit 3 --json > /tmp/templates.json 2>/dev/null
if [ -s /tmp/templates.json ]; then
    cat /tmp/templates.json | jq '.data[] | {id, name}' > /dev/null 2>&1
    echo "Exit: $?"
else
    echo "Templates search unavailable"
fi

# Cleanup
rm -f /tmp/wf-list.json /tmp/nodes-search.json /tmp/exec-list.json /tmp/creds-list.json /tmp/templates.json
```

### 32.2 Detailed Field Validation

| Test ID | Test Case | Command | Required Fields |
|---------|-----------|---------|-----------------|
| JQF-001 | Workflow Get | `workflows get` | `id, name, nodes, connections` |
| JQF-002 | Node Show | `nodes show` | `name, displayName, description, properties` |
| JQF-003 | Execution Get | `executions get` | `id, finished, status, data` |
| JQF-004 | Validation Result | `workflows validate` | `valid, errors, warnings` |

```bash
echo "=== JQF-001: Workflow Get Fields ==="
WF_ID=$(n8n workflows list -l 1 --json 2>/dev/null | jq -r '.data[0].id // empty')
if [ -n "$WF_ID" ]; then
    n8n workflows get $WF_ID --json | jq 'has("data") and (.data | has("id", "name", "nodes", "connections"))'
    # Expected: true
fi

echo "=== JQF-002: Node Show Fields ==="
n8n nodes show slack --json | jq 'has("data") and (.data | has("name", "displayName", "description"))'
# Expected: true

echo "=== JQF-004: Validation Result Fields ==="
echo '{"name":"Test","nodes":[],"connections":{}}' > /tmp/valid.json
n8n workflows validate /tmp/valid.json --json | jq 'has("valid", "errors", "warnings")'
# Expected: true
rm -f /tmp/valid.json
```

### 32.3 Error Response Schema

| Test ID | Test Case | Scenario | Expected Fields |
|---------|-----------|----------|-----------------|
| JQE-001 | Not Found | Invalid ID | `success: false, error` |
| JQE-002 | Validation Error | Bad JSON | `success: false, error` |
| JQE-003 | Auth Error | Bad API key | `success: false, error` |

```bash
echo "=== JQE-001: Not Found Response ==="
n8n workflows get "nonexistent-id-12345" --json 2>&1 | jq 'has("success") and .success == false'

echo "=== JQE-002: Validation Error Response ==="
echo "not json" > /tmp/bad.json
n8n workflows validate /tmp/bad.json --json 2>&1 | jq 'has("error") or has("errors")'
rm -f /tmp/bad.json
```

---

## Source Code Reference

**`core/formatters/jq-recipes.ts`:**
```typescript
// Lines 35-150: Maps command names to jq filter recipes
// Each recipe assumes the standard JSON output structure:
// { success: boolean, data: {...} | [...], meta?: {...} }
// Recipes extract commonly needed fields for piping
```
