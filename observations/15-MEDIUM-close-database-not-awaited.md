# closeDatabase() May Not Be Awaited Properly

**Severity:** MEDIUM
**File Ref:** `src/core/lifecycle.ts:37-39`, `src/core/db/adapter.ts:239-243`
**Tags:** #reliability #database #async

## 🔍 The Observation

The lifecycle cleanup calls `closeDatabase()` synchronously:

```typescript
async function performCleanup(signal?: string): Promise<void> {
  // ...
  debug('lifecycle', 'Closing database connection');
  closeDatabase();  // No await!
  debug('lifecycle', 'Database closed');
  // ...
}
```

While `closeDatabase()` is synchronous in the current better-sqlite3 implementation:

```typescript
export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
```

This is fragile because:
- Code pattern suggests async cleanup but is sync
- Future changes (async DB adapter) would break silently
- No error handling for close failures
- Debug message claims "closed" before actually closed

## 💻 Code Reference
```typescript
// src/core/lifecycle.ts:37-39
debug('lifecycle', 'Closing database connection');
closeDatabase();  // Sync call, but in async function
debug('lifecycle', 'Database closed');

// src/core/db/adapter.ts:239-243
export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Mixing sync/async patterns without clear intent. No error handling for resource cleanup.

*   **Best Practice:** 
    - Make closeDatabase() async and await it
    - Add try-catch for close failures
    - Or: Document sync nature with JSDoc

*   **Reference:** Node.js async best practices, better-sqlite3 close() semantics

## 🛠️ Fix Plan

1.  Make explicit async pattern:
    ```typescript
    export async function closeDatabase(): Promise<void> {
      if (_db) {
        try {
          _db.close();
        } catch (err) {
          debug('db', `Close error (ignored): ${err.message}`);
        } finally {
          _db = null;
        }
      }
    }
    ```

2.  Update lifecycle:
    ```typescript
    debug('lifecycle', 'Closing database connection');
    await closeDatabase();
    debug('lifecycle', 'Database closed');
    ```

3.  Add JSDoc documenting sync nature if keeping sync

## 💼 Business Impact

*   **Data Integrity:** WAL checkpoint may not complete
*   **Future Bugs:** Async adapter would break cleanup silently
*   **Debugging:** Misleading "Database closed" log

## 🔗 Evidences

- better-sqlite3 close() is synchronous but may throw on error
- Node.js best practice: Await all async in async functions
- SQLite WAL mode benefits from explicit checkpoint before close
