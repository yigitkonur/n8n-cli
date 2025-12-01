# BUG-005: Exit Code 1 When Showing Help for Commands Without Subcommand

**Severity:** MEDIUM  
**Category:** UX / Exit Codes  
**Discovered:** 2025-11-30  
**Status:** Open

## Summary

When running certain command groups without a subcommand (e.g., `n8n nodes`, `n8n workflows`), the CLI shows help text but exits with code 1 instead of 0. This is inconsistent with `n8n auth` which correctly exits with 0.

## Affected Commands

| Command | Current Exit Code | Expected Exit Code |
|---------|-------------------|-------------------|
| `n8n` (no args) | 1 | 0 |
| `n8n nodes` | 1 | 0 |
| `n8n workflows` | 1 | 0 |
| `n8n executions` | 1 | 0 |
| `n8n templates` | 1 | 0 |

## Working Correctly

| Command | Exit Code |
|---------|-----------|
| `n8n auth` | 0 ✓ |
| `n8n --help` | 0 ✓ |
| `n8n nodes --help` | 0 ✓ |
| `n8n help` | 0 ✓ |

## Steps to Reproduce

```bash
npx n8n nodes
echo $?  # Returns 1, should be 0

npx n8n auth  
echo $?  # Returns 0 (correct!)
```

## Impact

- CI/CD pipelines may incorrectly report failures
- Scripts checking exit codes will fail unexpectedly
- Inconsistent behavior confuses users

## Expected Behavior

When showing help (either explicitly via `--help` or implicitly when no subcommand is provided), the exit code should be 0.

## Suggested Fix

In `src/cli.ts`, ensure command groups that display help when no subcommand is provided exit with code 0.

```typescript
// Option 1: Add default action that shows help and exits 0
nodesCommand
  .action(() => {
    nodesCommand.help();  // Commander.js help() exits with 0
  });

// Option 2: Don't set exitCode when showing help
```

## Related Files

- `src/cli.ts`
- `src/commands/nodes/index.ts`
- `src/commands/workflows/index.ts`
- `src/commands/executions/index.ts`
- `src/commands/templates/index.ts`

## Test Output

```
cli-test-results/n8n-nodes.txt
cli-test-results/n8n-workflows.txt
cli-test-results/n8n-executions.txt
cli-test-results/n8n-templates.txt
```
