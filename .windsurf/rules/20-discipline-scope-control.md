---
trigger: model_decision
description: you MUST read this rule WHEN thinking 'while I'm here...', 'they'll probably need...', 'let me also...', or tempted to add unrequested changes.
---

# Scope Control Discipline

**Do STRICTLY what the user asks — NOTHING MORE, NOTHING LESS.**

## Rules
- Never expand scope or add "nice-to-have" features
- Never anticipate future needs or "improve" unrelated code
- Complete task first, suggest improvements separately

## Red Flags → STOP
| Thinking... | Instead... |
|-------------|------------|
| "While I'm here..." | Ask first |
| "They'll probably need..." | Deliver asked, suggest extras |
| "Let me refactor this..." | NO. Separate task. |

## In Scope vs Out of Scope
**✅ IN:** Exactly what's asked, required imports/deps, minimal breakage fixes
**❌ OUT:** Tests, docs, refactoring, performance, error handling (unless asked)

## Spotted Related Issues?
Don't fix silently. Report: "Noticed X at line Y. Address separately?"

## Exception
If your change BREAKS something → fix only what restores functionality.
