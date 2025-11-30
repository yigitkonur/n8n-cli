# Database Connections Never Closed

**Severity:** HIGH
**File Ref:** `src/core/db/adapter.ts:201-206`
**Tags:** #ResourceLeak #Database #Reliability

## 🔍 The Observation
The database adapter implements a singleton pattern with `getDatabase()` and exports `closeDatabase()`, but `closeDatabase()` is never called anywhere in the CLI. The database connection remains open until process termination.

While SQLite in readonly mode is forgiving, this pattern:
- Leaks file descriptors on long-running or batched operations
- Prevents proper WAL checkpoint in write scenarios (if ever enabled)
- Violates resource cleanup best practices

## 💻 Code Reference
```typescript
// src/core/db/adapter.ts:201-216
export async function getDatabase(): Promise<DatabaseAdapter> {
  if (!_db) {
    _db = await createDatabaseAdapter();
  }
  return _db;
}

export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
// ^ closeDatabase is exported but NEVER CALLED
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Creating singleton resources without lifecycle management. Relying on process exit to clean up.
* **Best Practice:** Explicitly close database connections on CLI completion or signal. Use try/finally or process event handlers.
* **Reference:** [better-sqlite3: Always call .close()](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#close---this)

## 🛠️ Fix Plan
1. Add `closeDatabase()` call in signal handlers (SIGINT/SIGTERM)
2. Add cleanup in the main CLI wrapper:
```typescript
try {
  await program.parseAsync(process.argv);
} finally {
  closeDatabase();
}
```
3. Consider using `process.on('exit', closeDatabase)` as fallback

## 💼 Business Impact
File descriptor exhaustion in automated/batched scenarios. Potential SQLite corruption if write mode is ever enabled. Resource accounting issues in containerized environments with FD limits.

## 🔗 Evidences
- better-sqlite3 documentation explicitly recommends calling .close()
- Node.js best practices: Explicitly release native resources
- SQLite WAL mode requires proper shutdown for checkpoint
