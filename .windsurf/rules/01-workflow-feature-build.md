---
trigger: model_decision
description: you MUST read this rule WHEN user says 'add', 'implement', 'create', 'build', 'I need', 'make it do' AND codebase already exists. NOT when, broken (→02), empty project (→07/08), restructuring (→03)
---

# BUILD FEATURE ON EXISTING CODEBASE

> Integrate elegantly. Reuse patterns. Zero duplication.
> "Make it work → make it right → make it fast." — Kent Beck

## HARD RULES
- **NEVER code before plan approval** — present plan, wait for "proceed"
- **NEVER touch files outside scope** — ask first for tangential changes  
- **NEVER assume patterns** — discover via warp_grep first
- **NEVER over-engineer** — no unit tests unless asked, focus MVP
- **ALWAYS verify after each change** — run_command immediately

---

## PHASE 1: DISCOVER (before planning)

**Discover patterns** — warp_grep (see 10-tools-morph-mcp.md):
- How does similar feature work?
- Where are shared utils?
- What naming conventions?

**Setup notes folder** (if not exists) — see 00-master-protocol.md for structure.

---

## PHASE 2: VALIDATE & PLAN (no code yet)

1. **Think deeply** — sequentialthinking (see 12-tools-sequential-thinking.md) **MIN 8 thoughts**:
   - Requirements → Dependencies → Patterns → Approach → Edge cases → Testing → Rollback → Summary
   
   **Legend-Guided Thinking:**
   - While defining requirements, think like **Marty Cagan**: ask "What customer problem does this solve?" — if you can't articulate the problem clearly, stop and research before building
   - While choosing approach, think like **Kent Beck**: ask "What's the simplest thing that could possibly work?" — implement that first, make it right, then make it fast
   - While considering patterns, think like **Rich Hickey**: ask "Am I braiding unrelated concerns together?" — if yes, separate them into independent pieces
   - While assessing risk, think like **Bezos**: ask "Is this a two-way door?" — if reversible, act fast; if not, think 10x deeper
   - While scoping, think like **Steve Jobs**: ask "What can I say NO to?" — ruthlessly cut features that don't serve the core value

2. **Validate approach** — deep_research (see 11-tools-research-powerpack.md) if:
   - Unfamiliar pattern encountered
   - Security/performance implications
   - External API integration
   - **ATTACH discovered files** with 2-3 sentence descriptions

3. **Document plan** to `notes/04-current-task.md`:
   - Files to modify/create
   - Patterns discovered (cite file:line)
   - Open questions resolved

4. **Track** — update_plan using **Dense Format** (see 17-tools-core-planning.md):
   - Max 20 Tasks, Max 8 Sub-steps per Task
   - Every Task has DoD, Test, Fail

**⛔ STOP. Wait for "proceed".**

---

## PHASE 3: EXECUTE (after approval)

**For each step:**
1. Think (if complex) → sequentialthinking
2. Code → edit_file (see 10-tools-morph-mcp.md) one logical chunk
3. Verify → run_command immediately (see 16-tools-core-execution.md)
4. Mark → update_plan step to completed

**Reasoning comments** (non-trivial decisions only):
```ts
/* REASONING: Using singleton pattern — matches auth.ts line 45 */
```

---

## PHASE 4: WRAP UP

- Mark final step completed
- Summarize changes
- Save learnings to `notes/03-memory.md` via edit_file
- Suggest next steps if applicable

---

## TOOLS USED (in order)

1. **warp_grep** (10-tools-morph-mcp.md) — discover patterns
2. **sequentialthinking** (12-tools-sequential-thinking.md) — plan approach
3. **edit_file** (10-tools-morph-mcp.md) — implement changes
4. **run_command** (16-tools-core-execution.md) — verify immediately
5. **update_plan** (17-tools-core-planning.md) — track progress
6. **deep_research** (11-tools-research-powerpack.md) — if unfamiliar patterns

---

## DON'T → DO

| ❌ Don't | ✅ Do |
|----------|-------|
| Jump to code | sequentialthinking (**MIN 8 thoughts**) → validate → plan → wait for "proceed" |
| Modify unrelated files | Ask: "Found X issue, address separately?" |
| Assume patterns | warp_grep to discover actual patterns |
| Batch changes then test | run_command after each edit_file |
| Invent conventions | Reuse patterns from warp_grep results |
| Debug loop >2x | Stop → state blocker → try alternative |

---

## SPECIAL CASES

**DB changes (13-tools-supabase-remote.md):**
list_tables → plan → apply_migration → generate_typescript_types → feature code

**External API integration:**
deep_research (attach code + API docs) → plan → implement

**Stuck (2+ failures):**
Stop. sequentialthinking to analyze. State blocker. Try different approach!