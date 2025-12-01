## Phase 22: Advanced Node Validation Logic

**Goal:** Test node-specific validation rules including code security and SQL injection detection.
**Source Truth:** `core/validation/node-specific.ts`, `core/validation/fixed-collection.ts`

### 22.1 Code Node Security & Syntax

**Target:** `validateCode` in `node-specific.ts` (Lines 380-450)

| Test ID | Test Case | Input | Expected Error |
|---------|-----------|-------|----------------|
| VAL-006 | Python Prohibited Import | `import requests` | Module not available |
| VAL-007 | JS Eval Detection | `eval(items[0].json.code)` | Security warning |
| VAL-008 | JS Exec Detection | `new Function(code)()` | Security warning |
| VAL-009 | Mixed Indentation | Python tabs + spaces | Indentation error |
| VAL-010 | Infinite Loop Risk | `while(true){}` | Warning: potential infinite loop |

**Setup Test Files:**
```bash
# VAL-006: Python prohibited import
cat > workflows/broken/val-006.json << 'EOF'
{
  "name": "Code Security Test - Python",
  "nodes": [
    {
      "name": "Python Code",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [400, 300],
      "parameters": {
        "mode": "runOnceForAllItems",
        "language": "python",
        "pythonCode": "import requests\nresponse = requests.get('http://example.com')\nreturn [{'json': {'data': response.text}}]"
      }
    }
  ],
  "connections": {}
}
EOF

# VAL-007: JS eval detection
cat > workflows/broken/val-007.json << 'EOF'
{
  "name": "Code Security Test - Eval",
  "nodes": [
    {
      "name": "Dangerous Code",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [400, 300],
      "parameters": {
        "jsCode": "const userCode = items[0].json.code;\nconst result = eval(userCode);\nreturn [{json: {result}}];"
      }
    }
  ],
  "connections": {}
}
EOF

# VAL-008: new Function detection
cat > workflows/broken/val-008.json << 'EOF'
{
  "name": "Code Security Test - Function",
  "nodes": [
    {
      "name": "Dynamic Function",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [400, 300],
      "parameters": {
        "jsCode": "const fn = new Function('x', items[0].json.code);\nreturn [{json: {result: fn(5)}}];"
      }
    }
  ],
  "connections": {}
}
EOF
```

**Test Commands:**
```bash
echo "=== VAL-006: Python Prohibited Import ==="
n8n workflows validate workflows/broken/val-006.json -P strict --json | jq '.warnings[] | select(.code | contains("IMPORT") or contains("MODULE"))'

echo "=== VAL-007: JS Eval Detection ==="
n8n workflows validate workflows/broken/val-007.json -P strict --json | jq '.warnings[] | select(.message | contains("eval"))'

echo "=== VAL-008: JS Function Detection ==="
n8n workflows validate workflows/broken/val-008.json -P strict --json | jq '.warnings[] | select(.message | contains("Function") or contains("exec"))'
```

### 22.2 FixedCollection Structural Integrity

**Target:** `FixedCollectionValidator` in `fixed-collection.ts` (Lines 1-397)

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| FXC-001 | Nested Values Bug | `fieldsToSummarize.values.values` | INVALID_VALUE error |
| FXC-002 | Missing Values Array | FixedCollection without values | Structural error |
| FXC-003 | Invalid Item Structure | Wrong property types | Type error |
| FXC-004 | Autofix Flattening | Nested values | Flattens to single level |

**Setup Test Files:**
```bash
# FXC-001: Nested values bug (causes "propertyValues[itemName] is not iterable")
cat > workflows/broken/fxc-001.json << 'EOF'
{
  "name": "FixedCollection Bug Test",
  "nodes": [
    {
      "name": "Summarize",
      "type": "n8n-nodes-base.summarize",
      "typeVersion": 1,
      "position": [400, 300],
      "parameters": {
        "fieldsToSummarize": {
          "values": {
            "values": [
              {"field": "amount", "aggregation": "sum"}
            ]
          }
        }
      }
    }
  ],
  "connections": {}
}
EOF
```

**Test Commands:**
```bash
echo "=== FXC-001: Nested Values Bug ==="
n8n workflows validate workflows/broken/fxc-001.json -P strict --json | jq '.errors[] | select(.code | contains("INVALID") or contains("STRUCTURE"))'

echo "=== FXC-004: Autofix Flattening ==="
n8n workflows autofix workflows/broken/fxc-001.json --json | jq '.fixes[] | select(.type | contains("structure") or contains("collection"))'
```

### 22.3 SQL Injection Pattern Detection

**Target:** `validateSQLQuery` in `node-specific.ts` (Lines 520-560)

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| SQL-001 | Template Interpolation | `WHERE id = {{ $json.id }}` | SQL injection warning |
| SQL-002 | Safe Parameterized | `WHERE id = $1` | No warning |
| SQL-003 | String Concatenation | `'SELECT * FROM ' + table` | Injection warning |
| SQL-004 | Multiple Injections | Several template vars | Multiple warnings |

**Setup Test Files:**
```bash
# SQL-001: SQL Injection via template
cat > workflows/broken/sql-001.json << 'EOF'
{
  "name": "SQL Injection Test",
  "nodes": [
    {
      "name": "Postgres Query",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [400, 300],
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM users WHERE id = {{ $json.userId }} AND email = '{{ $json.email }}'"
      }
    }
  ],
  "connections": {}
}
EOF

# SQL-002: Safe parameterized query
cat > workflows/broken/sql-002.json << 'EOF'
{
  "name": "SQL Safe Test",
  "nodes": [
    {
      "name": "Postgres Query",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [400, 300],
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT * FROM users WHERE id = $1 AND email = $2"
      }
    }
  ],
  "connections": {}
}
EOF
```

**Test Commands:**
```bash
echo "=== SQL-001: SQL Injection Warning ==="
n8n workflows validate workflows/broken/sql-001.json -P strict --json | jq '.warnings[] | select(.code | contains("SQL") or contains("INJECTION"))'

echo "=== SQL-002: Safe Query (No Warning) ==="
WARNINGS=$(n8n workflows validate workflows/broken/sql-002.json -P strict --json | jq '.warnings | length')
[ "$WARNINGS" -eq 0 ] && echo "✅ No SQL warnings" || echo "❌ Unexpected warnings"
```

---

## Source Code Reference

**`core/validation/node-specific.ts`:**
```typescript
// Lines 380-450: validateCode()
// - Checks for eval(), new Function(), exec()
// - Python: validates import statements
// - Detects potential infinite loops

// Lines 520-560: validateSQLQuery()
// - Detects {{ }} template expressions in SQL
// - Warns about SQL injection risks
// - Suggests parameterized queries
```

**`core/validation/fixed-collection.ts`:**
```typescript
// FixedCollectionValidator class
// - Validates structure of fixedCollection properties
// - Detects nested values bug
// - Provides autofix suggestions
```
