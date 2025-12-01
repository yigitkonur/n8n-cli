# update_plan

Manage task plan with steps and statuses.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `explanation` | string | No | Optional explanation for update |
| `plan` | array | Yes | List of plan items |

### Plan Item

| Field | Type | Values |
|-------|------|--------|
| `step` | string | Step description |
| `status` | enum | `pending`, `in_progress`, `completed` |

## Rules

- **Only one step** can be `in_progress` at a time
- Mark steps `completed` as soon as done
- Update plan when new constraints or discoveries arrive

## Example

```json
{
  "explanation": "Starting authentication refactor",
  "plan": [
    { "step": "Audit current auth implementation", "status": "completed" },
    { "step": "Extract JWT logic to service", "status": "in_progress" },
    { "step": "Add refresh token support", "status": "pending" },
    { "step": "Update tests", "status": "pending" }
  ]
}
```
