---
trigger: model_decision
description: you MUST read this rule WHEN choosing approach, when planning feels heavy, when tempted to over-engineer, or when ceremony exceeds value.
---

# Simplicity Protocol (Silicon Valley Wisdom)

> "The simplest solution is usually the best solution." — **John Carmack**
> "Simple ≠ Easy. Simple means not complected." — **Rich Hickey**
> "Less, but better." — **Dieter Rams**
> "If you're not embarrassed by v1, you shipped too late." — **Reid Hoffman**

This rule **overrides verbosity** in all other workflows when simplicity serves better.

## Core Principles (Multi-Legend Synthesis)

| # | Principle | Legend | Practical Application |
|---|-----------|--------|----------------------|
| 1 | **Simplest thing that works** | Carmack | No premature abstraction; solve today's problem today |
| 2 | **Make it work → right → fast** | Kent Beck | Sequence matters: working code before elegant code |
| 3 | **Eliminate special cases** | Linus Torvalds | Good taste = fewer branches; design data to handle edge cases |
| 4 | **Two-way doors: act fast** | Bezos | Reversible decisions don't need committees |
| 5 | **First principles over copying** | Elon Musk | Question assumptions; start from physics, not convention |
| 6 | **Everything fails all the time** | Werner Vogels | Design for failure from day one |
| 7 | **Minimum viable learning** | Eric Ries | Build to learn, not to ship perfect |
| 8 | **Constraint theory** | Gene Kim | Find the bottleneck; everything else is noise |
| 9 | **5 users find 80% of issues** | Jakob Nielsen | Small tests often beat big tests rarely |
| 10 | **Data-ink ratio** | Edward Tufte | Every line should convey information |

## Complexity Tiers

| Task | Thinking | Planning | Approval |
|------|----------|----------|----------|
| **Trivial** (typo, one-liner, obvious fix) | 0-2 thoughts | None | Skip |
| **Simple** (single file, clear scope) | 3-5 thoughts | Mental | Skip |
| **Medium** (multi-file, some unknowns) | 5-8 thoughts | Brief plan | Optional |
| **Complex** (architecture, unfamiliar domain) | 8+ thoughts | Full plan | Required |

**Default assumption: Task is Simple until proven otherwise.**

## Override Rules

### Skip ceremony when:
- Fix is obvious and isolated
- Change is < 20 lines
- Pattern already exists in codebase
- Rollback is trivial (single file, no DB)

### Keep ceremony when:
- Security implications
- Database migrations
- Public API changes
- User explicitly wants review

## Anti-Patterns to Avoid

| ❌ Over-engineering | ✅ Simplicity Way |
|---------------------|----------------|
| 8 thoughts for typo fix | Fix typo, verify, done |
| Research for known pattern | Grep codebase, follow existing |
| Create 4 notes files | One file if needed, none if not |
| "Stop and wait" for safe change | Act, verify, report |
| Abstract "for future flexibility" | Solve today's problem today |

## The Simplicity Test (Legend-Guided Decision Framework)

Before any action, apply these mental models:

**1. Bezos Two-Way Door Test**
- While deciding whether to act or analyze more, ask: "Is this decision reversible?"
- If YES (two-way door) → Act now, learn from the outcome, iterate quickly
- If NO (one-way door) → Slow down, think 10x deeper, get more input

**2. Hickey Complecting Check**
- While designing anything, ask: "Am I braiding unrelated concerns together?"
- If YES → Stop and separate them; complected code is the root of all maintenance hell
- Simple = one purpose, one reason to change, one place to look

**3. Musk First Principles Filter**
- While choosing an approach, ask: "Am I copying this because others do it, or because physics demands it?"
- If copying → Question every assumption; what would you do if you started from scratch?
- Eliminate the bottleneck, don't optimize around it

**4. Linus Good Taste Metric**
- While writing code, ask: "Does this eliminate special cases or add them?"
- Good taste = fewer if-else branches, not more
- The elegant solution handles edge cases implicitly through good data structure choice

**5. Rams Deletion Principle**
- While adding anything, ask: "Can I achieve this by removing something instead?"
- The best code is no code; the best feature is one that makes other features unnecessary
- Less, but better

**6. Vogels Failure Design**
- While building anything, ask: "What happens when this fails?"
- Everything fails all the time — design for graceful degradation from day one
- If you haven't planned for failure, you've planned to fail

**7. Ries MVP Discipline**
- While scoping work, ask: "What's the minimum I can build to validate this?"
- The goal is learning, not building; ship to learn, don't learn to ship
- If you're not embarrassed by v1, you shipped too late

## Integration with Workflows

All workflow rules (01-08) remain valid but **bend to simplicity**:

- **Feature build**: Skip research if pattern exists in codebase
- **Debug**: Fix root cause directly if obvious; skip hypothesis matrix
- **Refactor**: One chunk at a time, but chunk size scales to confidence
- **Greenfield**: Research required, but scope research to actual unknowns

## Summary

```
BEFORE: Read all rules → Follow all phases → Maximum ceremony
AFTER:  Assess complexity → Scale process → Minimum viable ceremony
```

**Simplicity is not laziness. It's the discipline to resist unnecessary complexity.**
