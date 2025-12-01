# ECONNREFUSED Not in Retry List

**Severity:** MEDIUM
**File Ref:** `src/core/api/client.ts:149-155`
**Tags:** #reliability #network #retry

## 🔍 The Observation

The retry logic lists specific network error codes:

```typescript
const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'ENETUNREACH'];
if (error.code && retryableCodes.includes(error.code)) {
  return true;
}
```

`ECONNREFUSED` is missing. This error occurs when:
- n8n server is restarting (common in dev/updates)
- Service just started but not listening yet
- Docker container restart in progress

These are classic transient failures that should be retried.

## 💻 Code Reference
```typescript
// src/core/api/client.ts:149-155
if (!error.response) {
  const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'ENETUNREACH'];
  if (error.code && retryableCodes.includes(error.code)) {
    debug('api', `Retryable network error: ${error.code}`);
    return true;
  }
  return false;
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Incomplete retry error code list. Missing common transient failure codes.

*   **Best Practice:** Include all transient network errors:
    - ECONNREFUSED: Connection refused (server not ready)
    - ECONNRESET: Connection reset by peer
    - ETIMEDOUT: Connection timed out
    - ENOTFOUND: DNS lookup failed
    - ENETUNREACH: Network unreachable
    - EHOSTUNREACH: Host unreachable

*   **Reference:** Node.js net module error codes, axios-retry default configuration

## 🛠️ Fix Plan

1.  Add ECONNREFUSED to retry list:
    ```typescript
    const retryableCodes = [
      'ECONNRESET', 
      'ETIMEDOUT', 
      'ECONNABORTED', 
      'ENOTFOUND', 
      'ENETUNREACH',
      'ECONNREFUSED',  // Server not ready yet
      'EHOSTUNREACH',  // Host unreachable
    ];
    ```

2.  Consider logging retry attempts at debug level

## 💼 Business Impact

*   **Dev Experience:** Server restart fails commands that would succeed 1s later
*   **CI/CD Flakiness:** Service startup timing causes false failures
*   **Container Orchestration:** Kubernetes pod restarts cause unnecessary failures

## 🔗 Evidences

- Node.js net module documents ECONNREFUSED as common transient error
- axios-retry library includes ECONNREFUSED by default
- Common in Docker/K8s environments during rolling updates
