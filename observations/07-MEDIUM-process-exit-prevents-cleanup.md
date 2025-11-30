# process.exit() Prevents Proper Cleanup

**Severity:** MEDIUM
**File Ref:** `src/cli.ts:254-255, 263-264`
**Tags:** #ProcessLifecycle #Reliability #NodeJS

## 🔍 The Observation
The CLI uses `process.exit(1)` in multiple places, which immediately terminates the process without allowing the event loop to drain. This bypasses any cleanup handlers, `finally` blocks after async operations, and the `exit` event.

## 💻 Code Reference
```typescript
// src/cli.ts:252-256
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);  // Immediate kill, no cleanup
});

// src/cli.ts:259-265
(async () => {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(error);
    process.exit(1);  // Immediate kill, no cleanup
  }
})();
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** `process.exit()` immediately kills the process. Timers, I/O, and event listeners are abandoned.
* **Best Practice:** Set `process.exitCode = 1` and let the event loop drain naturally. Or use explicit cleanup before exit.
* **Reference:** [Node.js process.exit() documentation](https://nodejs.org/api/process.html#processexitcode)

## 🛠️ Fix Plan
1. Replace `process.exit(1)` with `process.exitCode = 1`:
```typescript
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exitCode = 1;
  // Let event loop drain, allowing cleanup
});
```
2. Ensure database and HTTP connections are closed via `process.on('beforeExit', cleanup)`
3. Add timeout fallback for truly stuck processes

## 💼 Business Impact
Database connections, file handles, and network sockets may not be properly released. In long-running scenarios or containerized environments, resource exhaustion accumulates. Harder to debug incomplete operations.

## 🔗 Evidences
- Node.js docs: "process.exit() will force the process to exit as quickly as possible"
- Heroku best practices recommend exitCode over exit()
- Async cleanup requires event loop to drain
