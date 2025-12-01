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

**Source Truth:** `core/db/nodes.ts` (Lines 65-100) - FTS5 with BM25 ranking, LIKE fallback

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
| SRC-009 | Special chars | `n8n nodes search "http-request OR *"` | Sanitized, no crash |
| SRC-010 | BM25 ranking | `n8n nodes search "http"` | Name match > desc match |

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

echo "=== SRC-009: FTS5 Special Char Sanitization ===" 
# These special chars are escaped: '"(){}[]*+-:^~
n8n nodes search "http-request OR *" --json 2>&1
echo "Exit: $?"  # Should be 0

echo "=== SRC-010: BM25 Ranking ===" 
FIRST=$(n8n nodes search "http" --limit 1 --json | jq -r '.data[0].name')
echo "Top result: $FIRST"
[[ "$FIRST" == *"HTTP"* ]] && echo "✅ Relevant result first"
```

**FTS5 Internals:**
- Uses `nodes_fts` virtual table (created by MCP)
- Falls back to LIKE search if FTS5 unavailable
- Escapes special characters before query
- BM25 ranking for relevance sorting

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

