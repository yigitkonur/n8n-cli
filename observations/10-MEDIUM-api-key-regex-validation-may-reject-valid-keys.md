# API Key Validation Regex May Reject Valid Keys

**Severity:** MEDIUM
**File Ref:** `src/core/config/loader.ts:261-262`
**Tags:** #validation #user-experience #compatibility

## 🔍 The Observation

The API key validation uses a regex pattern `/^[a-zA-Z0-9_-]{20,}$/` which may reject valid n8n API keys if they contain other characters or use different encoding formats (e.g., base64 with `=` padding, or JWT format with `.` separators).

The n8n API key format isn't documented as strictly alphanumeric, and future versions might use different formats.

## 💻 Code Reference
```typescript
// loader.ts:261-262
if (!/^[a-zA-Z0-9_-]{20,}$/.test(config.apiKey)) {
  errors.push('N8N_API_KEY appears malformed. Expected 20+ alphanumeric characters (including - and _).');
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Strict client-side validation of server-generated tokens. The server is the source of truth for token validity.
*   **Best Practice:** Minimal client-side validation (non-empty, reasonable length) combined with server-side validation via test request. Let the auth endpoint validate the actual token.
*   **Reference:** [OAuth 2.0 Token Format](https://datatracker.ietf.org/doc/html/rfc6749#section-1.4) - Access tokens are opaque strings, format is implementation-defined

## 🛠️ Fix Plan

1.  Relax the regex to allow more characters: `/^[a-zA-Z0-9_\-=+/.]{10,}$/` (allows base64, JWT)
2.  Or: Remove format validation entirely, rely on length check and server validation.
3.  The `verifyCredentials()` call in login already validates against the actual API.

```typescript
// Relaxed validation - trust the server
if (!config.apiKey || config.apiKey.length < 10) {
  errors.push('N8N_API_KEY is required and must be at least 10 characters.');
}
// Note: Actual validity is verified by API call in auth commands
```

## 💼 Business Impact

**User Experience:** Users with valid but non-standard API keys see confusing "malformed" errors when their keys would actually work.

**Future Compatibility:** If n8n changes API key format (e.g., to JWT), the CLI would reject valid keys.

**Effort:** ~15 minutes to relax validation.

## 🔗 Evidences

- JWT tokens contain `.` characters (not in current regex)
- Base64 encoding uses `=` for padding (not in current regex)
- n8n API key format may vary between versions/deployments
