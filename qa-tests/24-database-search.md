## Phase 23: Database & Search Internals

**Goal:** Test FTS5 search, LIKE fallback, and node type normalization.
**Source Truth:** `core/db/nodes.ts`, `core/db/adapter.ts`, `utils/node-type-normalizer.ts`

### 23.1 FTS5 vs LIKE Fallback

**Target:** `searchNodes` in `nodes.ts` (Lines 65-100)

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| DB-001 | FTS5 Ranking | Search "http" | Name match > Description match |
| DB-002 | FTS5 Syntax Sanitization | `http-request OR *` | Sanitizes to safe query |
| DB-003 | FTS5 Special Chars | `"http request"` | Phrase match works |
| DB-004 | LIKE Fallback | Invalid FTS5 syntax | Falls back gracefully |
| DB-005 | BM25 Scoring | Multiple results | Sorted by relevance |

```bash
echo "=== DB-001: FTS5 Ranking ==="
# Results should prioritize name matches
n8n nodes search "http" --limit 10 --json | jq '.data[:5] | .[].name'
# "HTTP Request" should appear before nodes that mention HTTP only in description

echo "=== DB-002: FTS5 Syntax Sanitization ==="
# Special characters should not crash
n8n nodes search "http-request OR *" --json 2>&1
echo "Exit: $?"  # Should be 0 (sanitized and searched)

echo "=== DB-003: FTS5 Special Chars Escaping ==="
# These should not cause syntax errors
n8n nodes search 'slack "send message"' --json | jq '.data | length'
n8n nodes search "webhook ()" --json | jq '.data | length'
n8n nodes search "test+node" --json | jq '.data | length'

echo "=== DB-005: BM25 Scoring ==="
# Verify relevance sorting - exact matches first
FIRST=$(n8n nodes search "slack" --limit 1 --json | jq -r '.data[0].name')
echo "Top result for 'slack': $FIRST"
[[ "$FIRST" == *"Slack"* ]] && echo "✅ Relevant result first" || echo "⚠️ Check ranking"
```

### 23.2 Node Type Normalization

**Target:** `utils/node-type-normalizer.ts`

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| NRM-001 | Short-Form Lookup | `httpRequest` | Resolves to `n8n-nodes-base.httpRequest` |
| NRM-002 | Database Format | `nodes-base.httpRequest` | Resolves correctly |
| NRM-003 | LangChain Prefix | `nodes-langchain.agent` | Resolves to `@n8n/n8n-nodes-langchain.agent` |
| NRM-004 | Full Type Passthrough | `n8n-nodes-base.slack` | Unchanged |
| NRM-005 | Trigger Suffix | `slack` when looking for trigger | Finds `slackTrigger` |
| NRM-006 | Case Insensitive | `HTTPREQUEST` | Resolves correctly |

```bash
echo "=== NRM-001: Short-Form Lookup ==="
n8n nodes show httpRequest --json | jq '.data.name'

echo "=== NRM-002: Database Format ==="
n8n nodes show nodes-base.httpRequest --json 2>&1 | jq '.data.name // .error'

echo "=== NRM-003: LangChain Prefix ==="
n8n nodes show nodes-langchain.agent --json 2>&1 | jq '.data.name // .error'

echo "=== NRM-004: Full Type Passthrough ==="
n8n nodes show n8n-nodes-base.slack --json | jq '.data.name'

echo "=== NRM-005: Trigger Variations ==="
n8n nodes search "slack" --json | jq '.data[].name' | grep -i trigger

echo "=== NRM-006: Case Insensitive ==="
n8n nodes show HTTPREQUEST --json 2>&1 | jq '.data.name // .error'
```

### 23.3 Database Adapter Internals

**Target:** `core/db/adapter.ts`

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| ADP-001 | Lazy FTS5 Detection | First search | Detects `nodes_fts` table |
| ADP-002 | Read-Only Mode | CLI mode | Cannot create tables |
| ADP-003 | Connection Pooling | Multiple searches | Reuses connection |
| ADP-004 | Graceful Close | Process exit | DB properly closed |

```bash
echo "=== ADP-001: Lazy FTS5 Detection ==="
# First search triggers FTS5 detection
n8n nodes search "test" -v 2>&1 | grep -i "fts5\|fulltext"

echo "=== ADP-003: Connection Reuse ==="
# Multiple rapid searches should reuse connection
for i in {1..5}; do
    n8n nodes search "test$i" --json > /dev/null
done
echo "5 searches completed (connection reuse expected)"

echo "=== Database Stats ==="
# If available, show database statistics
n8n nodes list --limit 0 --json | jq '{totalNodes: (.data | length)}'
```

### 23.4 Search Mode Behaviors

| Test ID | Test Case | Mode | Expected |
|---------|-----------|------|----------|
| SRM-001 | OR Mode Default | No flag | Any term matches |
| SRM-002 | AND Mode | `--mode AND` | All terms required |
| SRM-003 | FUZZY Mode | `--mode FUZZY` | Levenshtein distance |
| SRM-004 | FUZZY Threshold | 2-3 char typo | Still finds match |

```bash
echo "=== SRM-001: OR Mode (Default) ==="
n8n nodes search "slack webhook" --json | jq '.data | length'
# Should return nodes matching "slack" OR "webhook"

echo "=== SRM-002: AND Mode ==="
n8n nodes search "slack webhook" --mode AND --json | jq '.data | length'
# Should return fewer results (must match both)

echo "=== SRM-003: FUZZY Mode ==="
n8n nodes search "slak" --mode FUZZY --json | jq '.data[0].name'
# Should find "Slack" despite typo

echo "=== SRM-004: FUZZY Threshold ==="
# Test various typo distances
for TYPO in "webhok" "gogle" "httpreqest" "telgram"; do
    RESULT=$(n8n nodes search "$TYPO" --mode FUZZY --limit 1 --json | jq -r '.data[0].name // "NOT_FOUND"')
    echo "Typo '$TYPO' → '$RESULT'"
done
```

---

## Source Code Reference

**`core/db/nodes.ts`:**
```typescript
// Lines 65-100: searchNodes()
// - Routes to searchNodesFTS() when hasFTS5Tables is true
// - Falls back to LIKE search on FTS5 syntax errors
// - Escapes special chars: '"(){}[]*+-:^~

// searchNodesFTS(): BM25 ranking, phrase matching
// searchNodesLike(): LIKE '%term%' fallback
// searchNodesFuzzy(): Levenshtein distance algorithm
```

**`core/db/adapter.ts`:**
```typescript
// hasFTS5Tables: boolean (lazy detection)
// detectFTS5Tables(): Queries sqlite_master for nodes_fts
// Opens in readonly mode for CLI
```

**`utils/node-type-normalizer.ts`:**
```typescript
// normalizeNodeType(shortName): Expands to full type
// Handles: short names, database format, langchain prefix
// Case-insensitive matching
```
