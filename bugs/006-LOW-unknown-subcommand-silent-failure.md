# BUG-006: Unknown Subcommands Silently Show Parent Help

**Severity:** LOW  
**Category:** UX / Error Handling  
**Discovered:** 2025-11-30  
**Status:** Open

## Summary

When a user types a non-existent subcommand (e.g., `n8n workflows delete`), the CLI silently shows the parent help without any error message indicating the command doesn't exist. This can confuse users who may think the command worked or not understand what went wrong.

## Affected Commands

Any non-existent subcommand under command groups:

```bash
n8n workflows delete --help    # Shows workflows help, no error
n8n workflows activate --help  # Shows workflows help, no error
n8n workflows deactivate --help
n8n workflows execute --help
n8n workflows export --help
n8n workflows import --help
n8n nodes foobar --help        # Shows nodes help, no error
```

## Steps to Reproduce

```bash
npx n8n workflows delete --help
# Output: Shows "n8n workflows" help
# Exit code: 0
# No indication that "delete" is not a valid command
```

## Expected Behavior

The CLI should show an error message like:
```
error: unknown command 'delete'. See 'n8n workflows --help'.
```

And exit with code 1.

## Current Behavior

- Shows parent command's help text
- Exits with code 0
- User has no indication the command doesn't exist

## Impact

- Users may think commands exist that don't
- No feedback when typos are made
- Confusion about available functionality

## Suggested Fix

Configure Commander.js to handle unknown commands:

```typescript
// In src/cli.ts or command group files
workflowsCommand
  .showHelpAfterError()
  .exitOverride()
  .on('command:*', (operands) => {
    console.error(`error: unknown command '${operands[0]}'`);
    console.error(`See 'n8n workflows --help' for available commands.`);
    process.exitCode = 1;
  });
```

Or use Commander's built-in strict mode:

```typescript
program.showSuggestionAfterError(true);
```

## Related Files

- `src/cli.ts`

## Notes

The commands that users might expect (based on typical workflow tools):
- `delete` - Delete a workflow
- `activate` - Activate a workflow (currently via `update --activate`)
- `deactivate` - Deactivate a workflow (currently via `update --deactivate`)
- `execute` - Execute a workflow
- `export` - Export workflow to file (currently via `get --save`)
- `import` - Import workflow from file (currently via `create --file`)

Consider adding aliases or explicit error messages pointing to the correct commands.
