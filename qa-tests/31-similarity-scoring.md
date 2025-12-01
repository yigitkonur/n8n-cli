## Phase 30: Similarity Scoring & Algorithm Verification

**Goal:** Test fuzzy matching thresholds, confidence scoring, and search boosting.
**Source Truth:** `core/autofix/node-similarity.ts`
- `SCORING_THRESHOLD = 50` (Line 26)
- `AUTO_FIX_CONFIDENCE = 0.9` (Line 35)
- Short search boost logic (Line 168)

### 30.1 Scoring Logic

| Test ID | Test Case | Input | Expected Score/Behavior |
|---------|-----------|-------|-------------------------|
| SIM-001 | Short Query Boost | `slack` (5 chars) | Boosted score (Line 168) |
| SIM-002 | Long Query | `slack message notification` | Normal scoring |
| SIM-003 | Auto-Fix Threshold | Exact package match | Confidence >= 0.9 |
| SIM-004 | Below Threshold | `xyz123abc` | No suggestions (< 50) |
| SIM-005 | Partial Match | `http req` | Finds "HTTP Request" |

```bash
echo "=== SIM-001: Short Query Boost ==="
# Short query 'slack' should rank Slack node highly
n8n nodes search "slack" --json | jq '.data[0] | {name, score: .relevanceScore}'
# 'Slack' should be top result

echo "=== SIM-002: Long Query Normal Scoring ==="
n8n nodes search "slack send message channel" --mode AND --json | jq '.data[:3] | .[].name'

echo "=== SIM-003: Auto-Fix High Confidence ==="
# Create workflow with typo that should auto-fix with high confidence
cat > /tmp/typo-test.json << 'EOF'
{
  "name": "Typo Test",
  "nodes": [
    {
      "name": "Webhook",
      "type": "webhok",
      "typeVersion": 1,
      "position": [400, 300],
      "parameters": {}
    }
  ],
  "connections": {}
}
EOF

n8n workflows autofix /tmp/typo-test.json --json | jq '.fixes[] | select(.type=="node-type-correction") | {confidence, original: .context.originalType, suggested: .context.suggestedType}'
# Expected: confidence = "high"

echo "=== SIM-004: Below Threshold (No Suggestions) ==="
n8n nodes search "xyz123nonexistent" --json | jq '.data | length'
# Expected: 0 (no results)

echo "=== SIM-005: Partial Match ==="
n8n nodes search "http req" --mode AND --json | jq '.data[:3] | .[].name'
# Should find "HTTP Request"

# Cleanup
rm -f /tmp/typo-test.json
```

### 30.2 Fuzzy Match Algorithm (Levenshtein)

| Test ID | Test Case | Query | Target | Expected |
|---------|-----------|-------|--------|----------|
| FUZ-001 | 1 Char Diff | `slak` | `slack` | High match |
| FUZ-002 | 2 Char Diff | `slck` | `slack` | Medium match |
| FUZ-003 | 3+ Char Diff | `slek` | `slack` | Low/no match |
| FUZ-004 | Transposition | `salck` | `slack` | Should match |
| FUZ-005 | Case Insensitive | `SLACK` | `slack` | Perfect match |

```bash
echo "=== FUZ-001: 1 Character Difference ==="
n8n nodes search "slak" --mode FUZZY --json | jq '.data[0].name'
# Expected: "Slack"

echo "=== FUZ-002: 2 Character Difference ==="
n8n nodes search "slck" --mode FUZZY --json | jq '.data[:3] | .[].name'

echo "=== FUZ-003: 3+ Character Difference ==="
n8n nodes search "xxxk" --mode FUZZY --json | jq '.data | length'
# Might return no relevant results

echo "=== FUZ-004: Transposition ==="
n8n nodes search "salck" --mode FUZZY --json | jq '.data[0].name'
# Should still find "Slack"

echo "=== FUZ-005: Case Insensitive ==="
n8n nodes search "HTTPREQUEST" --mode FUZZY --json | jq '.data[0].name'
# Should find "HTTP Request"
```

### 30.3 Node Type Correction Confidence

| Test ID | Test Case | Typo | Expected Confidence |
|---------|-----------|------|---------------------|
| NTC-001 | Single Char | `webhok` → `webhook` | HIGH |
| NTC-002 | Two Chars | `webbok` → `webhook` | MEDIUM |
| NTC-003 | Package Prefix | `httpRequest` → `n8n-nodes-base.httpRequest` | HIGH |
| NTC-004 | Unknown Type | `totallyUnknown` | No suggestion |

```bash
echo "=== NTC-001: Single Char Typo (HIGH confidence) ==="
cat > /tmp/ntc-001.json << 'EOF'
{"name": "Test", "nodes": [{"name": "N", "type": "n8n-nodes-base.webhok", "typeVersion": 1, "position": [0,0], "parameters": {}}], "connections": {}}
EOF
n8n workflows autofix /tmp/ntc-001.json --json | jq '.fixes[] | select(.type=="node-type-correction") | .confidence'

echo "=== NTC-003: Package Prefix Resolution ==="
cat > /tmp/ntc-003.json << 'EOF'
{"name": "Test", "nodes": [{"name": "N", "type": "httpRequest", "typeVersion": 4, "position": [0,0], "parameters": {}}], "connections": {}}
EOF
n8n workflows autofix /tmp/ntc-003.json --json | jq '.fixes'

# Cleanup
rm -f /tmp/ntc-*.json
```

---

## Source Code Reference

**`core/autofix/node-similarity.ts`:**
```typescript
// Line 26: SCORING_THRESHOLD = 50 (minimum score for suggestion)
// Line 35: AUTO_FIX_CONFIDENCE = 0.9 (90% for HIGH confidence)
// Line 168: Short search boost - queries < 6 chars get extra weight
// Uses Levenshtein distance + package name matching
// Score = (1 - distance/maxLen) * 100 + bonuses
```
