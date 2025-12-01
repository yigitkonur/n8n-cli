## Phase 28: CI/CD Environment Simulation

**Goal:** Test environment detection, non-interactive mode, and typed confirmation.
**Source Truth:** `utils/prompts.ts`
- `isNonInteractive()` checks: `CI`, `GITHUB_ACTIONS`, `TERM=dumb` (Lines 25-36)
- `requireTypedConfirmation()` (Lines 187-216)

### 28.1 Environment Detection

| Test ID | Test Case | Env Var | Expected Result |
|---------|-----------|---------|-----------------|
| CI-001 | CI Environment | `CI=true` | isNonInteractive() → true |
| CI-002 | GitHub Actions | `GITHUB_ACTIONS=true` | isNonInteractive() → true |
| CI-003 | Dumb Terminal | `TERM=dumb` | isNonInteractive() → true |
| CI-004 | Normal Terminal | None of above | isNonInteractive() → false |
| CI-005 | CI Prompt Fail | `CI=true` + Destructive op | Fails: "Use --force" |

```bash
echo "=== CI-001: CI Environment Detection ==="
# Verify CI mode is detected
CI=true n8n auth status 2>&1 | head -5
# Should NOT prompt for input

echo "=== CI-002: GitHub Actions Detection ==="
GITHUB_ACTIONS=true n8n health 2>&1 | head -5
# Should work without prompts

echo "=== CI-003: Dumb Terminal Detection ==="
TERM=dumb n8n nodes list --limit 1 2>&1 | head -5
# Should work in non-interactive mode

echo "=== CI-005: CI Prompt Protection ==="
# Try destructive operation in CI without --force
CI=true n8n workflows delete --ids "test-id-123" 2>&1 | grep -i "force\|non-interactive\|CI"
echo "Exit: $?"  # Expected: non-zero, message about --force
# Should NOT show interactive prompt, should REQUIRE --force
```

### 28.2 Exact Match Confirmation

**Target:** `workflows/bulk.ts` - Delete >10 items requires `requireTypedConfirmation`

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| CFM-001 | Correct Typed Confirm | `DELETE 15` (Exact) | Operation proceeds |
| CFM-002 | Typo Protection | `delete 15` (Lowercase) | Operation cancelled |
| CFM-003 | Wrong Number | `DELETE 10` (Wrong count) | Operation cancelled |
| CFM-004 | CI Bypass Blocked | `CI=true` | Error (Requires --force) |
| CFM-005 | Force Flag | `--force` | Skips confirmation |

```bash
echo "=== CFM-002: Typo Protection ==="
# Simulate user typing wrong confirmation (requires interactive test)
# echo "delete 15" | n8n workflows delete --all --interactive 2>&1
# Should show "Operation cancelled" because case doesn't match

echo "=== CFM-004: CI Requires Force ==="
CI=true n8n workflows delete --ids "id1,id2,id3,id4,id5,id6,id7,id8,id9,id10,id11" 2>&1 | grep -i "force"
# Expected: Error requiring --force in CI mode

echo "=== CFM-005: Force Flag Bypasses Confirmation ==="
# Create disposable workflow first
TEMP_ID=$(n8n workflows import workflows/20-radar-scan-schedule.json --json 2>/dev/null | jq -r '.data.id // empty')
if [ -n "$TEMP_ID" ]; then
    n8n workflows delete --ids $TEMP_ID --force --json
    echo "Exit: $?"  # Expected: 0 (force skips confirmation)
fi
```

### 28.3 Interactive Flag Behavior

| Test ID | Test Case | Flags | Expected |
|---------|-----------|-------|----------|
| INT-001 | Force Interactive | `--interactive` | Always prompt |
| INT-002 | Force Non-Interactive | `--no-interactive` | Never prompt |
| INT-003 | Default (TTY) | No flags | Auto-detect |

```bash
echo "=== INT-002: Force Non-Interactive ==="
# Even without CI env var, should not prompt
n8n workflows delete --ids "fake-id" --no-interactive 2>&1 | grep -v "^$"
# Should fail without prompting (invalid ID)
```

---

## Source Code Reference

**`utils/prompts.ts`:**
```typescript
// Lines 25-36: isNonInteractive()
// Returns true if: CI=true, GITHUB_ACTIONS=true, TERM=dumb, !process.stdin.isTTY

// Lines 187-216: requireTypedConfirmation()
// Requires exact match like "DELETE 15" for bulk destructive operations
// Case-sensitive, number must match exactly
```
