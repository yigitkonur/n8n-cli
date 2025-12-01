# No --dry-run Flag for Bulk Operations

**Severity:** LOW
**File Ref:** `src/commands/workflows/bulk.ts:100-169`
**Tags:** #ux #safety #cli-design

## 🔍 The Observation

The bulk operations (activate, deactivate, delete) show a count in the confirmation prompt but don't offer a `--dry-run` mode to preview which workflows would be affected. Users must trust the count without seeing the actual items.

Compare to `kubectl delete --dry-run=client` which shows what would be deleted.

## 💻 Code Reference
```typescript
// bulk.ts - No dry-run option defined
interface BulkOptions extends GlobalOptions {
  ids?: string;
  all?: boolean;
  force?: boolean;
  yes?: boolean;
  json?: boolean;
  // Missing: dryRun?: boolean;
}

// Confirmation only shows count
const confirmed = await confirmAction(
  `${actionWord} ${workflowIds.length} workflow(s)?`,  // No item list
  { defaultNo: true }
);
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** "Trust me" confirmation that doesn't show what will be affected.
*   **Best Practice:** Preview mode that lists affected resources before execution.
*   **Reference:** kubectl, terraform plan, git rebase --interactive all show previews

## 🛠️ Fix Plan

1.  Add `--dry-run` flag that lists affected workflows without executing:

```typescript
interface BulkOptions extends GlobalOptions {
  // ... existing
  dryRun?: boolean;
}

// In executeBulkCommand()
if (opts.dryRun) {
  console.log(formatHeader({
    title: `${operation} Preview (Dry Run)`,
    context: { 'Total': workflowIds.length },
  }));
  
  // Show first N workflows
  for (const id of workflowIds.slice(0, 20)) {
    const wf = await client.getWorkflow(id);
    console.log(chalk.dim(`  ${id}: ${wf.name}`));
  }
  if (workflowIds.length > 20) {
    console.log(chalk.dim(`  ... and ${workflowIds.length - 20} more`));
  }
  
  console.log(chalk.cyan('\nRun without --dry-run to execute.'));
  return;
}
```

2.  Consider showing preview in confirmation prompt (first 5 items).

## 💼 Business Impact

**User Confidence:** Users can verify --all affects expected workflows before execution.

**Debugging:** Helps identify filter issues before destructive action.

**Effort:** ~45 minutes to implement dry-run mode.

## 🔗 Evidences

- workflows import has --dry-run (line 70-127) - inconsistent
- kubectl sets the standard with --dry-run=client/server
- terraform plan is mandatory before apply for exactly this reason
