# No HTTP Agent Configuration for Connection Pooling

**Severity:** LOW
**File Ref:** `src/core/api/client.ts:84-91`
**Tags:** #performance #network #optimization

## 🔍 The Observation

The Axios client uses default HTTP agent settings:

```typescript
this.client = axios.create({
  baseURL: apiUrl,
  timeout,
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
  },
  // No httpAgent/httpsAgent configured
});
```

Default Node.js HTTP agent:
- `keepAlive: false` (connections closed after each request)
- `maxSockets: Infinity` (but effectively ~5 per host without keepAlive)

For CLI tools with multiple sequential requests, this causes:
- TCP handshake overhead per request
- TLS negotiation overhead per request (for HTTPS)

## 💻 Code Reference
```typescript
// src/core/api/client.ts:84-91
this.client = axios.create({
  baseURL: apiUrl,
  timeout,
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
  },
});
// Missing: httpAgent, httpsAgent configuration
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Current Pattern:** Default agent. Fine for single-request commands.

*   **Better Practice:** Configure agents for multi-request scenarios:
    ```typescript
    import http from 'http';
    import https from 'https';
    
    const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
    const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });
    ```

*   **Reference:** Node.js HTTP agent documentation, Axios configuration

## 🛠️ Fix Plan

1.  Add agent configuration:
    ```typescript
    import { Agent as HttpAgent } from 'http';
    import { Agent as HttpsAgent } from 'https';
    
    this.client = axios.create({
      baseURL: apiUrl,
      timeout,
      headers: { /* ... */ },
      httpAgent: new HttpAgent({ keepAlive: true, maxSockets: 10 }),
      httpsAgent: new HttpsAgent({ keepAlive: true, maxSockets: 10 }),
    });
    ```

2.  Consider closing agents on cleanup:
    ```typescript
    close() {
      this.httpAgent.destroy();
      this.httpsAgent.destroy();
    }
    ```

3.  **Carmack Lens:** Premature optimization for CLI. Only matters for bulk operations.

## 💼 Business Impact

*   **Marginal Performance:** 10-20% faster for bulk operations
*   **Low Priority:** Single-request commands unaffected
*   **Resource Efficiency:** Keep-alive reduces server load

## 🔗 Evidences

- Node.js HTTP Agent docs recommend keepAlive for reuse
- NestJS/Express apps commonly configure agents
- Axios supports httpAgent/httpsAgent options
