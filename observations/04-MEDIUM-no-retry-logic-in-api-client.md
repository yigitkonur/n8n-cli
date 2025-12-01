# No Retry Logic in API Client for Transient Failures

**Severity:** MEDIUM
**File Ref:** `src/core/api/client.ts:60-91`
**Tags:** #reliability #network #api-client

## 🔍 The Observation

The API client has no retry logic for transient failures (5xx errors, network timeouts, DNS failures). Each API call fails immediately on first error, making the CLI fragile in real-world network conditions.

The only "retry" is the PUT→PATCH fallback for `updateWorkflow()` (lines 190-198), which handles API version differences, not transient failures.

## 💻 Code Reference
```typescript
// client.ts - No retry mechanism
this.client = axios.create({
  baseURL: apiUrl,
  timeout,  // 30s default, no retry
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
  },
});

// Response interceptor only transforms errors, doesn't retry
this.client.interceptors.response.use(
  (response) => response,
  (error) => {
    const sanitizedError = this.sanitizeAxiosError(error);
    const n8nError = handleN8nApiError(sanitizedError);
    return Promise.reject(n8nError);  // <-- Immediate failure
  }
);
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Single-attempt API calls in a CLI that may run in unstable network conditions or against overloaded servers.
*   **Best Practice:** Implement exponential backoff retry for 5xx errors, rate limits (429), and network errors. Libraries like `axios-retry` handle this elegantly.
*   **Reference:** [AWS SDK Retry Behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) - Industry standard pattern

## 🛠️ Fix Plan

1.  Add `axios-retry` as dependency or implement manual retry interceptor.
2.  Retry on: 5xx, 429, ECONNRESET, ETIMEDOUT, ENOTFOUND (transient DNS).
3.  Use exponential backoff: 1s, 2s, 4s (3 retries max for CLI responsiveness).
4.  Don't retry: 4xx (client errors), 401 (auth - won't help).

```typescript
// Option 1: axios-retry
import axiosRetry from 'axios-retry';
axiosRetry(this.client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => 
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.response?.status === 429 ||
    (error.response?.status ?? 0) >= 500,
});
```

## 💼 Business Impact

**User Experience:** Intermittent failures require manual re-runs, frustrating users and breaking automation.

**Affected Scenarios:**
- CI/CD pipelines during n8n instance restarts
- Rate-limited API calls during bulk operations
- Flaky network connections (VPN, cloud networks)

**Effort:** ~30 minutes with axios-retry, ~2 hours for manual implementation.

## 🔗 Evidences

- 429 rate limit handling exists in error mapping but not retry
- `N8nRateLimitError` includes `retryAfter` but caller doesn't use it
- healthCheck has its own 5s timeout but no retry
