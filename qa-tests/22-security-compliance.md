## Phase 21: Deep Inspection & Security Compliance

**Goal:** Test secret masking, sanitization, and permission checks.
**Source Truth:** `utils/output.ts`, `core/config/loader.ts`, `core/sanitizer.ts`

### 21.1 Secret Masking (Redaction)

**Target:** `sanitizeForLogging` and `sanitizeAxiosError` in `utils/output.ts`

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| SEC-004 | Header Redaction | Verbose error with `-v` | `X-N8N-API-KEY: [REDACTED]` |
| SEC-005 | Object Sanitization | Error with apiKey in response | Masked in output |
| SEC-006 | Password Masking | Config with password field | Never shown in logs |
| SEC-007 | Token Redaction | Bearer token in error | `Bearer [REDACTED]` |

```bash
echo "=== SEC-004: Header Redaction ==="
# Force verbose error - API key must be redacted
N8N_HOST="http://localhost:9999" n8n health -v 2>&1 | grep -i "api-key\|apikey\|authorization"
# Should show [REDACTED] or ... but NEVER actual key

echo "=== SEC-005: Object Sanitization ==="
# Trigger error that includes response data
n8n auth login -H http://localhost:5678 -k "test_secret_key_12345" --json 2>&1 | grep -i "secret\|key\|password"
# Secrets should be masked

echo "=== SEC-007: Token Redaction Verification ==="
# Check that verbose logs don't expose tokens
n8n workflows list -v 2>&1 | grep -E "(Bearer|token|apiKey)" | head -5
```

### 21.2 Config File Permissions

**Target:** `checkFilePermissions` in `core/config/loader.ts` (Lines 45-70)

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| PRM-005 | Insecure 777 | `chmod 777 .n8nrc` | Warning message |
| PRM-006 | Insecure 644 | `chmod 644 .n8nrc` | Warning message |
| PRM-007 | Secure 600 | `chmod 600 .n8nrc` | No warning |
| PRM-008 | Strict Mode Refusal | `N8N_STRICT_PERMISSIONS=true` + 644 | Exit code 1 |
| PRM-009 | Group Readable | `chmod 640 .n8nrc` | Warning (group access) |

```bash
# Setup test config
echo '{"host":"http://localhost:5678","apiKey":"test"}' > /tmp/test-n8nrc.json

echo "=== PRM-005: Insecure 777 ==="
chmod 777 /tmp/test-n8nrc.json
N8N_CONFIG=/tmp/test-n8nrc.json n8n config show 2>&1 | grep -i "permission\|insecure\|warning"

echo "=== PRM-006: Insecure 644 ==="
chmod 644 /tmp/test-n8nrc.json
N8N_CONFIG=/tmp/test-n8nrc.json n8n config show 2>&1 | grep -i "permission\|insecure\|warning"

echo "=== PRM-007: Secure 600 ==="
chmod 600 /tmp/test-n8nrc.json
N8N_CONFIG=/tmp/test-n8nrc.json n8n config show 2>&1 | grep -i "permission\|insecure\|warning"
echo "No warning expected above"

echo "=== PRM-008: Strict Mode Refusal ==="
chmod 644 /tmp/test-n8nrc.json
N8N_STRICT_PERMISSIONS=true N8N_CONFIG=/tmp/test-n8nrc.json n8n config show 2>&1
echo "Exit: $?"  # Expected: 1 or 78 (CONFIG)

# Cleanup
rm -f /tmp/test-n8nrc.json
```

### 21.3 Output Sanitization

**Target:** `core/sanitizer.ts`

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| SAN-001 | Strip Server Fields | Export workflow | No `id`, `createdAt` |
| SAN-002 | Remove Execution Data | Export | No execution results |
| SAN-003 | Credential Reference | Export default | Credentials stripped |
| SAN-004 | Full Export | `--full` flag | All fields preserved |

```bash
# First create a workflow
WF_ID=$(n8n workflows list -l 1 --json | jq -r '.data[0].id')

echo "=== SAN-001: Strip Server Fields ==="
n8n workflows export $WF_ID | jq 'has("id"), has("createdAt"), has("updatedAt")'
# Should output: false, false, false

echo "=== SAN-004: Full Export ==="
n8n workflows export $WF_ID --full | jq 'has("id"), has("createdAt")'
# Should output: true, true
```

---

## Source Code Reference

**`utils/output.ts`:**
```typescript
// sanitizeForLogging(): Masks apiKey, password, secret, token
// sanitizeAxiosError(): Redacts headers and response data
// SENSITIVE_KEYS = ['apiKey', 'password', 'secret', 'token', 'authorization']
```

**`core/config/loader.ts`:**
```typescript
// Lines 45-70: checkFilePermissions()
// Unix mode check: (mode & 0o077) !== 0 → insecure
// Strict mode: Throws error instead of warning
```
