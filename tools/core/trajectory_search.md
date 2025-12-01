# trajectory_search

Semantic search or retrieve conversation trajectories. Returns chunks scored, sorted, filtered by relevance.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ID` | string | Yes | Cascade ID for conversations |
| `Query` | string | Yes | Search query (empty returns all steps) |
| `SearchType` | enum | Yes | `cascade` for conversations |

## Notes

- Maximum 50 chunks returned
- Call when user @mentions a @conversation
- Do NOT call with `SearchType: 'user'`
- Ignore @activity mentions
