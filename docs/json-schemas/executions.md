# Executions Command JSON Schemas

## `executions list --json`

```typescript
interface ExecutionsListOutput {
  total: number;
  displayed: number;
  executions: ExecutionSummary[];
}

interface ExecutionSummary {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  startedAt: string;   // ISO 8601
  stoppedAt?: string;  // ISO 8601
  mode: 'manual' | 'trigger' | 'webhook' | 'retry';
}
```

### Example
```json
{
  "total": 156,
  "displayed": 10,
  "executions": [
    {
      "id": "exec123",
      "workflowId": "wf456",
      "workflowName": "Daily Sync",
      "status": "success",
      "startedAt": "2024-12-01T10:00:00.000Z",
      "stoppedAt": "2024-12-01T10:00:05.000Z",
      "mode": "trigger"
    }
  ]
}
```

### jq Recipes
```bash
# List execution IDs
n8n executions list --json | jq -r '.executions[].id'

# Get failed executions
n8n executions list --json | jq '.executions | map(select(.status == "error"))'

# Count by status
n8n executions list --json | jq '.executions | group_by(.status) | map({status: .[0].status, count: length})'
```

---

## `executions get <id> --json`

```typescript
interface ExecutionDetailOutput {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: string;
  startedAt: string;
  stoppedAt?: string;
  mode: string;
  data?: {
    resultData?: {
      runData?: Record<string, NodeExecutionResult[]>;
    };
  };
}

interface NodeExecutionResult {
  startTime: number;
  executionTime: number;
  data: {
    main: Array<Array<{ json: any }>>;
  };
}
```

### jq Recipes
```bash
# Get execution status
n8n executions get exec123 --json | jq '.status'

# Get node outputs
n8n executions get exec123 --json | jq '.data.resultData.runData | keys'
```

---

## `executions delete --json`

```typescript
interface ExecutionDeleteOutput {
  success: boolean;
  deleted: string[];  // IDs of deleted executions
  failed?: string[];  // IDs that failed to delete
}
```
