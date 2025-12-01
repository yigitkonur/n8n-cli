# maskApiKey Shows First and Last 4 Characters

**Severity:** LOW
**File Ref:** `src/core/config/loader.ts:297-300`
**Tags:** #security #credentials #logging

## 🔍 The Observation

The `maskApiKey()` function reveals the first 4 and last 4 characters of API keys (`eyJh...vGv8`). While this helps with debugging (identifying which key is in use), it also reveals:
- Key prefix/format (helps identify token type)
- Partial entropy that could aid brute force in theory
- More than necessary for identification

## 💻 Code Reference
```typescript
// loader.ts:297-300
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 4) + '...' + key.slice(-4);  // Shows 8 chars total
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Revealing fixed portions of secrets in logs/output.
*   **Best Practice:** Show only enough to identify (first 4 or hash suffix), or use consistent masking (`****-****-****-XXXX` pattern).
*   **Reference:** AWS shows last 4 of access key only. Stripe shows last 4 of API key.

## 🛠️ Fix Plan

1.  Reduce visible characters or use hash-based identification:

```typescript
// Option A: Show less
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return key.slice(0, 4) + '****';  // First 4 only
}

// Option B: Show hash suffix (no actual key chars)
import { createHash } from 'node:crypto';
export function maskApiKey(key: string): string {
  if (!key) return '****';
  const hash = createHash('sha256').update(key).digest('hex');
  return `****...${hash.slice(-6)}`;  // Shows hash suffix
}
```

2.  Document that masked output should not be logged to shared systems.

## 💼 Business Impact

**Security:** Very low practical risk - 8 characters of high-entropy key doesn't significantly help attacks.

**Debugging:** Current format is helpful for identifying which key is configured when users have multiple.

**Trade-off:** Security purists prefer less exposure; debugging needs identification.

**Effort:** ~10 minutes if changing.

## 🔗 Evidences

- JWT tokens often start with "eyJ" (base64 of `{"`) - first 4 reveals format
- Most key masking in industry shows 4 chars max
- This is used in auth status output and error messages
