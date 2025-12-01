# maskApiKey() Exposes 8 Characters

**Severity:** MEDIUM
**File Ref:** `src/core/config/loader.ts:297-299`
**Tags:** #security #credentials #logging

## 🔍 The Observation

The `maskApiKey()` function exposes the first 4 and last 4 characters:

```typescript
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) {return '***';}
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
```

For n8n API keys (typically JWT-like), this exposes:
- First 4 chars: Usually `eyJh` (JWT header indicator)
- Last 4 chars: Signature bytes that could aid brute-force

Combined with the regex pattern (`/^[a-zA-Z0-9_-]{20,}$/`), an attacker knows:
- Character set (base64url)
- Minimum length (20)
- 8 known characters

This reduces keyspace significantly for offline attacks.

## 💻 Code Reference
```typescript
// src/core/config/loader.ts:297-299
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) {return '***';}
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Partial exposure of secrets in logs/output. Any exposed characters reduce brute-force difficulty.

*   **Best Practice:** 
    - Full masking: `***` or `[REDACTED]`
    - Hash-based identification: `sha256(key).slice(0,8)` for debugging
    - Length indication only: `[key:48 chars]`

*   **Reference:** OWASP Key Management: Zero-exposure in logs recommended

## 🛠️ Fix Plan

1.  Option A - Full mask:
    ```typescript
    return '***';  // or '[REDACTED]'
    ```

2.  Option B - Hash-based (if identification needed):
    ```typescript
    import { createHash } from 'crypto';
    return `[key:${createHash('sha256').update(key).digest('hex').slice(0,8)}]`;
    ```

3.  Option C - Length only:
    ```typescript
    return `[API key: ${key.length} chars]`;
    ```

## 💼 Business Impact

*   **Reduced Key Entropy:** 8 chars exposed = less brute-force effort
*   **Attack Correlation:** Same key shows same mask → multi-system attacks
*   **Audit Trail:** Logs with partial keys are compliance-concerning

## 🔗 Evidences

- OWASP Key Management Cheat Sheet recommends zero exposure
- Similar to Kubernetes kubectl which fully masks secrets
- AWS CLI masks credentials entirely in logs
