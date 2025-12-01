# Missing SIGPIPE and SIGHUP Signal Handlers

**Severity:** MEDIUM
**File Ref:** `src/core/lifecycle.ts:68-82`
**Tags:** #reliability #signals #unix

## 🔍 The Observation

The lifecycle module only handles SIGINT and SIGTERM:

```typescript
process.on('SIGINT', createSignalHandler('SIGINT'));
process.on('SIGTERM', createSignalHandler('SIGTERM'));
```

Missing handlers for:
- **SIGPIPE:** Sent when writing to closed pipe (e.g., `n8n workflows list | head`). Default action terminates the process.
- **SIGHUP:** Sent when terminal disconnects (SSH timeout). Default action terminates the process.

These cause abrupt exits without cleanup.

## 💻 Code Reference
```typescript
// src/core/lifecycle.ts:68-82
export function registerShutdownHandlers(): void {
  // SIGINT: Ctrl+C
  process.on('SIGINT', createSignalHandler('SIGINT'));
  
  // SIGTERM: Docker/Kubernetes termination
  process.on('SIGTERM', createSignalHandler('SIGTERM'));
  
  // beforeExit, uncaughtException, unhandledRejection...
  // BUT: No SIGPIPE, SIGHUP
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Only handling "common" signals. Ignoring Unix-specific signals that cause termination.

*   **Best Practice:** Handle all relevant signals:
    - SIGPIPE: Ignore (don't crash on broken pipes)
    - SIGHUP: Graceful shutdown (terminal disconnect)
    - SIGUSR1/2: Debug/reload hooks (optional)

*   **Reference:** signal(7) man page, Node.js process signals documentation

## 🛠️ Fix Plan

1.  Add SIGPIPE ignore:
    ```typescript
    // Ignore broken pipe (common in piped commands)
    process.on('SIGPIPE', () => {
      debug('lifecycle', 'Ignoring SIGPIPE');
    });
    ```

2.  Add SIGHUP handler:
    ```typescript
    // Terminal disconnect - graceful shutdown
    process.on('SIGHUP', createSignalHandler('SIGHUP'));
    ```

3.  Document signal handling behavior in README

## 💼 Business Impact

*   **Broken Pipes:** `n8n list | head -5` crashes instead of clean exit
*   **SSH Sessions:** SSH timeout kills CLI without cleanup
*   **CI/CD Edge Cases:** Some CI systems send SIGHUP on job termination

## 🔗 Evidences

- signal(7) man page documents Unix signal behaviors
- Node.js SIGPIPE default: terminate process
- Common issue in CLI tools that output to pipes
