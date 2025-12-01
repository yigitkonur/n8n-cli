# mcp2_search_reddit

Search Reddit via Google (10 results/query). **MUST call `get_reddit_post` after.**

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queries` | array (max 10) | Yes | Distinct search queries |
| `date_after` | string | No | Filter results after date (YYYY-MM-DD) |

## Query Operators

- `intitle:` - Search in title
- `"exact phrase"` - Exact match
- `OR` - Alternative terms
- `-exclude` - Exclude term

Auto-adds `site:reddit.com`.

## Example

```json
{
  "queries": [
    "best IDE 2025",
    "best AI features on IDEs",
    "intitle:comparison of top IDEs",
    "top alternatives to vscode -cursor"
  ]
}
```

## Workflow

1. Call `search_reddit` to find relevant posts
2. Call `get_reddit_post` with URLs from results
