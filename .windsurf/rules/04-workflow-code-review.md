---
trigger: model_decision
description: you MUST read this rule WHEN user wants opinion only, 'review this', 'is this good?', 'any issues?', 'check my code', 'before I merge', 'what do you think?'.
---

# CODE REVIEW & QUALITY EVALUATION

> Evaluate. Advise. Don't implement unless asked. Be direct but constructive.
> "Human error is usually a design problem." — Don Norman

## HARD RULES
- **NEVER edit code unless explicitly asked** — advisory only
- **NEVER skip understanding intent** — bad review = reviewing wrong thing
- **NEVER give vague feedback** — specific line, specific issue, specific fix
- **ALWAYS check broader impact** — changes to shared code affect everything
- **ALWAYS prioritize feedback** — blockers > concerns > suggestions > nits

---

## PHASE 1: UNDERSTAND CHANGES

1. **Clarify scope** — sequentialthinking (see 12-tools-sequential-thinking.md):
   - What changed and why?
   - Focus on correctness/security/perf/style?

2. **See changes** — run_command (see 16-tools-core-execution.md):
   ```bash
   git diff main...HEAD --stat
   git diff main...HEAD -- src/
   ```

3. **Check impact** — warp_grep (see 10-tools-morph-mcp.md) if shared code changed

---

## PHASE 2: EVALUATE

**Systematic check** — sequentialthinking 5+ thoughts:
- Correctness, style, performance, security, edge cases

**Legend-Guided Thinking:**
- While reading code, think like **Don Norman**: ask "Would this confuse a future developer?" — if yes, it's a design problem, not a documentation problem; suggest restructuring
- While checking interfaces, think like **Barbara Liskov**: ask "Can any subtype be substituted without breaking expectations?" — if a caller must know which implementation they're using, the abstraction is leaky
- While evaluating performance, think like **Donald Knuth**: ask "Is this optimization premature?" — if there's no measurement proving it's slow, correctness and clarity beat speed
- While reviewing complexity, think like **Jakob Nielsen**: ask "Could we achieve 80% of the value with 20% of this complexity?" — the simplest solution that works is usually the right one
- While assessing maintainability, think like **Julie Zhuo**: ask "Will this scale to 10x the team size?" — code review should catch patterns that break at scale

**Research concerns** — deep_research (see 11-tools-research-powerpack.md) if issues found:
- ATTACH suspicious code
- Verify security/performance patterns

**Supabase security** — get_advisors (see 13-tools-supabase-remote.md) if RLS concerns

---

## PHASE 3: FORMULATE FEEDBACK

**Present in priority order:**

```markdown
## Code Review: [PR/Change]

### 🚫 BLOCKERS (must fix)
- **[file.ts:45]** — [Issue]: [why] | Fix: [specific suggestion]

### ⚠️ CONCERNS (should fix)
- **[file.ts:67]** — [Issue]: [suggestion]

### 💡 SUGGESTIONS (nice to have)
- **[file.ts:89]** — [improvement idea]

### ✅ LOOKS GOOD
- [what was done well]
```

---

## REVIEW CHECKLIST

**Correctness:** Logic sound? Null handling? Error handling?

**Security:** Input validated? Auth checks? Injection risks? Secrets exposed?

**Performance:** O(n²) loops? Unnecessary re-renders? N+1 queries?

**Style:** Matches conventions? Clear naming? Comments where needed?

**Edge Cases:** Empty arrays? Race conditions? Network failures?

---

## PHASE 4: IMPLEMENT FIXES (only if asked)

**⚠️ ONLY if user explicitly asks:**
1. edit_file (see 10-tools-morph-mcp.md) — apply fix
2. run_command — verify: `npm test && npm run lint`

---

## TOOLS USED (in order)

1. **sequentialthinking** (12-tools-sequential-thinking.md) — understand, evaluate
2. **run_command** (16-tools-core-execution.md) — git diff
3. **warp_grep** (10-tools-morph-mcp.md) — check shared code impact
4. **deep_research** (11-tools-research-powerpack.md) — verify concerns (attach code!)
5. **get_advisors** (13-tools-supabase-remote.md) — Supabase security
6. **edit_file** (10-tools-morph-mcp.md) — ONLY if asked to fix

---

## DON'T → DO

| ❌ Don't | ✅ Do |
|----------|-------|
| Edit without being asked | Advise with specific suggestions |
| Give vague feedback | Cite line + explain why + suggest fix |
| Review without understanding | sequentialthinking to clarify goal first |
| Ignore shared code impact | warp_grep: "what uses this?" |
| Guess about security | deep_research with attached code |
| Dump all feedback equally | Prioritize: blockers > concerns > suggestions |
| Only criticize | Acknowledge what's done well |

---

## SPECIAL CASES

**Security-sensitive code:**
Always deep_research with attached code. Don't guess about crypto, auth, injection.

**Supabase RLS changes:**
get_advisors to review policy

**Large PR (20+ files):**
Focus on: 1) Core logic, 2) Security-relevant, 3) Shared utilities. Skim test/config.

**Asked to implement fixes:**
Clarify scope first: "Fix all issues or just blockers?"