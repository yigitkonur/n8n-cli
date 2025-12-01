# Bugs Found in n8n CLI

## Bug #1: JQ Recipe Quoting Error (Critical for UX)

**File**: `src/core/formatters/jq-recipes.ts`  
**Line**: ~268

### Problem
When filters start with `-r`, they get double-wrapped in quotes causing invalid jq commands:

```bash
# Current (broken):
n8n nodes search "email" --json | jq '-r '.data[].nodeType''

# Should be:
n8n nodes search "email" --json | jq -r '.data[].nodeType'
```

### Root Cause
Line 268 wraps ALL filters in quotes:
```typescript
lines.push(chalk.green(`   n8n ${cliCommand} --json | jq '${jsonFilter}'`));
```

But filters like `-r '.[].nodeType'` already contain their own quotes.

### Fix
```typescript
// In formatExportFooter function, line ~268
const cmd = jsonFilter.startsWith('-r') 
  ? `n8n ${cliCommand} --json | jq ${jsonFilter}`
  : `n8n ${cliCommand} --json | jq '${jsonFilter}'`;
lines.push(chalk.green(`   ${cmd}`));
```

Also update line ~280 for file-based jq commands (same issue).

---

## Bug #2: ANSI Escape Codes in Non-TTY Output

**File**: Multiple (table formatters)

### Problem
Tables output raw ANSI codes when stdout is not a TTY:
```
[90m┌────[39m[90m┬───────────────────────────────────[39m
```

### Root Cause
`chalk` auto-detection may not work correctly in all terminal contexts.

### Fix
Add explicit `--no-color` flag or detect `!process.stdout.isTTY`:
```typescript
import chalk from 'chalk';

if (!process.stdout.isTTY || process.env.NO_COLOR) {
  chalk.level = 0;
}
```

---

## Bug #3: Credentials List Returns 405

**File**: `src/commands/credentials/list.ts` (assumed)

### Problem
```bash
$ n8n credentials list
❌ GET method not allowed [API_ERROR] (HTTP 405)
```

### Analysis
The n8n API may require a different endpoint or method. The error message doesn't explain this is an API limitation.

### Suggested Fix
1. Check n8n API docs for correct endpoint
2. Improve error message: "Credentials listing requires n8n Enterprise or isn't supported by this API version"

---

## Bug #4: Empty/Whitespace Search Allowed

**File**: `src/commands/nodes/search.ts` (assumed)

### Problem
```bash
$ n8n nodes search ""
# Returns 0 results instead of validation error
$ n8n nodes search "   "
# Same behavior
```

### Fix
Add input validation:
```typescript
if (!query.trim()) {
  console.error("❌ Search query cannot be empty");
  process.exit(1);
}
```

---

## Bug #5: Validation Profiles Too Similar

**File**: `src/core/validator.ts` (assumed)

### Problem
`--profile minimal`, `--profile runtime`, and `--profile strict` all return identical errors for `nodes validate`.

Expected: Minimal should check fewer things than strict.

### Example
```bash
$ n8n nodes validate nodes-base.slack --profile minimal
# 45 errors

$ n8n nodes validate nodes-base.slack --profile strict  
# 45 errors + 1 warning
```

### Fix
Implement differentiated validation logic per profile.

---

## Bug #6: `--mode ai-friendly` Missing for validate

**File**: `src/commands/workflows/validate.ts`

### Problem
Help shows `--profile ai-friendly` as an option:
```
--profile <profile>  Validation profile: minimal, runtime, ai-friendly, strict
```

But the profile may not have differentiated behavior.

---

## Bug #6: `workflows create` Doesn't Strip Read-Only Properties (Critical)

**File**: `src/commands/workflows/create.ts`

### Problem
When creating from exported workflow JSON, the API rejects extra properties:
```bash
$ n8n workflows create --file exported-workflow.json
❌ Invalid request: request/body must NOT have additional properties
❌ Invalid request: request/body/tags is read-only
```

### Root Cause
Exported workflows contain: `id`, `versionId`, `meta`, `createdAt`, `updatedAt`, `staticData`, `pinData`, `tags`, `shared`, `homeProject`, `sharedWithProjects`

The CLI should strip these before sending to API.

### Fix
```typescript
// In create.ts before API call
const cleanWorkflow = {
  name: workflow.name,
  nodes: workflow.nodes,
  connections: workflow.connections,
  settings: workflow.settings,
  active: workflow.active ?? false,
};
await api.createWorkflow(cleanWorkflow);
```

---

## Bug #7: `--dry-run` Flag Creates Real Workflows

**File**: `src/commands/workflows/create.ts`

### Problem
The `--dry-run` flag is documented but doesn't prevent creation:
```bash
$ n8n workflows create --file workflow.json --dry-run
# Expected: Preview only, no creation
# Actual: Creates the workflow anyway!
```

### Evidence
Two workflows were created during testing:
- `r2Yt6ZMbl2gl2tPN`
- `W7xfUKAOhkkyzqkT`

### Fix
The `--dry-run` logic needs to actually check the flag before calling the API:
```typescript
if (options.dryRun) {
  console.log('Dry run - workflow would be created:');
  console.log(JSON.stringify(workflow, null, 2));
  return;
}
// Only call API if not dry-run
await api.createWorkflow(workflow);
```

---

## Minor Issues

### Table Column Truncation
Long node names get truncated with `…` but the terminal width isn't detected correctly in some cases.

### Missing `--no-color` Flag
No global flag to disable colors, important for scripting.

### Version Display
`n8n -V` shows `1.6.1` but doesn't include git commit hash for dev builds.

---

## Verified Working

✅ All `--json` outputs are valid JSON  
✅ All `--save` outputs write correctly  
✅ Pagination with `--cursor` works  
✅ Error messages include helpful next steps  
✅ Auth status correctly shows masked API key  
✅ Health check includes latency measurement  
✅ Audit report includes remediation links  

---

## Help Text Enhancement Suggestions

These are "assumption vs reality" discoveries that should be added to help text.

### 1. Legacy `validate` vs `workflows validate`
**User assumes**: `n8n validate --profile strict file.json` works  
**Reality**: Legacy validate has no `--profile`, only `workflows validate` does  
**Add to help**: "For profiles, use `n8n workflows validate --profile`"

### 2. `workflows create` with Exported Files  
**User assumes**: Exported workflow JSON works directly  
**Reality**: Need to strip `id`, `tags`, `pinData`, `meta`, `shared`, etc.  
**Add to help**: Document required jq cleanup or auto-strip in CLI

### 3. `--force` Required for Scripting
**User assumes**: `--json` works in pipelines  
**Reality**: Non-interactive mode requires `--force` for destructive ops  
**Add to help**: "For CI/scripting, combine `--json` with `--force`"

### 4. Node Type Full Path Required
**User assumes**: `n8n nodes get slack` works  
**Reality**: Need full path: `n8n nodes get nodes-base.slack`  
**Current help**: Already good! ✅ Shows tip to search first

### 5. Variables Require License
**User assumes**: All commands work on any n8n  
**Reality**: Variables require Enterprise license  
**Add to help**: "Requires n8n Enterprise/Pro license"

### 6. credentials list API Limitation
**User assumes**: `credentials list` works like other list commands  
**Reality**: Returns 405 on some n8n versions  
**Add to help**: "May not be available on all n8n versions"

---

## Task List Summary

### P0 - Critical Bugs (Fix Before Release)
- [ ] **Bug #1**: JQ recipe quoting - invalid commands in help output
- [ ] **Bug #6**: `workflows create` should strip read-only properties
- [ ] **Bug #7**: `--dry-run` actually creates workflows

### P1 - Important Fixes
- [ ] **Bug #2**: ANSI codes in non-TTY output
- [ ] **Bug #3**: Improve credentials list 405 error message

### P2 - Minor Issues
- [ ] **Bug #4**: Validate empty search query
- [ ] **Bug #5**: Differentiate validation profiles more

### P3 - Help Text Enhancements
- [ ] Add `--profile` note to legacy `validate` help
- [ ] Document workflow JSON cleanup for `create`
- [ ] Add `--force` note for scripting
- [ ] Add license note to `variables` commands
- [ ] Improve `credentials list` error message  
