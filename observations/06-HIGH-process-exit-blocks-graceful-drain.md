# Signal Handlers Use process.exit() Blocking Graceful Drain

**Severity:** HIGH
**File Ref:** `src/core/lifecycle.ts:57-61`
**Tags:** #reliability #lifecycle #signals

## 🔍 The Observation

Signal handlers call `process.exit(0)` immediately after cleanup:

```typescript
return () => {
  debug('lifecycle', `Received ${signal}`);
  performCleanup(signal).finally(() => {
    process.exit(0);  // Forces exit, skips event loop drain
  });
};
```

This pattern:
- Abruptly terminates TCP connections (may lose in-flight responses)
- Skips natural event loop drainage
- Forces exit code 0 even for SIGTERM (standard is 128+signal_number=143)
- May leave child processes orphaned if not explicitly killed

Node.js best practice is to set `process.exitCode` and let the event loop drain naturally.

## 💻 Code Reference
```typescript
// src/core/lifecycle.ts:54-62
function createSignalHandler(signal: string): () => void {
  return () => {
    debug('lifecycle', `Received ${signal}`);
    performCleanup(signal).finally(() => {
      // Explicit exit after cleanup - don't rely on event loop drain
      process.exit(0);
    });
  };
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Calling `process.exit()` in signal handlers. This immediately terminates without allowing pending I/O to complete.

*   **Best Practice:** 
    - Set `process.exitCode = 0` (or 128+signal for signals)
    - Perform cleanup
    - Let Node.js exit naturally when event loop empties
    - Use timeout as safety net only

*   **Reference:** [Node.js Process Documentation](https://nodejs.org/docs/latest/api/process.html#processexitcode)

## 🛠️ Fix Plan

1.  Replace `process.exit()` with `process.exitCode`:
    ```typescript
    function createSignalHandler(signal: string): () => void {
      return () => {
        debug('lifecycle', `Received ${signal}`);
        // Set exit code (SIGINT=130, SIGTERM=143 per POSIX)
        process.exitCode = signal === 'SIGINT' ? 130 : 0;
        performCleanup(signal);
        // Event loop will drain and exit naturally
      };
    }
    ```

2.  Keep the 5-second timeout as a safety net for hung cleanup

3.  Consider removing the forced exit entirely for most cases

## 💼 Business Impact

*   **Data Loss:** In-flight API responses may be lost
*   **Zombie Connections:** TCP connections not properly closed
*   **CI Signal Propagation:** Docker/K8s expects proper signal handling for graceful shutdown

## 🔗 Evidences

- Node.js docs recommend process.exitCode over process.exit(): https://nodejs.org/docs/latest/api/process.html#processexitcode
- POSIX signal exit codes: 128 + signal_number (SIGTERM=15 → 143)
- Leapcell/RisingStack: "Let Node drain naturally for graceful shutdown"
