# mcp1_n8n_autofix_workflow

Automatically fix common workflow validation errors.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Workflow ID to fix |
| `applyFixes` | boolean | No | Apply fixes (default: false = preview mode) |
| `fixTypes` | array | No | Types of fixes to apply (default: all) |
| `confidenceThreshold` | enum | No | Minimum confidence level (default: medium) |
| `maxFixes` | number | No | Maximum fixes to apply (default: 50) |

## Fix Types

- `expression-format`
- `typeversion-correction`
- `error-output-config`
- `node-type-correction`
- `webhook-missing-path`
- `typeversion-upgrade`
- `version-migration`

## Confidence Levels

- `high` - Very confident fixes only
- `medium` - Balanced (default)
- `low` - Include experimental fixes
