# mcp1_n8n_update_full_workflow

Full workflow update. Requires complete `nodes[]` and `connections{}`.

For incremental changes, use `n8n_update_partial_workflow` instead.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Workflow ID to update |
| `name` | string | No | New workflow name |
| `nodes` | array | Conditional | Complete nodes array (required if modifying structure) |
| `connections` | object | Conditional | Complete connections (required if modifying structure) |
| `settings` | object | No | Workflow settings to update |
