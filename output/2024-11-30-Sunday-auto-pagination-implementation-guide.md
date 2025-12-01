# Auto-Pagination Implementation Guide for n8n CLI

**Date:** 2024-11-30  
**Scope:** Fix CLI pagination UX - automatically fetch all pages instead of requiring manual `--cursor` usage  
**Context:** Based on analysis of `src/commands/workflows/list.ts`, `src/commands/executions/list.ts`, `src/core/api/client.ts`, and related formatters

---

## 1. Executive Summary

### The Bug
The CLI currently shows only 10 workflows and prompts users to manually use `--cursor` to see more:

```
📊 Summary: 10 found
More workflows available. Use --cursor eyJsaW1pdCI6MTAsIm9mZnNldCI6MTB9 to see more.
```

This is poor UX. Users expect `workflows list` to show **all** workflows, not require manual pagination.

### The Fix
Implement automatic pagination that:
1. **Fetches all pages by default** until `hasMore === false`
2. **Aggregates results** into a single output
3. **Shows progress** during multi-page fetches
4. **Provides better jq/JSON hints** in footer

### Affected Commands
| Command | Has Pagination? | Fix Needed |
|---------|-----------------|------------|
| `workflows list` | ✅ Yes (cursor-based) | **Yes** |
| `executions list` | ✅ Yes (cursor-based) | **Yes** |
| `templates search` | ⚠️ External API (rows-based) | Optional |
| `nodes search` | ❌ No (local DB) | No |

---

## 2. Root Cause Analysis

### Current Implementation Flow

**`src/commands/workflows/list.ts` (lines 27-58):**

```typescript
export async function workflowsListCommand(opts: ListOptions): Promise<void> {
  const limit = parseInt(opts.limit || '10', 10);  // ← Defaults to 10
  // ...
  const params: any = {
    limit,
    cursor: opts.cursor,  // ← User must pass cursor manually
  };
  
  const response = await client.listWorkflows(params);  // ← Single API call
  const workflows = response.data;  // ← Only first page
  // ...
  if (response.nextCursor) {
    console.log(chalk.dim(`\n  More workflows available. Use --cursor ${response.nextCursor} to see more.`));
  }
}
```

**Problem Points:**
1. **Line 28**: Default limit of 10 is too low
2. **Line 36-37**: Cursor must be explicitly passed by user
3. **Line 46**: Single API call - no loop
4. **Line 132-134**: Manual cursor hint instead of auto-fetching

### API Response Structure

**`src/core/api/client.ts` (lines 143-150):**

```typescript
async listWorkflows(params: WorkflowListParams = {}): Promise<WorkflowListResponse> {
  try {
    const response = await this.client.get('/workflows', { params });
    return this.normalizeListResponse<Workflow>(response.data);
  } catch (error) {
    throw handleN8nApiError(error);
  }
}
```

**`src/types/n8n-api.ts` (lines 171-174):**

```typescript
export interface WorkflowListResponse {
  data: Workflow[];
  nextCursor?: string | null;  // ← Present when more pages exist
}
```

The API provides everything needed for auto-pagination - we just aren't using it.

---

## 3. Proposed Architecture

### Design Decisions

Based on research of AWS CLI, GitHub CLI, and UX best practices:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Default behavior** | Fetch all pages | User expects `list` to list everything (AWS-style) |
| **Safety limit** | Max 100 pages default | Prevents infinite loops / API abuse |
| **Progress indicator** | Spinner with item count | Shows activity, doesn't clutter |
| **Rate limiting** | 100ms delay between pages | Prevents API throttling |
| **Override flags** | `--limit`, `--no-paginate` | Power users can cap results or get single page |

### New Flag Structure

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--limit <n>` | number | undefined (all) | Maximum items to fetch |
| `--no-paginate` | boolean | false | Fetch only first page (legacy behavior) |
| `--cursor <str>` | string | - | **REMOVE** from user interface |

---

## 4. Implementation Plan

### 4.1 Create Pagination Utility

**New file: `src/core/api/pagination.ts`**

```typescript
/**
 * Auto-pagination utility for n8n API
 * Fetches all pages until hasMore === false
 */

import ora from 'ora';

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string | null;
}

export interface PaginationOptions {
  /** Maximum items to fetch (undefined = all) */
  limit?: number;
  /** Skip auto-pagination, fetch single page */
  noPaginate?: boolean;
  /** Maximum pages to fetch (safety limit) */
  maxPages?: number;
  /** Delay between page fetches (ms) */
  delayMs?: number;
  /** Show progress spinner */
  showProgress?: boolean;
}

export interface PaginationResult<T> {
  data: T[];
  totalPages: number;
  totalItems: number;
  durationMs: number;
  truncated: boolean;  // true if hit limit before exhausting pages
}

type FetchFn<T> = (params: { limit?: number; cursor?: string }) => Promise<PaginatedResponse<T>>;

export async function autoPaginate<T>(
  fetchFn: FetchFn<T>,
  options: PaginationOptions = {}
): Promise<PaginationResult<T>> {
  const {
    limit,
    noPaginate = false,
    maxPages = 100,
    delayMs = 100,
    showProgress = true,
  } = options;

  const startTime = Date.now();
  const allData: T[] = [];
  let cursor: string | undefined;
  let page = 0;
  let truncated = false;

  // Single page mode
  if (noPaginate) {
    const response = await fetchFn({ limit: limit || 10 });
    return {
      data: response.data,
      totalPages: 1,
      totalItems: response.data.length,
      durationMs: Date.now() - startTime,
      truncated: !!response.nextCursor,
    };
  }

  // Auto-paginate mode
  const spinner = showProgress ? ora('Fetching...').start() : null;

  try {
    while (page < maxPages) {
      page++;
      
      // Update spinner
      if (spinner) {
        spinner.text = `Fetching page ${page}... (${allData.length} items so far)`;
      }

      // Fetch page
      const pageSize = limit ? Math.min(50, limit - allData.length) : 50;
      const response = await fetchFn({ limit: pageSize, cursor });
      
      allData.push(...response.data);

      // Check if we've hit the limit
      if (limit && allData.length >= limit) {
        allData.splice(limit);  // Trim to exact limit
        truncated = true;
        break;
      }

      // Check if more pages exist
      if (!response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;

      // Rate limiting delay
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Check if we hit max pages
    if (page >= maxPages && cursor) {
      truncated = true;
    }

    if (spinner) {
      spinner.succeed(`Fetched ${allData.length} items from ${page} page${page > 1 ? 's' : ''}`);
    }

  } catch (error) {
    if (spinner) {
      spinner.fail('Fetch failed');
    }
    throw error;
  }

  return {
    data: allData,
    totalPages: page,
    totalItems: allData.length,
    durationMs: Date.now() - startTime,
    truncated,
  };
}

/**
 * Simple delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 4.2 Update CLI Flags

**`src/cli.ts` - workflows list command (lines 138-150):**

```diff
workflowsCmd
  .command('list')
  .description('List all workflows')
  .option('-a, --active', 'Filter active workflows only')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
- .option('-l, --limit <n>', 'Limit results', '10')
- .option('--cursor <cursor>', 'Pagination cursor')
+ .option('-l, --limit <n>', 'Maximum workflows to fetch')
+ .option('--no-paginate', 'Fetch only first page (no auto-pagination)')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { workflowsListCommand } = await import('./commands/workflows/list.js');
    await workflowsListCommand(opts);
  });
```

**`src/cli.ts` - executions list command (lines 237-249):**

```diff
executionsCmd
  .command('list')
  .description('List executions')
  .option('-w, --workflow-id <id>', 'Filter by workflow ID')
  .option('--status <status>', 'Filter by status: success, error, waiting')
- .option('-l, --limit <n>', 'Limit results', '10')
- .option('--cursor <cursor>', 'Pagination cursor')
+ .option('-l, --limit <n>', 'Maximum executions to fetch')
+ .option('--no-paginate', 'Fetch only first page (no auto-pagination)')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { executionsListCommand } = await import('./commands/executions/list.js');
    await executionsListCommand(opts);
  });
```

### 4.3 Update workflows/list.ts

**`src/commands/workflows/list.ts` - Full rewrite:**

```typescript
/**
 * Workflows List Command
 * List workflows from n8n instance with automatic pagination
 */

import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { autoPaginate, type PaginationOptions } from '../../core/api/pagination.js';
import { getConfig } from '../../core/config/loader.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable, columnFormatters } from '../../core/formatters/table.js';
import { formatSummary } from '../../core/formatters/summary.js';
import { formatNextActions } from '../../core/formatters/next-actions.js';
import { formatJqRecipes, getStandardRecipes } from '../../core/formatters/jq-recipes.js';
import { formatJsonHints } from '../../core/formatters/json-hints.js';  // NEW
import { saveToJson, outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { printError, N8nApiError } from '../../utils/errors.js';
import type { Workflow } from '../../types/n8n-api.js';

interface ListOptions {
  active?: boolean;
  tags?: string;
  limit?: string;
  noPaginate?: boolean;  // NEW: renamed from cursor
  save?: string;
  json?: boolean;
}

export async function workflowsListCommand(opts: ListOptions): Promise<void> {
  try {
    const client = getApiClient();
    const config = getConfig();
    
    // Build API params (without pagination - handled by autoPaginate)
    const apiParams: any = {};
    if (opts.active !== undefined) {
      apiParams.active = opts.active;
    }
    if (opts.tags) {
      apiParams.tags = opts.tags;
    }
    
    // Pagination options
    const paginationOpts: PaginationOptions = {
      limit: opts.limit ? parseInt(opts.limit, 10) : undefined,
      noPaginate: opts.noPaginate,
      showProgress: !opts.json,  // Hide spinner for JSON output
    };
    
    // Fetch all pages
    const result = await autoPaginate<Workflow>(
      (params) => client.listWorkflows({ ...apiParams, ...params }),
      paginationOpts
    );
    
    const workflows = result.data;
    
    // JSON output mode
    if (opts.json) {
      outputJson({
        data: workflows,
        total: result.totalItems,
        pages: result.totalPages,
        truncated: result.truncated,
      });
      return;
    }
    
    // Save to file if requested
    if (opts.save) {
      await saveToJson(workflows, { path: opts.save });
    }
    
    // Human-friendly output with host context
    console.log(formatHeader({
      title: 'Workflows',
      icon: icons.workflow,
      host: config.host ? new URL(config.host).host : undefined,
      context: {
        'Found': `${workflows.length} workflows`,
        ...(result.totalPages > 1 && { 'Pages': `${result.totalPages}` }),
        ...(opts.active !== undefined && { 'Filter': opts.active ? 'Active only' : 'Inactive only' }),
      },
    }));
    
    console.log('');
    
    if (workflows.length === 0) {
      console.log(chalk.yellow('  No workflows found.'));
      console.log(chalk.dim('\n  Tips:'));
      console.log(chalk.dim('  • Check your n8n instance has workflows'));
      console.log(chalk.dim('  • Verify N8N_HOST and N8N_API_KEY are correct'));
      process.exitCode = 0; return;
    }
    
    // Format as table
    const tableData = workflows.map((w: any) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      updatedAt: w.updatedAt,
      nodes: w.nodes?.length || 0,
    }));
    
    const tableOutput = formatTable(tableData as unknown as Record<string, unknown>[], {
      columns: [
        { key: 'id', header: 'ID', width: 10 },
        { 
          key: 'name', 
          header: 'Name', 
          width: 35,
          formatter: columnFormatters.truncate(34),
        },
        { 
          key: 'active', 
          header: 'Active', 
          width: 8,
          formatter: columnFormatters.boolean,
        },
        { 
          key: 'updatedAt', 
          header: 'Updated', 
          width: 15,
          formatter: columnFormatters.relativeTime,
        },
        { 
          key: 'nodes', 
          header: 'Nodes', 
          width: 7,
          align: 'right',
          formatter: columnFormatters.number,
        },
      ],
      limit: 30,  // Show more rows now that we fetch all
      showIndex: true,
    });
    
    console.log(tableOutput);
    
    // Truncation notice (replaces old cursor hint)
    if (result.truncated) {
      console.log(chalk.dim(`\n  Showing ${workflows.length} of more results. Use --limit to adjust.`));
    }
    
    // Summary with stats
    const activeCount = workflows.filter((w: any) => w.active).length;
    const inactiveCount = workflows.length - activeCount;
    
    console.log('\n' + formatSummary({ 
      total: workflows.length,
      active: activeCount,
      inactive: inactiveCount,
      durationMs: result.durationMs,
      pages: result.totalPages,
    }));
    
    // Next actions
    if (workflows.length > 0) {
      const firstWorkflow = workflows[0];
      console.log(formatNextActions([
        { command: `n8n workflows get ${firstWorkflow.id}`, description: 'View workflow details' },
        { command: `n8n workflows validate ${firstWorkflow.id}`, description: 'Validate workflow' },
        { command: `n8n executions list --workflow-id ${firstWorkflow.id}`, description: 'View executions' },
      ]));
    }
    
    // JSON/jq hints - NEW enhanced footer
    console.log(formatJsonHints('workflows list', 'workflows', opts.save));
    
    // jq recipes if saved
    if (opts.save) {
      console.log(formatJqRecipes(getStandardRecipes('workflows', opts.save), opts.save));
    }
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error, false, 'workflows list');
    } else {
      console.error(chalk.red(`\n${icons.error} Error: ${(error as Error).message}`));
    }
    process.exitCode = 1; return;
  }
}
```

### 4.4 Create JSON Hints Formatter

**New file: `src/core/formatters/json-hints.ts`**

```typescript
/**
 * JSON/jq hints for CLI footer
 * Shows practical examples for filtering and exporting data
 */

import chalk from 'chalk';

/**
 * Format JSON/jq usage hints for footer
 */
export function formatJsonHints(commandName: string, dataType: string, savedFile?: string): string {
  const lines: string[] = [];
  
  lines.push(chalk.cyan('\n📋 Export & filter:'));
  
  // Pipe examples (prioritized per UX research)
  lines.push(chalk.dim('   # Quick filter (pipe to jq):'));
  lines.push(chalk.green(`   n8n ${commandName} --json | jq '.data[] | {id, name}'`));
  lines.push(chalk.green(`   n8n ${commandName} --json | jq '.data[] | select(.active==true)'`));
  
  // Redirect/save examples
  lines.push(chalk.dim(''));
  lines.push(chalk.dim('   # Save for later analysis:'));
  lines.push(chalk.green(`   n8n ${commandName} --json > ${dataType}.json`));
  lines.push(chalk.green(`   n8n ${commandName} --save ${dataType}.json`));
  
  // jq with file examples
  if (savedFile) {
    lines.push(chalk.dim(''));
    lines.push(chalk.dim(`   # Filter saved file:`));
    lines.push(chalk.green(`   jq '.[] | select(.active==true) | .name' ${savedFile}`));
    lines.push(chalk.green(`   jq -r '.[] | "\\(.id)\\t\\(.name)"' ${savedFile} | less`));
  }
  
  return lines.join('\n');
}

/**
 * Format compact jq hint for smaller outputs
 */
export function formatJqHintCompact(commandName: string): string {
  return chalk.dim(`\n💡 Tip: n8n ${commandName} --json | jq '.data[]'`);
}
```

### 4.5 Update executions/list.ts

Apply the same pattern as workflows/list.ts:

```typescript
// Key changes in executionsListCommand():

import { autoPaginate, type PaginationOptions } from '../../core/api/pagination.js';
import { formatJsonHints } from '../../core/formatters/json-hints.js';

// Replace single fetch with auto-paginate:
const paginationOpts: PaginationOptions = {
  limit: opts.limit ? parseInt(opts.limit, 10) : undefined,
  noPaginate: opts.noPaginate,
  showProgress: !opts.json,
};

const result = await autoPaginate<Execution>(
  (params) => client.listExecutions({ ...apiParams, ...params }),
  paginationOpts
);

const executions = result.data;

// Remove cursor hint (line 126-128), replace with:
if (result.truncated) {
  console.log(chalk.dim(`\n  Showing ${executions.length} of more results. Use --limit to adjust.`));
}

// Add JSON hints to footer:
console.log(formatJsonHints('executions list', 'executions', opts.save));
```

---

## 5. Updated User Experience

### Before (Current)
```
n8n workflows list
╭─ 🔄 Workflows
│  Found: 10 workflows
╰─
[table with 10 rows]

More workflows available. Use --cursor eyJsaW1pdCI6MTAsIm9mZnNldCI6MTB9 to see more.

📊 Summary: 10 found
```

### After (Fixed)
```
n8n workflows list
⠋ Fetching page 1... (0 items so far)
⠙ Fetching page 2... (10 items so far)
✔ Fetched 25 items from 3 pages

╭─ 🔄 Workflows
│  Found: 25 workflows
│  Pages: 3
╰─
[table with 25 rows]

📊 Summary: 25 found | 12 active | 13 inactive | 1.2s (3 pages)

⚡ Next steps:
   n8n workflows get 6x5GoTs... # View workflow details
   n8n workflows validate 6x5GoTs... # Validate workflow
   n8n executions list --workflow-id 6x5GoTs... # View executions

📋 Export & filter:
   # Quick filter (pipe to jq):
   n8n workflows list --json | jq '.data[] | {id, name}'
   n8n workflows list --json | jq '.data[] | select(.active==true)'
   
   # Save for later analysis:
   n8n workflows list --json > workflows.json
   n8n workflows list --save workflows.json
```

### JSON Output (--json)
```json
{
  "data": [...all 25 workflows...],
  "total": 25,
  "pages": 3,
  "truncated": false
}
```

---

## 6. New CLI Flags Summary

| Command | Old Flags | New Flags |
|---------|-----------|-----------|
| `workflows list` | `--limit 10`, `--cursor <str>` | `--limit <n>`, `--no-paginate` |
| `executions list` | `--limit 10`, `--cursor <str>` | `--limit <n>`, `--no-paginate` |

### Flag Behavior

```bash
# Fetch ALL workflows (default - no limit)
n8n workflows list

# Fetch maximum 50 workflows
n8n workflows list --limit 50

# Fetch only first page (legacy behavior)
n8n workflows list --no-paginate

# Combine with filters
n8n workflows list --active --limit 100
```

---

## 7. Dependencies

### New Package: `ora`
Spinner for progress indication during multi-page fetches.

```bash
npm install ora
```

**Why ora?**
- Lightweight (7KB)
- Well-maintained (used by Angular CLI, Create React App, etc.)
- Simple API: `ora('text').start().succeed()`
- Terminal-aware (hides in non-TTY)

### Alternative: No Dependencies
If you prefer no new dependencies, use a simple console-based progress:

```typescript
// No-dependency progress
function logProgress(page: number, count: number): void {
  process.stdout.write(`\rFetching page ${page}... (${count} items)`);
}
function clearProgress(): void {
  process.stdout.write('\r' + ' '.repeat(50) + '\r');
}
```

---

## 8. Testing Recommendations

### Unit Tests

```typescript
// tests/pagination.test.ts
describe('autoPaginate', () => {
  it('fetches all pages when no limit specified', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ data: [1, 2], nextCursor: 'abc' })
      .mockResolvedValueOnce({ data: [3, 4], nextCursor: 'def' })
      .mockResolvedValueOnce({ data: [5], nextCursor: null });
    
    const result = await autoPaginate(mockFetch, { showProgress: false });
    
    expect(result.data).toEqual([1, 2, 3, 4, 5]);
    expect(result.totalPages).toBe(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
  
  it('respects limit and stops early', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ data: [1, 2, 3, 4, 5], nextCursor: 'abc' });
    
    const result = await autoPaginate(mockFetch, { limit: 3, showProgress: false });
    
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.truncated).toBe(true);
  });
  
  it('handles maxPages safety limit', async () => {
    const infiniteFetch = jest.fn()
      .mockResolvedValue({ data: [1], nextCursor: 'always-more' });
    
    const result = await autoPaginate(infiniteFetch, { maxPages: 5, showProgress: false });
    
    expect(result.totalPages).toBe(5);
    expect(result.truncated).toBe(true);
  });
});
```

### Integration Tests

```bash
# Test actual API pagination
n8n workflows list --json | jq '.pages'  # Should be > 1 if you have >10 workflows

# Test limit flag
n8n workflows list --limit 5 --json | jq '.total'  # Should be 5

# Test no-paginate flag
n8n workflows list --no-paginate --json | jq '.truncated'  # true if more exist
```

---

## 9. Migration Notes

### Breaking Changes
- `--cursor` flag is **removed** from user-facing interface
- Default behavior changes from "fetch 10" to "fetch all"

### Backwards Compatibility
Users who were using `--cursor` will see:
```
error: unknown option '--cursor'
```

**Mitigation:** Add deprecation warning for one release:
```typescript
if (opts.cursor) {
  console.warn(chalk.yellow('⚠️  --cursor is deprecated. CLI now auto-paginates. Use --no-paginate for single page.'));
}
```

---

## 10. Files to Create/Modify

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/core/api/pagination.ts` | **CREATE** | ~100 lines |
| `src/core/formatters/json-hints.ts` | **CREATE** | ~40 lines |
| `src/cli.ts` | MODIFY | ~10 lines (flags) |
| `src/commands/workflows/list.ts` | MODIFY | ~30 lines |
| `src/commands/executions/list.ts` | MODIFY | ~30 lines |
| `package.json` | MODIFY | 1 line (ora dep) |

### Implementation Order
1. Create `src/core/api/pagination.ts`
2. Create `src/core/formatters/json-hints.ts`
3. Update `src/cli.ts` flags
4. Update `src/commands/workflows/list.ts`
5. Update `src/commands/executions/list.ts`
6. Add `ora` dependency
7. Test all commands

---

## 11. Appendix: jq Recipes Reference

### Workflows
```bash
# List all workflow IDs and names
n8n workflows list --json | jq -r '.data[] | "\(.id)\t\(.name)"'

# Filter active workflows only
n8n workflows list --json | jq '.data[] | select(.active==true)'

# Count workflows by status
n8n workflows list --json | jq '.data | group_by(.active) | map({active: .[0].active, count: length})'

# Get workflows with >10 nodes
n8n workflows list --json | jq '.data[] | select(.nodes | length > 10) | {id, name, nodeCount: (.nodes | length)}'
```

### Executions
```bash
# List failed executions
n8n executions list --json | jq '.data[] | select(.status=="error")'

# Get execution duration stats
n8n executions list --json | jq '.data | map(select(.stoppedAt) | (.stoppedAt | fromdate) - (.startedAt | fromdate)) | {min: min, max: max, avg: (add/length)}'

# Group by workflow
n8n executions list --json | jq '.data | group_by(.workflowId) | map({workflow: .[0].workflowId, count: length})'
```

### Shell Patterns
```bash
# Save then analyze
n8n workflows list --save workflows.json
cat workflows.json | jq '.[] | select(.active)' | less

# Pipe directly (no file)
n8n workflows list --json | jq '.data[0:5]' | less

# Export to CSV
n8n workflows list --json | jq -r '.data[] | [.id, .name, .active] | @csv' > workflows.csv
```

---

---

## 12. Addendum: Enhanced jq Recipes (IMPLEMENTED)

The jq footer system has been completely rewritten to provide command-specific, data-structure-aware recipes.

### Key Changes

**File: `src/core/formatters/jq-recipes.ts`**

1. **New `CommandType` type** - All 8 command types explicitly defined:
   - `workflows-list`, `workflows-get`
   - `executions-list`, `executions-get`
   - `nodes-search`, `nodes-get`
   - `templates-search`, `templates-get`

2. **`getCommandRecipes(command)`** - Returns recipes based on actual data structure:
   ```typescript
   // Example: workflows-list returns { id, name, active, nodes[], ... }
   'workflows-list': [
     { filter: `.[] | {id, name, active}`, description: 'Extract key fields' },
     { filter: `.[] | select(.active == true)`, description: 'Only active workflows' },
     { filter: `sort_by(.updatedAt) | reverse | .[0:5]`, description: 'Most recently updated' },
   ]
   ```

3. **`formatExportFooter(command, cliCommand, savedFile?)`** - Comprehensive footer:
   ```
   💡 Export & filter with jq:

      # Pipe to jq (quick analysis):
      n8n workflows list --json | jq '.data[] | {id, name, active}'
         # Extract key fields
      n8n workflows list --json | jq '.data[] | select(.active == true)'
         # Only active workflows

      # Save then filter (for larger datasets):
      n8n workflows list --save workflows.json
      jq '.[] | {id, name, active}' workflows.json
      jq '.[] | select(.active == true)' workflows.json
      jq 'sort_by(.updatedAt) | reverse | .[0:5]' workflows.json

      # Export as TSV/CSV:
      jq -r '.[] | "\(.id)\t\(.name)\t\(.active)"' workflows.json
   ```

### Updated Commands

All 8 commands now show context-aware jq hints:

| Command | Recipe Examples |
|---------|-----------------|
| `workflows list` | Filter by `.active`, sort by `.updatedAt`, count `.nodes` |
| `workflows get` | Extract `.nodes[].type`, view `.settings`, find webhooks |
| `executions list` | Filter by `.status`, group by `.workflowId`, count errors |
| `executions get` | View `.data.resultData.error`, list executed nodes |
| `nodes search` | Filter by `.category`, sort by `.relevanceScore` |
| `nodes get` | List `.properties`, `.operations`, `.credentials` |
| `templates search` | Sort by `.totalViews`, filter by author |
| `templates get` | Extract `.workflow.nodes`, find node types |

### Data Structure Awareness

The system accounts for the difference between `--json` and `--save` output:

| Output Mode | Structure | jq Access |
|-------------|-----------|-----------|
| `--json` | `{ data: [...], total: N }` | `.data[]` |
| `--save` | `[...]` | `.[]` |

The footer automatically adjusts filters based on context.

**End of Document**
