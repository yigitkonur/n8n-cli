# Fuzzy Search Loads All Database Rows Into Memory

**Severity:** LOW
**File Ref:** `src/core/db/nodes.ts:86-129`
**Tags:** #performance #scalability #database

## 🔍 The Observation

The fuzzy search mode (`searchNodes(query, 'FUZZY')`) loads ALL rows from the nodes table into memory, then applies Levenshtein distance calculations in JavaScript. With a large node database, this could cause:
1. High memory usage
2. Slow response times
3. Potential OOM on constrained systems

## 💻 Code Reference
```typescript
// nodes.ts:86-129
if (mode === 'FUZZY') {
  // Loads ALL nodes into memory
  sql = `
    SELECT node_type, display_name, description, category, package_name,
           is_ai_tool, is_trigger, is_webhook
    FROM nodes
  `;
  const allRows = this.db.prepare(sql).all() as any[];  // Full table scan
  
  // Then processes each row in JavaScript
  const queryLower = query.toLowerCase();
  const scored = allRows.map(row => {
    // Levenshtein calculation per row...
    const distances = [
      this.levenshteinDistance(queryLower, nodeType),
      this.levenshteinDistance(queryLower, displayName),
      // ...
    ];
    // ...
  });
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Loading entire tables for client-side filtering when database-side filtering is possible.
*   **Best Practice:** Use SQLite FTS5 for fuzzy text search, or pre-filter with LIKE before fuzzy scoring. FTS5 support exists but is unused.
*   **Reference:** [SQLite FTS5](https://www.sqlite.org/fts5.html) - Full-text search extension

## 🛠️ Fix Plan

1.  **Quick fix:** Pre-filter with loose LIKE before fuzzy scoring:

```typescript
if (mode === 'FUZZY') {
  // First, get candidates with SQL LIKE
  const pattern = `%${query.split('').join('%')}%`;  // "http" -> "%h%t%t%p%"
  const candidates = this.db.prepare(`
    SELECT * FROM nodes 
    WHERE node_type LIKE ? OR display_name LIKE ?
    LIMIT 100
  `).all(pattern, pattern);
  
  // Then apply Levenshtein only to candidates
  const scored = candidates.map(row => { /* ... */ });
}
```

2.  **Better:** Enable FTS5 search (adapter already has `checkFTS5Support()`).

## 💼 Business Impact

**Current Impact:** Minimal - nodes.db is ~500-1000 rows, fits in memory easily.

**Future Risk:** If node database grows significantly or runs on constrained environments (CI runners, edge devices), could cause issues.

**Effort:** ~30 minutes for LIKE pre-filter. ~2 hours for FTS5 integration.

## 🔗 Evidences

- `checkFTS5Support()` exists in adapter but is unused for search
- Current database is small (~500 nodes) - issue is theoretical
- OR/AND modes correctly use parameterized LIKE queries
