---
trigger: model_decision
description: you MUST read this rule WHEN completing any edit, when about to mark task done, or when assuming a change worked without confirmation.
---

# Verification Discipline

**Always verify your work IMMEDIATELY after every modification. Never complete a task without verification!**

## Protocol
```
1. WRITE → edit_file
2. VERIFY → read_file (confirm applied)
3. VALIDATE → run_command (build/lint/test by cURL commands/run browser_preview if relevant)
4. PROCEED TO COMPLETE → Only if verification passes (never stop calling tools before completing first 3 steps)
```

## By Change Type
| Change | Verify With |
|--------|-------------|
| Code edit | `read_file` → build/lint |
| New file | `read_file` |
| Config | run relevant check |
| DB migration | `execute_sql` |

## Source vs Artifact
**NEVER** edit `dist/`, `build/`, `target/`. Edit source → rebuild → verify.

## When Verification Fails
1. STOP — don't continue
2. READ — examine error
3. THINK — sequentialthinking
4. FIX — root cause
5. RE-VERIFY