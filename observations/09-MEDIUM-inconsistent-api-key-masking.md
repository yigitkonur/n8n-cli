# Inconsistent API Key Masking

**Severity:** MEDIUM
**File Ref:** `src/core/config/loader.ts:155-158`, `src/utils/errors.ts`
**Tags:** #Security #Logging #CredentialExposure

## 🔍 The Observation
The codebase has a `maskApiKey()` function that properly truncates keys for display, but it's not consistently used. Error handlers and debug outputs might expose full API keys through:
- Axios error objects containing request headers
- Debug mode logging raw error details
- Unhandled exception stack traces

## 💻 Code Reference
```typescript
// src/core/config/loader.ts:155-158
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 4) + '...' + key.slice(-4);
}
// ^ Good function, but rarely used

// src/utils/errors.ts:162-163 (in verbose mode)
if (error.details) {
  console.error(chalk.dim(`   Details: ${JSON.stringify(error.details, null, 2)}`));
}
// ^ Could expose sensitive data in error.details
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Implementing masking but not applying it everywhere. Axios errors contain full request config including headers.
* **Best Practice:** Sanitize all error logging paths. Use axios interceptors to scrub headers from error objects. Never log raw config objects.
* **Reference:** [Axios Security Best Practices](https://axios-http.com/docs/handling_errors)

## 🛠️ Fix Plan
1. Add axios request interceptor to scrub sensitive headers:
```typescript
this.client.interceptors.request.use((config) => {
  // Clone config for logging without sensitive headers
  return config;
});
```
2. Wrap all error logging to sanitize sensitive fields
3. Add `sanitizeForLogging()` utility that removes known secret patterns
4. Use `maskApiKey()` in config display and health check output

## 💼 Business Impact
Credential leakage in logs enables account takeover. Logs often end up in centralized systems (Splunk, CloudWatch) with broad access. Compliance violation if secrets are logged.

## 🔗 Evidences
- OWASP A09:2021 Security Logging and Monitoring Failures
- Axios docs recommend error sanitization
- Numerous CVEs from leaked credentials in logs
