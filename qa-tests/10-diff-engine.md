
## Phase 10: Diff Engine & Surgical Updates

**Goal:** Test incremental workflow modifications via diff operations.
**Source Truth:** `core/diff/engine.ts`, `core/diff/utils.ts`

### 10.1 Diff Operations Matrix

| Operation Type | Test ID | Description |
|----------------|---------|-------------|
| `addNode` | DIF-001 | Add new node |
| `removeNode` | DIF-002 | Remove node + connections |
| `updateNode` | DIF-003 | Update parameters |
| `moveNode` | DIF-004 | Change position |
| `enableNode` | DIF-005 | Enable disabled node |
| `disableNode` | DIF-006 | Disable node |
| `addConnection` | DIF-007 | Add connection |
| `removeConnection` | DIF-008 | Remove connection |
| `rewireConnection` | DIF-009 | Change connection target |
| `cleanStaleConnections` | DIF-010 | Remove orphaned |
| `replaceConnections` | DIF-011 | Replace all connections |
| `updateSettings` | DIF-012 | Update workflow settings |
| `updateName` | DIF-013 | Rename workflow |
| `addTag` | DIF-014 | Add tag |
| `removeTag` | DIF-015 | Remove tag |
| `activateWorkflow` | DIF-016 | Activate |
| `deactivateWorkflow` | DIF-017 | Deactivate |

### 10.2 Diff Command Tests

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| DCM-001 | Inline JSON | `-o '[{"type":"updateName","name":"New"}]'` | Applied |
| DCM-002 | From file | `-f diff.json` or `-o @diff.json` | Applied |
| DCM-003 | Dry run | `--dry-run` | Preview only |
| DCM-004 | Continue on error | `--continue-on-error` | Partial success |
| DCM-005 | Save result | `-s result.json` | File created |
| DCM-006 | Force mode | `--force` | No confirmation |
| DCM-007 | No backup | `--no-backup` | Skip backup |

```bash
# Create diff operations file
cat > workflows/diff-ops.json << 'EOF'
{
  "operations": [
    {
      "type": "updateName",
      "name": "Diff Test Workflow"
    },
    {
      "type": "addNode",
      "node": {
        "name": "New Code Node",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [600, 300],
        "parameters": {
          "jsCode": "return items;"
        }
      }
    },
    {
      "type": "updateNode",
      "nodeName": "HTTP Request",
      "updates": {
        "parameters.url": "https://api.example.com/updated"
      }
    }
  ]
}
EOF

echo "=== DCM-003: Dry Run ===" 
n8n workflows diff $WF_ID -f workflows/diff-ops.json --dry-run --json | jq '.data.operations'

echo "=== DCM-001: Apply Diff ===" 
n8n workflows diff $WF_ID -f workflows/diff-ops.json --force --json | jq '{success: .success, applied: .data.appliedCount}'
```

### 10.3 Smart Branch Parameters

| Test ID | Test Case | Operation | Expected |
|---------|-----------|-----------|----------|
| BRN-001 | IF branch true | `"branch": "true"` | Correct output |
| BRN-002 | IF branch false | `"branch": "false"` | Correct output |
| BRN-003 | Switch case | `"case": 0` | First case |
| BRN-004 | Switch case 2 | `"case": 2` | Third case |

```bash
cat > workflows/diff-branch.json << 'EOF'
{
  "operations": [
    {
      "type": "addConnection",
      "source": "IF",
      "target": "Success Handler",
      "branch": "true"
    },
    {
      "type": "addConnection",
      "source": "IF",
      "target": "Failure Handler",
      "branch": "false"
    }
  ]
}
EOF

echo "=== BRN-001: IF Branch True ==="
n8n workflows diff $WF_ID -o '[{"type":"addConnection","source":"IF","target":"Handler","branch":"true"}]' --dry-run --json | jq '.data.operations[0]'
# Verify branch:"true" maps to sourceIndex:0
```

### 10.4 Node Renaming & Connection Propagation

**Source Truth:** `updateConnectionReferences` in `engine.ts` (Lines 480-510)

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| REN-001 | Rename source | Rename "Start" → "Init" | Updates outgoing |
| REN-002 | Rename target | Rename "Handler" → "Proc" | Updates incoming |
| REN-003 | Rename conflict | Rename to existing name | Error |

```bash
echo "=== REN-001: Rename with Connection Update ==="
cat > /tmp/diff-rename.json << 'EOF'
{"operations":[{"type":"updateNode","nodeName":"Start","updates":{"name":"Init"}}]}
EOF
# Connections should update from "Start" to "Init" automatically
```

**Diff Engine Internals:**
- `resolveSmartParameters()`: Maps `branch: "true"` → `sourceIndex: 0`
- `updateConnectionReferences()`: Auto-updates connections on rename
- Atomic operations: All or nothing

