# No Backup Before Workflow Mutations

**Severity:** HIGH
**File Ref:** `src/commands/workflows/autofix.ts:130-133`
**Tags:** #DataSafety #Recovery #Operations

## 🔍 The Observation
When the CLI modifies workflows (autofix, update), it does not create any backup of the original state. If the fix introduces issues or the user wants to revert, there's no recovery path.

The code directly overwrites files without snapshots:
```typescript
await writeFile(source, JSON.stringify(workflow, null, 2));
```

## 💻 Code Reference
```typescript
// src/commands/workflows/autofix.ts:130-133
} else if (isFile && opts.apply) {
  await writeFile(source, JSON.stringify(workflow, null, 2));  // Overwrites original!
  console.log(chalk.green(`  ${icons.success} Updated ${source}`));
}
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Destructive file overwrites without backup. Data loss is permanent.
* **Best Practice:** Create timestamped backup before mutation: `${filename}.backup-${Date.now()}.json`. Or use atomic writes (write to temp, rename).
* **Reference:** Unix tradition of `.bak` files; Version control systems

## 🛠️ Fix Plan
1. Before any file write, create backup:
```typescript
const backupPath = `${source}.backup-${Date.now()}.json`;
await copyFile(source, backupPath);
console.log(chalk.dim(`  Backup saved to ${backupPath}`));
```
2. Add `--no-backup` flag for automation that manages its own versioning
3. For API updates, fetch and log original workflow before mutation
4. Consider `--backup-dir` for organized backup storage

## 💼 Business Impact
Data loss is irreversible. Production workflows may contain months of refinement. Without backup, user must manually reconstruct or restore from external version control. Support cost and downtime.

## 🔗 Evidences
- NSA/CISA Kubernetes guides mandate backup before changes
- Git: Every operation is reversible by design
- Enterprise tools (Terraform, Ansible) maintain state history
