# Bug Verification Report

**Date**: 2025-12-01  
**Version Tested**: 1.7.0  
**Verification Method**: Code review + CLI testing

---

## Executive Summary

| Category | Count |
|----------|-------|
| Bugs Fixed | 3 |
| Bugs Still Exist | 2 |
| API Limitations (Not Bugs) | 2 |
| Help Text Improvements Done | 3 |

---

## ✅ FIXED BUGS

### Bug #1: JQ Recipe Quoting Error - FIXED ✅

**File**: `src/core/formatters/jq-recipes.ts`

**Evidence**:
```typescript
// Lines 269-271: Pipe commands
const pipeCmd = jsonFilter.startsWith('-') 
  ? `n8n ${cliCommand} --json | jq ${jsonFilter}`
  : `n8n ${cliCommand} --json | jq '${jsonFilter}'`;

// Lines 285-287: File commands
const fileCmd = recipe.filter.startsWith('-') 
  ? `jq ${recipe.filter} ${filename}`
  : `jq '${recipe.filter}' ${filename}`;

// Lines 332-334: Legacy function
const cmd = recipe.filter.startsWith('-r') 
  ? `jq ${recipe.filter} ${filename}`
  : `jq '${recipe.filter}' ${filename}`;
```

**CLI Output Confirms**:
```bash
$ n8n nodes search "slack" --limit 3
💡 Export & filter with jq:
   n8n nodes search "slack" --json | jq -r '.data[].nodeType'  # ✅ Correct!
   n8n nodes search "slack" --json | jq '.data[] | {...}'     # ✅ Correct!
```

---

### Bug #6: workflows create Doesn't Strip Read-Only Props - FIXED ✅

**File**: `src/commands/workflows/create.ts`

**Evidence**:
```typescript
// Line 15: Import
import { stripReadOnlyProperties } from '../../core/sanitizer.js';

// Line 64: Usage
const cleanedWorkflow = stripReadOnlyProperties(workflow);
```

**Sanitizer Implementation** (`src/core/sanitizer.ts`):
```typescript
const READ_ONLY_KEYS = [
  'id', 'versionId', 'meta', 'createdAt', 'updatedAt',
  'staticData', 'pinData', 'tags', 'shared', 'homeProject',
  'sharedWithProjects', 'triggerCount', 'lastNodeExecuted',
  'templateData', 'activeExecutions',
];

export function stripReadOnlyProperties<T>(workflow: T): T {
  const cleaned = { ...workflow };
  for (const key of READ_ONLY_KEYS) {
    delete cleaned[key];
  }
  return cleaned;
}
```

**Help Text Confirms**:
```
$ n8n workflows create --help
⚠️  Using exported workflow files?
   Exported files contain read-only properties that must be stripped.
   This command auto-strips them...
```

---

### Bug #7: --dry-run Creates Real Workflows - FIXED ✅

**File**: `src/commands/workflows/create.ts`

**Evidence**:
```typescript
// Lines 67-127: Dry-run returns early
if (opts.dryRun) {
  if (opts.json) {
    outputJson({ dryRun: true, valid: validation.valid, ... });
    return;  // ← Returns without API call
  }
  // ... preview output ...
  return;  // ← Returns without API call
}

// Line 130: API call only reached if NOT dry-run
const created = await client.createWorkflow(cleanedWorkflow);
```

---

## ⚠️ BUGS STILL EXIST

### Bug #2: ANSI Escape Codes in Non-TTY Output - EXISTS

**Severity**: Medium (affects piping/scripting)

**Evidence**:
```bash
$ n8n nodes search "slack" | cat
[90m┌────[39m[90m┬───────────────────────────────────[39m
[90m│[39m  1 [90m│[39m nodes-base.slack                  ...
```

**Root Cause**: Chalk color library doesn't detect non-TTY in all cases.

**Suggested Fix**:
```typescript
// In main entry or formatting code
if (!process.stdout.isTTY || process.env.NO_COLOR) {
  chalk.level = 0;
}
```

**Also Missing**: `--no-color` global flag

---

### Bug #4: Empty/Whitespace Search Allowed - EXISTS

**Severity**: Low (UX issue)

**File**: `src/commands/nodes/search.ts`

**Evidence**:
```bash
$ n8n nodes search ""
╭─ 🔍 Nodes matching ""
│  Results: 0 found
╰─
  No nodes found matching your query.

$ n8n nodes search "   "
╭─ 🔍 Nodes matching "   "
│  Results: 0 found
╰─
```

**Expected**: Validation error before search

**Suggested Fix** (add to line ~28 of search.ts):
```typescript
if (!query.trim()) {
  console.error(chalk.red(`\n${icons.error} Search query cannot be empty`));
  console.log(chalk.dim('\nTry: n8n nodes search "gmail" or n8n nodes search "webhook"'));
  process.exitCode = 1;
  return;
}
```

---

## ⚠️ API LIMITATIONS (Not CLI Bugs)

### Bug #3: Credentials List Returns 405

**Status**: API limitation, not a CLI bug

**Evidence**:
```bash
$ n8n credentials list
❌ GET method not allowed
   [API_ERROR] (HTTP 405)
```

**Analysis**: The n8n API endpoint for listing credentials may not be available on all n8n versions or configurations. The CLI correctly handles and displays the error.

**Improvement Suggestion**: Better error message explaining this may be an API version issue.

---

### Bug #5: Variables Requires License

**Status**: Expected behavior (license feature)

**Evidence**:
```bash
$ n8n variables list
❌ Your license does not allow for feat:variables. 
   To enable feat:variables, please upgrade to a license that supports this feature.
   [API_ERROR] (HTTP 403)
```

**Analysis**: This is working as designed - variables are a paid feature.

---

## ✅ HELP TEXT IMPROVEMENTS DONE

### 1. workflows create - Exported File Warning

```
$ n8n workflows create --help
⚠️  Using exported workflow files?
   Exported files contain read-only properties that must be stripped.
   This command auto-strips them, but you can also clean manually:
   ...
```

### 2. workflows validate - Profile Descriptions

```
$ n8n workflows validate --help
Validation Profiles:
  minimal      Basic structure checks (fast)
  runtime      Default: structure + node type validation
  ai-friendly  Optimized output for LLM processing
  strict       All checks + best practices warnings
```

### 3. --dry-run Documentation

```
$ n8n workflows create --help
  --dry-run          Preview without creating
...
💡 Tip: Use --dry-run to preview before creating:
   n8n workflows create --file workflow.json --dry-run
```

---

## 📋 VALIDATION PROFILES ANALYSIS

### Bug #5 (from original notes): Validation Profiles Too Similar

**Status**: Partially exists - profiles are documented but not fully differentiated in code

**Code Review** (`src/core/validator.ts`):
```typescript
export interface ValidateOptions {
  rawSource?: string;  // Only option - NO profile parameter!
}

export function validateWorkflowStructure(data: unknown, options?: ValidateOptions): ValidationResult {
  // ... validation logic - no profile-specific behavior
}
```

**Finding**: The `--profile` option exists in CLI but `validateWorkflowStructure()` doesn't actually use it. All profiles run the same validation logic.

**Workaround**: The `ai-friendly` profile appears to affect output formatting, not validation depth.

---

## 🧪 COMMANDS TESTED & WORKING

| Command | Status | Notes |
|---------|--------|-------|
| `n8n --version` | ✅ | Shows 1.7.0 |
| `n8n auth status` | ✅ | Shows connection, latency |
| `n8n nodes search` | ✅ | Full-text search works |
| `n8n nodes get` | ✅ | Shows node schema |
| `n8n workflows list` | ✅ | Pagination works |
| `n8n workflows list --json` | ✅ | Valid JSON, pipes to jq |
| `n8n workflows validate` | ✅ | File and ID validation |
| `n8n workflows create --help` | ✅ | Good help text |
| `n8n executions list` | ✅ | Works with filters |
| `n8n credentials schema` | ✅ | Shows credential fields |
| `n8n credentials list` | ❌ | 405 - API limitation |
| `n8n variables list` | ❌ | 403 - License required |
| `n8n tags list` | ✅ | Works (0 tags found) |
| `n8n templates search` | ✅ | n8n.io integration |
| `n8n audit` | ✅ | Security audit works |

---

## 📊 PRIORITY RECOMMENDATIONS

### P0 - Should Fix Before 1.0

1. **Empty search validation** - Quick fix, improves UX
2. **ANSI codes in non-TTY** - Important for scripting/CI

### P1 - Nice to Have

1. **--no-color global flag** - Common CLI convention
2. **Better credentials list error** - Explain API limitation
3. **Validation profile differentiation** - Make profiles meaningful

### P2 - Future Enhancements

1. Shell completions (bash/zsh/fish)
2. Watch mode for executions
3. Workflow export/import commands

---

## Verification Completed

✅ All originally documented bugs have been verified  
✅ 3 bugs confirmed FIXED in code  
✅ 2 bugs confirmed STILL EXIST  
✅ 2 items are API limitations, not CLI bugs  
✅ Help text improvements have been implemented
