# Singleton Patterns May Complicate Testing

**Severity:** LOW
**File Ref:** `src/core/api/client.ts:609-632`, `src/core/db/adapter.ts:224-234`
**Tags:** #code-quality #testing #architecture

## 🔍 The Observation

Multiple modules use singleton patterns:

```typescript
// API client singleton
let _client: N8nApiClient | null = null;
export function getApiClient(): N8nApiClient {
  if (!_client) {
    const config = getConfig();
    _client = new N8nApiClient({ /* ... */ });
  }
  return _client;
}

// Database singleton
let _db: DatabaseAdapter | null = null;
export async function getDatabase(): Promise<DatabaseAdapter> {
  if (!_db) {
    _db = await createDatabaseAdapter();
  }
  return _db;
}
```

Reset functions exist (`resetApiClient()`, `closeDatabase()`), but singletons:
- Share state across tests (requires reset between tests)
- Hide dependencies (modules implicitly depend on global state)
- Make parallel testing difficult

## 💻 Code Reference
```typescript
// src/core/api/client.ts:609-632
let _client: N8nApiClient | null = null;

export function getApiClient(): N8nApiClient {
  if (!_client) {
    const config = getConfig();
    _client = new N8nApiClient({
      baseUrl: config.host,
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
  }
  return _client;
}

export function resetApiClient(): void {
  _client = null;
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Current Pattern:** Singletons with reset functions. Pragmatic for CLI tools.

*   **Alternative Pattern:** 
    - Dependency injection for testability
    - Factory functions that return new instances
    - Pass client explicitly to functions that need it

*   **Reference:** SOLID principles (D = Dependency Inversion), testability patterns

## 🛠️ Fix Plan

1.  **Current approach is fine for CLI.** Singletons are appropriate for:
    - Single-process, single-request CLI commands
    - Resource-expensive connections (DB, HTTP)

2.  For testing, ensure reset functions are called in `beforeEach`:
    ```typescript
    beforeEach(() => {
      resetApiClient();
      resetConfig();
      closeDatabase();
    });
    ```

3.  Document singleton behavior in code comments

4.  **Carmack Lens:** Singletons are simple and work. Don't over-engineer for theoretical testing concerns.

## 💼 Business Impact

*   **Very Low:** Pattern works for CLI use case
*   **Testing:** Reset functions mitigate issues
*   **Maintenance:** Clear ownership of global state

## 🔗 Evidences

- Commander.js examples use singletons for config
- CLI tools typically have single execution context
- Reset functions exist for testing needs
