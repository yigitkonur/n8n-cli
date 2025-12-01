## Phase 34: Backup File Integrity

**Goal:** Test backup creation, naming format, and content integrity.
**Source Truth:** `utils/backup.ts` (Lines 40-60)
- `getTimestamp()` format
- `writeFile` atomicity

### 34.1 Backup Naming Convention

| Test ID | Test Case | Action | Expected Format |
|---------|-----------|--------|-----------------|
| BCK-001 | Workflow Update | Update workflow | `workflow-{ID}-{TIMESTAMP}.json` |
| BCK-002 | Autofix Apply | Apply fixes | `autofix-{ID}-{TIMESTAMP}.json` |
| BCK-003 | Rollback | Version rollback | `rollback-{ID}-{TIMESTAMP}.json` |
| BCK-004 | Timestamp Format | Any backup | `YYYYMMDD-HHMMSS` format |

```bash
echo "=== BCK-001: Backup on Workflow Update ==="
# Create a test workflow
TEST_WF=$(n8n workflows import workflows/01-profile-linkedin-search-webhook.json --json 2>/dev/null | jq -r '.data.id // empty')
if [ -n "$TEST_WF" ]; then
    # Update it (creates backup)
    n8n workflows update $TEST_WF --name "Backup Test $(date +%s)" --force --json > /dev/null
    
    # Check backup directory
    BACKUP_DIR="$HOME/.n8n-cli/backups"
    ls -la "$BACKUP_DIR" | grep "$TEST_WF" | head -1
    
    # Cleanup test workflow
    n8n workflows delete --ids $TEST_WF --force --json > /dev/null
fi

echo "=== BCK-004: Timestamp Format ==="
# List backups and verify format
ls -1 "$HOME/.n8n-cli/backups/" 2>/dev/null | head -5
# Should match pattern: *-YYYYMMDD-HHMMSS.json
```

### 34.2 Backup Content Integrity

| Test ID | Test Case | Check | Expected |
|---------|-----------|-------|----------|
| BCI-001 | Pre-Fix State | Autofix backup | Matches original |
| BCI-002 | Valid JSON | All backups | Parseable JSON |
| BCI-003 | Complete Workflow | Backup content | All nodes, connections |
| BCI-004 | No Modifications | Backup vs original | Byte-for-byte match |

```bash
echo "=== BCI-001: Backup Content Before Autofix ==="
# 1. Create workflow with issues
cat > /tmp/backup-test.json << 'EOF'
{
  "name": "Backup Test Original",
  "nodes": [
    {
      "name": "HTTP",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [400, 300],
      "parameters": {
        "url": "{{ $json.url }}"
      }
    }
  ],
  "connections": {}
}
EOF

# 2. Store original hash
ORIGINAL_HASH=$(md5 -q /tmp/backup-test.json 2>/dev/null || md5sum /tmp/backup-test.json | cut -d' ' -f1)
echo "Original hash: $ORIGINAL_HASH"

# 3. Run autofix (creates backup)
n8n workflows autofix /tmp/backup-test.json --apply --force --save /tmp/backup-fixed.json 2>/dev/null

# 4. Find the backup
BACKUP_FILE=$(ls -t "$HOME/.n8n-cli/backups/"*backup-test* 2>/dev/null | head -1)
if [ -n "$BACKUP_FILE" ]; then
    BACKUP_HASH=$(md5 -q "$BACKUP_FILE" 2>/dev/null || md5sum "$BACKUP_FILE" | cut -d' ' -f1)
    echo "Backup hash: $BACKUP_HASH"
    [ "$ORIGINAL_HASH" = "$BACKUP_HASH" ] && echo "✅ Backup matches original" || echo "⚠️ Backup differs"
fi

echo "=== BCI-002: Valid JSON ==="
# Verify all backups are valid JSON
for f in "$HOME/.n8n-cli/backups/"*.json 2>/dev/null; do
    jq empty "$f" 2>/dev/null && echo "✅ $f" || echo "❌ $f"
done | head -5

# Cleanup
rm -f /tmp/backup-test.json /tmp/backup-fixed.json
```

### 34.3 Backup Directory Management

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| BDM-001 | Auto-Create Dir | Fresh install | `~/.n8n-cli/backups/` created |
| BDM-002 | Permissions | Check dir perms | 700 (user only) |
| BDM-003 | No Backup Flag | `--no-backup` | Skips backup creation |

```bash
echo "=== BDM-001: Backup Directory Exists ==="
BACKUP_DIR="$HOME/.n8n-cli/backups"
[ -d "$BACKUP_DIR" ] && echo "✅ Backup directory exists" || echo "❌ Missing"

echo "=== BDM-002: Directory Permissions ==="
ls -ld "$BACKUP_DIR" 2>/dev/null | cut -d' ' -f1
# Should be drwx------ (700)

echo "=== BDM-003: No Backup Flag ==="
# Create test file
echo '{"name":"NoBackup","nodes":[],"connections":{}}' > /tmp/no-backup-test.json
BEFORE_COUNT=$(ls -1 "$BACKUP_DIR" 2>/dev/null | wc -l)

# Update with --no-backup (if the file were a workflow)
# n8n workflows update <id> --no-backup --force

AFTER_COUNT=$(ls -1 "$BACKUP_DIR" 2>/dev/null | wc -l)
echo "Backups before: $BEFORE_COUNT, after: $AFTER_COUNT"

rm -f /tmp/no-backup-test.json
```

### 34.4 Atomic Write Operations

| Test ID | Test Case | Scenario | Expected |
|---------|-----------|----------|----------|
| ATM-001 | Concurrent Backups | Multiple updates | No corruption |
| ATM-002 | Disk Full | Simulate full disk | Graceful error |
| ATM-003 | Interrupted Write | Kill during write | No partial files |

```bash
echo "=== ATM-001: Unique Timestamps ==="
# Rapid backup creation should have unique names
ls -1 "$HOME/.n8n-cli/backups/" 2>/dev/null | sort | uniq -d | head -5
# Should be empty (no duplicates)
```

---

## Source Code Reference

**`utils/backup.ts`:**
```typescript
// Lines 40-60: Backup file generation
// getTimestamp(): Returns YYYYMMDD-HHMMSS format
// writeFile: Uses atomic write (write to temp, then rename)
// Ensures backup is complete before overwriting original
// Directory: ~/.n8n-cli/backups/
// Naming: {operation}-{identifier}-{timestamp}.json
```
