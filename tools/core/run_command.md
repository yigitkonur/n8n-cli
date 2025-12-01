# run_command

Execute terminal commands on user's machine.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CommandLine` | string | Yes | Exact command to execute |
| `Cwd` | string | Yes | Current working directory (absolute path) |
| `Blocking` | boolean | Yes | Wait for completion before continuing |
| `SafeToAutoRun` | boolean | Yes | If safe to run without user approval |
| `WaitMsBeforeAsync` | integer | No | Ms to wait before going async (for non-blocking) |

## Critical Rules

1. **NEVER use `cd` in command** - Use `Cwd` parameter instead
2. **Safety assessment required** - Unsafe commands need user approval

## Blocking vs Non-Blocking

**Use Blocking=true when:**
- Command finishes quickly
- Need to see output before responding

**Use Blocking=false when:**
- Starting long-running processes (dev servers)
- Command may run indefinitely

## Safety Assessment

**Unsafe operations (require approval):**
- Deleting files
- Mutating state
- Installing system dependencies
- Making external requests

**Safe operations (can auto-run):**
- Reading files
- Listing directories
- Running tests (read-only)

Commands run with `PAGER=cat`. Limit output for commands that usually page (e.g., `git log -n 10`).
