# Raw Axios in healthCheck Bypasses Error Sanitization

**Severity:** MEDIUM
**File Ref:** `src/core/api/client.ts:128-152`
**Tags:** #security #credential-leakage #error-handling

## 🔍 The Observation

The `healthCheck()` method uses a raw `axios.get()` call instead of the configured `this.client`, bypassing the response interceptor that sanitizes errors. If the health check fails and the error is logged upstream, it could potentially expose configuration details.

Similarly, `triggerWebhook()` (lines 445-477) creates an ad-hoc axios client without the sanitization interceptor.

## 💻 Code Reference
```typescript
// client.ts:128-152 - Raw axios bypasses interceptors
async healthCheck(): Promise<HealthCheckResponse> {
  try {
    const baseUrl = this.client.defaults.baseURL || '';
    const healthzUrl = baseUrl.replace(/\/api\/v\d+\/?$/, '') + '/healthz';
    
    // Uses raw axios, not this.client - no sanitization!
    const response = await axios.get(healthzUrl, {
      timeout: 5000,
      validateStatus: (status) => status < 500
    });
    // ...
  } catch {
    // Fallback uses this.client (good)
    try {
      await this.client.get('/workflows', { params: { limit: 1 } });
      // ...
    } catch (fallbackError) {
      throw handleN8nApiError(fallbackError);  // sanitized
    }
  }
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Mixing configured clients (with interceptors) and raw axios calls, creating inconsistent error handling paths.
*   **Best Practice:** All HTTP calls should flow through the configured client to ensure consistent error handling, logging, and security controls.
*   **Reference:** [Axios Interceptors](https://axios-http.com/docs/interceptors) - Designed for exactly this purpose

## 🛠️ Fix Plan

1.  Create a separate axios instance for non-authenticated calls (healthz, webhooks) that still has the sanitization interceptor.
2.  Or: Manually sanitize errors in the catch blocks of these methods.
3.  Audit `triggerWebhook()` for same issue.

```typescript
// Option 1: Create sanitized non-auth client
private healthClient: AxiosInstance;

constructor(config: N8nApiClientConfig) {
  // ... existing this.client setup ...
  
  this.healthClient = axios.create({ timeout: 5000 });
  this.healthClient.interceptors.response.use(
    (r) => r,
    (e) => Promise.reject(this.sanitizeAxiosError(e))
  );
}
```

## 💼 Business Impact

**Security Risk:** Low-to-medium. The healthz endpoint doesn't require authentication, so the API key isn't sent. However, error objects could contain:
- Base URL (revealing internal infrastructure)
- Request configuration details
- Stack traces in verbose mode

**Effort:** ~30 minutes to create shared sanitization or secondary client.

## 🔗 Evidences

- `sanitizeAxiosError()` (lines 97-124) specifically handles header and request sanitization
- The catch blocks use generic error handling without sanitization
- `triggerWebhook()` creates ad-hoc client with same issue
