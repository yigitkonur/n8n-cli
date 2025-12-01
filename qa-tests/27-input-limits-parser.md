## Phase 26: Input Limits & Parser Resilience

**Goal:** Test DoS prevention limits and JSON parser fallback strategies.
**Source Truth:** `core/json-parser.ts`
- `MAX_JSON_SIZE = 10MB` (Line 5)
- `MAX_NESTING_DEPTH = 100` (Line 6)
- `jsonrepair` fallback logic (Line 70)

### 26.1 Denial of Service (DoS) Prevention

| Test ID | Test Case | Setup | Expected Result |
|---------|-----------|-------|-----------------|
| DOS-001 | Max File Size | Create 11MB JSON file | Error: exceeds maximum size |
| DOS-002 | Max Nesting | JSON with 101 levels deep | Error: exceeds maximum depth |
| DOS-003 | Valid Boundary | 9MB file, 99 levels | Parses successfully |
| DOS-004 | Exactly 10MB | 10MB file | Edge case - may pass or fail |
| DOS-005 | Exactly 100 levels | 100 nested objects | Edge case - should pass |

```bash
echo "=== DOS-001: Max File Size Limit (11MB) ==="
# Create 11MB JSON file with valid structure
python3 -c "print('{\"name\": \"test\", \"data\": \"' + 'x' * 11000000 + '\"}')" > /tmp/large.json
n8n workflows validate /tmp/large.json --json 2>&1
echo "Exit: $?"  # Expected: non-zero with "exceeds maximum size"

echo "=== DOS-002: Max Nesting Depth (101 levels) ==="
# Generate deeply nested JSON
node -e '
  let obj = { name: "Deep", nodes: [], connections: {} };
  let cur = obj;
  for (let i = 0; i < 102; i++) {
    cur.nested = {};
    cur = cur.nested;
  }
  console.log(JSON.stringify(obj));
' > /tmp/deep.json
n8n workflows validate /tmp/deep.json --json 2>&1
echo "Exit: $?"  # Expected: non-zero with "exceeds maximum depth"

echo "=== DOS-003: Valid Boundary (9MB, 99 levels) ==="
# Create 9MB file
python3 -c "print('{\"name\": \"test\", \"nodes\": [], \"data\": \"' + 'x' * 9000000 + '\"}')" > /tmp/valid-large.json
n8n workflows validate /tmp/valid-large.json --json | jq '.valid'
# Expected: true (parses successfully)

echo "=== DOS-005: Exactly 100 Nesting Levels ==="
node -e '
  let obj = { name: "Edge", nodes: [], connections: {} };
  let cur = obj;
  for (let i = 0; i < 100; i++) { cur.n = {}; cur = cur.n; }
  console.log(JSON.stringify(obj));
' > /tmp/edge-depth.json
n8n workflows validate /tmp/edge-depth.json --json 2>&1
echo "Exit: $?"  # Expected: 0 (exactly at limit)

# Cleanup
rm -f /tmp/large.json /tmp/deep.json /tmp/valid-large.json /tmp/edge-depth.json
```

### 26.2 Parser Fallback Strategies

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| PRS-001 | JS Object Syntax | `{ key: "value" }` (no quotes) | Parses (via esprima) |
| PRS-002 | Trailing Comma | `{"key": "value",}` | Repairs (via jsonrepair) |
| PRS-003 | Severe Truncation | `{"key": "val` | Best effort repair |
| PRS-004 | Single Quotes | `{'key': 'value'}` | Repairs to double quotes |
| PRS-005 | Comments in JSON | `{/* comment */ "key": 1}` | Strips comments |

```bash
echo "=== PRS-001: JS Object Syntax (No Quotes on Keys) ==="
cat > /tmp/js-obj.json << 'EOF'
{ name: "JS Syntax Workflow", nodes: [], connections: {} }
EOF
n8n workflows validate /tmp/js-obj.json --json | jq '.valid'
# Should succeed because acceptJSObject is true in workflows/validate.ts

echo "=== PRS-002: JSON Repair - Trailing Comma ==="
cat > /tmp/trailing.json << 'EOF'
{"name": "Trailing Comma", "nodes": [], "connections": {},}
EOF
n8n workflows validate /tmp/trailing.json --repair --json | jq '.valid'
# Expected: true (jsonrepair fixes trailing comma)

echo "=== PRS-003: Severely Truncated JSON ==="
echo '{"name": "Truncated", "nodes": [{"type": "test"' > /tmp/truncated.json
n8n workflows validate /tmp/truncated.json --repair --json 2>&1
# Expected: Best effort repair or graceful error

echo "=== PRS-004: Single Quotes ==="
echo "{'name': 'Single Quotes', 'nodes': []}" > /tmp/single-quotes.json
n8n workflows validate /tmp/single-quotes.json --repair --json | jq '.valid'

echo "=== PRS-005: Comments in JSON ==="
cat > /tmp/comments.json << 'EOF'
{
  /* This is a comment */
  "name": "With Comments",
  "nodes": [], // inline comment
  "connections": {}
}
EOF
n8n workflows validate /tmp/comments.json --repair --json | jq '.valid'

# Cleanup
rm -f /tmp/js-obj.json /tmp/trailing.json /tmp/truncated.json /tmp/single-quotes.json /tmp/comments.json
```

### 26.3 Parser Mode Combinations

| Test ID | Test Case | Flags | Expected |
|---------|-----------|-------|----------|
| PMC-001 | No Repair | Default | Strict JSON only |
| PMC-002 | Repair Mode | `--repair` | jsonrepair active |
| PMC-003 | JS Object Accept | Internal flag | Esprima fallback |

---

## Source Code Reference

**`core/json-parser.ts`:**
```typescript
// Line 5: MAX_JSON_SIZE = 10 * 1024 * 1024 (10MB)
// Line 6: MAX_NESTING_DEPTH = 100
// Line 70: jsonrepair fallback when JSON.parse fails
// Esprima fallback for JS object literals
```
