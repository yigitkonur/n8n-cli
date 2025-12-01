# beforeExit Handler Cannot Perform Async Cleanup

**Severity:** MEDIUM
**File Ref:** `src/core/lifecycle.ts:76-82`
**Tags:** #reliability #lifecycle #nodejs

## 🔍 The Observation

The `beforeExit` handler is used for fallback cleanup:

```typescript
process.on('beforeExit', () => {
  if (!cleanupComplete) {
    debug('lifecycle', 'beforeExit - performing cleanup');
    closeDatabase();  // Sync only allowed here
  }
});
```

This is correct for sync cleanup, but:
- `beforeExit` NEVER fires on signals (SIGINT/SIGTERM) - Node.js docs
- It only fires when event loop is empty AND no `process.exit()` called
- The current signal handlers call `process.exit(0)`, so `beforeExit` never triggers
- Any async cleanup here is impossible (promises ignored)

## 💻 Code Reference
```typescript
// src/core/lifecycle.ts:76-82
process.on('beforeExit', () => {
  if (!cleanupComplete) {
    debug('lifecycle', 'beforeExit - performing cleanup');
    // Synchronous close since we're exiting
    closeDatabase();
  }
});
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Relying on `beforeExit` for critical cleanup. It doesn't fire in most exit scenarios.

*   **Best Practice:** 
    - Use `beforeExit` only as last-resort sync cleanup
    - Primary cleanup should be in signal handlers
    - Remove `process.exit()` from signal handlers to let `beforeExit` fire
    - Or: Remove `beforeExit` if signals always handle cleanup

*   **Reference:** [Node.js Process Documentation](https://nodejs.org/docs/latest/api/process.html#event-beforeexit)

## 🛠️ Fix Plan

1.  Option A - Make beforeExit useful by removing process.exit():
    ```typescript
    // Signal handler sets exitCode, doesn't call exit()
    performCleanup(signal).finally(() => {
      process.exitCode = 0;
      // Let event loop drain, beforeExit will fire
    });
    ```

2.  Option B - Remove beforeExit (signals always cleanup):
    ```typescript
    // Remove beforeExit handler entirely
    // Document that Ctrl+C is required for cleanup
    ```

3.  Document the cleanup flow clearly in code comments

## 💼 Business Impact

*   **False Confidence:** beforeExit appears to provide fallback but rarely fires
*   **Code Clarity:** Misleading comment "will be performed" when it won't
*   **Debugging:** Cleanup issues hard to diagnose

## 🔗 Evidences

- Node.js docs: beforeExit doesn't fire on signals or process.exit()
- Leapcell blog 2025: "beforeExit is sync-only, signal-bypassed"
- Common misconception in Node.js cleanup patterns
