# --json Flag Bypasses Destructive Operation Confirmation

**Severity:** HIGH
**File Ref:** `src/commands/workflows/bulk.ts:143`
**Tags:** #security #data-safety #cli-design

## 🔍 The Observation

The `--json` output flag unintentionally bypasses the confirmation prompt for destructive operations like `workflows delete --all`. The code checks `!skipConfirm && !opts.json` before prompting, meaning any command with `--json` proceeds without confirmation.

This creates a dangerous automation footgun where a script expecting JSON output accidentally deletes all workflows:
```bash
# Intended: Get deletion results as JSON
# Actual: Deletes ALL workflows without confirmation
n8n workflows delete --all --json
```

## 💻 Code Reference
```typescript
// bulk.ts:141-154
const skipConfirm = opts.force || opts.yes;

if (!skipConfirm && !opts.json) {  // <-- BUG: --json bypasses confirm
  const actionWord = operation === 'delete' ? 'DELETE' : operation;
  const confirmed = await confirmAction(
    `${actionWord} ${workflowIds.length} workflow(s)?`,
    { defaultNo: true }
  );
  
  if (!confirmed) {
    console.log(chalk.yellow('Operation cancelled.'));
    return;
  }
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Conflating output format flags (`--json`) with confirmation bypass. Output formatting is orthogonal to safety controls.
*   **Best Practice:** Separate concerns - `--json` affects output format only, `--force/--yes` explicitly bypasses safety. kubectl requires explicit `--force` regardless of output format.
*   **Reference:** [Kubernetes kubectl delete documentation](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#delete) - `--force` is required for dangerous operations

## 🛠️ Fix Plan

1.  Remove `!opts.json` from the confirmation check condition.
2.  For `--json` mode, either: (a) still require `--force` in non-TTY, or (b) output confirmation request in JSON format.
3.  Consider: In non-TTY with `--json`, auto-fail unless `--force` is explicit.

```typescript
// Fixed condition - --json no longer bypasses
if (!skipConfirm) {
  if (isNonInteractive()) {
    // In CI/non-TTY, require explicit --force
    throw new Error('Destructive operation requires --force in non-interactive mode');
  }
  const confirmed = await confirmAction(...);
  // ...
}
```

## 💼 Business Impact

**Data Loss Risk:** A misconfigured CI/CD pipeline or automation script could delete all production workflows with a single command. This is the "rm -rf /" equivalent for n8n instances.

**Affected Scenarios:**
- GitHub Actions workflows using `--json` for parsing
- Shell scripts piping to `jq`
- Agent-based automation expecting JSON responses

**Effort:** ~30 minutes. Breaking change for scripts relying on bypass (intentional fix).

## 🔗 Evidences

- kubectl requires `--force` for cascade deletions regardless of `-o json`
- git requires `--force` for destructive push regardless of porcelain format
- AWS CLI requires `--force` for delete operations regardless of `--output json`
