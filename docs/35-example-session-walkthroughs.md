# Example Session Walkthroughs

## Overview

Real-world usage scenarios demonstrating the CLI in action, validating our design against actual user workflows.

---

## Scenario 1: New User Discovers and Creates First Workflow

**Goal**: User wants to create a webhook-to-Slack notification workflow

### Step 1: Verify Setup
```bash
$ n8n health

🏥 n8n Health Check

Status: ✅ HEALTHY
API Response: 156ms
Instance: https://n8n.example.com
Version: 1.28.0

💡 Ready to go!
```

### Step 2: Discover Available Nodes
```bash
$ n8n nodes search webhook

╭─ Nodes matching "webhook" (showing 10 of 12 results)
│  🔍 Search mode: OR
╰─

| Node Type                      | Display Name    | Category   | Score |
|--------------------------------|-----------------|------------|-------|
| n8n-nodes-base.webhook         | Webhook         | Core Nodes | 98.5  |
| n8n-nodes-base.respondToWebhook| Respond Webhook | Core Nodes | 87.2  |
| n8n-nodes-base.httpRequest     | HTTP Request    | Core Nodes | 65.1  |

📊 Summary: 12 nodes found | 10 displayed

⚡ Next steps:
   n8n nodes get n8n-nodes-base.webhook --mode docs
   n8n nodes search webhook --save webhook-nodes.json
```

### Step 3: Learn About Webhook Node
```bash
$ n8n nodes get n8n-nodes-base.webhook --mode docs

╭─ Node Documentation: Webhook
│  📦 Type: n8n-nodes-base.webhook
│  🏷️  Category: Core Nodes
│  📌 Version: 2.1 (latest)
╰─

DESCRIPTION
    Starts a workflow execution when an HTTP request is received.

PARAMETERS
    HTTP Method
        • GET - Retrieve data
        • POST - Send data (default)
        • PUT - Update data
        • DELETE - Remove data
    
    Webhook Path
        Custom path segment for the webhook URL
        Example: /my-webhook → https://n8n.example.com/webhook/my-webhook

OUTPUTS
    • body - Request body data
    • headers - HTTP headers
    • query - Query parameters

💡 Next steps:
   n8n nodes get n8n-nodes-base.webhook --mode search_properties --property-query "auth"
```

### Step 4: Find Slack Node
```bash
$ n8n nodes search slack

╭─ Nodes matching "slack" (showing 3 of 3 results)
╰─

| Node Type               | Display Name | Category      | Score |
|-------------------------|--------------|---------------|-------|
| n8n-nodes-base.slack    | Slack        | Communication | 99.1  |
| n8n-nodes-base.slackTrigger | Slack Trigger | Triggers  | 85.3  |

⚡ Next steps:
   n8n nodes get n8n-nodes-base.slack --mode docs
```

### Step 5: Find a Template
```bash
$ n8n templates search "webhook slack"

╭─ Templates matching "webhook slack" (showing 5 of 23 results)
╰─

| ID   | Name                          | Nodes | Views | Complexity   |
|------|-------------------------------|-------|-------|--------------|
| 1234 | Webhook to Slack Notification | 3     | 12.5K | beginner     |
| 1456 | GitHub Events to Slack        | 5     | 8.2K  | intermediate |

⚡ Next steps:
   n8n templates get 1234 --save webhook-slack.json
```

### Step 6: Download Template as Starting Point
```bash
$ n8n templates get 1234 --save webhook-slack.json

✅ Saved to webhook-slack.json
   Size: 5.2 KB

💡 jq recipes:
   jq '.nodes[].name' webhook-slack.json
   jq '.nodes[] | {name, type}' webhook-slack.json
```

### Step 7: Validate Before Creating
```bash
$ n8n workflows validate --from-file webhook-slack.json

🔍 Validating workflow: webhook-slack.json

╭─ Validation Results
╰─

✅ VALID - All checks passed

Structure:
    ✓ 3 nodes present
    ✓ 2 connections configured
    ✓ Trigger node present (Webhook)

⚠️  Warnings:
    • Credentials are placeholders - configure after creating
    • Webhook path is generic - consider customizing

💡 Next steps:
   n8n workflows create --from-file webhook-slack.json --dry-run
```

### Step 8: Preview Creation (Dry Run)
```bash
$ n8n workflows create --from-file webhook-slack.json

📝 PREVIEW: Create workflow (DRY RUN - no changes)

╭─ Workflow to be created
╰─

Name: "Webhook to Slack Notification"
Nodes: 3
  • Webhook (trigger)
  • Set (transform)
  • Slack (action)

⚠️  To create, run:
    n8n workflows create --from-file webhook-slack.json --confirm-with "CREATE WEBHOOK SLACK"
```

### Step 9: Create the Workflow
```bash
$ n8n workflows create --from-file webhook-slack.json --confirm-with "CREATE WEBHOOK SLACK"

🚀 Workflow Created Successfully

╭─ Created Workflow
╰─

ID: wf-abc123
Name: "Webhook to Slack Notification"
Status: INACTIVE

⚠️  Next steps:
   1. Configure Slack credentials in n8n UI
   2. Activate workflow in n8n UI
   3. Test: n8n workflows trigger <webhook-url> --data '{"test": true}'
```

---

## Scenario 2: Debug Failed Execution

**Goal**: User notices workflow failures and needs to diagnose the issue

### Step 1: List Recent Failures
```bash
$ n8n executions list --status error --limit 5

╭─ Executions (showing 5 of 23 errors)
│  🔍 Filters: status=error
╰─

| ID         | Workflow          | Status | Started       | Duration |
|------------|-------------------|--------|---------------|----------|
| exec-001   | Data Sync         | ❌     | 5 min ago     | 0.8s     |
| exec-002   | Data Sync         | ❌     | 35 min ago    | 0.9s     |
| exec-003   | Email Processor   | ❌     | 2 hours ago   | 1.2s     |

📊 Summary: 23 failed in last 24h

⚡ Next steps:
   n8n executions get exec-001 --mode summary
```

### Step 2: Get Error Details
```bash
$ n8n executions get exec-001 --mode summary

🐛 Execution Details: exec-001

Workflow: "Data Sync" (wf-xyz789)
Status: ❌ ERROR
Duration: 0.856s

╭─ Execution Flow
╰─

1. ✓ Schedule Trigger (0.002s)
   Output: {"timestamp": "2025-11-30T15:00:00Z"}

2. ✓ HTTP Request - Get Data (0.234s)
   Output: {"items": [...]} (47 items)

3. ❌ HTTP Request - Post to API (0.620s) - FAILED
   
   Error: 401 Unauthorized
   
   Details:
     • URL: https://api.example.com/data
     • Method: POST
     • Response: {"error": "Invalid API key"}
   
   Likely causes:
     • API key expired or invalid
     • Wrong authentication method

4. ⊘ Set - Format Response - Not executed
5. ⊘ Slack - Notify - Not executed

💡 Debug steps:
   # Check the API key is correct
   # Verify auth method matches API requirements
   
   n8n workflows get wf-xyz789 --mode structure
   n8n executions get exec-001 --mode full --save debug.json
```

### Step 3: Check Workflow Configuration
```bash
$ n8n workflows get wf-xyz789 --mode structure

╭─ Workflow Structure: wf-xyz789
│  📦 Name: "Data Sync"
│  ⚡ Status: ACTIVE
╰─

Nodes (5):
  Schedule Trigger → HTTP Request (Get) → HTTP Request (Post) → Set → Slack
                                              ↑
                                         FAILED HERE

Credentials used:
  • HTTP Request (Post): "Production API" (header auth)
```

### Step 4: Save Full Debug Data
```bash
$ n8n executions get exec-001 --mode full --save debug-exec-001.json

✅ Saved to debug-exec-001.json
   Size: 15.3 KB

💡 jq recipes:
   jq '.data.resultData.runData | keys' debug-exec-001.json
   jq '.data.resultData.runData["HTTP Request - Post to API"][0].error' debug-exec-001.json
```

### Step 5: Validate Workflow After Fix
```bash
$ n8n workflows validate --id wf-xyz789

🔍 Validating workflow: wf-xyz789

╭─ Validation Results
╰─

✅ VALID - Structure is correct

⚠️  Cannot validate credentials
    Verify credentials are configured correctly in n8n UI
```

---

## Scenario 3: Modify Existing Workflow

**Goal**: Add error handling to an existing workflow

### Step 1: Get Current Workflow
```bash
$ n8n workflows get wf-abc123 --save current.json

✅ Saved to current.json
   Size: 8.2 KB
```

### Step 2: Inspect Structure
```bash
$ jq '.nodes[] | {name, type}' current.json

{"name": "Webhook", "type": "n8n-nodes-base.webhook"}
{"name": "HTTP Request", "type": "n8n-nodes-base.httpRequest"}
{"name": "Slack", "type": "n8n-nodes-base.slack"}
```

### Step 3: Validate Current State
```bash
$ n8n workflows validate --id wf-abc123

✅ VALID

⚠️  Suggestions:
    • Consider adding error handling for HTTP Request node
```

### Step 4: Preview Update Operations
```bash
$ cat > ops.json << 'EOF'
[
  {
    "type": "addNode",
    "node": {
      "name": "Error Handler",
      "type": "n8n-nodes-base.noOp",
      "position": [600, 400],
      "parameters": {}
    }
  },
  {
    "type": "updateNode",
    "nodeName": "HTTP Request",
    "updates": {
      "onError": "continueErrorOutput"
    }
  },
  {
    "type": "addConnection",
    "source": "HTTP Request",
    "target": "Error Handler",
    "branch": "false"
  }
]
EOF

$ n8n workflows update wf-abc123 --from-file ops.json --intent "Add error handling"

📝 Preview: Update workflow wf-abc123

Mode: VALIDATE-ONLY (no changes)
Intent: "Add error handling"
Operations: 3

╭─ Operations to apply
╰─

1. ✓ addNode - "Error Handler" (n8n-nodes-base.noOp)
2. ✓ updateNode - "HTTP Request" → onError: continueErrorOutput
3. ✓ addConnection - HTTP Request[error] → Error Handler

Validation:
  ✓ All operations valid

⚠️  To apply, add --apply flag (remove --validate-only)
```

### Step 5: Apply the Update
```bash
$ n8n workflows update wf-abc123 --from-file ops.json --intent "Add error handling" --apply

✅ Workflow Updated

Applied 3 operations to wf-abc123

Changes:
  • Added node: Error Handler
  • Updated node: HTTP Request
  • Added connection: HTTP Request → Error Handler

⚠️  Re-validate:
   n8n workflows validate --id wf-abc123
```

### Step 6: Verify Update
```bash
$ n8n workflows validate --id wf-abc123

✅ VALID

Structure:
    ✓ 4 nodes present
    ✓ 3 connections configured
    ✓ Error handling configured for HTTP Request
```

---

## Scenario 4: Rollback After Bad Update

**Goal**: User made a mistake and needs to restore previous version

### Step 1: Check Version History
```bash
$ n8n workflows versions list --workflow-id wf-abc123

╭─ Version History: wf-abc123
│  📦 Workflow: "Webhook to Slack"
│  💾 Total versions: 5
╰─

| Version | Created             | Nodes | Size  |
|---------|---------------------|-------|-------|
| 5       | 10 minutes ago      | 4     | 8.5KB |  ← Current (broken?)
| 4       | 2 hours ago         | 3     | 5.2KB |  ← Before update
| 3       | 1 day ago           | 3     | 5.1KB |
| 2       | 3 days ago          | 2     | 4.0KB |
| 1       | 1 week ago          | 2     | 3.8KB |

💡 Next steps:
   n8n workflows versions get --version-id 4
   n8n workflows versions rollback --workflow-id wf-abc123 --version-id 4
```

### Step 2: Preview Rollback
```bash
$ n8n workflows versions rollback --workflow-id wf-abc123 --version-id 4

⏮️  PREVIEW: Rollback wf-abc123 to version 4

Current State (v5):
  Nodes: 4
  Modified: 10 minutes ago

Target State (v4):
  Nodes: 3
  Created: 2 hours ago

Changes:
  • Node removed: "Error Handler"
  • HTTP Request: onError reverted
  • Connection removed: HTTP Request → Error Handler

⚠️  To rollback:
    n8n workflows versions rollback --workflow-id wf-abc123 --version-id 4 --confirm-with "ROLLBACK TO V4"
```

### Step 3: Execute Rollback
```bash
$ n8n workflows versions rollback --workflow-id wf-abc123 --version-id 4 --confirm-with "ROLLBACK TO V4"

✅ Rolled back to version 4

Backup created: version 6 (pre-rollback snapshot)

Current state:
  Nodes: 3
  Version: 4 (restored)

💡 If this was wrong:
   n8n workflows versions rollback --workflow-id wf-abc123 --version-id 6
```

---

## Scenario 5: CI/CD Pipeline Integration

**Goal**: Validate and deploy workflows in automated pipeline

### Pipeline Script
```bash
#!/bin/bash
# deploy-workflow.sh

WORKFLOW_FILE=$1
WORKFLOW_NAME=$(jq -r '.name' "$WORKFLOW_FILE")

echo "🔍 Validating: $WORKFLOW_NAME"

# Step 1: Validate
if ! n8n workflows validate --from-file "$WORKFLOW_FILE" --quiet; then
    echo "❌ Validation failed"
    exit 1
fi

echo "✅ Validation passed"

# Step 2: Check if workflow exists
EXISTING_ID=$(n8n workflows list --json | jq -r ".[] | select(.name == \"$WORKFLOW_NAME\") | .id")

if [ -n "$EXISTING_ID" ]; then
    echo "📝 Updating existing workflow: $EXISTING_ID"
    n8n workflows replace "$EXISTING_ID" \
        --from-file "$WORKFLOW_FILE" \
        --intent "CI/CD deployment" \
        --confirm-with "REPLACE $WORKFLOW_NAME"
else
    echo "🆕 Creating new workflow"
    n8n workflows create \
        --from-file "$WORKFLOW_FILE" \
        --confirm-with "CREATE $WORKFLOW_NAME"
fi

echo "✅ Deployment complete"
```

### Usage
```bash
$ ./deploy-workflow.sh workflows/data-sync.json

🔍 Validating: Data Sync Pipeline
✅ Validation passed
📝 Updating existing workflow: wf-xyz789
✅ Deployment complete
```

---

## Scenario 6: Bulk Export for Backup

**Goal**: Export all workflows for backup/migration

```bash
# List all workflows
$ n8n workflows list --limit 0 --save all-workflows-list.json

✅ Saved 47 workflows to all-workflows-list.json

# Export each workflow
$ jq -r '.[].id' all-workflows-list.json | while read id; do
    n8n workflows get "$id" --save "backup/${id}.json"
    echo "Exported: $id"
done

Exported: wf-abc123
Exported: wf-def456
...

# Verify backup
$ ls backup/ | wc -l
47
```

---

## Key Observations

These walkthroughs validate our design:

1. ✅ **Progressive disclosure** - Users start with simple commands, go deeper as needed
2. ✅ **Safe defaults** - Dry-run/preview prevents accidents
3. ✅ **Contextual help** - Next steps guide users forward
4. ✅ **jq integration** - Power users can chain with standard tools
5. ✅ **Error recovery** - Version history enables rollback
6. ✅ **Automation friendly** - --json and --quiet flags for scripting
