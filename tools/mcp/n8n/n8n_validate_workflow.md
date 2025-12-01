# mcp1_n8n_validate_workflow

Validate workflow by ID. Returns errors/warnings/suggestions.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Workflow ID to validate |
| `options` | object | No | Validation options |

### Options

| Field | Type | Default |
|-------|------|---------|
| `validateNodes` | boolean | true |
| `validateConnections` | boolean | true |
| `validateExpressions` | boolean | true |
| `profile` | enum | `runtime` |

### Profiles

- `minimal` - Quick check
- `runtime` - Standard validation
- `ai-friendly` - Optimized for AI tools
- `strict` - Comprehensive checks
