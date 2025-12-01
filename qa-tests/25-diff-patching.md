## Phase 24: Diff Engine & Patching Internals

**Goal:** Test smart parameter resolution, node renaming, and connection propagation.
**Source Truth:** `core/diff/engine.ts`, `core/diff/utils.ts`

### 24.1 Smart Parameter Resolution

**Target:** `resolveSmartParameters` in `engine.ts` (Lines 320-350)

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| DIF-018 | IF Branch "true" | `branch: "true"` | Maps to `sourceIndex: 0` |
| DIF-019 | IF Branch "false" | `branch: "false"` | Maps to `sourceIndex: 1` |
| DIF-020 | Switch Case 0 | `case: 0` | Maps to `sourceIndex: 0` |
| DIF-021 | Switch Case N | `case: 2` | Maps to `sourceIndex: 2` |
| DIF-022 | Mixed Usage Warning | `sourceIndex` on IF | Warning suggestion |

**Setup Test Files:**
```bash
# Create workflow with IF and Switch nodes
cat > workflows/test-diff-branch.json << 'EOF'
{
  "name": "Branch Test Workflow",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [200, 300],
      "parameters": {}
    },
    {
      "name": "IF",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [400, 300],
      "parameters": {
        "conditions": {
          "boolean": [{"value1": "={{ $json.active }}", "value2": true}]
        }
      }
    },
    {
      "name": "Switch",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3,
      "position": [600, 300],
      "parameters": {
        "rules": {
          "rules": [
            {"outputKey": "case0"},
            {"outputKey": "case1"},
            {"outputKey": "case2"}
          ]
        }
      }
    },
    {
      "name": "Success Handler",
      "type": "n8n-nodes-base.noOp",
      "typeVersion": 1,
      "position": [600, 200],
      "parameters": {}
    },
    {
      "name": "Failure Handler",
      "type": "n8n-nodes-base.noOp",
      "typeVersion": 1,
      "position": [600, 400],
      "parameters": {}
    }
  ],
  "connections": {
    "Start": {"main": [[{"node": "IF", "type": "main", "index": 0}]]}
  }
}
EOF
```

**Test Diff Operations:**
```bash
# DIF-018: IF Branch true
cat > /tmp/diff-if-true.json << 'EOF'
{
  "operations": [
    {
      "type": "addConnection",
      "source": "IF",
      "target": "Success Handler",
      "branch": "true"
    }
  ]
}
EOF

# DIF-019: IF Branch false
cat > /tmp/diff-if-false.json << 'EOF'
{
  "operations": [
    {
      "type": "addConnection",
      "source": "IF",
      "target": "Failure Handler",
      "branch": "false"
    }
  ]
}
EOF

# DIF-021: Switch Case 2
cat > /tmp/diff-switch.json << 'EOF'
{
  "operations": [
    {
      "type": "addConnection",
      "source": "Switch",
      "target": "Success Handler",
      "case": 2
    }
  ]
}
EOF

echo "=== DIF-018: IF Branch true ==="
n8n workflows diff workflows/test-diff-branch.json -f /tmp/diff-if-true.json --dry-run --json | jq '.data.operations[0]'

echo "=== DIF-019: IF Branch false ==="
n8n workflows diff workflows/test-diff-branch.json -f /tmp/diff-if-false.json --dry-run --json | jq '.data.operations[0]'

echo "=== DIF-021: Switch Case 2 ==="
n8n workflows diff workflows/test-diff-branch.json -f /tmp/diff-switch.json --dry-run --json | jq '.data.operations[0]'
```

### 24.2 Node Renaming & Connection Propagation

**Target:** `updateConnectionReferences` in `engine.ts` (Lines 480-510)

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| DIF-023 | Rename Source Node | Rename "Start" → "Init" | Updates outgoing connections |
| DIF-024 | Rename Target Node | Rename "Handler" → "Processor" | Updates incoming connections |
| DIF-025 | Rename Propagation | Rename in middle of chain | All references updated |
| DIF-026 | Rename Conflict | Rename to existing name | Error: duplicate name |

**Test Diff Operations:**
```bash
# DIF-023: Rename with connection update
cat > /tmp/diff-rename.json << 'EOF'
{
  "operations": [
    {
      "type": "updateNode",
      "nodeName": "Start",
      "updates": {
        "name": "Init Trigger"
      }
    }
  ]
}
EOF

echo "=== DIF-023: Rename Source Node ==="
# Check that connections are updated
n8n workflows diff workflows/test-diff-branch.json -f /tmp/diff-rename.json --dry-run --json | jq '.data.workflow.connections'
# Should show connections from "Init Trigger" instead of "Start"

# DIF-026: Rename conflict
cat > /tmp/diff-conflict.json << 'EOF'
{
  "operations": [
    {
      "type": "updateNode",
      "nodeName": "Start",
      "updates": {
        "name": "IF"
      }
    }
  ]
}
EOF

echo "=== DIF-026: Rename Conflict ==="
n8n workflows diff workflows/test-diff-branch.json -f /tmp/diff-conflict.json --dry-run --json 2>&1 | jq '.error // .data'
# Should show error about duplicate node name
```

### 24.3 Complex Diff Scenarios

| Test ID | Test Case | Operations | Expected |
|---------|-----------|------------|----------|
| DIF-027 | Multi-Operation Atomic | 5 operations | All or nothing |
| DIF-028 | Continue on Error | Invalid + valid ops | Partial success |
| DIF-029 | Order Dependency | Add node then connect | Works in sequence |
| DIF-030 | Circular Detection | A→B→C→A | Warning or error |

```bash
# DIF-027: Multi-operation atomic
cat > /tmp/diff-multi.json << 'EOF'
{
  "operations": [
    {"type": "updateName", "name": "Multi-Op Test"},
    {"type": "addNode", "node": {"name": "New Node", "type": "n8n-nodes-base.noOp", "typeVersion": 1, "position": [800, 300], "parameters": {}}},
    {"type": "addConnection", "source": "IF", "target": "New Node", "branch": "true"},
    {"type": "disableNode", "nodeName": "Failure Handler"},
    {"type": "updateSettings", "settings": {"executionOrder": "v1"}}
  ]
}
EOF

echo "=== DIF-027: Multi-Operation Atomic ==="
n8n workflows diff workflows/test-diff-branch.json -f /tmp/diff-multi.json --dry-run --json | jq '{operationsCount: (.data.operations | length), allApplied: .data.allApplied}'

# DIF-028: Continue on error
cat > /tmp/diff-errors.json << 'EOF'
{
  "operations": [
    {"type": "removeNode", "nodeName": "NonExistent"},
    {"type": "updateName", "name": "Partial Success Test"}
  ]
}
EOF

echo "=== DIF-028: Continue on Error ==="
n8n workflows diff workflows/test-diff-branch.json -f /tmp/diff-errors.json --continue-on-error --dry-run --json | jq '{success: .success, errors: .data.errors, applied: .data.appliedCount}'
```

---

## Source Code Reference

**`core/diff/engine.ts`:**
```typescript
// Lines 320-350: resolveSmartParameters()
// - Maps branch: "true"/"false" to sourceIndex for IF nodes
// - Maps case: N to sourceIndex for Switch nodes
// - Detects node type to apply correct mapping

// Lines 480-510: updateConnectionReferences()
// - Updates connections when node is renamed
// - Finds all connections pointing to/from renamed node
// - Batch updates in single pass
```

**`core/diff/utils.ts`:**
```typescript
// validateOperations(): Pre-validates all operations
// detectConflicts(): Checks for naming conflicts
// orderOperations(): Ensures correct execution order
```
