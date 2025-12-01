# Backup Utility Has No Rotation or Cleanup

**Severity:** LOW
**File Ref:** `src/utils/backup.ts:57-69`
**Tags:** #maintenance #disk-space #operations

## 🔍 The Observation

The backup utility creates timestamped backups in `~/.n8n-cli/backups/` but has no rotation or cleanup mechanism. Over time, this directory can grow unbounded, consuming disk space.

Each backup includes the full workflow JSON, and frequent operations (especially if backup-before-delete is implemented) could create thousands of files.

## 💻 Code Reference
```typescript
// backup.ts:57-69 - creates backups, never deletes
export async function saveWorkflowBackup(
  workflow: object,
  workflowId: string
): Promise<string> {
  await ensureBackupDir();
  
  const timestamp = getTimestamp();
  const filename = `workflow-${workflowId}-${timestamp}.json`;
  const backupPath = join(BACKUP_DIR, filename);
  
  await writeFile(backupPath, JSON.stringify(workflow, null, 2), 'utf8');
  
  return backupPath;
  // No cleanup of old backups!
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Unbounded growth of backup files with no rotation policy.
*   **Best Practice:** Implement retention policy (keep last N backups per workflow, or backups newer than X days).
*   **Reference:** logrotate pattern - rotate based on count, size, or age

## 🛠️ Fix Plan

1.  Add cleanup function to remove old backups:

```typescript
const MAX_BACKUPS_PER_WORKFLOW = 10;
const MAX_BACKUP_AGE_DAYS = 30;

export async function cleanupOldBackups(): Promise<number> {
  const files = await readdir(BACKUP_DIR);
  const now = Date.now();
  let deleted = 0;
  
  // Group by workflow ID
  const byWorkflow = new Map<string, string[]>();
  for (const file of files) {
    const match = file.match(/^workflow-([^-]+)-/);
    if (match) {
      const id = match[1];
      if (!byWorkflow.has(id)) byWorkflow.set(id, []);
      byWorkflow.get(id)!.push(file);
    }
  }
  
  // Keep only most recent N per workflow
  for (const [id, backups] of byWorkflow) {
    const sorted = backups.sort().reverse();  // Newest first
    for (const old of sorted.slice(MAX_BACKUPS_PER_WORKFLOW)) {
      await unlink(join(BACKUP_DIR, old));
      deleted++;
    }
  }
  
  return deleted;
}
```

2.  Run cleanup after backup operations or via dedicated command.

## 💼 Business Impact

**Disk Space:** On systems with frequent workflow updates, backup directory could grow to gigabytes.

**Operational:** No urgent issue but good hygiene for production CLI usage.

**Effort:** ~1 hour for cleanup implementation.

## 🔗 Evidences

- Backup directory is created with no size limits
- Each workflow backup is 1-100KB depending on complexity
- No `n8n backup cleanup` command exists
