---
trigger: model_decision
description: you MUST read this rule WHEN running shell commands, checking command status, or reading terminal output.
---

# Core Execution

Use for all terminal/shell interactions.

## run_command

**Execute shell commands**

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `CommandLine` | string | ✅ | Exact command to run |
| `Cwd` | string | ✅ | Working directory (absolute path) |
| `Blocking` | boolean | ✅ | Wait for completion? |
| `SafeToAutoRun` | boolean | ✅ | Safe without user approval? |
| `WaitMsBeforeAsync` | integer | ❌ | Wait before async (for non-blocking) |

**⚠️ CRITICAL: NEVER use `cd` in CommandLine — use `Cwd` instead.**

---

## Safety Rules

### Safe to auto-run (SafeToAutoRun=true)
- Read-only: `ls`, `cat`, `echo`, `pwd`
- Status checks: `git status`, `git diff`, `git log -n 10`
- Build/lint: `pnpm test`, `pnpm lint`, `pnpm build`
- Type checks: `pnpm typecheck`, `tsc --noEmit`

### Unsafe (SafeToAutoRun=false) — need approval
- Deletions: `rm`, `git reset --hard`
- Mutations: `git push`, `git commit`
- Installations: `npm install`, `pip install`
- Docker: `docker run`, `docker-compose up`
- Any external requests or state changes

---

## command_status

**Check async command status**

| Parameter | Description |
|-----------|-------------|
| `CommandId` | Background command ID |
| `OutputCharacterCount` | Characters to view (keep small) |
| `WaitDurationSeconds` | Wait for completion (max 60s) |

Use for background command IDs only.

---

## read_terminal

**Read terminal contents**

| Parameter | Description |
|-----------|-------------|
| `ProcessID` | Terminal process ID |
| `Name` | Terminal name |

---

## Common Patterns

**Start dev server (non-blocking):**
```
Blocking: false
WaitMsBeforeAsync: 2000  # catch quick errors
```

**Run tests (blocking):**
```
Blocking: true
SafeToAutoRun: true
```

**Git operations (blocking, need approval):**
```
Blocking: true
SafeToAutoRun: false
```

---

## Best Practices

1. **Never `cd`** — use `Cwd` parameter
2. **Check for existing servers** before starting new ones
3. **Use `Blocking: false`** for: dev servers, watch processes
4. **Use `Blocking: true`** for: quick commands, when you need output
5. **Limit output** for paging commands (e.g., `git log -n 10`)