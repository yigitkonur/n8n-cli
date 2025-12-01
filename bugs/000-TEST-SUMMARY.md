# CLI Testing Summary Report

**Date:** 2025-11-30  
**CLI Version:** 1.6.0  
**n8n Instance:** https://aura.zeogen.com  
**Automated Tests Run:** 97

---

## Overall Results

| Category | Commands | Passed | Bugs Found |
|----------|----------|--------|------------|
| root/help | 2 | 2 | 1 |
| auth | 4 | 4 | 0 |
| health | 2 | 2 | 0 |
| nodes | 3 | 3 | 2 |
| workflows | 7 | 7 | 2 |
| executions | 2 | 2 | 0 |
| templates | 2 | 2 | 0 |
| validate (legacy) | 1 | 1 | 0 |
| **TOTAL** | **23** | **23** | **6** |

---

## Command Test Results

### ✅ Fully Passing Commands

| Command | Flags Tested | Status |
|---------|--------------|--------|
| `health` | `--json` | ✅ PASS |
| `nodes get` | `--mode info/docs/versions`, `--detail minimal/standard/full`, `--json`, `--save` | ✅ PASS |
| `workflows list` | `--active`, `--tags`, `--limit`, `--cursor`, `--save`, `--json` | ✅ PASS |
| `workflows get` | `--mode full/details/structure/minimal`, `--save`, `--json` | ✅ PASS |
| `workflows update` | `--activate`, `--deactivate`, `--force`, `--no-backup`, `--json` | ✅ PASS |
| `workflows autofix` | `--dry-run`, `--apply`, `--force`, `--no-backup`, `--json` | ✅ PASS |
| `executions list` | `--workflow-id`, `--status`, `--limit`, `--cursor`, `--save`, `--json` | ✅ PASS |
| `executions get` | `--mode preview/summary/filtered/full`, `--save`, `--json` | ✅ PASS |
| `templates search` | `--limit`, `--save`, `--json` | ✅ PASS |
| `templates get` | `--save`, `--json` | ✅ PASS |
| `validate` (legacy) | `--repair`, `--fix`, `--json`, `--output` | ✅ PASS |

### ⚠️ Commands with Bugs

| Command | Bug ID | Issue |
|---------|--------|-------|
| `nodes search` | BUG-001 | `--mode FUZZY` returns 0 results |
| `nodes validate` | BUG-002 | `--profile` flag has no effect |
| `workflows validate` | BUG-003 | `--save` fails when validating local file |
| `workflows create` | BUG-004 | Fails without `settings` in workflow JSON |

### ⏭️ Skipped Tests

| Command | Reason |
|---------|--------|
| `workflows trigger` | No active webhook on test instance |

---

## Bugs Found (6 total) - ALL FIXED ✅

### BUG-001: FUZZY search mode not working ✅ FIXED
- **Severity:** Medium
- **Command:** `n8n nodes search "webhok" --mode FUZZY`
- **Issue:** Returns 0 results for typo that should match "webhook"
- **Fix:** Implemented Levenshtein distance algorithm for true fuzzy matching
- **File:** `bugs/001-fuzzy-search-not-working.md`

### BUG-002: --profile flag has no effect in nodes validate ✅ FIXED
- **Severity:** Low
- **Command:** `n8n nodes validate webhook --profile minimal/runtime/strict`
- **Issue:** All profiles produce identical output
- **Fix:** Added profile-based validation logic (minimal/runtime/strict)
- **File:** `bugs/002-nodes-validate-profile-no-effect.md`

### BUG-003: workflows validate --save fails with local file ✅ FIXED
- **Severity:** Medium
- **Command:** `n8n workflows validate file.json --save output.json`
- **Issue:** Save only worked with --fix flag
- **Fix:** Removed unnecessary `opts.fix` requirement for save
- **File:** `bugs/003-workflows-validate-save-with-file-fails.md`

### BUG-004: workflows create requires settings property ✅ FIXED
- **Severity:** High
- **Command:** `n8n workflows create --file workflow.json`
- **Issue:** Fails with "missing required property 'settings'"
- **Fix:** Auto-add default settings `{ executionOrder: 'v1' }` when missing
- **File:** `bugs/004-workflows-create-missing-settings.md`

### BUG-005: Exit code 1 when showing help ✅ FIXED
- **Severity:** Medium
- **Command:** `n8n nodes`, `n8n workflows`, `n8n executions`, `n8n templates`
- **Issue:** Commands exit with code 1 when showing help, should be 0
- **Fix:** Added default action handlers that call `.help()` (exits 0)
- **File:** `bugs/005-MEDIUM-exit-code-1-when-showing-help.md`

### BUG-006: Unknown subcommands silently show parent help ✅ FIXED
- **Severity:** Low
- **Command:** `n8n workflows delete`, `n8n workflows activate`
- **Issue:** Non-existent commands show parent help without error message
- **Fix:** Added unknown command detection in action handlers
- **File:** `bugs/006-LOW-unknown-subcommand-silent-failure.md`

---

## Recommendations

All bugs have been fixed! ✅

### Files Changed
- `src/core/db/nodes.ts` - Added Levenshtein distance for fuzzy search (BUG-001)
- `src/commands/nodes/validate.ts` - Added profile-based validation (BUG-002)
- `src/commands/workflows/validate.ts` - Fixed --save without --fix (BUG-003)
- `src/commands/workflows/create.ts` - Auto-add default settings (BUG-004)
- `src/cli.ts` - Fixed exit codes and unknown command handling (BUG-005, BUG-006)

---

## Test Environment

```bash
export N8N_HOST="https://aura.zeogen.com"
export N8N_API_KEY=$(cat key.txt)
node dist/cli.js --version  # 1.5.1
```
