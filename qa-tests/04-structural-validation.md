## Phase 4: Structural & Syntax Validation

**Goal:** Test JSON parsing, repair, and fundamental schema checks.

### 4.1 JSON Syntax Errors

| Test ID | Test Case | Break Method | Expected Error |
|---------|-----------|--------------|----------------|
| SYN-001 | Missing closing brace | Remove last `}` | Failed to parse JSON |
| SYN-002 | Trailing comma | Add `,` before `}` | JSON syntax error |
| SYN-003 | Unquoted key | `{name: "test"}` | JSON syntax error |
| SYN-004 | Single quotes | `{'key': 'value'}` | JSON syntax error |
| SYN-005 | Missing comma | Two properties no comma | JSON syntax error |
| SYN-006 | Control characters | Embed raw newline in string | JSON syntax error |

**Setup Broken Files:**
```bash
# Create broken workflow files
mkdir -p workflows/broken

# SYN-001: Missing brace
cat > workflows/broken/syn-001.json << 'EOF'
{
  "name": "Test",
  "nodes": [],
  "connections": {}
EOF

# SYN-002: Trailing comma
cat > workflows/broken/syn-002.json << 'EOF'
{
  "name": "Test",
  "nodes": [],
  "connections": {},
}
EOF

# SYN-003: Unquoted key
cat > workflows/broken/syn-003.json << 'EOF'
{
  name: "Test",
  "nodes": [],
  "connections": {}
}
EOF

# SYN-004: Single quotes
cat > workflows/broken/syn-004.json << 'EOF'
{
  'name': 'Test',
  'nodes': [],
  'connections': {}
}
EOF
```

**Test Commands:**
```bash
echo "=== SYN-001: Missing Brace ===" 
n8n workflows validate workflows/broken/syn-001.json --json 2>&1 | jq '.error.code'
echo "Exit: $?"

echo "=== SYN-002: Trailing Comma ===" 
n8n workflows validate workflows/broken/syn-002.json --json 2>&1
echo "Exit: $?"
```

### 4.2 JSON Repair Mode

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| REP-001 | Repair trailing comma | `--repair` | Fixed JSON |
| REP-002 | Repair unquoted keys | `--repair` | Fixed JSON |
| REP-003 | Repair single quotes | `--repair` | Fixed JSON |
| REP-004 | Save repaired | `--repair --save fixed.json` | File created |
| REP-005 | Unrepairable | Severely malformed | Repair fails gracefully |

```bash
echo "=== REP-001: Repair Trailing Comma ===" 
n8n workflows validate workflows/broken/syn-002.json --repair --json | jq '.repaired'

echo "=== REP-004: Repair and Save ===" 
n8n workflows validate workflows/broken/syn-002.json --repair --save workflows/fixed-002.json
cat workflows/fixed-002.json | jq '.name'

echo "=== REP-005: Legacy Command ===" 
n8n validate workflows/broken/syn-002.json --repair --json
```

### 4.3 Missing Required Properties

| Test ID | Test Case | Missing Property | Expected Error Code |
|---------|-----------|------------------|---------------------|
| MIS-001 | No nodes array | `nodes` | MISSING_PROPERTY |
| MIS-002 | No connections | `connections` | MISSING_PROPERTY |
| MIS-003 | No name | `name` | MISSING_PROPERTY |
| MIS-004 | Node without type | Node `type` | MISSING_REQUIRED |
| MIS-005 | Node without name | Node `name` | MISSING_REQUIRED |
| MIS-006 | Node without position | Node `position` | MISSING_REQUIRED |

**Setup Broken Files:**
```bash
# MIS-001: No nodes
cat > workflows/broken/mis-001.json << 'EOF'
{
  "name": "Test",
  "connections": {}
}
EOF

# MIS-004: Node without type
cat > workflows/broken/mis-004.json << 'EOF'
{
  "name": "Test",
  "nodes": [
    {
      "name": "Start",
      "position": [100, 100],
      "parameters": {}
    }
  ],
  "connections": {}
}
EOF
```

**Test Commands:**
```bash
echo "=== MIS-001: No Nodes ===" 
n8n workflows validate workflows/broken/mis-001.json --json | jq '.errors[] | select(.code == "MISSING_PROPERTY")'

echo "=== MIS-004: Node Without Type ===" 
n8n workflows validate workflows/broken/mis-004.json --json | jq '.errors[].code'
```

