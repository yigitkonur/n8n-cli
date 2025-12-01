## Phase 31: Recursion Safeguards & Stack Depth

**Goal:** Test recursion limits and circular reference handling.
**Source Truth:**
- `core/autofix/expression-validator.ts`: `MAX_RECURSION_DEPTH = 100` (Line 33)
- `core/validation/expression-format.ts`: `MAX_RECURSION_DEPTH = 100` (Line 37)

### 31.1 Maximum Recursion Depth

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| REC-001 | At Limit | 100 nested objects | Processes successfully |
| REC-002 | Over Limit | 101+ nested objects | Warning: "Maximum recursion depth exceeded" |
| REC-003 | Deep Parameters | 105 nested params | Warning, no crash |
| REC-004 | Deep Expressions | Nested `{{ }}` | Limit applied |

```bash
echo "=== REC-001: At Recursion Limit (100 levels) ==="
node -e '
  let params = {};
  let cur = params;
  for (let i = 0; i < 100; i++) {
    cur.nested = {};
    cur = cur.nested;
  }
  console.log(JSON.stringify({
    name: "Deep 100",
    nodes: [{
      name: "Test",
      type: "n8n-nodes-base.set",
      typeVersion: 3,
      position: [0, 0],
      parameters: params
    }],
    connections: {}
  }));
' > /tmp/deep-100.json

n8n workflows validate /tmp/deep-100.json --json 2>&1 | jq '.warnings | length'
# Expected: 0 warnings (at limit, not over)

echo "=== REC-002: Over Recursion Limit (105 levels) ==="
node -e '
  let params = {};
  let cur = params;
  for (let i = 0; i < 105; i++) {
    cur.p = {};
    cur = cur.p;
  }
  console.log(JSON.stringify({
    name: "Deep 105",
    nodes: [{
      name: "Test",
      type: "n8n-nodes-base.set",
      typeVersion: 3,
      position: [0, 0],
      parameters: params
    }],
    connections: {}
  }));
' > /tmp/deep-105.json

n8n workflows validate /tmp/deep-105.json --json 2>&1 | jq '.warnings'
# Expected: Warning about maximum recursion depth

echo "=== REC-003: No Stack Overflow ==="
# Verify no stack overflow crash
n8n workflows validate /tmp/deep-105.json --json > /dev/null 2>&1
echo "Exit: $?"  # Should be 0 or 65, NOT crash

# Cleanup
rm -f /tmp/deep-100.json /tmp/deep-105.json
```

### 31.2 Circular Reference Handling

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| CIR-001 | Circular Object | JSON with self-reference | Graceful handling |
| CIR-002 | WeakSet Detection | Internal tracking | No infinite loop |
| CIR-003 | Connection Loop | A → B → C → A | Detects cycle |

```bash
echo "=== CIR-001: Circular Reference Detection ==="
# Note: True circular refs can't be in JSON, but we test the validation logic
cat > /tmp/circular-like.json << 'EOF'
{
  "name": "Circular Test",
  "nodes": [
    {"name": "A", "type": "n8n-nodes-base.noOp", "typeVersion": 1, "position": [0, 0], "parameters": {}},
    {"name": "B", "type": "n8n-nodes-base.noOp", "typeVersion": 1, "position": [200, 0], "parameters": {}},
    {"name": "C", "type": "n8n-nodes-base.noOp", "typeVersion": 1, "position": [400, 0], "parameters": {}}
  ],
  "connections": {
    "A": {"main": [[{"node": "B", "type": "main", "index": 0}]]},
    "B": {"main": [[{"node": "C", "type": "main", "index": 0}]]},
    "C": {"main": [[{"node": "A", "type": "main", "index": 0}]]}
  }
}
EOF

n8n workflows validate /tmp/circular-like.json --json 2>&1 | jq '.warnings'
# Note: n8n allows loops in workflows, but validation should handle it gracefully

# Cleanup
rm -f /tmp/circular-like.json
```

### 31.3 Expression Recursion

| Test ID | Test Case | Expression | Expected |
|---------|-----------|------------|----------|
| EXR-001 | Simple Expression | `={{ $json.value }}` | Valid |
| EXR-002 | Nested Brackets | `={{ {{ $json.a }} }}` | Error or warning |
| EXR-003 | Long Expression | 1000+ chars | Processes |

```bash
echo "=== EXR-001: Simple Expression Validation ==="
cat > /tmp/expr-simple.json << 'EOF'
{
  "name": "Expression Test",
  "nodes": [{
    "name": "Set",
    "type": "n8n-nodes-base.set",
    "typeVersion": 3,
    "position": [0, 0],
    "parameters": {
      "assignments": {
        "assignments": [
          {"name": "value", "value": "={{ $json.input }}"}
        ]
      }
    }
  }],
  "connections": {}
}
EOF

n8n workflows validate /tmp/expr-simple.json --json | jq '.valid'
# Expected: true

echo "=== EXR-003: Long Expression ==="
# Generate a very long expression
LONG_EXPR="={{ \$json.a $(printf '.b%.0s' {1..200}) }}"
cat > /tmp/expr-long.json << EOF
{
  "name": "Long Expression",
  "nodes": [{
    "name": "Set",
    "type": "n8n-nodes-base.set",
    "typeVersion": 3,
    "position": [0, 0],
    "parameters": {"value": "$LONG_EXPR"}
  }],
  "connections": {}
}
EOF

n8n workflows validate /tmp/expr-long.json --json 2>&1 | head -10
echo "Exit: $?"

# Cleanup
rm -f /tmp/expr-*.json
```

---

## Source Code Reference

**`core/autofix/expression-validator.ts`:**
```typescript
// Line 33: MAX_RECURSION_DEPTH = 100
// Uses WeakSet to track visited objects
// Prevents infinite loops in deeply nested structures
```

**`core/validation/expression-format.ts`:**
```typescript
// Line 37: MAX_RECURSION_DEPTH = 100
// Validates expression syntax recursively
// Gracefully handles depth exceeded with warning
```
