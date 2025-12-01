# Debug Logging Has Inconsistent Activation

**Severity:** LOW
**File Ref:** `src/utils/output.ts:78-79`, `src/core/debug.ts`
**Tags:** #debugging #developer-experience #consistency

## 🔍 The Observation

Debug logging can be enabled via three different mechanisms:
1. `--verbose` / `-v` flag (GlobalOptions.verbose)
2. `N8N_DEBUG=true` environment variable
3. `DEBUG=n8n-cli` environment variable (loader.ts:173)

These don't always trigger the same behavior, leading to inconsistent debugging experience.

## 💻 Code Reference
```typescript
// output.ts:78-79 - Checks both
export function isVerbose(opts?: GlobalOptions): boolean {
  return opts?.verbose === true || process.env.N8N_DEBUG === 'true';
}

// loader.ts:173 - Third option
debug: process.env.N8N_DEBUG === 'true' || process.env.DEBUG === 'n8n-cli',

// config type includes debug flag but not consistently used
interface CliConfig {
  // ...
  debug: boolean;
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Multiple ways to enable the same feature that don't always work the same.
*   **Best Practice:** Single source of truth for debug mode, consistently checked everywhere.
*   **Reference:** DEBUG=* is standard for Node.js debug module, but mixing with custom env vars causes confusion

## 🛠️ Fix Plan

1.  Consolidate debug checking to single function:

```typescript
// In output.ts or debug.ts
let _debugEnabled: boolean | null = null;

export function isDebugEnabled(opts?: GlobalOptions): boolean {
  if (_debugEnabled === null) {
    _debugEnabled = 
      process.env.N8N_DEBUG === 'true' ||
      process.env.DEBUG?.includes('n8n-cli');
  }
  return _debugEnabled || opts?.verbose === true;
}

// Use everywhere instead of direct env checks
```

2.  Document the preferred way to enable debug (--verbose or N8N_DEBUG).

3.  Consider removing `DEBUG=n8n-cli` to reduce confusion.

## 💼 Business Impact

**Developer Experience:** Users trying to debug may enable one method but miss output controlled by another.

**Support:** Inconsistent debug output makes troubleshooting harder.

**Effort:** ~30 minutes to consolidate.

## 🔗 Evidences

- `debug()` function exists in core/debug.ts but uses different check
- GlobalOptions.verbose not always passed to functions that need it
- Config.debug flag exists but isn't consistently used
