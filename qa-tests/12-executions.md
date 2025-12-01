## Phase 12: Executions Management

**Goal:** Test execution listing, inspection, and retry.

### 12.1 Execution Listing

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| EXL-001 | List all | `n8n executions list` | Recent executions |
| EXL-002 | Filter by workflow | `-w <workflow-id>` | Filtered |
| EXL-003 | Filter by status | `--status error` | Only errors |
| EXL-004 | Status success | `--status success` | Only success |
| EXL-005 | Status waiting | `--status waiting` | Only waiting |
| EXL-006 | Custom limit | `-l 50` | 50 results |
| EXL-007 | Pagination | `--cursor <cursor>` | Next page |

```bash
echo "=== EXL-001: List All ===" 
n8n executions list --json | jq '.data[:3] | .[] | {id, status, workflowName}'

echo "=== EXL-003: Filter by Status ===" 
n8n executions list --status error --json | jq '.data | length'

echo "=== EXL-002: Filter by Workflow ===" 
n8n executions list -w $WF_ID --json | jq '.data | length'
```

### 12.2 Execution Details

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| EXD-001 | Get execution | `n8n executions get <id>` | Execution details |
| EXD-002 | Mode preview | `--mode preview` | Quick overview |
| EXD-003 | Mode summary | `--mode summary` | Default |
| EXD-004 | Mode filtered | `--mode filtered` | No large data |
| EXD-005 | Mode full | `--mode full` | Complete data |
| EXD-006 | Save to file | `-s exec.json` | File created |

```bash
# Get an execution ID first
EXEC_ID=$(n8n executions list -l 1 --json | jq -r '.data[0].id')

echo "=== EXD-002: Preview Mode ===" 
n8n executions get $EXEC_ID --mode preview --json | jq '.'

echo "=== EXD-003: Summary Mode ===" 
n8n executions get $EXEC_ID --mode summary --json | jq 'keys'
```

### 12.3 Retry & Delete

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| EXR-001 | Retry execution | `n8n executions retry <id>` | New execution |
| EXR-002 | Retry load latest | `--load-latest` | Uses current workflow |
| EXR-003 | Delete execution | `n8n executions delete <id> --force` | Deleted |

```bash
# Get a failed execution
FAILED_ID=$(n8n executions list --status error -l 1 --json | jq -r '.data[0].id')

if [ "$FAILED_ID" != "null" ]; then
  echo "=== EXR-001: Retry ===" 
  n8n executions retry $FAILED_ID --json
fi
```
