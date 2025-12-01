## Phase 27: Lifecycle Management & Cleanup Timeouts

**Goal:** Test process termination, signal handling, and cleanup mechanisms.
**Source Truth:** `core/lifecycle.ts`
- `CLEANUP_TIMEOUT_MS = 5000` (Line 17)
- Configurable via `N8N_CLEANUP_TIMEOUT_MS` (Line 18)
- `forceExitTimeout` mechanism (Line 33)

### 27.1 Process Termination Logic

| Test ID | Test Case | Setup | Expected Result |
|---------|-----------|-------|-----------------|
| LFC-001 | Cleanup Timeout | `N8N_CLEANUP_TIMEOUT_MS=1` | Force exit message |
| LFC-002 | Broken Pipe | Pipe to closed reader | Ignores SIGPIPE (Line 67) |
| LFC-003 | Normal Cleanup | Default timeout | Graceful exit |
| LFC-004 | Long Cleanup | Slow operation + SIGINT | Waits up to 5s |
| LFC-005 | Zero Timeout | `N8N_CLEANUP_TIMEOUT_MS=0` | Immediate force exit |

```bash
echo "=== LFC-001: Forced Cleanup Timeout ==="
# Run command with super short timeout
N8N_CLEANUP_TIMEOUT_MS=1 n8n nodes list --limit 10 2>&1 | grep -i "forcing exit\|timeout\|cleanup"
echo "Exit: $?"

echo "=== LFC-002: SIGPIPE Resilience (Broken Pipe) ==="
# Simulate broken pipe - head closes stream before command finishes
n8n nodes list --limit 0 --json | head -n 1
EXIT_CODE=$?
echo "Exit: $EXIT_CODE"
# Should exit cleanly (0 or 141), NOT with stack trace
[ "$EXIT_CODE" -eq 0 ] || [ "$EXIT_CODE" -eq 141 ] && echo "✅ SIGPIPE handled"

echo "=== LFC-003: Normal Cleanup ==="
# Normal operation should cleanup gracefully
n8n nodes list --limit 5 --json > /dev/null
echo "Exit: $?"  # Expected: 0

echo "=== LFC-005: Zero Timeout (Immediate Force) ==="
N8N_CLEANUP_TIMEOUT_MS=0 n8n nodes search "test" --json > /dev/null 2>&1
echo "Exit: $?"
```

### 27.2 Signal Handling

| Test ID | Test Case | Signal | Expected |
|---------|-----------|--------|----------|
| SIG-001 | SIGINT | Ctrl+C | Cleanup + Exit 130 |
| SIG-002 | SIGTERM | kill -TERM | Cleanup + Exit 143 |
| SIG-003 | SIGPIPE | Pipe break | Ignore, continue |
| SIG-004 | Double SIGINT | Ctrl+C twice | Force immediate exit |

```bash
echo "=== SIG-001: SIGINT Handling (Manual Test) ==="
# Start long operation in background
# n8n workflows list --limit 1000 &
# PID=$!
# sleep 0.5
# kill -INT $PID
# wait $PID
# echo "Exit: $?"  # Expected: 130

echo "=== SIG-003: SIGPIPE Handling ==="
# This should not crash
(n8n nodes list --limit 100 --json || true) | head -c 100 > /dev/null
echo "✅ SIGPIPE test completed"
```

### 27.3 Unhandled Rejection & Error Handling

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| ERR-001 | Unhandled Promise | Async error | Exit 1, cleanup runs |
| ERR-002 | Sync Exception | Throw in command | Exit 1, stack trace |
| ERR-003 | Graceful Error | Validation fail | Exit 65, no stack |

```bash
echo "=== ERR-003: Graceful Error Handling ==="
# Validation error should be graceful (no stack trace)
n8n workflows validate /nonexistent/file.json 2>&1 | grep -v "at "
echo "Exit: $?"  # Expected: 66 (NOINPUT)
```

---

## Source Code Reference

**`core/lifecycle.ts`:**
```typescript
// Line 17: CLEANUP_TIMEOUT_MS = 5000 (default)
// Line 18: process.env.N8N_CLEANUP_TIMEOUT_MS override
// Line 33: forceExitTimeout - forces exit if cleanup hangs
// Line 67: process.on('SIGPIPE', () => {}) - ignore broken pipes
// Registers handlers for: SIGINT, SIGTERM, uncaughtException, unhandledRejection
```
