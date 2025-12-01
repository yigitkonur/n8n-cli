
## Phase 9: Workflow Lifecycle (CRUD)

**Goal:** Test complete workflow management operations.

### 9.1 Create & Import

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CRE-001 | Create from file | `n8n workflows create -f file.json` | Workflow created |
| CRE-002 | Create with name | `--name "Custom Name"` | Name overridden |
| CRE-003 | Create dry-run | `--dry-run` | Preview only |
| CRE-004 | Import alias | `n8n workflows import file.json` | Same as create |
| CRE-005 | Import + activate | `--activate` | Created and active |
| CRE-006 | Skip validation | `--skip-validation` | No pre-check |
| CRE-007 | JSON output | `--json` | Returns ID, name |

```bash
echo "=== CRE-001: Create Workflow ===" 
RESULT=$(n8n workflows create -f workflows/01-profile-linkedin-search-webhook.json --json)
WF_ID=$(echo "$RESULT" | jq -r '.data.id')
echo "Created: $WF_ID"

echo "=== CRE-005: Import + Activate ===" 
n8n workflows import workflows/06-billing-revenuecat-webhook.json --activate --json | jq '{id: .data.id, active: .data.active}'

echo "=== CRE-003: Dry Run ===" 
n8n workflows create -f workflows/11-job-scrape-webhook-apify.json --dry-run --json | jq '.data'
```

### 9.2 List & Get

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| LST-001 | List all | `n8n workflows list` | Workflows listed |
| LST-002 | Active only | `-a` or `--active` | Only active |
| LST-003 | Filter by tags | `-t production,api` | Filtered |
| LST-004 | Custom limit | `-l 50` | 50 results |
| LST-005 | Pagination | `--cursor <cursor>` | Next page |
| LST-006 | Save to file | `-s workflows.json` | File created |
| GET-001 | Get by ID | `n8n workflows get <id>` | Full workflow |
| GET-002 | Mode: details | `--mode details` | Metadata only |
| GET-003 | Mode: structure | `--mode structure` | Nodes + connections |
| GET-004 | Mode: minimal | `--mode minimal` | Bare minimum |
| GET-005 | Save workflow | `--save wf.json` | File created |

```bash
echo "=== LST-001: List All ===" 
n8n workflows list --json | jq '.data | length'

echo "=== LST-002: Active Only ===" 
n8n workflows list -a --json | jq '.data[] | {id, name, active}'

echo "=== GET-001: Get by ID ===" 
n8n workflows get $WF_ID --json | jq '{name: .data.name, nodes: (.data.nodes | length)}'

echo "=== GET-002: Mode Details ===" 
n8n workflows get $WF_ID --mode details --json | jq 'keys'
```

### 9.3 Export

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| EXP-001 | Export to stdout | `n8n workflows export <id>` | JSON to stdout |
| EXP-002 | Export to file | `-o backup.json` | File created |
| EXP-003 | Full export | `--full` | All fields included |
| EXP-004 | Stripped export | Default | Server fields removed |

```bash
echo "=== EXP-001: Export to Stdout ===" 
n8n workflows export $WF_ID | jq '.name'

echo "=== EXP-002: Export to File ===" 
n8n workflows export $WF_ID -o backups/wf-backup.json
[ -f backups/wf-backup.json ] && echo "✅ Created"

echo "=== EXP-003: Full Export ===" 
n8n workflows export $WF_ID --full --json | jq 'keys'
```

### 9.4 Update

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| UPD-001 | Update from file | `n8n workflows update <id> -f file.json` | Updated |
| UPD-002 | Update name only | `--name "New Name"` | Name changed |
| UPD-003 | Activate | `--activate` | Workflow active |
| UPD-004 | Deactivate | `--deactivate` | Workflow inactive |
| UPD-005 | Force update | `--force` | No confirmation |
| UPD-006 | No backup | `--no-backup` | Skip backup |

```bash
echo "=== UPD-002: Update Name ===" 
n8n workflows update $WF_ID --name "QA Test Workflow" --force --json | jq '.data.name'

echo "=== UPD-003: Activate ===" 
n8n workflows update $WF_ID --activate --force --json | jq '.data.active'

echo "=== UPD-004: Deactivate ===" 
n8n workflows update $WF_ID --deactivate --force --json | jq '.data.active'
```

### 9.5 Bulk Operations

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| BLK-001 | Activate multiple | `--ids id1,id2` | All activated |
| BLK-002 | Activate all | `--all` | All activated |
| BLK-003 | Deactivate multiple | Same with deactivate | All deactivated |
| BLK-004 | Delete single | `n8n workflows delete --ids <id> --force` | Deleted |
| BLK-005 | Delete confirmation | >10 workflows | TYPE DELETE N |
| BLK-006 | Delete with backup | Default | Backup created |

```bash
echo "=== BLK-003: Deactivate Multiple ===" 
IDS="$WF_ID"  # Add more comma-separated IDs
n8n workflows deactivate --ids $IDS --force --json

echo "=== BLK-004: Delete ===" 
# Create a disposable workflow first
TEMP_ID=$(n8n workflows import workflows/20-radar-scan-schedule.json --json | jq -r '.data.id')
n8n workflows delete --ids $TEMP_ID --force --json
```

### 9.6 Trigger

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| TRG-001 | POST trigger | `n8n workflows trigger <url>` | Webhook called |
| TRG-002 | With JSON data | `-d '{"key":"value"}'` | Data sent |
| TRG-003 | From file | `-d @data.json` | File data sent |
| TRG-004 | GET method | `-m GET` | GET request |

```bash
# Note: Requires a workflow with webhook trigger active
echo "=== TRG-001: Trigger Webhook ===" 
# n8n workflows trigger "http://localhost:5678/webhook/test-path" -d '{"test": true}' --json
echo "Skipped - requires active webhook"
```

### 9.7 Tags Management

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| WTG-001 | Get workflow tags | `n8n workflows tags <id>` | Current tags |
| WTG-002 | Set tags | `--set tag1,tag2` | Tags assigned |

```bash
# First create some tags
TAG_ID=$(n8n tags create -n "qa-test" --json | jq -r '.data.id')

echo "=== WTG-002: Set Tags ===" 
n8n workflows tags $WF_ID --set $TAG_ID --force --json | jq '.data'

echo "=== WTG-001: Get Tags ===" 
n8n workflows tags $WF_ID --json | jq '.data'
```
