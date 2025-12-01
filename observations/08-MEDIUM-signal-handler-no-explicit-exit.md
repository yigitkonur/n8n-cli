# Signal Handler Doesn't Explicitly Exit Process

**Severity:** MEDIUM
**File Ref:** `src/core/lifecycle.ts:54-62`
**Tags:** #process-lifecycle #reliability #edge-case

## 🔍 The Observation

The signal handler sets `process.exitCode = 0` after cleanup but relies on the event loop draining naturally. If there are pending timers, unresolved promises, or keep-alive connections, the process may hang instead of exiting cleanly.

This can cause issues in CI/CD environments where hung processes block pipelines or in Docker where SIGTERM has a timeout before SIGKILL.

## 💻 Code Reference
```typescript
// lifecycle.ts:54-62
function createSignalHandler(signal: string): () => void {
  return () => {
    debug('lifecycle', `Received ${signal}`);
    performCleanup(signal).finally(() => {
      // Set exit code and let event loop drain
      process.exitCode = 0;
      // ISSUE: No explicit process.exit() - relies on natural drain
    });
  };
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Relying on event loop drain after signal handling. Pending async operations can prevent exit.
*   **Best Practice:** After cleanup completes, explicitly exit or use `process.kill(process.pid, signal)` to re-raise for natural exit.
*   **Reference:** [Node.js Signal Events](https://nodejs.org/api/process.html#signal-events) - Recommends explicit exit after async cleanup

## 🛠️ Fix Plan

1.  Add explicit `process.exit()` after cleanup in signal handlers.
2.  Or use self-signal pattern for cleaner exit:

```typescript
function createSignalHandler(signal: string): () => void {
  return () => {
    debug('lifecycle', `Received ${signal}`);
    performCleanup(signal).finally(() => {
      process.exitCode = 0;
      // Option A: Explicit exit
      process.exit(0);
      
      // Option B: Self-signal for natural exit (preserves exit hooks)
      // process.kill(process.pid, signal);
    });
  };
}
```

3.  The 5-second force exit timeout (line 30-33) acts as fallback, but this is a last resort.

## 💼 Business Impact

**CI/CD Impact:** Hung CLI processes can:
- Block GitHub Actions runners (10-minute job timeout)
- Consume Docker container slots
- Cause false "success" if killed before exit code set

**Debugging Difficulty:** Hangs are hard to debug without visibility into what's keeping the event loop alive.

**Effort:** ~10 minutes. Single line change.

## 🔗 Evidences

- Force exit timeout exists (5s) suggesting awareness of potential hangs
- Commander.js async actions can leave promises pending
- axios keeps connections alive by default
