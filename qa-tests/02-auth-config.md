## Phase 2: Authentication & Configuration

### 2.1 Authentication Flow

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| AUTH-001 | Login with flags | `n8n auth login -H <url> -k <key>` | Success, config saved |
| AUTH-002 | Login interactive | `n8n auth login --interactive` | Prompts for input |
| AUTH-003 | Status check | `n8n auth status` | Shows "Connected" |
| AUTH-004 | Whoami alias | `n8n auth whoami` | Same as status |
| AUTH-005 | Health check | `n8n health` | Connected + latency |
| AUTH-006 | Logout | `n8n auth logout` | Clears credentials |
| AUTH-007 | Status after logout | `n8n auth status` | Shows "Not configured" |
| AUTH-008 | Invalid credentials | `n8n auth login -H http://localhost:5678 -k WRONG` | Error on health check |

```bash
# Test Script
echo "=== AUTH-001: Login ===" 
n8n auth login -H http://localhost:5678 -k "$N8N_API_KEY" --json

echo "=== AUTH-003: Status ===" 
n8n auth status --json | jq -e '.data.connected'

echo "=== AUTH-005: Health ===" 
n8n health --json | jq '{status: .data.status, latency: .data.latencyMs}'

echo "=== AUTH-006: Logout ===" 
n8n auth logout --json

echo "=== AUTH-007: Status After Logout ===" 
n8n auth status --json 2>&1
```

### 2.2 Configuration File Precedence

| Test ID | Test Case | Setup | Expected Result |
|---------|-----------|-------|-----------------|
| CFG-001 | Local .n8nrc | Create `.n8nrc` in cwd | Uses local config |
| CFG-002 | Local JSON | Create `.n8nrc.json` in cwd | Uses JSON config |
| CFG-003 | Home directory | Create `~/.n8nrc` | Falls back to home |
| CFG-004 | XDG config | Create `~/.config/n8n/config.json` | Uses XDG path |
| CFG-005 | Env override | `N8N_HOST=x N8N_API_KEY=y n8n health` | Env takes precedence |
| CFG-006 | Config show | `n8n config show` | Displays active config |

```bash
# Test Script - CFG-001 to CFG-005
echo "=== CFG-001: Local .n8nrc ===" 
echo "N8N_HOST=http://test-local:5678" > .n8nrc
n8n config show | grep -i host

echo "=== CFG-005: Env Override ===" 
N8N_HOST=http://env-override:5678 n8n config show --json | jq '.data.host'

echo "=== CFG-006: Config Show ===" 
n8n config show --json | jq '.'

# Cleanup
rm -f .n8nrc
```

### 2.3 Security & Permissions

**Source Truth:** `core/config/loader.ts` (Lines 45-70) - `checkFilePermissions`

| Test ID | Test Case | Setup | Expected Result |
|---------|-----------|-------|-----------------|
| SEC-001 | Insecure file perms | `chmod 777 .n8nrc` | Warning shown |
| SEC-002 | Strict mode | `N8N_STRICT_PERMISSIONS=true` with 777 | Refuses to load |
| SEC-003 | Secure perms | `chmod 600 .n8nrc` | No warning |
| SEC-004 | Group readable | `chmod 640 .n8nrc` | Warning (group) |
| SEC-005 | World readable | `chmod 644 .n8nrc` | Warning (world) |

```bash
# Test Script
echo "N8N_HOST=http://test:5678" > .n8nrc
chmod 777 .n8nrc

echo "=== SEC-001: Insecure Warning ===" 
n8n config show 2>&1 | grep -i "permission\|warning" || echo "No warning (may vary by OS)"

echo "=== SEC-002: Strict Mode ===" 
N8N_STRICT_PERMISSIONS=true n8n config show 2>&1; echo "Exit: $?"

chmod 600 .n8nrc
rm -f .n8nrc
```

### 2.4 Secret Redaction in Output

**Source Truth:** `utils/output.ts` - `sanitizeForLogging`, `sanitizeAxiosError`

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| RED-001 | Header redaction | Verbose error `-v` | `X-N8N-API-KEY: [REDACTED]` |
| RED-002 | Object sanitization | Error with apiKey | Masked |
| RED-003 | Token redaction | Bearer in error | `Bearer [REDACTED]` |

```bash
echo "=== RED-001: Header Redaction ==="
N8N_HOST="http://invalid:9999" n8n health -v 2>&1 | grep -i "api-key\|apikey"
# Should show [REDACTED] not actual key

echo "=== RED-002: Sensitive Field Masking ==="
n8n auth login -H http://localhost:5678 -k "secret_test_key" --json 2>&1 | grep -i "secret\|key"
# Secrets should be masked
```

**Redaction Rules:**
- Sensitive keys: `apiKey`, `password`, `secret`, `token`, `authorization`
- Headers are always redacted in verbose output
- Error responses sanitized before display

