## Phase 8: Version Management & Breaking Changes

**Goal:** Test local version history stored in SQLite.

### 8.1 Version History Commands

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| VHC-001 | List versions | `n8n workflows versions <id>` | Version list |
| VHC-002 | Limit results | `--limit 5` | Max 5 versions |
| VHC-003 | Get specific | `--get <version-id>` | Version details |
| VHC-004 | Save snapshot | `--get 42 --save v42.json` | File created |
| VHC-005 | Compare versions | `--compare 1,2` | Property diff |
| VHC-006 | Storage stats | `--stats` | Global statistics |

```bash
# First, import a workflow to have versions
WORKFLOW_ID=$(n8n workflows import workflows/01-profile-linkedin-search-webhook.json --json | jq -r '.data.id')
echo "Imported workflow: $WORKFLOW_ID"

# Update to create version
n8n workflows update $WORKFLOW_ID --name "Updated Name" --force

echo "=== VHC-001: List Versions ===" 
n8n workflows versions $WORKFLOW_ID --json | jq '.data'

echo "=== VHC-005: Compare Versions ===" 
n8n workflows versions $WORKFLOW_ID --compare 1,2 --json | jq '.data.differences'

echo "=== VHC-006: Storage Stats ===" 
n8n workflows versions --stats --json | jq '.data'
```

### 8.2 Rollback Operations

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| RBK-001 | Rollback previous | `--rollback` | Previous version restored |
| RBK-002 | Rollback specific | `--rollback --to-version 42` | Version 42 restored |
| RBK-003 | Skip validation | `--rollback --skip-validation` | No pre-rollback check |
| RBK-004 | Backup created | Default | Backup before rollback |

```bash
echo "=== RBK-001: Rollback Previous ===" 
n8n workflows versions $WORKFLOW_ID --rollback --force --json | jq '.data'
```

### 8.3 Version Cleanup

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CLN-001 | Delete version | `--delete <version-id>` | Version removed |
| CLN-002 | Delete all | `--delete-all --force` | All versions removed |
| CLN-003 | Prune old | `--prune --keep 5` | Keep 5 newest |
| CLN-004 | Truncate all | `--truncate-all --force` | All workflows, all versions |

```bash
echo "=== CLN-003: Prune Old ===" 
n8n workflows versions $WORKFLOW_ID --prune --keep 3 --force --json
```
