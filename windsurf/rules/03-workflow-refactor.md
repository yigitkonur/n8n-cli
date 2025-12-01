---
trigger: model_decision
description: you MUST read this rule WHEN code works but needs restructuring: 'refactor', 'clean up', 'DRY', 'consolidate', 'modernize', 'too messy'. NOT when: bugs exist (→02), adding features (→01).
---

# REFACTOR / MODERNIZE EXISTING CODEBASE

> Incremental chunks. Test after EVERY change. Never break working code.
> "Less, but better." — Dieter Rams

## HARD RULES
- **NEVER refactor multiple things at once** — one logical chunk, then test
- **NEVER skip tests between changes** — partial refactor = broken codebase
- **NEVER refactor toward outdated patterns** — research current best practices first
- **NEVER lose track of progress** — update_plan after every chunk
- **ALWAYS have rollback strategy** — know how to undo if tests fail
- **ALWAYS complete what you start** — partial refactor worse than none

---

## ⚠️ DANGER ZONE

This is the **MOST DANGEROUS** workflow. Risks:
- Breaking working code with no clear rollback
- Refactoring toward outdated patterns
- Losing track mid-refactor, leaving inconsistent state
- "Just one more change" syndrome leading to untested sprawl

**Mitigation:** Chunk small, test constantly, track obsessively.

---

## PHASE 1: FULL MAPPING

1. **Analyze** — sequentialthinking (see 12-tools-sequential-thinking.md) 5+ thoughts:
   - What's being refactored and why?
   - Target state and risks
   - Chunking strategy
   
   **Legend-Guided Thinking:**
   - While assessing scope, think like **Dieter Rams**: ask "What can I remove entirely?" — the best refactor deletes code, not just reorganizes it
   - While planning chunks, think like **Martin Fowler**: ask "Can this evolve incrementally?" — never do big bang rewrites; each commit should leave code working
   - While evaluating target state, think like **Linus Torvalds**: ask "Does this eliminate special cases?" — good taste in code means fewer if-else branches, not more
   - While considering complexity, think like **Jonathan Ive**: ask "Is this the inevitable, obvious solution?" — if it feels forced, you haven't found the essence yet
   - While validating approach, think like **Gene Kim**: ask "What's the constraint limiting flow?" — refactor the bottleneck first, ignore everything else

2. **Map ALL instances** — warp_grep (see 10-tools-morph-mcp.md):
   - First: `run_command` with `tree -f . | head -100` for structure overview
   - All usages of current pattern
   - Dependencies and touch points
   - Exact counts via grep_search if needed

3. **Document** to `notes/04-current-task.md`:
   - Current vs target state
   - Risk assessment (high/medium/low)
   - Rollback plan
   - Instance count and files affected

---

## PHASE 2: MODERNIZATION RESEARCH (MANDATORY)

**Research current best practices** — deep_research (see 11-tools-research-powerpack.md):
- What's the 2024 best practice?
- Common refactoring pitfalls?
- Migration strategy?
- **ATTACH current implementation files!**

Optional: web_search + search_reddit for migration stories.

**⚠️ NEVER skip research. Don't refactor toward outdated patterns.**

---

## PHASE 3: CHUNK PLANNING

1. **Plan safe chunks** — sequentialthinking:
   - Smallest independent units
   - Order dependencies
   - Each chunk must leave codebase working

2. **Create plan** — update_plan (see 17-tools-core-planning.md) with all chunks

3. **Document chunks** to `notes/04-current-task.md`:
   | # | Chunk | Files | Test | Rollback |
   |---|-------|-------|------|----------|
   | 1 | Create new util | utils/new.ts | npm test | delete file |
   | 2 | Migrate auth.ts | services/auth.ts | npm test -- auth | git checkout |

**⛔ STOP. Wait for "proceed".**

---

## PHASE 4: INCREMENTAL EXECUTION

**FOR EACH CHUNK:**
1. Mark in_progress — update_plan
2. Think if complex — sequentialthinking
3. Transform — edit_file (see 10-tools-morph-mcp.md)
4. **TEST IMMEDIATELY** — run_command (see 16-tools-core-execution.md) — MUST pass
5. **IF FAIL:** STOP → rollback → rethink → retry OR ask user
6. **IF PASS:** Mark completed → next chunk

**Track obsessively:** update_plan after EVERY chunk.

---

## PHASE 5: FINAL VALIDATION

- **Full test suite** — run_command: `npm run test:all && npm run lint`
- **Rerun tests** — testsprite_rerun_tests (see 14-tools-testsprite.md)
- **Save patterns** to `notes/03-memory.md`:
  - Old vs new pattern
  - Files changed
  - New conventions
  - Gotchas discovered

---

## TOOLS USED (in order)

1. **warp_grep** (10-tools-morph-mcp.md) — map ALL instances
2. **deep_research** (11-tools-research-powerpack.md) — MANDATORY research (attach files!)
3. **update_plan** (17-tools-core-planning.md) — track every chunk
4. **edit_file** (10-tools-morph-mcp.md) — one chunk at a time
5. **run_command** (16-tools-core-execution.md) — test after EACH edit
6. **testsprite_rerun_tests** (14-tools-testsprite.md) — final validation

---

## DON'T → DO

| ❌ Don't | ✅ Do |
|----------|-------|
| Refactor multiple things at once | One chunk → test → next chunk |
| Test at the end | run_command after EVERY edit_file |
| Skip research | deep_research MANDATORY |
| Lose track of progress | update_plan after every chunk |
| Continue if tests fail | STOP → rollback → rethink → retry |
| Leave refactor incomplete | Finish all chunks or rollback entirely |

---

## ROLLBACK STRATEGIES

**Before starting:**
```bash
git stash && git stash drop  # clean state
git status                    # verify clean
```

**Per-chunk rollback:**
```bash
git checkout -- [specific-file]  # single file
git stash                        # all uncommitted
```

**Full refactor rollback:**
```bash
git reset --hard HEAD~N  # N = commits
git stash pop            # if stashed before
```

---

## SPECIAL CASES

**Large-scale (50+ files):**
Create sub-plans. Refactor by module/domain, not all at once.

**Changing shared utility:**
Create new alongside old → migrate consumers one by one → delete old when zero usages.

**Database schema refactor (13-tools-supabase-remote.md):**
list_tables → plan → apply_migration → update code → generate_typescript_types

**Framework version upgrade:**
Follow official migration guide. web_search for "[framework] vX to vY migration".

**Stuck mid-refactor:**
STOP. Either rollback entirely or commit working partial state with TODO markers.
