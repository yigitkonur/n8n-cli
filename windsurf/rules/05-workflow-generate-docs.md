---
trigger: model_decision
description: you MUST read this rule WHEN user needs documentation: 'write README', 'document this', 'explain to new devs', 'API docs', 'add comments', 'how does this work?'.
---

# GENERATE DOCUMENTATION

> Structure before content. Tell a story. Ground in actual code. Clear, concise, no fluff — docs that respect the reader's time.

## HARD RULES
- **NEVER write docs without understanding code** — explore first
- **NEVER document what code already says** — explain WHY, not WHAT
- **NEVER write walls of text** — structure with headers, bullets, examples
- **ALWAYS ground claims in actual code** — link to files, show real examples
- **ALWAYS know your audience** — developer vs user vs ops changes everything

---

## PHASE 1: UNDERSTAND PROJECT

1. **Clarify purpose** — sequentialthinking (see 12-tools-sequential-thinking.md):
   - Doc purpose (onboarding/reference/tutorial)
   - Audience (dev/user/ops)
   - Sections needed
   
   **Legend-Guided Thinking:**
   - While choosing content, think like **Donald Knuth**: ask "Am I explaining WHY, not just WHAT?" — the code already says what it does; docs must explain the reasoning and context
   - While structuring docs, think like **Edward Tufte**: ask "What's the data-ink ratio here?" — every sentence should convey information; delete filler words and obvious statements
   - While writing for users, think like **Don Norman**: ask "What mental model does the reader already have?" — meet them where they are, don't force them to learn your mental model
   - While editing, think like **Steve Jobs**: ask "Is this the simplest possible explanation?" — if you can't explain it simply, you don't understand it well enough
   - While deciding scope, think like **Jakob Nielsen**: ask "What do users actually need to accomplish?" — document the 20% of features that cover 80% of use cases first

2. **Discover structure:**
   - list_dir + find_by_name (see 15-tools-core-file-ops.md) — key files
   - warp_grep (see 10-tools-morph-mcp.md) — "what does this do?", "main features?"
   - testsprite_generate_code_summary (see 14-tools-testsprite.md) — structured overview

3. **Research if unfamiliar** — deep_research (see 11-tools-research-powerpack.md) for doc best practices

---

## PHASE 2: OUTLINE & WRITE

1. **Plan narrative** — sequentialthinking:
   - Hook → Quick Start → Concepts → API/Usage → Troubleshooting

2. **Document outline** to `notes/04-current-task.md`

3. **⛔ STOP. Wait for "proceed".**

4. **Write** — edit_file (see 10-tools-morph-mcp.md):
   - Follow README structure below
   - Ground in actual code examples (use warp_grep to find patterns)

5. **Verify** — run_command if doc generator exists

---

## README STRUCTURE

```markdown
# Project Name
> One-line description

## Overview
[2-3 sentences: what, why, who]

## Quick Start
```bash
npm install project-name
npx project-name init
```

## Installation
[All methods: npm, docker, source]

## Configuration
| Option | Type | Default | Description |
|--------|------|---------|-------------|

## Usage
[Basic + advanced examples]

## API Reference
### `functionName(param)`
- **param** (`type`): Description
- **Returns**: `type`

## Troubleshooting
### Error: "message"
**Cause**: Why | **Fix**: How

## Contributing
See CONTRIBUTING.md

## License
MIT © [Author]
```

---

## DOC TYPES

| Type | Audience | Focus |
|------|----------|-------|
| **README** | First-time visitors | Hook → Quick Start → Overview |
| **API Reference** | Developers | Complete, accurate, examples |
| **Tutorial** | Learners | Step-by-step, explain why |
| **Architecture** | Contributors | Big picture, decisions |

---

## TOOLS USED (in order)

1. **sequentialthinking** (12-tools-sequential-thinking.md) — plan purpose, outline
2. **list_dir / find_by_name** (15-tools-core-file-ops.md) — project structure
3. **warp_grep** (10-tools-morph-mcp.md) — understand features
4. **testsprite_generate_code_summary** (14-tools-testsprite.md) — structured overview
5. **deep_research** (11-tools-research-powerpack.md) — unfamiliar domains
6. **edit_file** (10-tools-morph-mcp.md) — create docs

---

## DON'T → DO

| ❌ Don't | ✅ Do |
|----------|-------|
| Write without exploring | warp_grep + list_dir first |
| Document what code says | Explain WHY, not WHAT |
| Wall of text | Headers, bullets, code blocks |
| Generic examples | Real examples from codebase |
| Skip Quick Start | First thing after overview |
| Outdated docs | Ground in actual current code |

---

## SPECIAL CASES

**API Documentation:**
testsprite_generate_standardized_prd for formal spec, then humanize.

**Large codebase:**
testsprite_generate_code_summary for structured overview first.

**Existing outdated docs:**
warp_grep to find discrepancies. Update, don't rewrite from scratch.

**Multiple audiences:**
Separate docs: README.md (users), CONTRIBUTING.md (devs), docs/architecture.md (maintainers).