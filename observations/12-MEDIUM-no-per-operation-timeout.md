# Uniform 30-Second Timeout for All Operations

**Severity:** MEDIUM
**File Ref:** `src/core/api/client.ts:77,86`
**Tags:** #reliability #network #timeout

## 🔍 The Observation

All API operations use the same 30-second timeout:

```typescript
constructor(config: N8nApiClientConfig) {
  const { baseUrl, apiKey, timeout = 30000 } = config;
  // ...
  this.client = axios.create({
    // ...
    timeout,  // Same for all operations
  });
}
```

This is problematic because:
- **Too long for simple ops:** `GET /workflows` should fail faster
- **Too short for complex ops:** Execution fetch with full data (`includeData=true`) may exceed 30s
- **No user control:** Operations that need more time have no recourse

## 💻 Code Reference
```typescript
// src/core/api/client.ts:77,86
constructor(config: N8nApiClientConfig) {
  const { baseUrl, apiKey, timeout = 30000 } = config;

  this.client = axios.create({
    baseURL: apiUrl,
    timeout,  // Uniform for all operations
    headers: { /* ... */ },
  });
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Single timeout for all operations. Not considering operation-specific requirements.

*   **Best Practice:** Per-method timeout overrides:
    - Health check: 5s (already done)
    - List operations: 15s
    - Single resource GET: 30s
    - Complex queries (executions with data): 60s
    - Webhook triggers: 120s (separate client)

*   **Reference:** HTTP client best practices, REST API design patterns

## 🛠️ Fix Plan

1.  Add timeout parameter to methods that need it:
    ```typescript
    async getExecution(id: string, includeData = false): Promise<Execution> {
      const timeout = includeData ? 60000 : 30000;
      const response = await this.client.get(`/executions/${safeId}`, {
        params: { includeData },
        timeout,
      });
      // ...
    }
    ```

2.  Document timeout behavior in command help text

3.  Consider `--timeout` CLI flag for user override

## 💼 Business Impact

*   **False Failures:** Large executions timeout despite being valid
*   **Slow Feedback:** Simple operations wait 30s on network issues
*   **User Frustration:** No way to extend timeout for known-slow operations

## 🔗 Evidences

- Axios allows per-request timeout override
- Similar to curl's different timeout defaults for connect vs transfer
- n8n large workflows can produce MBs of execution data
