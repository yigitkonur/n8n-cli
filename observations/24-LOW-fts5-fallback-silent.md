# FTS5 Fallback to LIKE is Silent

**Severity:** LOW
**File Ref:** `src/core/db/nodes.ts:145-152`
**Tags:** #observability #search #user-experience

## 🔍 The Observation

When FTS5 query fails, the code silently falls back to LIKE search:

```typescript
try {
  // FTS5 query
  const rows = this.db.prepare(/* FTS5 SQL */).all(/* ... */);
  return rows.map(row => this.parseSearchRow(row, query));
} catch (error: any) {
  // FTS5 syntax error - fallback to LIKE
  if (error.message?.includes('fts5') || error.message?.includes('syntax')) {
    return this.searchNodesLIKE(query, mode, limit);  // Silent fallback!
  }
  throw error;
}
```

Users don't know:
- They're getting slower LIKE search
- Results may differ (no BM25 ranking)
- Their query had FTS5 syntax issues

## 💻 Code Reference
```typescript
// src/core/db/nodes.ts:145-152
} catch (error: any) {
  // FTS5 syntax error - fallback to LIKE
  // Pattern from: n8n-mcp/src/mcp/server.ts:1543-1564
  if (error.message?.includes('fts5') || error.message?.includes('syntax')) {
    return this.searchNodesLIKE(query, mode, limit);
  }
  throw error;
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Current Pattern:** Silent fallback. Graceful degradation.

*   **Better Practice:** 
    - Log fallback at debug level
    - Consider warning user about degraded search
    - Include fallback indicator in results metadata

*   **Reference:** Progressive enhancement, observability best practices

## 🛠️ Fix Plan

1.  Add debug logging:
    ```typescript
    if (error.message?.includes('fts5') || error.message?.includes('syntax')) {
      debug('search', `FTS5 query failed, falling back to LIKE: ${error.message}`);
      return this.searchNodesLIKE(query, mode, limit);
    }
    ```

2.  Optionally add metadata to results:
    ```typescript
    return {
      results: rows.map(/* ... */),
      searchMethod: this.db.hasFTS5Tables ? 'fts5' : 'like',
    };
    ```

3.  **Carmack Lens:** Silent fallback is fine for UX. Debug logging is sufficient.

## 💼 Business Impact

*   **Very Low:** Graceful degradation is good
*   **Debugging:** When searches seem wrong, users have no insight
*   **Performance:** LIKE can be slower on large databases

## 🔗 Evidences

- MCP pattern also does silent fallback
- FTS5 syntax errors are user error (special chars)
- Logging would help troubleshooting
