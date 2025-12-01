---
trigger: model_decision
description: you MUST read this rule WHEN starting new project AND user provides NO docs/URLs/specs, 'build me an app', 'new project', 'from scratch' with empty folder and zero guidance.
---

# BUILD NEW PROJECT FROM SCRATCH (NO RESOURCES)

> Greenfield requires expert guidance. Research BEFORE architecture.
> "Start with the customer and work backward." — Jeff Bezos

## HARD RULES
- **NEVER skip research phase** — empty folder = no patterns to learn from
- **NEVER code before architecture is crystallized** — decide stack & structure first
- **NEVER over-abstract early** — build MVP, refactor later
- **ALWAYS verify each scaffolding step** — run_command after every setup
- **ALWAYS document architectural decisions** — future you will thank you

---

## PHASE 1: STRATEGIC RESEARCH (MANDATORY)

1. **Think deeply** — sequentialthinking (see 12-tools-sequential-thinking.md) **MIN 12 thoughts**:
   - Domain understanding
   - Target users
   - Stack options (3+)
   - Tradeoffs analysis
   - Decision criteria
   - Folder structure
   - Core abstractions
   - MVP scope
   - Risks
   - Mitigation
   - Implementation plan
   - Summary
   
   **Legend-Guided Thinking:**
   - While understanding users, think like **Jeff Bezos**: ask "Who is the customer and what do they need?" — write a fake press release for the finished product; if you can't, you don't understand the problem
   - While choosing stack, think like **Elon Musk**: ask "Is this a first-principles decision or am I copying others?" — question every assumption; what would you build if you started from physics?
   - While defining abstractions, think like **Rich Hickey**: ask "What are the simple, unbraided concepts?" — if two things always change together, they're one concept; if not, separate them
   - While scoping MVP, think like **Eric Ries**: ask "What's the minimum I can build to validate this hypothesis?" — the goal is learning, not building; ship something embarrassing before competitors ship something polished
   - While planning architecture, think like **Reid Hoffman**: ask "What would need to be true to 10x this?" — design for where you're going, not just where you are

2. **Deep research** — deep_research (see 11-tools-research-powerpack.md) **4-6 questions** per call:
   - Best stack for [domain] in 2024
   - [Stack A] vs [Stack B] vs [Stack C] tradeoffs
   - Architecture patterns for [domain]
   - Common pitfalls in [domain] projects
   - Production deployment considerations
   - **Run 2-3 deep_research calls** if domain is unfamiliar

3. **Find examples:**
   - web_search (see 11-tools-research-powerpack.md) — boilerplates, best practices
   - scrape_links — extract from real projects
   - search_reddit + get_reddit_post — community opinions

**⚠️ NEVER skip research. Empty folder = no patterns to learn from.**

---

## PHASE 2: CRYSTALLIZE ARCHITECTURE

1. **Synthesize** — sequentialthinking 10+ thoughts:
   - Stack decision: X because [research findings]
   - Folder structure
   - Core abstractions
   - MVP scope

2. **Document** to `notes/02-architecture.md`:
   - Stack decisions with reasoning
   - Folder structure (tree)
   - Core abstractions
   - MVP features

3. **Plan** — update_plan (see 17-tools-core-planning.md) 15-20 tasks

**⛔ STOP. Present architecture. Wait for "proceed".**

---

## PHASE 3: SCAFFOLD & ITERATE

**Init:** run_command (see 16-tools-core-execution.md) — e.g., `npx create-next-app`

**For each task:**
1. Mark in_progress → edit_file (see 10-tools-morph-mcp.md)
2. Verify: run_command — build + lint
3. Mark completed

---

## PHASE 4: WRAP UP

- Save decisions to `notes/03-memory.md`
- Generate summary: testsprite_generate_code_summary (see 14-tools-testsprite.md)

---

## TOOLS USED (in order)

1. **sequentialthinking** (12-tools-sequential-thinking.md) — initial analysis, synthesize
2. **deep_research** (11-tools-research-powerpack.md) — MANDATORY: stack, patterns
3. **web_search / scrape_links** (11-tools-research-powerpack.md) — reference implementations
4. **search_reddit + get_reddit_post** (11-tools-research-powerpack.md) — community opinions
5. **edit_file** (10-tools-morph-mcp.md) — create notes/ docs, all code
6. **update_plan** (17-tools-core-planning.md) — track 15-20 tasks
7. **run_command** (16-tools-core-execution.md) — init, verify each step
8. **testsprite_generate_code_summary** (14-tools-testsprite.md) — document final structure

---

## DON'T → DO

| ❌ Don't | ✅ Do |
|----------|-------|
| Skip research for greenfield | deep_research MANDATORY |
| Pick stack without research | Research 4-6 questions on tradeoffs |
| Code before architecture | Crystallize structure first |
| Over-abstract early | Build MVP, refactor after it works |
| Forget to document | Save to `notes/02-architecture.md` and `notes/03-memory.md` |

---

## SPECIAL CASES

**Supabase project (13-tools-supabase-remote.md):**
list_tables → apply_migration → get_advisors → generate_typescript_types

**Unfamiliar framework:**
Extra deep_research questions about that framework's patterns.

**Stuck on architecture:**
search_reddit → get_reddit_post for opinions, then sequentialthinking to synthesize.
