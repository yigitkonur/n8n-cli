## Phase 7: Auto-Fix Engine

**Goal:** Verify automatic repair capabilities with confidence levels.
**Source Truth:** `core/autofix/engine.ts`, `core/autofix/types.ts`

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

### 7.4 Version Migration Integration

**Source Truth:** `core/autofix/engine.ts` uses `NodeVersionService`, `NodeMigrationService`, `BreakingChangeDetector`

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| VMI-001 | Upgrade fix | Outdated typeVersion | Applies migrations |
| VMI-002 | Skip info-only | `version-migration` fix | NOT applied (bug fix) |
| VMI-003 | Breaking change hint | Major version diff | Shows guidance |
| VMI-004 | Applied migrations | Complex upgrade | Lists applied changes |

```bash
# Test version-migration skip (bug fix verification)
cat > workflows/broken/version-test.json << 'EOF'
{
  "name": "Version Test",
  "nodes": [
    {
      "name": "HTTP",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [400, 300],
      "parameters": {"url": "http://example.com"}
    }
  ],
  "connections": {}
}
EOF

echo "=== VMI-001: Upgrade Fix ==="
n8n workflows autofix workflows/broken/version-test.json --upgrade-versions --json | jq '.fixes[] | select(.type | contains("version"))'

echo "=== VMI-004: Applied Migrations ==="
n8n workflows autofix workflows/broken/version-test.json --upgrade-versions --apply --force --json | jq '.fixes[].appliedMigrations // empty'
```

**Autofix Architecture:**
- `version-migration` fixes are INFO-ONLY (not applied) - prevents typeVersion corruption
- Uses versioning services for upgrade migrations
- Backup created before any modifications
