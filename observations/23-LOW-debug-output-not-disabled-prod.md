# Debug Output Controlled Only by Environment Variable

**Severity:** LOW
**File Ref:** `src/core/debug.ts` (inferred), `src/utils/errors.ts:394`
**Tags:** #operations #logging #configuration

## 🔍 The Observation

Debug output is controlled by environment variables:

```typescript
// src/utils/errors.ts:394
if (process.env.N8N_DEBUG === 'true') {
  console.error(chalk.dim(`[DEBUG] ${context || 'Error'}:`), { /* ... */ });
}
```

This is standard practice, but considerations:
- No `--debug` CLI flag (would be more discoverable)
- Debug output may contain sensitive data in some scenarios
- No log levels (just on/off)

## 💻 Code Reference
```typescript
// src/utils/errors.ts:393-401
export function logError(error: N8nApiError, context?: string): void {
  if (process.env.N8N_DEBUG === 'true') {
    console.error(chalk.dim(`[DEBUG] ${context || 'Error'}:`), {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
  }
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Current Pattern:** Env var based debug. Simple and common.

*   **Better Practice:** 
    - Add `--debug` / `-v` CLI flag for discoverability
    - Consider log levels (error, warn, info, debug, trace)
    - Ensure debug output is sanitized

*   **Reference:** 12-factor logging, CLI UX conventions

## 🛠️ Fix Plan

1.  The `--verbose` flag already exists in cli.ts. Ensure it triggers debug mode:
    ```typescript
    if (opts.verbose) {
      process.env.N8N_DEBUG = 'true';
    }
    ```

2.  Verify debug output doesn't leak secrets:
    ```typescript
    if (process.env.N8N_DEBUG === 'true') {
      console.error(chalk.dim('[DEBUG]'), sanitizeForLogging(data));
    }
    ```

3.  **Carmack Lens:** Current approach works. `--verbose` flag exists.

## 💼 Business Impact

*   **Very Low:** Standard debugging pattern
*   **User Experience:** --verbose is more discoverable than env var
*   **Security:** Ensure debug output is sanitized

## 🔗 Evidences

- Most CLI tools support both --verbose and DEBUG env var
- npm uses DEBUG=* pattern
- 12-factor app: Log to stdout, control verbosity via config
