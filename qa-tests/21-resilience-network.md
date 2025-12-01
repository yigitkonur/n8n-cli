## Phase 20: Resilience & Network Fault Tolerance

**Goal:** Test retry logic, timeout handling, and network error recovery.
**Source Truth:** `core/api/client.ts` (Lines 68-138), `core/lifecycle.ts`

### 20.1 Auto-Retry Logic

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| RES-001 | 429 Rate Limit | Mock 429 + `Retry-After: 2` | Pauses 2s, retries |
| RES-002 | 5xx Server Error | Mock 502 twice, then 200 | Succeeds after 2 retries |
| RES-003 | Client Error (No Retry) | Mock 404 or 400 | Immediate fail (Exit 65) |
| RES-004 | Max Retries Exceeded | Mock 5xx forever | Fails after max attempts |
| RES-005 | Retry Backoff | Observe retry timing | Exponential backoff |

```bash
# Test 429 Rate Limit handling (requires mock server or intercept)
# This test verifies the shouldRetryRequest logic in client.ts

echo "=== RES-001: 429 Rate Limit (Manual Test) ==="
# Start a mock server that returns 429 with Retry-After header
# Then observe CLI behavior with timestamps

echo "=== RES-003: Client Error No Retry ==="
# Invalid workflow ID triggers 404
n8n workflows get "nonexistent-id-12345" --json 2>&1
echo "Exit: $?"  # Expected: 65 (DATAERR) or 72 (PROTOCOL)

echo "=== RES-005: Retry Backoff Observation ==="
# With verbose mode, observe retry attempts
N8N_HOST="http://localhost:9999" n8n health -v 2>&1 | head -30
echo "Exit: $?"
```

### 20.2 Timeout & Signal Handling

**Source Truth:** `core/lifecycle.ts` (Line 23), `core/api/client.ts` (Line 56)

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| TMO-001 | Request Timeout | Config `timeout: 100` | ECONNABORTED |
| TMO-002 | Cleanup Timeout | `N8N_CLEANUP_TIMEOUT_MS=100` + SIGINT | Force exit |
| TMO-003 | Graceful Shutdown | SIGINT during operation | Cleanup runs |
| TMO-004 | SIGTERM Handling | Send SIGTERM | Graceful exit |

```bash
echo "=== TMO-001: Request Timeout ==="
# Set very short timeout
N8N_REQUEST_TIMEOUT=100 n8n health --json 2>&1
echo "Exit: $?"

echo "=== TMO-003: Graceful Shutdown (Manual) ==="
# Start a long operation and send SIGINT
# n8n workflows list --limit 1000 &
# PID=$!
# sleep 0.5
# kill -INT $PID
# wait $PID
# echo "Exit: $?"
```

### 20.3 Connection Error Handling

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| CON-001 | DNS Resolution Fail | Invalid hostname | Connection error |
| CON-002 | Port Not Open | Valid host, wrong port | ECONNREFUSED |
| CON-003 | SSL Certificate Error | Self-signed cert | Certificate error |
| CON-004 | Network Unreachable | Disconnect network | Network error |

```bash
echo "=== CON-001: DNS Resolution Fail ==="
N8N_HOST="http://this-host-does-not-exist.local:5678" n8n health --json 2>&1
echo "Exit: $?"

echo "=== CON-002: Port Not Open ==="
N8N_HOST="http://localhost:59999" n8n health --json 2>&1
echo "Exit: $?"

echo "=== CON-003: SSL Certificate Error (if applicable) ==="
N8N_HOST="https://self-signed.badssl.com" n8n health --json 2>&1
echo "Exit: $?"
```

---

## Source Code Reference

**`core/api/client.ts`:**
```typescript
// Lines 68-138: shouldRetryRequest implementation
// - Retries on 429 with Retry-After header
// - Retries on 5xx errors (502, 503, 504)
// - NO retry on 4xx client errors (except 429)
// - Exponential backoff with jitter
```

**`core/lifecycle.ts`:**
```typescript
// Line 23: CLEANUP_TIMEOUT_MS default
// Signal handlers: SIGINT, SIGTERM
// Cleanup callback registration
```
