---
trigger: model_decision
description: you MUST read this rule WHEN tracking multi-step work, updating progress, or persisting learnings to notes/.
---

# Core Planning

Use for progress tracking and maintaining state across operations.

## update_plan

**Manage task progress**

### Example

```
update_plan(
  explanation="Starting feature implementation",
  plan=[
    {step: "Setup structure", status: "completed"},
    {step: "Implement core logic", status: "in_progress"},
    {step: "Add tests", status: "pending"},
    {step: "Documentation", status: "pending"}
  ]
)
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `explanation` | Optional context for update |
| `plan` | Array of steps with status |

### Statuses
- `pending` — not started
- `in_progress` — currently working (**MAX ONE**)
- `completed` — done

### Rules
- Only ONE step can be `in_progress` at a time
- Mark completed as soon as done
- Update when discoveries change the plan

---

## Dense Format (MANDATORY for 3+ step plans)

```
Task <ID>: <Title> → [1]<Step1> → [2]<Step2> → ... → [N]<StepN> (DoD:<criteria>|Test:<cmd>|Fail:<recovery>)
```

### Rules (ENFORCED)
| Rule | Limit |
|------|-------|
| Max Tasks | 20 |
| Max Sub-steps per Task | 8 |
| Min Sub-steps per Task | 3 (otherwise merge tasks) |

### Components
- **Task ID**: Sequential number (01, 02, ...)
- **Title**: What this task achieves
- **[n]Steps**: Atomic, executable actions
- **DoD**: Definition of Done — verifiable criteria (not "looks good")
- **Test**: Command to verify (e.g., `pnpm test`, `curl -I /api`)
- **Fail**: Recovery action if test fails

### Example
```json
{
  "step": "Task 01: Auth Middleware → [1]Create src/middleware/auth.ts → [2]Define JWT strategy → [3]Add token validation → [4]Register in app.ts → [5]Add 401 error handler (DoD:Returns 401 on invalid token|Test:curl -H 'Authorization: invalid' localhost:3000/protected|Fail:Check middleware registration order)",
  "status": "pending"
}
```

### Anti-patterns
- ❌ `"Fix the bug"` → too vague
- ❌ `"Setup everything"` → not atomic
- ❌ `"DoD: works"` → not verifiable
- ✅ `"[1]Add null check line 45 → [2]Add error log (DoD:No null pointer exception|Test:pnpm test auth.spec.ts)"`

---

## notes/ Folder

Store project-specific learnings in `notes/` directory:

```
notes/
├── 01-project-plan.md      # High-level goals, architecture
├── 02-documentation.md     # API contracts, conventions
├── 03-memory.md            # Quirks, workarounds, learnings
└── 04-current-task.md      # Active task plan
```

**Save all learnings** via `edit_file` (10-tools-morph-mcp.md) to these files.

---

## Planning Guidelines

1. **Dense over shallow** — fewer comprehensive tasks, not many tiny ones
2. **One step active** — only one `in_progress` at a time
3. **Update on discovery** — refresh plan when new constraints appear
4. **Mark complete promptly** — immediately after verification passes
5. **Lightweight artifacts** — prefer `notes/` files over verbose chat
6. **Every task must have DoD** — "done" means verified, not "I think it works"

---

## When to Use

| Scenario | Tool/File |
|----------|-----------|
| Track multi-step task | `update_plan` |
| Record architecture decision | `notes/02-documentation.md` |
| Note discovered convention | `notes/03-memory.md` |
| Active task state | `notes/04-current-task.md` |
| Long-horizon work | `notes/` files + `update_plan` |