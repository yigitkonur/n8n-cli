# Rate Limit Error Has retryAfter But Caller Doesn't Use It

**Severity:** LOW
**File Ref:** `src/utils/errors.ts:46-54`
**Tags:** #reliability #api-client #ux

## 🔍 The Observation

The `N8nRateLimitError` class captures the `retry-after` header value from 429 responses, but no caller uses this information. The user sees "Rate limit exceeded" but isn't told when to retry.

## 💻 Code Reference
```typescript
// errors.ts:46-54 - Captures retryAfter
export class N8nRateLimitError extends N8nApiError {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds`
      : 'Rate limit exceeded';
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'N8nRateLimitError';
  }
}

// errors.ts:98-100 - Extracts from headers
case 429:
  const retryAfter = axiosError.response.headers['retry-after'];
  return new N8nRateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Capturing information that's never used. Error message mentions retry time but CLI doesn't act on it.
*   **Best Practice:** Either implement automatic retry with backoff, or prominently display retry-after in user output.
*   **Reference:** HTTP 429 spec requires honoring Retry-After header

## 🛠️ Fix Plan

1.  Display retry-after prominently in `printError()`:

```typescript
// In printError(), add special handling for rate limits
if (error.code === 'RATE_LIMIT_ERROR' && error.details?.retryAfter) {
  const retryAfter = error.details.retryAfter as number;
  console.error(chalk.yellow(`\n   ⏱️  Retry in ${retryAfter} seconds`));
  console.error(chalk.dim(`   Command: sleep ${retryAfter} && !!`));
}
```

2.  Better: Implement retry logic in API client (see observation #4).

3.  Consider: Auto-sleep and retry for non-destructive operations.

## 💼 Business Impact

**User Experience:** Users hitting rate limits don't know how long to wait.

**Automation:** Scripts can't intelligently backoff without this information.

**Effort:** ~15 minutes for display, more for auto-retry.

## 🔗 Evidences

- retryAfter is parsed from headers (line 99)
- Stored in error.details but not surfaced in suggestions (line 181-185)
- Other CLIs (gh, aws) display retry information prominently
