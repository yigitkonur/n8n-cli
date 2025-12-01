# Cleanup Timeout Not Configurable

**Severity:** MEDIUM
**File Ref:** `src/core/lifecycle.ts:15`
**Tags:** #reliability #configuration #lifecycle

## 🔍 The Observation

The cleanup timeout is hardcoded at 5 seconds:

```typescript
const CLEANUP_TIMEOUT_MS = 5000;
```

This causes issues in two scenarios:
- **Too short:** Database operations with large transaction logs may need more time
- **Too long:** CI/CD pipelines need fast failure detection

The timeout should be configurable via environment variable.

## 💻 Code Reference
```typescript
// src/core/lifecycle.ts:15
const CLEANUP_TIMEOUT_MS = 5000;

// src/core/lifecycle.ts:30-33
const forceExitTimeout = setTimeout(() => {
  console.error('\nCleanup timeout - forcing exit');
  process.exit(1);
}, CLEANUP_TIMEOUT_MS);
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Hardcoding operational timeouts. Not allowing environment-specific tuning.

*   **Best Practice:** Use environment variable with sensible default:
    ```typescript
    const CLEANUP_TIMEOUT_MS = parseInt(process.env.N8N_CLEANUP_TIMEOUT_MS || '5000', 10);
    ```

*   **Reference:** 12-Factor App: Config in environment, not code

## 🛠️ Fix Plan

1.  Make timeout configurable:
    ```typescript
    const CLEANUP_TIMEOUT_MS = parseInt(
      process.env.N8N_CLEANUP_TIMEOUT_MS || '5000', 
      10
    );
    ```

2.  Document in help text and README

3.  Consider different defaults for interactive vs CI mode

## 💼 Business Impact

*   **Data Corruption:** Insufficient cleanup time for database commits
*   **CI Slowness:** Unnecessary waits in fast-fail scenarios
*   **Operational Inflexibility:** No way to tune for specific environments

## 🔗 Evidences

- 12-Factor App methodology: https://12factor.net/config
- Docker default stop timeout is 30s, configurable via --stop-timeout
- Node.js best practice: Environment-tuned timeouts (RisingStack 2024)
