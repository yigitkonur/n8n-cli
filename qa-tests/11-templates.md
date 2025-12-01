## Phase 11: Templates & Deploy-Template

**Goal:** Test template discovery and deployment.
**Source Truth:** `commands/workflows/deploy-template.ts`, `core/credential-utils.ts`

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

### 11.4 Credential Handling

**Source Truth:** `core/credential-utils.ts` - `stripCredentials`, `extractCredentials`

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| TCR-001 | Credentials stripped | Default deploy | No credentials |
| TCR-002 | Keep credentials | `--keep-credentials` | Preserved |
| TCR-003 | Extract types | Deploy output | Lists required types |

```bash
echo "=== TCR-001: Credentials Stripped (Default) ==="
n8n workflows deploy-template 3121 --dry-run --json | jq '.data.workflow.nodes[] | select(.credentials) | .credentials'
# Should be empty

echo "=== TCR-002: Keep Credentials ==="
n8n workflows deploy-template 3121 --dry-run --keep-credentials --json | jq '.data.workflow.nodes[] | select(.credentials) | has("credentials")'

echo "=== TCR-003: Extract Required Types ==="
n8n workflows deploy-template 3121 --dry-run --json | jq '.data.credentialsRequired'
```

### 11.5 Template Autofix Pipeline

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| TAF-001 | Expression fix | `{{ }}` → `={{ }}` | Auto-fixed |
| TAF-002 | Switch fix | Switch v3 conditions | Auto-fixed |
| TAF-003 | No autofix | `--no-autofix` | Issues preserved |

```bash
echo "=== TAF-001: Template Autofix ==="
# Count expression issues before/after
n8n workflows deploy-template 3121 --dry-run --json | jq '.data.fixesApplied'
n8n workflows deploy-template 3121 --dry-run --no-autofix --json | jq '.data.fixesApplied // 0'
```

