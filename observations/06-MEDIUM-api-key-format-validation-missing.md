# API Key Format Validation Missing

**Severity:** MEDIUM
**File Ref:** `src/core/config/loader.ts:138-149`
**Tags:** #Security #Validation #InputSanitization

## 🔍 The Observation
The `validateConfig()` function only checks if the API key is present (truthy), not whether it has a valid format. n8n API keys are typically 32-64 character hex strings. Malformed keys cause confusing 401 errors instead of clear validation failures.

## 💻 Code Reference
```typescript
// src/core/config/loader.ts:138-149
export function validateConfig(config: CliConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.apiKey) {  // Only checks presence, not format!
    errors.push('N8N_API_KEY is required. Set via environment or .n8nrc file.');
  }
  
  if (!config.host) {
    errors.push('N8N_HOST is required. Set via environment or .n8nrc file.');
  }
  
  return { valid: errors.length === 0, errors };
}
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Accepting any truthy value as valid. Empty strings, partial keys, or garbage pass validation.
* **Best Practice:** Validate format with regex before use. Fail fast with clear error: "API key appears malformed (expected 32+ hex characters)".
* **Reference:** [OWASP API Security A07:2021](https://owasp.org/API-Security/editions/2023/en/0xa7-server-side-request-forgery/)

## 🛠️ Fix Plan
1. Add format validation:
```typescript
if (!config.apiKey) {
  errors.push('N8N_API_KEY is required.');
} else if (!/^[a-zA-Z0-9_-]{20,}$/.test(config.apiKey)) {
  errors.push('N8N_API_KEY appears malformed. Expected 20+ alphanumeric characters.');
}
```
2. Optionally validate against n8n's actual key format if documented
3. Add warning for suspiciously short keys

## 💼 Business Impact
Confusing error messages waste developer time. Malformed keys might be logged in error contexts, creating audit confusion. Potential for injection if key is used in other contexts.

## 🔗 Evidences
- OWASP recommends validating all configuration inputs
- Fail-fast principle: Catch issues at config load, not at API call
- n8n keys follow predictable patterns that can be validated
