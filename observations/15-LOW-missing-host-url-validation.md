# Missing Host URL Validation

**Severity:** LOW
**File Ref:** `src/core/config/loader.ts:145-147`
**Tags:** #Validation #Configuration #Security

## 🔍 The Observation
The config loader checks if `host` is present but doesn't validate it's a proper URL. Invalid URLs (e.g., "not-a-url", "ftp://wrong-protocol") pass validation and cause confusing axios errors later.

## 💻 Code Reference
```typescript
// src/core/config/loader.ts:145-147
if (!config.host) {
  errors.push('N8N_HOST is required. Set via environment or .n8nrc file.');
}
// Missing: Validate URL format and protocol!
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Presence check without format validation. Garbage in, confusing error out.
* **Best Practice:** Validate URL with `new URL()` and check protocol is http/https.
* **Reference:** Fail-fast configuration validation

## 🛠️ Fix Plan
1. Add URL validation:
```typescript
if (!config.host) {
  errors.push('N8N_HOST is required.');
} else {
  try {
    const url = new URL(config.host);
    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push('N8N_HOST must use http:// or https:// protocol.');
    }
  } catch {
    errors.push('N8N_HOST is not a valid URL.');
  }
}
```

## 💼 Business Impact
Low - users quickly discover invalid URLs. But clear error at config time vs cryptic axios error at runtime improves UX.

## 🔗 Evidences
- Node.js URL constructor validates format
- axios accepts any string, errors at request time
- Config validation should catch all obvious issues
