# mcp1_n8n_create_workflow

Create workflow. Created **inactive**. Returns workflow with ID.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Workflow name |
| `nodes` | array | Yes | Workflow nodes |
| `connections` | object | Yes | Workflow connections |
| `settings` | object | No | Workflow settings |

### Node Object

| Field | Type | Required |
|-------|------|----------|
| `id` | string | Yes |
| `name` | string | Yes |
| `type` | string | Yes |
| `typeVersion` | number | Yes |
| `position` | [x, y] | Yes |
| `parameters` | object | Yes |
| `credentials` | object | No |
| `disabled` | boolean | No |
| `continueOnFail` | boolean | No |
| `retryOnFail` | boolean | No |
| `maxTries` | number | No |
| `waitBetweenTries` | number | No |
| `notes` | string | No |

### Settings Object

| Field | Type |
|-------|------|
| `executionOrder` | `v0` or `v1` |
| `timezone` | string |
| `errorWorkflow` | string |
| `executionTimeout` | number |
| `saveDataErrorExecution` | `all` or `none` |
| `saveDataSuccessExecution` | `all` or `none` |
| `saveExecutionProgress` | boolean |
| `saveManualExecutions` | boolean |
