## Phase 5: Schema-Aware Validation Engine

**Goal:** Test the sophisticated validation logic across all profiles and modes.
**Source Truth:** `core/validator.ts`, `core/validation/*.ts`

### 5.1 Validation Profiles Matrix

| Profile | Errors Kept | Warnings Kept | Use Case |
|---------|------------|---------------|----------|
| `minimal` | Missing required only | Security, deprecated | Fast check |
| `runtime` | Critical runtime | Security, deprecated | Default |
| `ai-friendly` | All errors | + Best practice | LLM processing |
| `strict` | All errors | All warnings | Production |

| Test ID | Profile | Mode | File | Expected |
|---------|---------|------|------|----------|
| VAL-001 | minimal | minimal | valid.json | Pass |
| VAL-002 | runtime | operation | valid.json | Pass |
| VAL-003 | ai-friendly | operation | valid.json | Pass + hints |
| VAL-004 | strict | full | valid.json | Pass + all warnings |
| VAL-005 | strict | full | slightly-off.json | Warnings shown |

```bash
# Test all profile combinations
for PROFILE in minimal runtime ai-friendly strict; do
  for MODE in minimal operation full; do
    echo "=== Profile: $PROFILE, Mode: $MODE ===" 
    n8n workflows validate workflows/01-profile-linkedin-search-webhook.json \
      -P $PROFILE -M $MODE --json | jq '{valid, errorCount: (.errors | length), warnCount: (.warnings | length)}'
  done
done
```

### 5.2 Expression Format Validation

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| EXP-001 | Missing = prefix | `{{ $json.id }}` | EXPRESSION_MISSING_PREFIX |
| EXP-002 | Correct expression | `={{ $json.id }}` | Valid |
| EXP-003 | Nested expression | `{{ $json.{{ $vars.key }} }}` | EXPRESSION_MISSING_PREFIX |
| EXP-004 | Multiple expressions | Two fields missing = | Multiple errors |
| EXP-005 | Skip validation | `--no-validate-expressions` | No expression errors |

**Setup Test File:**
```bash
cat > workflows/broken/exp-001.json << 'EOF'
{
  "name": "Expression Test",
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [400, 300],
      "parameters": {
        "url": "{{ $json.endpoint }}",
        "method": "POST",
        "body": "={{ $json.data }}"
      }
    }
  ],
  "connections": {}
}
EOF
```

**Test Commands:**
```bash
echo "=== EXP-001: Missing = Prefix ===" 
n8n workflows validate workflows/broken/exp-001.json --json | jq '.errors[] | select(.code == "EXPRESSION_MISSING_PREFIX")'

echo "=== EXP-005: Skip Expression Validation ===" 
n8n workflows validate workflows/broken/exp-001.json --no-validate-expressions --json | jq '.errors'
```

### 5.3 Node Type Validation & Suggestions

| Test ID | Test Case | Bad Type | Expected Suggestion |
|---------|-----------|----------|---------------------|
| TYP-001 | Missing prefix | `httpRequest` | n8n-nodes-base.httpRequest |
| TYP-002 | Typo | `n8n-nodes-base.webhok` | n8n-nodes-base.webhook |
| TYP-003 | Case error | `n8n-nodes-base.SLACK` | n8n-nodes-base.slack |
| TYP-004 | Unknown node | `n8n-nodes-base.foobar` | No suggestion / unknown |
| TYP-005 | Community node | `n8n-nodes-community.custom` | No error (external) |

**Setup Test File:**
```bash
cat > workflows/broken/typ-001.json << 'EOF'
{
  "name": "Type Test",
  "nodes": [
    {
      "name": "My Webhook",
      "type": "webhok",
      "typeVersion": 1,
      "position": [200, 200],
      "parameters": {}
    }
  ],
  "connections": {}
}
EOF
```

**Test Commands:**
```bash
echo "=== TYP-002: Typo Suggestion ===" 
n8n workflows validate workflows/broken/typ-001.json --json | jq '.issues[] | {code, suggestions}'
```

### 5.4 Version & Upgrade Checking

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| VER-001 | Check upgrades | `--check-upgrades` | Upgrade recommendations |
| VER-002 | Upgrade severity | `--check-upgrades --upgrade-severity HIGH` | Only HIGH |
| VER-003 | Check versions | `--check-versions` | Outdated typeVersions |
| VER-004 | Version severity | `--check-versions --version-severity error` | Errors for outdated |
| VER-005 | Skip community | `--check-versions --skip-community-nodes` | Skip external nodes |

```bash
echo "=== VER-001: Check Upgrades ===" 
n8n workflows validate workflows/01-profile-linkedin-search-webhook.json --check-upgrades --json | jq '.upgrades'

echo "=== VER-003: Check Versions ===" 
n8n workflows validate workflows/01-profile-linkedin-search-webhook.json --check-versions --json | jq '.versionIssues'
```

### 5.5 Node Type Normalization

**Source Truth:** `utils/node-type-normalizer.ts`

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| NRM-001 | Short form | `httpRequest` | Resolves to full type |
| NRM-002 | DB format | `nodes-base.httpRequest` | Resolves correctly |
| NRM-003 | LangChain | `nodes-langchain.agent` | `@n8n/n8n-nodes-langchain.agent` |
| NRM-004 | Case insensitive | `HTTPREQUEST` | Resolves correctly |

```bash
echo "=== NRM-001: Short Form Resolution ==="
n8n nodes show httpRequest --json | jq '.data.name'

echo "=== NRM-003: LangChain Prefix ==="
n8n nodes show agent --json 2>&1 | jq '.data.name // .error'
```
