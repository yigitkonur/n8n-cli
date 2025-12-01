# --all Operations Have Same Confirmation as Single Item

**Severity:** MEDIUM
**File Ref:** `src/commands/workflows/bulk.ts:143-154`
**Tags:** #ux #data-safety #cli-design

## 🔍 The Observation

The `--all` flag for bulk operations receives the same confirmation prompt as deleting a single workflow. There's no escalated warning or typed confirmation for operations affecting potentially hundreds of workflows.

Current prompt: `DELETE 247 workflow(s)? [y/N]:` - A single 'y' keypress deletes everything.

Compare to git which requires typing "yes" for `push --force` to protected branches, or AWS which requires typing the resource name for deletion.

## 💻 Code Reference
```typescript
// bulk.ts:143-154 - Same confirm for 1 or 1000 workflows
if (!skipConfirm && !opts.json) {
  const actionWord = operation === 'delete' ? 'DELETE' : operation;
  const confirmed = await confirmAction(
    `${actionWord} ${workflowIds.length} workflow(s)?`,  // Just shows count
    { defaultNo: true }  // y/N prompt, default no
  );
  
  if (!confirmed) {
    console.log(chalk.yellow('Operation cancelled.'));
    return;
  }
}
// No special handling for --all or large counts
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Treating deletion of 1 item the same as deletion of all items. A single typo or muscle memory 'y' can cause disaster.
*   **Best Practice:** Escalated confirmation for bulk operations. Examples:
    - Require typing count: "Type '247' to confirm"
    - Require typing 'DELETE ALL'
    - Two-step: List items first, confirm separately
*   **Reference:** [AWS CLI delete-objects](https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-objects.html) - Requires explicit bucket name in command

## 🛠️ Fix Plan

1.  For `--all` or count > threshold (e.g., 10), require typed confirmation:

```typescript
if (opts.all || workflowIds.length > 10) {
  const confirmText = `DELETE ${workflowIds.length}`;
  const typed = await promptInput(
    `Type "${confirmText}" to confirm deletion of ALL workflows`
  );
  if (typed !== confirmText) {
    console.log(chalk.yellow('Confirmation did not match. Operation cancelled.'));
    return;
  }
}
```

2.  Show preview of first N items before confirmation.
3.  Consider `--dry-run` flag that lists affected items without executing.

## 💼 Business Impact

**Risk Mitigation:** The difference between "y" and typed confirmation could prevent accidental production data loss. This is a cheap safeguard with high value.

**User Experience:** Slightly slower for intentional bulk deletes, but users performing intentional bulk deletes will appreciate the safety net.

**Effort:** ~30 minutes to implement typed confirmation.

## 🔗 Evidences

- kubectl doesn't support `--all` for delete (requires label selector)
- git interactive rebase requires explicit 'drop' per commit
- Heroku CLI requires app name for `destroy` command
