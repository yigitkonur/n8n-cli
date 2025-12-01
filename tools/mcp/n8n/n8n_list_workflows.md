# mcp1_n8n_list_workflows

List workflows (minimal metadata only). Returns id/name/active/dates/tags.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number (1-100) | No | Number to return (default: 100) |
| `active` | boolean | No | Filter by active status |
| `tags` | array | No | Filter by tags (exact match) |
| `cursor` | string | No | Pagination cursor from previous response |
| `projectId` | string | No | Filter by project ID (enterprise) |
| `excludePinnedData` | boolean | No | Exclude pinned data (default: true) |

## Response

Check `hasMore` and `nextCursor` for pagination.
