---
trigger: model_decision
description: you MUST read this rule WHEN something is broken: errors, exceptions, 'doesn't work', 'used to work', 'expected X got Y', stack traces, wrong output. NOT when: adding features (→01), cleanup (→03), wanting opinion (→04).
---

# DEBUG & FIX EXISTING ISSUE

> Root cause first. Never fix symptoms. Understand before editing.
> "Ask 'why' five times." — Taiichi Ohno (Toyota) / Linus Torvalds

## HARD RULES
- **NEVER edit before understanding root cause** — trace full error path first
- **NEVER fix symptoms** — find WHY it's broken, not just WHERE
- **NEVER skip regression check** — your fix might break something else
- **ALWAYS capture actual error** — no debugging from memory
- **ALWAYS verify fix** — reproduce → fixed → regression check

---

## PHASE 1: ERROR CAPTURE

**Understand symptom** — sequentialthinking (see 12-tools-sequential-thinking.md):
- What's the exact symptom?
- What info do I need?
- Can I reproduce it?

**Capture error** (see 16-tools-core-execution.md):
- Terminal error: read_terminal
- Background command: command_status
- Supabase DB/auth/API: get_logs (see 13-tools-supabase-remote.md)

**Save to `notes/04-current-task.md`:**
- Exact error + stack trace
- Reproduction steps
- Expected vs actual behavior

---

## PHASE 2: TRACE & UNDERSTAND

1. **Trace origin** — warp_grep (see 10-tools-morph-mcp.md): "where does error X originate?"
2. **Pinpoint** — grep_search if exact pattern needed
3. **Form hypothesis** — sequentialthinking **MIN 8 thoughts**:
   - Symptom analysis
   - Hypothesis A, B, C (minimum 3)
   - **Ask "why" 5 times** for each hypothesis
   - Which is root cause vs symptom?
   - Verification strategy per hypothesis
   - Risk assessment
   - Fix approach
   - Regression prevention
   
   **Legend-Guided Thinking:**
   - While analyzing symptoms, think like **Brendan Gregg**: ask "What does the USE method reveal?" — check Utilization, Saturation, Errors for each resource before guessing
   - While forming hypotheses, think like **Linus Torvalds**: ask "Why?" five times for each hypothesis — the first answer is almost never the root cause
   - While untangling the bug, think like **Rich Hickey**: ask "What concerns are complected here?" — separate them before fixing, or you'll create new bugs
   - While planning the fix, think like **Carmack**: ask "What's the single surgical change that fixes this?" — prefer one precise edit over scattered patches
   - While verifying, think like **Werner Vogels**: ask "What happens when this fails again?" — design the fix to fail gracefully, not catastrophically

4. **Research if subtle** — deep_research (see 11-tools-research-powerpack.md):
   - **4-6 questions** per call (optimal)
   - **MANDATORY file attachments** with 2-3 sentence descriptions:
     - What the file is
     - Why it's relevant to the bug
     - What section/logic to focus on

---

## PHASE 3: PLAN FIX

**Document to `notes/04-current-task.md`:**
- Root cause location + explanation
- Why this is root cause (not symptom)
- Planned fix
- Verification plan

**⛔ STOP. Wait for "proceed".**

---

## PHASE 4: FIX & VERIFY

1. **Apply fix** — edit_file (see 10-tools-morph-mcp.md) targeted change only
2. **Verify** — run_command (see 16-tools-core-execution.md):
   - Reproduce original (should fail before fix)
   - Verify fix works
   - **MANDATORY regression check** — full test suite

---

## PHASE 5: WRAP UP

- Save bug pattern to `notes/03-memory.md`:
  - Symptom, root cause, fix, prevention
- Generate regression test if recurring: testsprite_* (see 14-tools-testsprite.md)
- Summarize: what broke, why, how fixed

---

## TOOLS USED (in order)

1. **read_terminal / command_status** (16-tools-core-execution.md) — capture error
2. **get_logs** (13-tools-supabase-remote.md) — Supabase errors
3. **warp_grep** (10-tools-morph-mcp.md) — trace error path
4. **sequentialthinking** (12-tools-sequential-thinking.md) — form hypothesis
5. **deep_research** (11-tools-research-powerpack.md) — subtle bugs (attach files!)
6. **edit_file** (10-tools-morph-mcp.md) — surgical fix
7. **run_command** (16-tools-core-execution.md) — verify + regression
8. **testsprite_*** (14-tools-testsprite.md) — prevent future regression

---

## DON'T → DO

| ❌ Don't | ✅ Do |
|----------|-------|
| Edit before understanding | warp_grep + sequentialthinking first |
| Fix symptoms | Trace to root cause, ask "why" 5 times |
| Debug from memory | read_terminal / get_logs to capture actual error |
| Skip regression check | run_command full test suite after fix |
| Guess at cause | deep_research with attached files |
| Forget bug pattern | Save to `notes/03-memory.md` |

---

## SPECIAL CASES

**Supabase RLS/permission issues:**
get_logs(service="postgres") → get_advisors → fix policy → verify

**Async/race condition bugs:**
deep_research with ATTACHED files — these are subtle

**"Works locally, fails in prod":**
Compare environments: env vars, API endpoints, CORS, SSL

**Recurring bug:**
After fix: testsprite_generate_backend_test_plan → execute

**Stuck after 2+ attempts:**
Stop. sequentialthinking to reconsider. Might be fixing symptom not cause.