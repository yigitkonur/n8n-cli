# mcp1_n8n_get_workflow

Get workflow by ID with different detail levels.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Workflow ID |
| `mode` | enum | No | Detail level (default: `full`) |

## Modes

| Mode | Description |
|------|-------------|
| `full` | Complete workflow |
| `details` | Full + execution stats |
| `structure` | Nodes/connections topology only |
| `minimal` | Metadata only (id/name/active/tags) |
