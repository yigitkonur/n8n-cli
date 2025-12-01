# mcp1_n8n_update_partial_workflow

Update workflow incrementally with diff operations.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Workflow ID to update |
| `operations` | array | Yes | Diff operations to apply |
| `validateOnly` | boolean | No | Only validate, don't apply |
| `continueOnError` | boolean | No | Best-effort mode (default: atomic) |

## Operation Types

- `addNode`
- `removeNode`
- `updateNode`
- `moveNode`
- `enableNode` / `disableNode`
- `addConnection`
- `removeConnection`
- `updateSettings`
- `updateName`
- `addTag` / `removeTag`

## Modes

- **Atomic (default)**: All operations succeed or none applied
- **Best-effort** (`continueOnError=true`): Apply valid operations even if some fail

Use `tools_documentation("n8n_update_partial_workflow", "full")` for detailed operation specs.
