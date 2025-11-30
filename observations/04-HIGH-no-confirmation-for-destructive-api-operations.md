# No Confirmation for Destructive API Operations

**Severity:** HIGH
**File Ref:** `src/commands/workflows/autofix.ts:136-139`
**Tags:** #UX #DataSafety #CLI-Design

## 🔍 The Observation
The `autofix --apply` command directly mutates workflows on the n8n server without any confirmation prompt. A user can accidentally corrupt production workflows with a single command.

Similarly, `update --file` overwrites workflows without preview or confirmation. There's no `--dry-run` flag actually implemented (though mentioned in help).

## 💻 Code Reference
```typescript
// src/commands/workflows/autofix.ts:136-139
// Apply to API if requested
if (opts.apply && !isFile) {
  const client = getApiClient();
  await client.updateWorkflow(idOrFile, workflow);  // No confirmation!
  console.log(chalk.green(`  ${icons.success} Updated workflow on n8n`));
}
```

## 🛡️ Best Practice vs. Anti-Pattern
* **Anti-Pattern:** Silently executing destructive operations. Users expect CLI tools to warn before mutating remote state.
* **Best Practice:** For destructive operations: (1) Show diff/preview, (2) Prompt for confirmation in TTY mode, (3) Provide `--yes`/`--force` for automation.
* **Reference:** [Kubernetes kubectl patterns](https://kubernetes.io/docs/reference/kubectl/) - Always uses explicit confirmation or `--force`

## 🛠️ Fix Plan
1. Detect TTY: `if (process.stdin.isTTY && !opts.force)`
2. Show diff before apply: `console.log('Changes:', diff(original, fixed))`
3. Prompt: `readline.question('Apply changes to n8n? [y/N]: ')`
4. Add `--force` / `--yes` flag for non-interactive mode

## 💼 Business Impact
Accidental production workflow corruption. No undo capability means manual restoration from backups. Support burden and user trust erosion. Regulatory issues if workflows process sensitive data.

## 🔗 Evidences
- Unix philosophy: Destructive operations should be explicit
- kubectl requires `--force` for dangerous operations
- 80% of production CLIs avoid silent mutations (spacelift.io)
