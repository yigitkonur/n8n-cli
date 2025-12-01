---
trigger: model_decision
description: you MUST read this rule WHEN problem needs reasoning through: complex planning, multiple hypotheses, architecture decisions, tradeoff evaluation. MANDATORY when: before git ops, before marking complete, choosing between approaches.
---

# Sequential Thinking MCP

Use for dynamic, reflective problem-solving that can adapt and evolve.

## MANDATORY Trigger Situations

**You MUST use sequentialthinking in these situations:**

1. **Before critical git/GitHub decisions**
   - What branch to branch off from?
   - What branch to check out?
   - Whether to make a new PR or update existing?
   - Non-trivial git actions

2. **When transitioning from exploring to implementing**
   - Have I gathered all necessary context?
   - Found all locations to edit?
   - Inspected references, types, definitions?

3. **Before reporting completion to user**
   - Did I completely fulfill the request?
   - Completed all verification steps?
   - For multi-location edits: verified ALL locations?

## RECOMMENDED Trigger Situations

**You SHOULD use sequentialthinking when:**

1. No clear next step
2. Clear next step but details are critical to get right
3. Facing unexpected difficulties
4. Tried multiple approaches without success
5. Making a decision critical for task success
6. Tests, lint, or CI failed — step back before diving in
7. Encountering potential environment issues
8. Unclear which repo/file/function to work on
9. Viewing screenshots or images — analyze what you see
10. Searching for files but finding no matches — brainstorm alternatives

## When to Use

- Breaking down complex problems
- Planning with room for revision
- Analysis needing course correction
- Problems where scope isn't clear
- Multi-step solutions
- Maintaining context over steps

## Basic Usage

```
sequentialthinking(
  thought="Current analysis step content",
  thoughtNumber=1,
  totalThoughts=5,
  nextThoughtNeeded=true
)
```

## Revision Example

```
sequentialthinking(
  thought="Reconsidering step 2 — actually the issue is...",
  thoughtNumber=4,
  totalThoughts=6,
  nextThoughtNeeded=true,
  isRevision=true,
  revisesThought=2
)
```

## Parameters

| Parameter | Purpose |
|-----------|---------|
| `thought` | Current thinking step |
| `thoughtNumber` | Current position (1, 2, 3...) |
| `totalThoughts` | Estimated total (adjustable) |
| `nextThoughtNeeded` | True if more thinking needed |
| `isRevision` | If revising previous thinking |
| `revisesThought` | Which thought being reconsidered |
| `branchFromThought` | Branching point |
| `branchId` | Branch identifier |
| `needsMoreThoughts` | If more thoughts needed at "end" |

## Thinking Scales to Complexity (09-carmack-simplicity.md)

| Complexity | Thoughts | When |
|------------|----------|------|
| **Trivial** | 0-2 | Typo, obvious fix, one-liner, pattern exists |
| **Simple** | 3-5 | Single file, clear scope, low risk |
| **Medium** | 5-8 | Multi-file, some unknowns, moderate risk |
| **Complex** | 8+ | Architecture, unfamiliar domain, high risk |

**Default: Assume Simple. Escalate only when uncertainty demands it.**

### Patterns (use when complexity warrants)
- **Simple**: Context → Change → Verify
- **Medium**: Context → Approach → Change → Impact → Verify
- **Complex**: Full analysis → Options → Tradeoffs → Decision → Plan → Verify

## Thinking Minimums by Workflow (ENFORCED)

| Workflow | Min Thoughts | Pattern |
|----------|-------------|----------|
| **Simple Edit** | 5 | Context → Change → Impact → Verify → Edge cases |
| **Feature** | 8 | Requirements → Dependencies → Patterns → Approach → Edge cases → Testing → Rollback → Summary |
| **Debug** | 8 | Symptom → Hypotheses (3+) → Why×5 → Root cause → Fix → Regression → Verify → Prevent |
| **Architecture** | 10 | Requirements → Options (3+) → Tradeoffs → Evaluate → Decide → Justify → Risks → Mitigate → Plan → Summary |
| **Refactor** | 8/chunk | Scope → Current state → Target state → Safety → Transform → Test → Rollback → Next chunk |
| **Greenfield** | 12 | Domain → Users → Stack options → Tradeoffs → Decision → Structure → Core abstractions → MVP scope → Risks → Plan → Verify → Summary |
| **Critical Decision** | 5 | Options → Tradeoffs → Risks → Recommendation → Justification |

**⚠️ NEVER skip to action before reaching minimum thoughts.**

## The "Think Before Commit" Rule

Critical checkpoints:

```
Before git operations:    → sequentialthinking (5 thoughts)
Before major refactor:    → sequentialthinking (8 thoughts)
Before reporting done:    → sequentialthinking (5 thoughts)
After CI/test failure:    → sequentialthinking (5 thoughts) BEFORE fixing
```

## Key Features

- **Adjustable**: Change `totalThoughts` as you progress
- **Revisable**: Question or revise previous thoughts
- **Extensible**: Add more thoughts after reaching apparent end
- **Branching**: Support for alternative approaches

## Use BEFORE

- Major refactoring decisions
- Architecture choices
- Complex debugging sessions
- Multi-file changes
- Performance optimization

## Process

1. Start with minimum for workflow type (see table above)
2. Question or revise previous thoughts freely
3. **Extend beyond minimum** if uncertainty remains
4. Express uncertainty explicitly — it triggers more thoughts
5. Only set `nextThoughtNeeded=false` when:
   - Minimum reached AND
   - Clear conclusion formed AND
   - No remaining uncertainty

**If stuck:** Use `needsMoreThoughts=true` to extend beyond initial estimate.

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Do Instead |
|--------------|--------------|------------|
| Skipping to action | Miss edge cases | Complete minimum thoughts |
| Shallow thoughts | False confidence | Go deep on each thought |
| Not revising | Stuck in wrong direction | Use `isRevision=true` |
| Ignoring uncertainty | Hidden risks | Extend thoughts |
| Racing through | Poor decisions | Take time on each |

## Cross-Reference

- For error loops → 21-discipline-error-loops.md (max 3 attempts)
- For scope control → 18-discipline-scope-control.md
- For verification → 19-discipline-verification.md