# 🧪 n8n-cli Comprehensive QA Testing Plan v2.0

**Philosophy:** This testing plan follows the **Agent-First** paradigm: **Write Local → Validate → Fix → Deploy**. It is designed to be exhaustive, covering every command group, flag combination, edge case, and failure mode.

---

## 📋 Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Phase 1: Installation & Global Infrastructure](#phase-1-installation--global-infrastructure)
3. [Phase 2: Authentication & Configuration](#phase-2-authentication--configuration)
4. [Phase 3: Offline Node Database (nodes)](#phase-3-offline-node-database-nodes)
5. [Phase 4: Structural & Syntax Validation](#phase-4-structural--syntax-validation)
6. [Phase 5: Schema-Aware Validation Engine](#phase-5-schema-aware-validation-engine)
7. [Phase 6: AI Node Validation](#phase-6-ai-node-validation)
8. [Phase 7: Auto-Fix Engine](#phase-7-auto-fix-engine)
9. [Phase 8: Version Management & Breaking Changes](#phase-8-version-management--breaking-changes)
10. [Phase 9: Workflow Lifecycle (CRUD)](#phase-9-workflow-lifecycle-crud)
11. [Phase 10: Diff Engine & Surgical Updates](#phase-10-diff-engine--surgical-updates)
12. [Phase 11: Templates & Deploy-Template](#phase-11-templates--deploy-template)
13. [Phase 12: Executions Management](#phase-12-executions-management)
14. [Phase 13: Credentials Management](#phase-13-credentials-management)
15. [Phase 14: Variables & Tags](#phase-14-variables--tags)
16. [Phase 15: Security Audit](#phase-15-security-audit)
17. [Phase 16: Edge Cases & Error Handling](#phase-16-edge-cases--error-handling)
18. [Phase 17: Exit Codes & Scripting](#phase-17-exit-codes--scripting)
19. [Phase 18: Performance & Stress Testing](#phase-18-performance--stress-testing)
20. [Phase 19: End-to-End Agent Simulation](#phase-19-end-to-end-agent-simulation)
21. [Master QA Checklist](#master-qa-checklist)

---

## Test Environment Setup

### Prerequisites Checklist

```bash
# 1. System Requirements
node --version  # Must be ≥18

# 2. Installation Options
pnpm add -g n8n-cli          # Global install
# OR
npx n8n-cli --help              # No install (ephemeral)
# OR (for development)
git clone <repo> && pnpm link --global    # Local development

# 3. n8n Instance (for API tests)
# Option A: Docker
docker run -d --name n8n -p 5678:5678 n8nio/n8n

# Option B: Existing instance
# Ensure API is enabled in Settings → API

# 4. Create Test Directory Structure
mkdir -p qa-tests/{workflows,credentials,results,backups}
cd qa-tests
```

### Configuration Profiles for Testing

Create `.n8nrc.json` with multiple profiles:

```json
{
  "default": "local",
  "profiles": {
    "local": {
      "host": "http://localhost:5678",
      "apiKey": "LOCAL_API_KEY"
    },
    "staging": {
      "host": "https://staging-n8n.example.com",
      "apiKey": "STAGING_API_KEY"
    },
    "production": {
      "host": "https://n8n.example.com",
      "apiKey": "PROD_API_KEY"
    },
    "invalid": {
      "host": "http://localhost:9999",
      "apiKey": "WRONG_KEY"
    }
  }
}
```

### Test Workflow Files Setup

```bash
# Copy sample workflows
cp ../n8n-workflows/*.json workflows/

# Create intentionally broken files for testing
mkdir -p workflows/broken
```

---

## Phase 1: Installation & Global Infrastructure

### 1.1 Installation Verification

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| INS-001 | Version display | `n8n --version` | Outputs semver (e.g., `1.2.3`) |
| INS-002 | Help display | `n8n --help` | Lists all 15 command groups |
| INS-003 | Unknown command | `n8n foobar` | Exit code 64 (USAGE) |
| INS-004 | Subcommand help | `n8n workflows --help` | Lists all workflow subcommands |
| INS-005 | Deep help | `n8n workflows validate --help` | Shows all validation flags |

```bash
# Test Script
echo "=== INS-001: Version ===" && n8n --version
echo "=== INS-002: Help ===" && n8n --help | head -50
echo "=== INS-003: Unknown Command ===" && n8n foobar 2>&1; echo "Exit: $?"
echo "=== INS-004: Subcommand Help ===" && n8n workflows --help | head -30
echo "=== INS-005: Deep Help ===" && n8n workflows validate --help
```

### 1.2 Global Flags Testing

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| GLB-001 | Verbose mode | `n8n nodes search slack -v` | Debug output visible |
| GLB-002 | Quiet mode | `n8n nodes search slack -q` | Minimal output |
| GLB-003 | No color | `n8n nodes search slack --no-color` | No ANSI escape codes |
| GLB-004 | JSON output | `n8n nodes search slack --json` | Valid JSON structure |
| GLB-005 | Profile switch | `n8n --profile staging health` | Uses staging profile |
| GLB-006 | Combined flags | `n8n -v --json nodes list --limit 5` | Verbose + JSON |

```bash
# Test Script
echo "=== GLB-001: Verbose ===" && n8n nodes search slack -v 2>&1 | head -20
echo "=== GLB-002: Quiet ===" && n8n nodes search slack -q
echo "=== GLB-003: No Color ===" && n8n nodes search slack --no-color | cat -v | head -10
echo "=== GLB-004: JSON ===" && n8n nodes search slack --json | jq -e '.success' && echo "Valid JSON"
echo "=== GLB-005: Profile ===" && n8n --profile invalid health 2>&1; echo "Exit: $?"
```

### 1.3 Shell Completion

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| CMP-001 | Bash completion | `n8n completion bash` | Valid bash script |
| CMP-002 | Zsh completion | `n8n completion zsh` | Valid zsh script |
| CMP-003 | Fish completion | `n8n completion fish` | Valid fish script |
| CMP-004 | Invalid shell | `n8n completion powershell` | Error message |

```bash
# Test Script
n8n completion bash > /tmp/n8n-bash.sh && source /tmp/n8n-bash.sh && echo "Bash: OK"
n8n completion zsh > /tmp/n8n-zsh.sh && echo "Zsh: OK"
n8n completion fish > /tmp/n8n-fish.fish && echo "Fish: OK"
```

---

## Phase 2: Authentication & Configuration

### 2.1 Authentication Flow

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| AUTH-001 | Login with flags | `n8n auth login -H <url> -k <key>` | Success, config saved |
| AUTH-002 | Login interactive | `n8n auth login --interactive` | Prompts for input |
| AUTH-003 | Status check | `n8n auth status` | Shows "Connected" |
| AUTH-004 | Whoami alias | `n8n auth whoami` | Same as status |
| AUTH-005 | Health check | `n8n health` | Connected + latency |
| AUTH-006 | Logout | `n8n auth logout` | Clears credentials |
| AUTH-007 | Status after logout | `n8n auth status` | Shows "Not configured" |
| AUTH-008 | Invalid credentials | `n8n auth login -H http://localhost:5678 -k WRONG` | Error on health check |

```bash
# Test Script
echo "=== AUTH-001: Login ===" 
n8n auth login -H http://localhost:5678 -k "$N8N_API_KEY" --json

echo "=== AUTH-003: Status ===" 
n8n auth status --json | jq -e '.data.connected'

echo "=== AUTH-005: Health ===" 
n8n health --json | jq '{status: .data.status, latency: .data.latencyMs}'

echo "=== AUTH-006: Logout ===" 
n8n auth logout --json

echo "=== AUTH-007: Status After Logout ===" 
n8n auth status --json 2>&1
```

### 2.2 Configuration File Precedence

| Test ID | Test Case | Setup | Expected Result |
|---------|-----------|-------|-----------------|
| CFG-001 | Local .n8nrc | Create `.n8nrc` in cwd | Uses local config |
| CFG-002 | Local JSON | Create `.n8nrc.json` in cwd | Uses JSON config |
| CFG-003 | Home directory | Create `~/.n8nrc` | Falls back to home |
| CFG-004 | XDG config | Create `~/.config/n8n/config.json` | Uses XDG path |
| CFG-005 | Env override | `N8N_HOST=x N8N_API_KEY=y n8n health` | Env takes precedence |
| CFG-006 | Config show | `n8n config show` | Displays active config |

```bash
# Test Script - CFG-001 to CFG-005
echo "=== CFG-001: Local .n8nrc ===" 
echo "N8N_HOST=http://test-local:5678" > .n8nrc
n8n config show | grep -i host

echo "=== CFG-005: Env Override ===" 
N8N_HOST=http://env-override:5678 n8n config show --json | jq '.data.host'

echo "=== CFG-006: Config Show ===" 
n8n config show --json | jq '.'

# Cleanup
rm -f .n8nrc
```

### 2.3 Security & Permissions

| Test ID | Test Case | Setup | Expected Result |
|---------|-----------|-------|-----------------|
| SEC-001 | Insecure file perms | `chmod 777 .n8nrc` | Warning shown |
| SEC-002 | Strict mode | `N8N_STRICT_PERMISSIONS=true` with 777 | Refuses to load |
| SEC-003 | Secure perms | `chmod 600 .n8nrc` | No warning |

```bash
# Test Script
echo "N8N_HOST=http://test:5678" > .n8nrc
chmod 777 .n8nrc

echo "=== SEC-001: Insecure Warning ===" 
n8n config show 2>&1 | grep -i "permission\|warning" || echo "No warning (may vary by OS)"

echo "=== SEC-002: Strict Mode ===" 
N8N_STRICT_PERMISSIONS=true n8n config show 2>&1; echo "Exit: $?"

chmod 600 .n8nrc
rm -f .n8nrc
```

---

## Phase 3: Offline Node Database (nodes)

**Goal:** Verify all offline node operations work without API connection.

### 3.1 Node Listing

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| NOD-001 | List all | `n8n nodes list --limit 0` | 800+ nodes |
| NOD-002 | By category | `n8n nodes list --by-category` | Grouped output |
| NOD-003 | Filter category | `n8n nodes list -c "Marketing"` | Only marketing nodes |
| NOD-004 | Compact format | `n8n nodes list --compact --limit 20` | Condensed table |
| NOD-005 | Save to file | `n8n nodes list --save nodes.json --json` | File created |

```bash
# Test Script
echo "=== NOD-001: List All ===" 
COUNT=$(n8n nodes list --limit 0 --json | jq '.data | length')
echo "Total nodes: $COUNT"
[ "$COUNT" -ge 800 ] && echo "✅ Pass" || echo "❌ Fail: Expected ≥800"

echo "=== NOD-002: By Category ===" 
n8n nodes list --by-category --json | jq 'keys'

echo "=== NOD-003: Filter Category ===" 
n8n nodes list -c "Marketing" --json | jq '.data[].displayName'

echo "=== NOD-005: Save to File ===" 
n8n nodes list --limit 10 --save /tmp/nodes-test.json --json
[ -f /tmp/nodes-test.json ] && echo "✅ File created" || echo "❌ File not created"
```

### 3.2 Node Search (FTS5)

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| SRC-001 | OR search | `n8n nodes search "slack message"` | Matches any term |
| SRC-002 | AND search | `n8n nodes search "slack message" --mode AND` | Matches all terms |
| SRC-003 | Fuzzy search | `n8n nodes search "slak" --mode FUZZY` | Finds "slack" |
| SRC-004 | Fuzzy typo | `n8n nodes search "gogle" --mode FUZZY` | Finds "google" |
| SRC-005 | Phrase match | `n8n nodes search '"http request"'` | Exact phrase |
| SRC-006 | Limit results | `n8n nodes search "api" --limit 5` | Max 5 results |
| SRC-007 | JSON output | `n8n nodes search "webhook" --json` | Valid JSON |
| SRC-008 | No results | `n8n nodes search "xyznonexistent123"` | Empty results, no error |

```bash
# Test Script
echo "=== SRC-001: OR Search ===" 
n8n nodes search "slack message" --json | jq '.data | length'

echo "=== SRC-002: AND Search ===" 
n8n nodes search "slack message" --mode AND --json | jq '.data[].name'

echo "=== SRC-003: Fuzzy (slak → slack) ===" 
n8n nodes search "slak" --mode FUZZY --json | jq '.data[0].name' | grep -i slack && echo "✅ Pass"

echo "=== SRC-004: Fuzzy (gogle → google) ===" 
n8n nodes search "gogle" --mode FUZZY --json | jq '.data[].name' | grep -i google && echo "✅ Pass"

echo "=== SRC-008: No Results ===" 
RESULT=$(n8n nodes search "xyznonexistent123" --json)
echo "$RESULT" | jq -e '.data | length == 0' && echo "✅ Empty results"
```

### 3.3 Node Schema Inspection

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| SCH-001 | Minimal detail | `n8n nodes show httpRequest --detail minimal` | ~200 tokens |
| SCH-002 | Standard detail | `n8n nodes show httpRequest --detail standard` | ~1-2K tokens |
| SCH-003 | Full detail | `n8n nodes show httpRequest --detail full` | ~3-8K tokens |
| SCH-004 | Legacy --schema | `n8n nodes show httpRequest --schema` | Same as full |
| SCH-005 | Docs mode | `n8n nodes show httpRequest --mode docs` | Markdown output |
| SCH-006 | Versions mode | `n8n nodes show httpRequest --mode versions` | Version history |
| SCH-007 | Search properties | `n8n nodes show httpRequest --mode search-properties --query "auth"` | Auth-related props |
| SCH-008 | Compare versions | `n8n nodes show httpRequest --mode compare --from 1.0 --to 4.2` | Property diff |
| SCH-009 | Include examples | `n8n nodes show slack --include-examples` | Real-world configs |
| SCH-010 | Short name lookup | `n8n nodes show webhook` | Auto-resolves to full type |
| SCH-011 | Full type name | `n8n nodes show n8n-nodes-base.httpRequest` | Works with prefix |

```bash
# Test Script
echo "=== SCH-001: Minimal (~200 tokens) ===" 
MINIMAL=$(n8n nodes show httpRequest --detail minimal --json)
echo "$MINIMAL" | jq '.data | keys'

echo "=== SCH-003: Full Detail ===" 
n8n nodes show httpRequest --detail full --json | jq '.data.properties | length'

echo "=== SCH-006: Versions ===" 
n8n nodes show httpRequest --mode versions --json | jq '.data.versions'

echo "=== SCH-007: Search Properties ===" 
n8n nodes show httpRequest --mode search-properties --query "auth" --json | jq '.data.matches[].name'

echo "=== SCH-008: Compare Versions ===" 
n8n nodes show httpRequest --mode compare --from 1.0 --to 4.2 --json | jq '.data.changes | length'
```

### 3.4 Node Categories

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| CAT-001 | List categories | `n8n nodes categories` | All category names |
| CAT-002 | Detailed view | `n8n nodes categories --detailed` | With descriptions |
| CAT-003 | JSON output | `n8n nodes categories --json` | Valid JSON |

```bash
# Test Script
echo "=== CAT-001: List Categories ===" 
n8n nodes categories

echo "=== CAT-002: Detailed ===" 
n8n nodes categories --detailed --json | jq '.[0]'
```

### 3.5 Node Configuration Validation

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| NCV-001 | Valid Slack config | See below | No errors |
| NCV-002 | Missing required | See below | Error: channel required |
| NCV-003 | Invalid operation | See below | Error: unknown operation |
| NCV-004 | Strict profile | See below | Additional warnings |
| NCV-005 | Full mode | See below | All properties validated |

```bash
# Test Script
echo "=== NCV-001: Valid Config ===" 
n8n nodes validate n8n-nodes-base.slack \
  --config '{"resource":"message","operation":"send","channel":"#general","text":"Hello"}' \
  --json | jq '.valid'

echo "=== NCV-002: Missing Required ===" 
n8n nodes validate n8n-nodes-base.slack \
  --config '{"resource":"message","operation":"send"}' \
  --json | jq '.errors[] | select(.code | contains("MISSING"))'

echo "=== NCV-003: Invalid Operation ===" 
n8n nodes validate n8n-nodes-base.slack \
  --config '{"resource":"message","operation":"invalid_op"}' \
  --json | jq '.errors'

echo "=== NCV-004: Strict Profile ===" 
n8n nodes validate httpRequest \
  --config '{"url":"http://example.com"}' \
  -P strict --json | jq '.warnings'
```

### 3.6 Breaking Changes Analysis

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| BRK-001 | Webhook changes | `n8n nodes breaking-changes webhook --from 1.0 --to 2.0` | Lists changes |
| BRK-002 | Severity filter | `n8n nodes breaking-changes switch --from 2.0 --severity HIGH` | Only HIGH |
| BRK-003 | Auto-only | `n8n nodes breaking-changes switch --from 2.0 --auto-only` | Auto-migratable |
| BRK-004 | Exit code | Check exit code when changes found | Exit 65 (DATAERR) |
| BRK-005 | No changes | Node with no breaking changes | Empty list, exit 0 |

```bash
# Test Script
echo "=== BRK-001: Webhook Changes ===" 
n8n nodes breaking-changes webhook --from 1.0 --to 2.0 --json | jq '.data.changes'

echo "=== BRK-002: Severity Filter ===" 
n8n nodes breaking-changes switch --from 2.0 --severity HIGH --json | jq '.data.changes | length'

echo "=== BRK-004: Exit Code ===" 
n8n nodes breaking-changes switch --from 2.0 --json > /dev/null 2>&1
echo "Exit code: $?"
```

---

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

---

## Phase 5: Schema-Aware Validation Engine

**Goal:** Test the sophisticated validation logic across all profiles and modes.

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

---

## Phase 6: AI Node Validation

**Goal:** Test specialized validation for AI Agent workflows.

### 6.1 AI Agent Validation

| Test ID | Test Case | Setup | Expected Error Code |
|---------|-----------|-------|---------------------|
| AI-001 | Missing LLM | AI Agent no ai_languageModel | MISSING_LANGUAGE_MODEL |
| AI-002 | Too many LLMs | AI Agent with 3 LLMs | TOO_MANY_LANGUAGE_MODELS |
| AI-003 | Fallback without 2nd | needsFallback=true, 1 LLM | FALLBACK_MISSING_SECOND_MODEL |
| AI-004 | Missing parser | hasOutputParser=true, no parser | MISSING_OUTPUT_PARSER |
| AI-005 | Streaming + output | Streaming mode with main output | STREAMING_WITH_MAIN_OUTPUT |
| AI-006 | Multiple memory | 2 memory connections | MULTIPLE_MEMORY_CONNECTIONS |
| AI-007 | Missing tool desc | AI tool without toolDescription | MISSING_TOOL_DESCRIPTION |
| AI-008 | Empty prompt | promptType="define" with empty text | MISSING_PROMPT_TEXT |

**Setup Test Files:**
```bash
# AI-001: AI Agent without LLM
cat > workflows/broken/ai-001.json << 'EOF'
{
  "name": "AI Agent Test",
  "nodes": [
    {
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.6,
      "position": [400, 300],
      "parameters": {
        "options": {}
      }
    }
  ],
  "connections": {}
}
EOF

# AI-002: Too many LLMs
cat > workflows/broken/ai-002.json << 'EOF'
{
  "name": "AI Agent Too Many LLMs",
  "nodes": [
    {
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.6,
      "position": [400, 300],
      "parameters": {}
    },
    {"name": "LLM1", "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi", "typeVersion": 1, "position": [200, 200], "parameters": {}},
    {"name": "LLM2", "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi", "typeVersion": 1, "position": [200, 300], "parameters": {}},
    {"name": "LLM3", "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi", "typeVersion": 1, "position": [200, 400], "parameters": {}}
  ],
  "connections": {
    "LLM1": {"ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]},
    "LLM2": {"ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]},
    "LLM3": {"ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]}
  }
}
EOF
```

**Test Commands:**
```bash
echo "=== AI-001: Missing LLM ===" 
n8n workflows validate workflows/broken/ai-001.json -P ai-friendly --json | jq '.errors[] | select(.code == "MISSING_LANGUAGE_MODEL")'

echo "=== AI-002: Too Many LLMs ===" 
n8n workflows validate workflows/broken/ai-002.json -P ai-friendly --json | jq '.errors[] | select(.code == "TOO_MANY_LANGUAGE_MODELS")'
```

### 6.2 Chat Trigger Validation

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| CHT-001 | Streaming wrong target | Streaming to non-agent | STREAMING_WRONG_TARGET |
| CHT-002 | Valid streaming | Streaming to AI Agent | Valid |

---

## Phase 7: Auto-Fix Engine

**Goal:** Verify automatic repair capabilities with confidence levels.

### 7.1 Fix Types Matrix

| Fix Type | Confidence | Test Case |
|----------|------------|-----------|
| `expression-format` | HIGH | Missing `=` prefix |
| `node-type-correction` | HIGH | >90% match typo |
| `webhook-missing-path` | HIGH | No path on webhook |
| `switch-options` | HIGH | Switch v3 conditions |
| `typeversion-correction` | MEDIUM | Version exceeds max |
| `error-output-config` | MEDIUM | Invalid onError |
| `typeversion-upgrade` | MEDIUM | Suggest upgrade |
| `version-migration` | LOW | Breaking change hint |

### 7.2 Auto-Fix Commands

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| FIX-001 | Preview fixes | `n8n workflows autofix file.json` | Shows preview |
| FIX-002 | Preview mode explicit | `--preview` | No changes |
| FIX-003 | Apply fixes | `--apply` | Fixes applied |
| FIX-004 | High confidence only | `--confidence high` | Only HIGH fixes |
| FIX-005 | Filter fix types | `--fix-types expression-format` | Only specified |
| FIX-006 | Save fixed file | `--save fixed.json` | File created |
| FIX-007 | Force without prompt | `--apply --force` | No confirmation |
| FIX-008 | Max fixes limit | `--max-fixes 2` | Limited fixes |
| FIX-009 | Upgrade versions | `--upgrade-versions --apply` | Version migrations |
| FIX-010 | No guidance | `--apply --no-guidance` | Suppress guidance |
| FIX-011 | Backup created | Default behavior | Backup in ~/.n8n-cli |

```bash
# Setup file with multiple issues
cat > workflows/broken/multi-issues.json << 'EOF'
{
  "name": "Multi Issues",
  "nodes": [
    {
      "name": "Webhook",
      "type": "webhok",
      "typeVersion": 1,
      "position": [200, 200],
      "parameters": {}
    },
    {
      "name": "HTTP",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [400, 200],
      "parameters": {
        "url": "{{ $json.url }}"
      }
    }
  ],
  "connections": {}
}
EOF

echo "=== FIX-001: Preview Fixes ===" 
n8n workflows autofix workflows/broken/multi-issues.json --json | jq '.fixes'

echo "=== FIX-003: Apply Fixes ===" 
n8n workflows autofix workflows/broken/multi-issues.json --apply --save workflows/fixed-multi.json --force --json | jq '.applied'

echo "=== FIX-004: High Confidence Only ===" 
n8n workflows autofix workflows/broken/multi-issues.json --confidence high --json | jq '.fixes[] | {type, confidence}'

echo "=== FIX-005: Filter Fix Types ===" 
n8n workflows autofix workflows/broken/multi-issues.json --fix-types expression-format --json | jq '.fixes'
```

### 7.3 Post-Update Guidance

| Test ID | Test Case | Expected |
|---------|-----------|----------|
| GUD-001 | Guidance displayed | Shows behavior changes |
| GUD-002 | Confidence scores | HIGH/MEDIUM/LOW shown |
| GUD-003 | Required actions | Manual tasks listed |
| GUD-004 | Estimated time | Time estimate shown |
| GUD-005 | JSON guidance | `postUpdateGuidance` array |

```bash
echo "=== GUD-001: Guidance Display ===" 
n8n workflows autofix workflows/broken/multi-issues.json --apply --force 2>&1 | grep -A 20 "Guidance"

echo "=== GUD-005: JSON Guidance ===" 
n8n workflows autofix workflows/broken/multi-issues.json --apply --force --json | jq '.postUpdateGuidance'
```

---

## Phase 8: Version Management & Breaking Changes

**Goal:** Test local version history stored in SQLite.

### 8.1 Version History Commands

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| VHC-001 | List versions | `n8n workflows versions <id>` | Version list |
| VHC-002 | Limit results | `--limit 5` | Max 5 versions |
| VHC-003 | Get specific | `--get <version-id>` | Version details |
| VHC-004 | Save snapshot | `--get 42 --save v42.json` | File created |
| VHC-005 | Compare versions | `--compare 1,2` | Property diff |
| VHC-006 | Storage stats | `--stats` | Global statistics |

```bash
# First, import a workflow to have versions
WORKFLOW_ID=$(n8n workflows import workflows/01-profile-linkedin-search-webhook.json --json | jq -r '.data.id')
echo "Imported workflow: $WORKFLOW_ID"

# Update to create version
n8n workflows update $WORKFLOW_ID --name "Updated Name" --force

echo "=== VHC-001: List Versions ===" 
n8n workflows versions $WORKFLOW_ID --json | jq '.data'

echo "=== VHC-005: Compare Versions ===" 
n8n workflows versions $WORKFLOW_ID --compare 1,2 --json | jq '.data.differences'

echo "=== VHC-006: Storage Stats ===" 
n8n workflows versions --stats --json | jq '.data'
```

### 8.2 Rollback Operations

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| RBK-001 | Rollback previous | `--rollback` | Previous version restored |
| RBK-002 | Rollback specific | `--rollback --to-version 42` | Version 42 restored |
| RBK-003 | Skip validation | `--rollback --skip-validation` | No pre-rollback check |
| RBK-004 | Backup created | Default | Backup before rollback |

```bash
echo "=== RBK-001: Rollback Previous ===" 
n8n workflows versions $WORKFLOW_ID --rollback --force --json | jq '.data'
```

### 8.3 Version Cleanup

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CLN-001 | Delete version | `--delete <version-id>` | Version removed |
| CLN-002 | Delete all | `--delete-all --force` | All versions removed |
| CLN-003 | Prune old | `--prune --keep 5` | Keep 5 newest |
| CLN-004 | Truncate all | `--truncate-all --force` | All workflows, all versions |

```bash
echo "=== CLN-003: Prune Old ===" 
n8n workflows versions $WORKFLOW_ID --prune --keep 3 --force --json
```

---

## Phase 9: Workflow Lifecycle (CRUD)

**Goal:** Test complete workflow management operations.

### 9.1 Create & Import

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CRE-001 | Create from file | `n8n workflows create -f file.json` | Workflow created |
| CRE-002 | Create with name | `--name "Custom Name"` | Name overridden |
| CRE-003 | Create dry-run | `--dry-run` | Preview only |
| CRE-004 | Import alias | `n8n workflows import file.json` | Same as create |
| CRE-005 | Import + activate | `--activate` | Created and active |
| CRE-006 | Skip validation | `--skip-validation` | No pre-check |
| CRE-007 | JSON output | `--json` | Returns ID, name |

```bash
echo "=== CRE-001: Create Workflow ===" 
RESULT=$(n8n workflows create -f workflows/01-profile-linkedin-search-webhook.json --json)
WF_ID=$(echo "$RESULT" | jq -r '.data.id')
echo "Created: $WF_ID"

echo "=== CRE-005: Import + Activate ===" 
n8n workflows import workflows/06-billing-revenuecat-webhook.json --activate --json | jq '{id: .data.id, active: .data.active}'

echo "=== CRE-003: Dry Run ===" 
n8n workflows create -f workflows/11-job-scrape-webhook-apify.json --dry-run --json | jq '.data'
```

### 9.2 List & Get

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| LST-001 | List all | `n8n workflows list` | Workflows listed |
| LST-002 | Active only | `-a` or `--active` | Only active |
| LST-003 | Filter by tags | `-t production,api` | Filtered |
| LST-004 | Custom limit | `-l 50` | 50 results |
| LST-005 | Pagination | `--cursor <cursor>` | Next page |
| LST-006 | Save to file | `-s workflows.json` | File created |
| GET-001 | Get by ID | `n8n workflows get <id>` | Full workflow |
| GET-002 | Mode: details | `--mode details` | Metadata only |
| GET-003 | Mode: structure | `--mode structure` | Nodes + connections |
| GET-004 | Mode: minimal | `--mode minimal` | Bare minimum |
| GET-005 | Save workflow | `--save wf.json` | File created |

```bash
echo "=== LST-001: List All ===" 
n8n workflows list --json | jq '.data | length'

echo "=== LST-002: Active Only ===" 
n8n workflows list -a --json | jq '.data[] | {id, name, active}'

echo "=== GET-001: Get by ID ===" 
n8n workflows get $WF_ID --json | jq '{name: .data.name, nodes: (.data.nodes | length)}'

echo "=== GET-002: Mode Details ===" 
n8n workflows get $WF_ID --mode details --json | jq 'keys'
```

### 9.3 Export

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| EXP-001 | Export to stdout | `n8n workflows export <id>` | JSON to stdout |
| EXP-002 | Export to file | `-o backup.json` | File created |
| EXP-003 | Full export | `--full` | All fields included |
| EXP-004 | Stripped export | Default | Server fields removed |

```bash
echo "=== EXP-001: Export to Stdout ===" 
n8n workflows export $WF_ID | jq '.name'

echo "=== EXP-002: Export to File ===" 
n8n workflows export $WF_ID -o backups/wf-backup.json
[ -f backups/wf-backup.json ] && echo "✅ Created"

echo "=== EXP-003: Full Export ===" 
n8n workflows export $WF_ID --full --json | jq 'keys'
```

### 9.4 Update

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| UPD-001 | Update from file | `n8n workflows update <id> -f file.json` | Updated |
| UPD-002 | Update name only | `--name "New Name"` | Name changed |
| UPD-003 | Activate | `--activate` | Workflow active |
| UPD-004 | Deactivate | `--deactivate` | Workflow inactive |
| UPD-005 | Force update | `--force` | No confirmation |
| UPD-006 | No backup | `--no-backup` | Skip backup |

```bash
echo "=== UPD-002: Update Name ===" 
n8n workflows update $WF_ID --name "QA Test Workflow" --force --json | jq '.data.name'

echo "=== UPD-003: Activate ===" 
n8n workflows update $WF_ID --activate --force --json | jq '.data.active'

echo "=== UPD-004: Deactivate ===" 
n8n workflows update $WF_ID --deactivate --force --json | jq '.data.active'
```

### 9.5 Bulk Operations

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| BLK-001 | Activate multiple | `--ids id1,id2` | All activated |
| BLK-002 | Activate all | `--all` | All activated |
| BLK-003 | Deactivate multiple | Same with deactivate | All deactivated |
| BLK-004 | Delete single | `n8n workflows delete --ids <id> --force` | Deleted |
| BLK-005 | Delete confirmation | >10 workflows | TYPE DELETE N |
| BLK-006 | Delete with backup | Default | Backup created |

```bash
echo "=== BLK-003: Deactivate Multiple ===" 
IDS="$WF_ID"  # Add more comma-separated IDs
n8n workflows deactivate --ids $IDS --force --json

echo "=== BLK-004: Delete ===" 
# Create a disposable workflow first
TEMP_ID=$(n8n workflows import workflows/20-radar-scan-schedule.json --json | jq -r '.data.id')
n8n workflows delete --ids $TEMP_ID --force --json
```

### 9.6 Trigger

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| TRG-001 | POST trigger | `n8n workflows trigger <url>` | Webhook called |
| TRG-002 | With JSON data | `-d '{"key":"value"}'` | Data sent |
| TRG-003 | From file | `-d @data.json` | File data sent |
| TRG-004 | GET method | `-m GET` | GET request |

```bash
# Note: Requires a workflow with webhook trigger active
echo "=== TRG-001: Trigger Webhook ===" 
# n8n workflows trigger "http://localhost:5678/webhook/test-path" -d '{"test": true}' --json
echo "Skipped - requires active webhook"
```

### 9.7 Tags Management

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| WTG-001 | Get workflow tags | `n8n workflows tags <id>` | Current tags |
| WTG-002 | Set tags | `--set tag1,tag2` | Tags assigned |

```bash
# First create some tags
TAG_ID=$(n8n tags create -n "qa-test" --json | jq -r '.data.id')

echo "=== WTG-002: Set Tags ===" 
n8n workflows tags $WF_ID --set $TAG_ID --force --json | jq '.data'

echo "=== WTG-001: Get Tags ===" 
n8n workflows tags $WF_ID --json | jq '.data'
```

---

## Phase 10: Diff Engine & Surgical Updates

**Goal:** Test incremental workflow modifications via diff operations.

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
```

---

## Phase 11: Templates & Deploy-Template

**Goal:** Test template discovery and deployment.

### 11.1 Template Search

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| TSR-001 | Keyword search | `n8n templates search "openai"` | API results |
| TSR-002 | By nodes | `--by-nodes slack,webhook` | Local search |
| TSR-003 | By task | `--by-task ai_automation` | Local search |
| TSR-004 | Complexity | `--complexity simple` | Filtered |
| TSR-005 | Setup time | `--max-setup 15` | Max 15 min |
| TSR-006 | Combined | `--complexity medium --service openai` | Combined filters |
| TSR-007 | Local keyword | `--local` | Forced local |
| TSR-008 | Limit results | `-l 20` | 20 results |

```bash
echo "=== TSR-001: Keyword Search ===" 
n8n templates search "openai" --json | jq '.data | length'

echo "=== TSR-002: By Nodes ===" 
n8n templates search --by-nodes slack,webhook --json | jq '.data[].name'

echo "=== TSR-003: By Task ===" 
n8n templates search --by-task ai_automation --json | jq '.data | length'

echo "=== TSR-004: Complexity ===" 
n8n templates search --complexity simple --json | jq '.data[0]'
```

### 11.2 Template Tasks

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| TTK-001 | List tasks | `n8n templates list-tasks` | All tasks |
| TTK-002 | JSON output | `--json` | Valid JSON |

```bash
echo "=== TTK-001: List Tasks ===" 
n8n templates list-tasks --json | jq '.data'
```

### 11.3 Template Get & Deploy

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| TGT-001 | Get template | `n8n templates get 3121` | Template JSON |
| TGT-002 | Save template | `-s template.json` | File created |
| TDP-001 | Deploy template | `n8n workflows deploy-template 3121` | Workout created |
| TDP-002 | Custom name | `--name "My Custom Bot"` | Name overridden |
| TDP-003 | Dry run | `--dry-run` | Preview only |
| TDP-004 | No autofix | `--no-autofix` | Skip fixes |
| TDP-005 | Keep credentials | `--keep-credentials` | Preserve refs |
| TDP-006 | Save locally | `-s workflow.json` | File created |

```bash
echo "=== TGT-001: Get Template ===" 
n8n templates get 3121 --json | jq '{name: .data.name, nodes: (.data.workflow.nodes | length)}'

echo "=== TDP-003: Deploy Dry Run ===" 
n8n workflows deploy-template 3121 --dry-run --json | jq '{name: .data.name, requiresCredentials: .data.credentialsRequired}'

echo "=== TDP-001: Deploy Template ===" 
TEMPLATE_WF=$(n8n workflows deploy-template 3121 --name "QA Template Test" --json)
echo "$TEMPLATE_WF" | jq '{id: .data.id, name: .data.name, active: .data.active}'
```

---

## Phase 12: Executions Management

**Goal:** Test execution listing, inspection, and retry.

### 12.1 Execution Listing

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| EXL-001 | List all | `n8n executions list` | Recent executions |
| EXL-002 | Filter by workflow | `-w <workflow-id>` | Filtered |
| EXL-003 | Filter by status | `--status error` | Only errors |
| EXL-004 | Status success | `--status success` | Only success |
| EXL-005 | Status waiting | `--status waiting` | Only waiting |
| EXL-006 | Custom limit | `-l 50` | 50 results |
| EXL-007 | Pagination | `--cursor <cursor>` | Next page |

```bash
echo "=== EXL-001: List All ===" 
n8n executions list --json | jq '.data[:3] | .[] | {id, status, workflowName}'

echo "=== EXL-003: Filter by Status ===" 
n8n executions list --status error --json | jq '.data | length'

echo "=== EXL-002: Filter by Workflow ===" 
n8n executions list -w $WF_ID --json | jq '.data | length'
```

### 12.2 Execution Details

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| EXD-001 | Get execution | `n8n executions get <id>` | Execution details |
| EXD-002 | Mode preview | `--mode preview` | Quick overview |
| EXD-003 | Mode summary | `--mode summary` | Default |
| EXD-004 | Mode filtered | `--mode filtered` | No large data |
| EXD-005 | Mode full | `--mode full` | Complete data |
| EXD-006 | Save to file | `-s exec.json` | File created |

```bash
# Get an execution ID first
EXEC_ID=$(n8n executions list -l 1 --json | jq -r '.data[0].id')

echo "=== EXD-002: Preview Mode ===" 
n8n executions get $EXEC_ID --mode preview --json | jq '.'

echo "=== EXD-003: Summary Mode ===" 
n8n executions get $EXEC_ID --mode summary --json | jq 'keys'
```

### 12.3 Retry & Delete

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| EXR-001 | Retry execution | `n8n executions retry <id>` | New execution |
| EXR-002 | Retry load latest | `--load-latest` | Uses current workflow |
| EXR-003 | Delete execution | `n8n executions delete <id> --force` | Deleted |

```bash
# Get a failed execution
FAILED_ID=$(n8n executions list --status error -l 1 --json | jq -r '.data[0].id')

if [ "$FAILED_ID" != "null" ]; then
  echo "=== EXR-001: Retry ===" 
  n8n executions retry $FAILED_ID --json
fi
```

---

## Phase 13: Credentials Management

**Goal:** Test credential CRUD operations.

### 13.1 Credential Types (Offline)

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CRT-001 | List types | `n8n credentials types` | 200+ types |
| CRT-002 | By auth method | `--by-auth` | Grouped |
| CRT-003 | Search types | `-s "github"` | Filtered |
| CRT-004 | JSON output | `--json` | Valid JSON |

```bash
echo "=== CRT-001: List Types ===" 
COUNT=$(n8n credentials types --json | jq '.data | length')
echo "Total types: $COUNT"
[ "$COUNT" -ge 200 ] && echo "✅ Pass"

echo "=== CRT-002: By Auth ===" 
n8n credentials types --by-auth --json | jq 'keys'

echo "=== CRT-003: Search ===" 
n8n credentials types -s "github" --json | jq '.data[].name'
```

### 13.2 Credential Schema

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CRS-001 | Get schema | `n8n credentials schema githubApi` | Schema JSON |
| CRS-002 | Show-type alias | `n8n credentials show-type githubApi` | Same result |
| CRS-003 | Unknown type | `n8n credentials schema unknownType` | Error |

```bash
echo "=== CRS-001: Get Schema ===" 
n8n credentials schema githubApi --json | jq '.data.properties | keys'
```

### 13.3 Credential CRUD

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CRC-001 | List credentials | `n8n credentials list` | All credentials |
| CRC-002 | Create credential | See below | Credential created |
| CRC-003 | Create from file | `-d @creds.json` | Credential created |
| CRC-004 | Delete credential | `n8n credentials delete <id> --force` | Deleted |

```bash
echo "=== CRC-001: List Credentials ===" 
n8n credentials list --json | jq '.data | length'

# Create test credential (use fake data)
echo '{"accessToken":"test_token_12345"}' > /tmp/github-creds.json
chmod 600 /tmp/github-creds.json

echo "=== CRC-002: Create Credential ===" 
CRED_RESULT=$(n8n credentials create \
  --type githubApi \
  --name "QA Test GitHub" \
  --data @/tmp/github-creds.json \
  --json)
CRED_ID=$(echo "$CRED_RESULT" | jq -r '.data.id')
echo "Created: $CRED_ID"

echo "=== CRC-004: Delete Credential ===" 
n8n credentials delete $CRED_ID --force --json

rm /tmp/github-creds.json
```

---

## Phase 14: Variables & Tags

### 14.1 Variables (Enterprise)

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| VAR-001 | List variables | `n8n variables list` | All variables |
| VAR-002 | Create variable | `n8n variables create -k API_KEY -v "xxx"` | Created |
| VAR-003 | Update variable | `n8n variables update <id> -k API_KEY -v "yyy"` | Updated |
| VAR-004 | Delete variable | `n8n variables delete <id> --force` | Deleted |
| VAR-005 | Invalid key | `-k "invalid-key"` | Error |

```bash
echo "=== VAR-001: List Variables ===" 
n8n variables list --json | jq '.data'

# Note: May fail on community edition
echo "=== VAR-002: Create Variable ===" 
VAR_RESULT=$(n8n variables create -k QA_TEST_VAR -v "test_value" --json 2>&1) || true
echo "$VAR_RESULT"
```

### 14.2 Tags

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| TAG-001 | List tags | `n8n tags list` | All tags |
| TAG-002 | Get tag | `n8n tags get <id>` | Tag details |
| TAG-003 | Create tag | `n8n tags create -n "production"` | Created |
| TAG-004 | Update tag | `n8n tags update <id> -n "prod"` | Renamed |
| TAG-005 | Delete tag | `n8n tags delete <id> --force` | Deleted |

```bash
echo "=== TAG-001: List Tags ===" 
n8n tags list --json | jq '.data'

echo "=== TAG-003: Create Tag ===" 
TAG_RESULT=$(n8n tags create -n "qa-test-tag-$(date +%s)" --json)
TAG_ID=$(echo "$TAG_RESULT" | jq -r '.data.id')
echo "Created: $TAG_ID"

echo "=== TAG-004: Update Tag ===" 
n8n tags update $TAG_ID -n "qa-updated-tag" --json | jq '.data.name'

echo "=== TAG-005: Delete Tag ===" 
n8n tags delete $TAG_ID --force --json
```

---

## Phase 15: Security Audit

**Goal:** Test security audit capabilities.

### 15.1 Audit Commands

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| AUD-001 | Full audit | `n8n audit` | Complete report |
| AUD-002 | Credentials | `-c credentials` | Credential audit |
| AUD-003 | Nodes | `-c nodes` | Risky nodes |
| AUD-004 | Database | `-c database` | DB security |
| AUD-005 | Filesystem | `-c filesystem` | File access |
| AUD-006 | Instance | `-c instance` | Config audit |
| AUD-007 | Combined | `-c credentials,nodes` | Multiple |
| AUD-008 | Abandoned | `--days-abandoned 90` | Old workflows |
| AUD-009 | Save report | `-s audit.json` | File created |

```bash
echo "=== AUD-001: Full Audit ===" 
n8n audit --json | jq '.data.sections | length'

echo "=== AUD-002: Credentials Audit ===" 
n8n audit -c credentials --json | jq '.data.sections[].issues | length'

echo "=== AUD-007: Combined Audit ===" 
n8n audit -c credentials,nodes --json | jq '.data.summary'

echo "=== AUD-008: Abandoned Workflows ===" 
n8n audit --days-abandoned 90 --json | jq '.data.sections[] | select(.name | contains("abandoned"))'
```

---

## Phase 16: Edge Cases & Error Handling

**Goal:** Test robustness and graceful degradation.

### 16.1 Input Edge Cases

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| EDG-001 | Empty file | 0 bytes | Graceful error |
| EDG-002 | Null workflow | `null` | Error message |
| EDG-003 | Very large file | 50MB JSON | Handles or rejects |
| EDG-004 | Binary file | PNG image | Graceful error |
| EDG-005 | Unicode names | Workflow name: 你好 | Handled |
| EDG-006 | Special chars | Name with `<>&"` | Escaped properly |
| EDG-007 | Empty nodes | `"nodes": []` | Warning, not error |
| EDG-008 | Circular ref | JSON with cycles | Graceful error |

```bash
# Create edge case files
echo "" > workflows/broken/edg-001.json
echo "null" > workflows/broken/edg-002.json
head -c 100 /dev/urandom > workflows/broken/edg-004.bin

echo "=== EDG-001: Empty File ===" 
n8n workflows validate workflows/broken/edg-001.json --json 2>&1; echo "Exit: $?"

echo "=== EDG-002: Null ===" 
n8n workflows validate workflows/broken/edg-002.json --json 2>&1; echo "Exit: $?"

echo "=== EDG-004: Binary ===" 
n8n workflows validate workflows/broken/edg-004.bin --json 2>&1; echo "Exit: $?"

# EDG-005: Unicode
cat > workflows/broken/edg-005.json << 'EOF'
{
  "name": "你好世界 Workflow",
  "nodes": [],
  "connections": {}
}
EOF
echo "=== EDG-005: Unicode ===" 
n8n workflows validate workflows/broken/edg-005.json --json | jq '.valid'
```

### 16.2 Network Edge Cases

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| NET-001 | No internet | Disconnect network | Offline commands work |
| NET-002 | Timeout | Very slow server | Timeout error |
| NET-003 | SSL error | Self-signed cert | Certificate error |
| NET-004 | Rate limit | Many requests | 71 (TEMPFAIL) |
| NET-005 | Invalid host | `http://invalid.local` | Connection error |

```bash
echo "=== NET-001: Offline Commands ===" 
# These should work without API
n8n nodes search slack --json > /dev/null && echo "✅ Nodes search: OK"
n8n workflows validate workflows/01-profile-linkedin-search-webhook.json --json > /dev/null && echo "✅ Validation: OK"
n8n credentials types --json > /dev/null && echo "✅ Credential types: OK"

echo "=== NET-005: Invalid Host ===" 
N8N_HOST="http://invalid.local:9999" n8n health --json 2>&1; echo "Exit: $?"
```

### 16.3 Permission Edge Cases

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| PRM-001 | Read-only file | `chmod 444 file.json` | Can read |
| PRM-002 | No write dir | Save to `/` | Permission error |
| PRM-003 | Invalid API key | Wrong key | 73 (NOPERM) |
| PRM-004 | Expired key | Old key | Auth error |

```bash
echo "=== PRM-001: Read-Only File ===" 
chmod 444 workflows/01-profile-linkedin-search-webhook.json
n8n workflows validate workflows/01-profile-linkedin-search-webhook.json --json | jq '.valid'
chmod 644 workflows/01-profile-linkedin-search-webhook.json

echo "=== PRM-002: No Write Permission ===" 
n8n workflows export $WF_ID -o /root/test.json 2>&1; echo "Exit: $?"

echo "=== PRM-003: Invalid API Key ===" 
N8N_API_KEY="invalid_key" n8n health --json 2>&1; echo "Exit: $?"
```

---

## Phase 17: Exit Codes & Scripting

**Goal:** Verify POSIX-compliant exit codes for CI/CD integration.

### 17.1 Exit Code Matrix

| Code | Name | Test Command | Trigger |
|------|------|--------------|---------|
| 0 | SUCCESS | `n8n nodes search slack` | Valid operation |
| 1 | GENERAL | Various | Unknown errors |
| 64 | USAGE | `n8n foobar` | Unknown command |
| 65 | DATAERR | `n8n workflows validate broken.json` | Invalid data |
| 66 | NOINPUT | `n8n workflows validate nonexistent.json` | File not found |
| 70 | IOERR | Network fail | I/O error |
| 71 | TEMPFAIL | Rate limit | Temporary fail |
| 72 | PROTOCOL | API error | Server error |
| 73 | NOPERM | Invalid auth | Permission denied |
| 78 | CONFIG | Bad config | Config error |

```bash
echo "=== Testing Exit Codes ===" 

# Exit 0: Success
n8n nodes search slack > /dev/null
echo "Exit 0 (SUCCESS): $?"

# Exit 64: Usage error
n8n unknowncommand > /dev/null 2>&1
echo "Exit 64 (USAGE): $?"

# Exit 65: Data error
n8n workflows validate workflows/broken/syn-001.json > /dev/null 2>&1
echo "Exit 65 (DATAERR): $?"

# Exit 66: File not found
n8n workflows validate /nonexistent/file.json > /dev/null 2>&1
echo "Exit 66 (NOINPUT): $?"

# Exit 73: Permission denied
N8N_API_KEY="wrong" n8n workflows list > /dev/null 2>&1
echo "Exit 73 (NOPERM): $?"
```

### 17.2 Script Integration Examples

```bash
#!/bin/bash
# Example: CI/CD workflow validation script

validate_workflow() {
    local file=$1
    
    n8n workflows validate "$file" --json > /tmp/result.json 2>&1
    local exit_code=$?
    
    case $exit_code in
        0)
            echo "✅ $file is valid"
            return 0
            ;;
        65)
            echo "❌ $file has validation errors:"
            jq '.errors[]' /tmp/result.json
            return 1
            ;;
        66)
            echo "❌ File not found: $file"
            return 1
            ;;
        *)
            echo "⚠️ Unexpected error (code $exit_code)"
            return 1
            ;;
    esac
}

# Usage in pipeline
for f in workflows/*.json; do
    validate_workflow "$f" || exit 1
done
```

---

## Phase 18: Performance & Stress Testing

**Goal:** Verify performance under load.

### 18.1 Performance Benchmarks

| Test ID | Test Case | Target | Measure |
|---------|-----------|--------|---------|
| PRF-001 | Node search speed | `n8n nodes search slack` | < 100ms |
| PRF-002 | Node list (800+) | `n8n nodes list --limit 0` | < 500ms |
| PRF-003 | Validation speed | Single workflow | < 200ms |
| PRF-004 | Schema lookup | `n8n nodes show slack` | < 150ms |
| PRF-005 | Large workflow | 100+ nodes | < 2s |

```bash
echo "=== Performance Benchmarks ===" 

# PRF-001: Node search
START=$(date +%s%N)
n8n nodes search slack --json > /dev/null
END=$(date +%s%N)
echo "Node search: $(( (END-START)/1000000 ))ms"

# PRF-002: Node list
START=$(date +%s%N)
n8n nodes list --limit 0 --json > /dev/null
END=$(date +%s%N)
echo "Node list (all): $(( (END-START)/1000000 ))ms"

# PRF-003: Validation
START=$(date +%s%N)
n8n workflows validate workflows/01-profile-linkedin-search-webhook.json --json > /dev/null
END=$(date +%s%N)
echo "Validation: $(( (END-START)/1000000 ))ms"
```

### 18.2 Stress Tests

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| STR-001 | Consecutive searches | 100 searches | No degradation |
| STR-002 | Parallel validations | 10 concurrent | All complete |
| STR-003 | Large batch import | 50 workflows | All imported |
| STR-004 | Memory stability | Long running | No leaks |

```bash
echo "=== STR-001: Consecutive Searches ===" 
for i in {1..20}; do
    n8n nodes search "test$i" --json > /dev/null
done
echo "20 searches completed"

echo "=== STR-002: Parallel Validations ===" 
for f in workflows/*.json; do
    n8n workflows validate "$f" --json > /dev/null &
done
wait
echo "Parallel validations completed"
```

---

## Phase 19: End-to-End Agent Simulation

**Goal:** Simulate complete AI agent workflow creation cycle.

### 19.1 Agent Workflow Simulation

```bash
#!/bin/bash
# Simulates: Agent generates → Validates → Fixes → Deploys

echo "🤖 AGENT SIMULATION: Complete Workflow Cycle"
echo "============================================="

# Step 1: Agent "generates" a workflow (with intentional issues)
echo "Step 1: Generate workflow with issues..."
cat > /tmp/agent-workflow.json << 'EOF'
{
  "name": "Agent Generated Workflow",
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "webhok",
      "typeVersion": 1,
      "position": [200, 200],
      "parameters": {}
    },
    {
      "name": "Process Data",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [400, 200],
      "parameters": {
        "jsCode": "return items.map(i => ({ json: { processed: {{ $json.data }} }}));"
      }
    },
    {
      "name": "HTTP Call",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [600, 200],
      "parameters": {
        "url": "{{ $json.endpoint }}",
        "method": "POST"
      }
    }
  ],
  "connections": {
    "Webhook Trigger": {
      "main": [[{"node": "Process Data", "type": "main", "index": 0}]]
    },
    "Process Data": {
      "main": [[{"node": "HTTP Call", "type": "main", "index": 0}]]
    }
  }
}
EOF

# Step 2: Validate (expect errors)
echo "Step 2: Validate (expecting errors)..."
VALIDATION=$(n8n workflows validate /tmp/agent-workflow.json --json)
VALID=$(echo "$VALIDATION" | jq -r '.valid')
ERROR_COUNT=$(echo "$VALIDATION" | jq '.errors | length')

echo "Valid: $VALID"
echo "Errors: $ERROR_COUNT"

if [ "$VALID" = "false" ]; then
    echo "Issues found:"
    echo "$VALIDATION" | jq '.errors[] | {code, message: .message[:50]}'
fi

# Step 3: Auto-fix
echo "Step 3: Auto-fix issues..."
n8n workflows autofix /tmp/agent-workflow.json \
    --apply \
    --save /tmp/agent-workflow-fixed.json \
    --force \
    --json | jq '{applied: .applied, fixes: .fixes | length}'

# Step 4: Re-validate
echo "Step 4: Re-validate..."
REVALIDATION=$(n8n workflows validate /tmp/agent-workflow-fixed.json --json)
VALID_AFTER=$(echo "$REVALIDATION" | jq -r '.valid')
echo "Valid after fix: $VALID_AFTER"

# Step 5: Deploy
if [ "$VALID_AFTER" = "true" ]; then
    echo "Step 5: Deploy to n8n..."
    DEPLOY_RESULT=$(n8n workflows import /tmp/agent-workflow-fixed.json --json)
    WORKFLOW_ID=$(echo "$DEPLOY_RESULT" | jq -r '.data.id')
    echo "✅ Deployed! Workflow ID: $WORKFLOW_ID"
    
    # Step 6: Verify
    echo "Step 6: Verify deployment..."
    n8n workflows get $WORKFLOW_ID --mode minimal --json | jq '{name, nodes: .nodes | length}'
else
    echo "❌ Still invalid after fixes. Errors:"
    echo "$REVALIDATION" | jq '.errors'
fi

# Cleanup
rm -f /tmp/agent-workflow.json /tmp/agent-workflow-fixed.json
echo "============================================="
echo "🤖 AGENT SIMULATION COMPLETE"
```

### 19.2 Multi-Environment Deployment

```bash
#!/bin/bash
# Simulates: Dev → Staging → Production deployment

echo "🚀 Multi-Environment Deployment Test"
echo "====================================="

WORKFLOW_FILE="workflows/01-profile-linkedin-search-webhook.json"

# Deploy to each environment
for ENV in local staging; do  # Add 'production' if available
    echo "Deploying to: $ENV"
    
    # Switch profile
    RESULT=$(n8n --profile $ENV workflows import $WORKFLOW_FILE --name "QA-$ENV-$(date +%s)" --json 2>&1)
    
    if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
        ID=$(echo "$RESULT" | jq -r '.data.id')
        echo "✅ $ENV: Deployed as $ID"
    else
        echo "❌ $ENV: Failed"
        echo "$RESULT" | head -5
    fi
done
```

---

## Master QA Checklist

### Installation & Setup
- [ ] `n8n --version` returns valid version
- [ ] `n8n --help` shows all 15 command groups
- [ ] All subcommand help works (`n8n <cmd> --help`)
- [ ] Shell completions work (bash/zsh/fish)

### Authentication & Configuration
- [ ] `n8n auth login` works (flags and interactive)
- [ ] `n8n auth status` shows connection status
- [ ] `n8n auth logout` clears credentials
- [ ] `n8n health` checks connectivity
- [ ] Configuration file precedence works
- [ ] Profile switching works (`--profile`)
- [ ] Environment variables override config

### Offline Node Database
- [ ] `n8n nodes list` shows 800+ nodes
- [ ] `n8n nodes search` (OR/AND/FUZZY modes)
- [ ] `n8n nodes show` (all detail levels)
- [ ] `n8n nodes categories` lists all categories
- [ ] `n8n nodes validate` validates configs
- [ ] `n8n nodes breaking-changes` analyzes versions

### Validation Engine
- [ ] JSON syntax errors detected
- [ ] JSON repair mode (`--repair`) works
- [ ] Missing required properties caught
- [ ] All validation profiles work
- [ ] All validation modes work
- [ ] Expression format validation works
- [ ] Node type suggestions work
- [ ] Version checking works (`--check-versions`)
- [ ] Upgrade checking works (`--check-upgrades`)

### AI Node Validation
- [ ] MISSING_LANGUAGE_MODEL detected
- [ ] TOO_MANY_LANGUAGE_MODELS detected
- [ ] FALLBACK_MISSING_SECOND_MODEL detected
- [ ] All AI error codes work

### Auto-Fix Engine
- [ ] Preview mode works
- [ ] Apply mode works
- [ ] Confidence filtering works
- [ ] Fix type filtering works
- [ ] Post-update guidance displays
- [ ] Backup created before fixes

### Version Management
- [ ] Version history listing works
- [ ] Rollback works
- [ ] Version comparison works
- [ ] Pruning works
- [ ] Storage stats work

### Workflow Lifecycle
- [ ] Create/Import works
- [ ] List/Get works
- [ ] Export works
- [ ] Update works
- [ ] Activate/Deactivate works
- [ ] Delete works (with safety checks)
- [ ] Trigger webhook works
- [ ] Tag management works

### Diff Engine
- [ ] All 17 operation types work
- [ ] Dry-run mode works
- [ ] Continue-on-error mode works
- [ ] Smart branch parameters work

### Templates
- [ ] Keyword search works (API)
- [ ] By-nodes search works (local)
- [ ] By-task search works (local)
- [ ] Template deployment works
- [ ] Auto-fix during deploy works

### Executions
- [ ] List executions works
- [ ] Filter by status works
- [ ] Get execution details works
- [ ] Retry execution works
- [ ] Delete execution works

### Credentials
- [ ] List credentials works
- [ ] Get schema works
- [ ] Create credential works
- [ ] Delete credential works
- [ ] Credential types (offline) works

### Variables & Tags
- [ ] Variables CRUD works (Enterprise)
- [ ] Tags CRUD works

### Security Audit
- [ ] Full audit works
- [ ] Category filtering works
- [ ] Abandoned workflow detection works

### Exit Codes
- [ ] Exit 0 on success
- [ ] Exit 64 on usage error
- [ ] Exit 65 on data error
- [ ] Exit 66 on file not found
- [ ] Exit 70 on I/O error
- [ ] Exit 73 on permission denied

### Edge Cases
- [ ] Empty file handled
- [ ] Invalid JSON handled
- [ ] Binary file rejected
- [ ] Unicode supported
- [ ] Very large files handled
- [ ] Network failures handled

### Performance
- [ ] Node search < 100ms
- [ ] Validation < 200ms
- [ ] No memory leaks on repeated operations

---

## Test Execution Summary Template

```markdown
# QA Test Run Report

**Date:** YYYY-MM-DD
**Version:** n8n-cli vX.X.X
**Tester:** Name
**Environment:** OS / Node version

## Results Summary

| Phase | Tests | Pass | Fail | Skip |
|-------|-------|------|------|------|
| 1. Installation | X | X | X | X |
| 2. Auth & Config | X | X | X | X |
| ... | ... | ... | ... | ... |
| **TOTAL** | **X** | **X** | **X** | **X** |

## Failed Tests

| Test ID | Description | Expected | Actual | Notes |
|---------|-------------|----------|--------|-------|
| XXX-001 | ... | ... | ... | ... |

## Blockers

- [ ] Issue 1
- [ ] Issue 2

## Sign-off

- [ ] All critical tests pass
- [ ] No P1 blockers
- [ ] Ready for release: YES / NO
```

---

This comprehensive QA plan covers **300+ test cases** across **19 phases**, ensuring complete coverage of the n8n-cli's **70+ commands** and **300+ flags**. Execute phases sequentially or in parallel based on your CI/CD capabilities.

