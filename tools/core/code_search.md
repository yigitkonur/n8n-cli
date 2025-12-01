# code_search

Semantic search subagent (Fast Context) for exploring codebase. Runs parallel grep and readfile calls to locate relevant files/line ranges.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search_term` | string | Yes | Natural language query describing what to find |
| `search_folder_absolute_uri` | string | Yes | Absolute path of folder to search |

## Query Examples

```
"Find where authentication requests are handled in the Express routes"
"Modify the agentic rollout to use the new tokenizer"
"Fix the bug where user gets redirected from /feed page"
```

## Important

- **Cannot call in parallel** - Must wait for completion before next call
- Use as **starting point** for search, then follow up with classical tools
- Evaluate relevance carefully - subagent may make mistakes
- In multi-repo workspaces, specify subfolder to avoid searching all repos
- Fill out extra details you can infer in the question
