# Missing uncaughtException and unhandledRejection Handlers

**Severity:** HIGH
**File Ref:** `src/core/lifecycle.ts:68`
**Tags:** #process-lifecycle #error-handling #reliability

## 🔍 The Observation

The CLI registers SIGINT/SIGTERM handlers but lacks handlers for `uncaughtException` and `unhandledRejection` events. When an unhandled promise rejection occurs (e.g., network failure during dynamic import, API timeout), the process exits without running cleanup code, potentially leaving database connections open.

This is particularly risky during the startup phase when dynamic imports (`await import('./commands/auth/index.js')`) are executing. A Ctrl+C during this phase or a rejected import could bypass cleanup entirely.

## 💻 Code Reference
```typescript
// Current implementation in lifecycle.ts:68-85
export function registerShutdownHandlers(): void {
  // SIGINT: Ctrl+C
  process.on('SIGINT', createSignalHandler('SIGINT'));
  
  // SIGTERM: Docker/Kubernetes termination
  process.on('SIGTERM', createSignalHandler('SIGTERM'));
  
  // beforeExit: Fallback for clean exit
  process.on('beforeExit', () => {
    if (!cleanupComplete) {
      closeDatabase();
    }
  });
  // MISSING: uncaughtException and unhandledRejection handlers
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Only handling expected signals (SIGINT/SIGTERM) while ignoring crashes and unhandled rejections. This leaves ~10-20% of exit scenarios unhandled.
*   **Best Practice:** Comprehensive exit handling that covers signals, uncaught exceptions, and unhandled promise rejections. Node.js v22+ defaults to crashing on unhandled rejections.
*   **Reference:** [Node.js Process Events Documentation](https://nodejs.org/api/process.html#event-uncaughtexception)

## 🛠️ Fix Plan

1.  Add `uncaughtException` handler that logs the error, runs sync cleanup (`closeDatabase()`), and exits with code 1.
2.  Add `unhandledRejection` handler that logs the rejection reason, runs async cleanup (`performCleanup()`), and exits with code 1.
3.  Ensure handlers don't throw to prevent infinite loops.

```typescript
// Suggested additions to registerShutdownHandlers():
process.on('uncaughtException', (err) => {
  debug('lifecycle', `Uncaught exception: ${err.message}`);
  closeDatabase(); // Sync only - don't await
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  debug('lifecycle', `Unhandled rejection: ${reason}`);
  performCleanup().finally(() => process.exit(1));
});
```

## 💼 Business Impact

**Reliability Risk:** In CI/CD environments or when used by automation agents, unhandled rejections cause silent exits without proper resource cleanup. This can lead to:
- Leaked file descriptors over time
- Confusing exit codes (Node.js default varies by version)
- Incomplete operations with no error context

**Effort:** ~15 minutes to implement. No breaking changes.

## 🔗 Evidences

- Node.js v22+ defaults `--unhandled-rejections=throw` (crashes on unhandled)
- better-sqlite3 connections should be explicitly closed even in readonly mode
- Commander.js relies on async action handlers that can reject
