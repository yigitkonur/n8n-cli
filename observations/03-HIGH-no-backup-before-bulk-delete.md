# No Backup Before Bulk Delete Operations

**Severity:** HIGH
**File Ref:** `src/commands/workflows/bulk.ts:46-58`
**Tags:** #data-safety #backup #reliability

## 🔍 The Observation

The bulk delete operation iterates through workflows and deletes them without creating backups, despite the codebase having a fully functional backup utility (`src/utils/backup.ts`). The `maybeBackupWorkflow()` function exists but is never called in `performBulkOperation()`.

This means `n8n workflows delete --all --force` permanently destroys all workflows with no recovery option other than external backups.

## 💻 Code Reference
```typescript
// bulk.ts:46-58 - No backup before delete
for (const id of workflowIds) {
  try {
    switch (operation) {
      case 'activate':
        await client.activateWorkflow(id);
        break;
      case 'deactivate':
        await client.deactivateWorkflow(id);
        break;
      case 'delete':
        await client.deleteWorkflow(id);  // <-- No backup!
        break;
    }
    // ...
  }
}

// backup.ts has this ready but unused:
export async function maybeBackupWorkflow(
  workflow: object,
  workflowId: string,
  options: BackupOptions = {}
): Promise<string | null>
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Providing a backup utility but not integrating it into the most dangerous operation. Users trust that a mature CLI handles safety.
*   **Best Practice:** Always create automatic local backups before destructive operations. Git reflog, Kubernetes etcd snapshots, and database soft-deletes follow this pattern.
*   **Reference:** [Kubernetes backup best practices](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/#backing-up-an-etcd-cluster)

## 🛠️ Fix Plan

1.  Before the delete loop, fetch full workflow data for each ID.
2.  Call `maybeBackupWorkflow()` (respects `--no-backup` flag) for each workflow before deletion.
3.  Log backup paths in verbose mode for recovery reference.
4.  Consider: Aggregate backup into single timestamped JSON array for easier restore.

```typescript
// Suggested modification in performBulkOperation()
case 'delete':
  // Fetch full workflow for backup
  const workflow = await client.getWorkflow(id);
  await maybeBackupWorkflow(workflow, id, { noBackup: opts.noBackup });
  await client.deleteWorkflow(id);
  break;
```

## 💼 Business Impact

**Disaster Recovery:** Without backups, accidental bulk deletions require:
- Hoping n8n instance has internal backups
- Contacting n8n Cloud support
- Recreating workflows from scratch

**Cost of Fix:** ~2 extra API calls per deletion (getWorkflow + fs write). For 100 workflows, adds ~30 seconds total. Acceptable trade-off for data safety.

**Effort:** ~45 minutes including tests.

## 🔗 Evidences

- `backup.ts` already implements `saveWorkflowBackup()` with proper timestamping
- Directory `~/.n8n-cli/backups/` is created with secure permissions (0o700)
- Single workflow operations in other commands may use backup, creating inconsistency
