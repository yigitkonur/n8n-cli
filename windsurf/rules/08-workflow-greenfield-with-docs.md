---
trigger: model_decision
description: you MUST read this rule WHEN starting new project AND user provides docs/URLs/specs: 'follow this guide', 'based on these docs', 'here's the API', user shares links or tutorials.
---

# BUILD NEW PROJECT WITH PROVIDED DOCS

> Honor user's context first. Docs before research. Research fills gaps only. Understand fully before building, no assumptions.

## HARD RULES
- **NEVER research before reading provided docs** — user shared them for a reason
- **NEVER ignore provided context** — absorb it fully first
- **NEVER let research replace user's docs** — research SUPPLEMENTS gaps only
- **ALWAYS extract explicit patterns from docs** — auth, error handling, rate limits
- **ALWAYS verify each step** — run_command after every implementation

---

## PHASE 1: ABSORB PROVIDED CONTEXT (do this FIRST)

1. **Acknowledge** — sequentialthinking (see 12-tools-sequential-thinking.md):
   - What docs/URLs provided?
   - Expected output?
   - Gaps?
   
   **Legend-Guided Thinking:**
   - While reading docs, think like **Leslie Lamport**: ask "What does this specification actually promise?" — treat docs as contracts; undefined behavior will bite you in production
   - While extracting patterns, think like **Andrew Ng**: ask "What's the baseline before I add complexity?" — implement the simplest version from the docs first, measure it, then improve
   - While identifying gaps, think like **Satya Nadella**: ask "What don't I know yet?" — adopt a learn-it-all mindset; the gaps in docs are where bugs will hide
   - While planning implementation, think like **Kent Beck**: ask "What's the simplest thing that follows these docs?" — don't over-engineer; the docs are your guide
   - While validating approach, think like **Marty Cagan**: ask "Does this solve the user's actual problem?" — following docs perfectly but building the wrong thing is still failure

2. **Read ALL docs** — read_url_content (see 15-tools-core-file-ops.md)

3. **Extract patterns** — scrape_links (see 11-tools-research-powerpack.md) for references

4. **Document** to `notes/02-docs-summary.md`:
   - Source documents
   - Extracted patterns (auth, rate limits, errors, endpoints)
   - Key patterns to follow

---

## PHASE 2: GAP ANALYSIS

1. **Identify gaps** — sequentialthinking 5+ thoughts:
   - Docs covered well: [X, Y, Z]
   - Unclear/missing: [A, B]

2. **Research ONLY gaps** — deep_research (see 11-tools-research-powerpack.md) 2-4 questions max:
   - ATTACH `notes/02-docs-summary.md` so research knows what you have

**⚠️ Only research what docs DON'T cover.**

---

## PHASE 3: PLAN & EXECUTE

1. **Plan** to `notes/04-current-task.md` + update_plan (see 17-tools-core-planning.md):
   - Based on provided docs
   - Patterns from docs to follow

**⛔ STOP. Wait for "proceed".**

2. **Execute:** For each step:
   - edit_file (see 10-tools-morph-mcp.md) following doc patterns
   - Reference docs in code comments
   - Verify with run_command (see 16-tools-core-execution.md)

**Reference docs in code:**
```ts
/* From docs: https://docs.example.com/api/auth
 * Auth requires Bearer token in header
 */
```

---

## PHASE 4: WRAP UP

- Save learnings to `notes/03-memory.md`:
  - Docs provided
  - Patterns used
  - Gaps filled by research
  - Gotchas
- Summarize what was built and how it follows provided docs

---

## TOOLS USED (in order)

1. **sequentialthinking** (12-tools-sequential-thinking.md) — analyze context, gap analysis
2. **read_url_content** (15-tools-core-file-ops.md) — read ALL provided URLs FIRST
3. **scrape_links** (11-tools-research-powerpack.md) — follow doc references
4. **deep_research** (11-tools-research-powerpack.md) — ONLY for gaps (2-4 questions max)
5. **edit_file** (10-tools-morph-mcp.md) — create code following doc patterns
6. **update_plan** (17-tools-core-planning.md) — track progress
7. **run_command** (16-tools-core-execution.md) — verify each step

---

## DON'T → DO

| ❌ Don't | ✅ Do |
|----------|-------|
| Research before reading docs | read_url_content ALL provided URLs first |
| Skim user's context | Extract patterns to `notes/02-docs-summary.md` |
| Research things in docs | deep_research ONLY for gaps |
| Assume patterns | Use exact patterns from provided docs |
| Forget where patterns came from | Comment code with doc references |

---

## SPECIAL CASES

**API docs provided — extract explicitly:**
- Auth method (Bearer, API Key, OAuth)
- Rate limits + retry handling
- Error response format + codes
- Pagination pattern
- Webhook signatures

**Tutorial/guide provided:**
Follow step order from tutorial, adapt to project needs.

**Multiple conflicting docs:**
sequentialthinking to reconcile. Ask user which takes priority.

**Docs outdated or incomplete:**
Flag to user: "Docs seem outdated for X. Research current best practices?"
