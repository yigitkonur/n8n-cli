# mcp1_n8n_executions

Manage workflow executions: get details, list, or delete.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | enum | Yes | `get`, `list`, or `delete` |
| `id` | string | For get/delete | Execution ID |

### List Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workflowId` | string | Filter by workflow |
| `status` | enum | `success`, `error`, `waiting` |
| `limit` | number (1-100) | Results to return (default: 100) |
| `cursor` | string | Pagination cursor |
| `includeData` | boolean | Include execution data (default: false) |
| `projectId` | string | Filter by project (enterprise) |

### Get Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `mode` | enum | `preview`, `summary`, `filtered`, `full` |
| `includeInputData` | boolean | Include input data (default: false) |
| `nodeNames` | array | Filter to specific nodes (mode=filtered) |
| `itemsLimit` | number | Items per node (mode=filtered) |
