## Phase 33: Template Metadata & Filters

**Goal:** Test template metadata search and SQL filtering logic.
**Source Truth:** `core/templates/repository.ts` (Lines 300-330)
- `buildMetadataFilterConditions`: Uses `json_extract` on `metadata_json`

### 33.1 Metadata Filter SQL Generation

| Test ID | Test Case | Filter | Expected SQL Logic |
|---------|-----------|--------|-------------------|
| TPL-013 | Complexity | `--complexity simple` | `json_extract(..., '$.complexity') = 'simple'` |
| TPL-014 | Setup Time | `--max-setup 10` | `CAST(... AS INTEGER) <= 10` |
| TPL-015 | Service Filter | `--service openai` | `json_extract(..., '$.services')` contains |
| TPL-016 | Combined | Multiple filters | AND conditions |

```bash
echo "=== TPL-013: Complexity Filter ==="
n8n templates search --complexity simple --local --json | jq '.data[:3] | .[].metadata.complexity // "unknown"'
# All results should be "simple"

echo "=== TPL-014: Setup Time Filter ==="
n8n templates search --max-setup 10 --local --json | jq '.data[:5] | .[].metadata.estimated_setup_minutes'
# All results should be <= 10

echo "=== TPL-015: Service Filter ==="
n8n templates search --service openai --local --json | jq '.data[:3] | .[].name'
# Results should relate to OpenAI

echo "=== TPL-016: Combined Filters ==="
n8n templates search --complexity simple --max-setup 15 --local --json | jq '{count: (.data | length), first: .data[0].name}'
```

### 33.2 Metadata-Absent Templates

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| MTA-001 | No Metadata | Template without metadata | Excluded from filter results |
| MTA-002 | Partial Metadata | Missing some fields | Uses defaults |
| MTA-003 | API vs Local | `--local` flag | Uses local DB metadata |

```bash
echo "=== MTA-001: Templates Without Metadata ==="
# Search with strict filters - templates without metadata should be excluded
FILTERED=$(n8n templates search --complexity simple --local --json | jq '.data | length')
TOTAL=$(n8n templates search --local --json | jq '.data | length')
echo "Filtered: $FILTERED / Total: $TOTAL"

echo "=== MTA-003: API vs Local Search ==="
# API search (keyword)
API_COUNT=$(n8n templates search "openai" --json 2>/dev/null | jq '.data | length')
# Local search (by-nodes)
LOCAL_COUNT=$(n8n templates search --by-nodes openai --local --json | jq '.data | length')
echo "API results: $API_COUNT, Local results: $LOCAL_COUNT"
```

### 33.3 Task-Based Search

| Test ID | Test Case | Task | Expected |
|---------|-----------|------|----------|
| TSK-001 | AI Automation | `--by-task ai_automation` | AI-related templates |
| TSK-002 | Marketing | `--by-task marketing` | Marketing templates |
| TSK-003 | Unknown Task | `--by-task xyz123` | Empty results |

```bash
echo "=== TSK-001: AI Automation Task ==="
n8n templates search --by-task ai_automation --local --json | jq '.data[:3] | .[].name'

echo "=== TSK-003: Unknown Task ==="
COUNT=$(n8n templates search --by-task xyz123unknown --local --json | jq '.data | length')
echo "Results for unknown task: $COUNT"  # Expected: 0
```

---

## Source Code Reference

**`core/templates/repository.ts`:**
```typescript
// Lines 300-330: buildMetadataFilterConditions()
// Generates SQL WHERE conditions for metadata filtering:
// - json_extract(metadata_json, '$.complexity') = ?
// - CAST(json_extract(metadata_json, '$.estimated_setup_minutes') AS INTEGER) <= ?
// - json_extract(metadata_json, '$.services') LIKE '%openai%'
// Only includes templates that HAVE the required metadata fields
```
