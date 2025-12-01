# mcp1_validate_node

Validate n8n node configuration.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeType` | string | Yes | Node type (e.g., `nodes-base.slack`) |
| `config` | object | Yes | Configuration to validate |
| `mode` | enum | No | `full` (comprehensive) or `minimal` (quick required fields) |
| `profile` | enum | No | For mode=full: `minimal`, `runtime`, `ai-friendly`, `strict` |

## Example

```json
{
  "nodeType": "nodes-base.slack",
  "config": {
    "resource": "channel",
    "operation": "create"
  },
  "mode": "full",
  "profile": "ai-friendly"
}
```

Returns errors/warnings/suggestions.
