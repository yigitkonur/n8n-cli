# Rate Limit (429) Ignores Retry-After Header

**Severity:** HIGH
**File Ref:** `src/core/api/client.ts:160-163`
**Tags:** #reliability #api #rate-limiting

## 🔍 The Observation

The retry interceptor explicitly does NOT retry 4xx errors, including 429 (Too Many Requests):

```typescript
// Don't retry client errors (4xx) - they won't succeed on retry
if (status >= 400 && status < 500) {
  return false;
}
```

While not retrying 4xx is generally correct, 429 is a special case per RFC 7231 §6.6.4. The server sends a `Retry-After` header indicating when the client should retry. Ignoring this:
- Causes immediate failure on rate limits
- Prevents automatic recovery after brief wait
- Forces users to manually retry or add external retry logic

## 💻 Code Reference
```typescript
// src/core/api/client.ts:160-163
private shouldRetryRequest(error: AxiosError, retryCount: number): boolean {
  // ...
  const {status} = error.response;
  
  // Don't retry client errors (4xx) - they won't succeed on retry
  if (status >= 400 && status < 500) {
    return false;  // 429 falls here!
  }
  // ...
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Treating 429 like other 4xx errors. Not parsing `Retry-After` header.

*   **Best Practice:** Handle 429 specially: parse `Retry-After` header (seconds or HTTP-date), wait that duration, then retry. Libraries like `axios-retry` support this natively.

*   **Reference:** [RFC 7231 §6.6.4](https://tools.ietf.org/html/rfc7231#section-6.6.4), [MDN Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After)

## 🛠️ Fix Plan

1.  Add 429 handling in `shouldRetryRequest()`:
    ```typescript
    // Special case: 429 is retryable with Retry-After
    if (status === 429) {
      return true;  // Will use delay from retry logic
    }
    ```

2.  Parse `Retry-After` in retry delay calculation:
    ```typescript
    const retryAfter = error.response?.headers['retry-after'];
    if (status === 429 && retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return Math.max(1000, seconds * 1000);  // At least 1 second
      }
    }
    ```

3.  Log rate limit events for user awareness

## 💼 Business Impact

*   **Batch Operations Fail:** `n8n workflows delete --all` hitting rate limits fails entirely
*   **CI/CD Flakiness:** Intermittent 429s cause pipeline failures that would auto-recover
*   **User Frustration:** Manual retry cycles for operations that could self-heal

## 🔗 Evidences

- RFC 7231 §6.6.4 defines Retry-After semantics: https://tools.ietf.org/html/rfc7231#section-6.6.4
- axios-retry library handles this natively
- SailPoint/Anvil APIs mandate Retry-After handling in client documentation
