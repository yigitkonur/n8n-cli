# Missing Signal Handlers for Graceful Shutdown

**Severity:** HIGH
**File Ref:** `src/cli.ts:252-256`
**Tags:** #Reliability #ProcessLifecycle #Kubernetes

## 🔍 The Observation
The CLI has no explicit `SIGINT` or `SIGTERM` signal handlers. When running in containerized environments (Docker, Kubernetes), `SIGTERM` kills the process immediately without cleanup. This can leave:
- Database connections open (file descriptors leaked)
- Incomplete API operations (half-updated workflows)
- Temp files/WAL files from SQLite

Only `unhandledRejection` is handled, which logs and exits but doesn't perform cleanup.

## 💻 Code Reference
```typescript
// src/cli.ts:252-256
// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Relying on Node.js default signal behavior. `SIGTERM` immediately kills without event loop drain.
* **Best Practice:** Register explicit handlers for `SIGINT`/`SIGTERM` that close resources (DB, HTTP connections) with a timeout.
* **Reference:** [Node.js Process Signal Events](https://nodejs.org/api/process.html#signal-events)

## 🛠️ Fix Plan
1. Add signal handlers before `parseAsync`:
```typescript
const cleanup = async () => {
  closeDatabase();
  process.exitCode = 0;
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
```
2. Use `process.exitCode` instead of `process.exit()` to allow event loop drain
3. Add timeout (e.g., 5s) to force exit if cleanup hangs

## 💼 Business Impact
In Kubernetes/Docker deployments, pod termination (rolling updates, scaling) sends SIGTERM. Without handlers, ongoing operations abort mid-flight, causing data inconsistency. Debug is hard (no logs of unclean exit).

## 🔗 Evidences
- Kubernetes sends SIGTERM with 30s grace period before SIGKILL
- Node.js docs: "If SIGTERM has no handler, Node.js will terminate immediately"
- RisingStack K8s guide emphasizes graceful shutdown handlers
