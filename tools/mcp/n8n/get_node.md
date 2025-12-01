# mcp1_get_node

Get node info with progressive detail levels and multiple modes.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nodeType` | string | Yes | Full node type (e.g., `nodes-base.httpRequest`) |
| `detail` | enum | No | `minimal` (~200 tokens), `standard` (default), `full` (~3-8K) |
| `mode` | enum | No | Operation mode |
| `includeExamples` | boolean | No | Include template examples (mode=info, detail=standard) |
| `includeTypeInfo` | boolean | No | Include type metadata (mode=info) |

## Modes

| Mode | Description |
|------|-------------|
| `info` | Node schema (default) |
| `docs` | Markdown documentation |
| `search_properties` | Find specific properties |
| `versions` | Version info |
| `compare` | Compare versions |
| `breaking` | Breaking changes |
| `migrations` | Migration info |

### For search_properties mode

| Parameter | Description |
|-----------|-------------|
| `propertyQuery` | Search term (e.g., "auth", "header") |
| `maxPropertyResults` | Max results (default: 20) |

### For compare mode

| Parameter | Description |
|-----------|-------------|
| `fromVersion` | Source version (e.g., "1.0") |
| `toVersion` | Target version (defaults to latest) |
