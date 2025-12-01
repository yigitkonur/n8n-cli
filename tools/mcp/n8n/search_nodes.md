# mcp1_search_nodes

Search n8n nodes by keyword.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search terms (quotes for exact phrase) |
| `limit` | number | No | Max results (default: 20) |
| `mode` | enum | No | `OR` (any word), `AND` (all words), `FUZZY` (typo-tolerant) |
| `includeExamples` | boolean | No | Include top 2 template configs per node (default: false) |

## Example

```json
{
  "query": "webhook",
  "mode": "OR",
  "includeExamples": true
}
```
