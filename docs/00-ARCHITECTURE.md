# n8n CLI Architecture

## Overview

Convert n8n MCP Server to CLI using Clipanion framework with "Human-First, Agent-Compatible" design.

## ⚠️ GOLDEN RULE: Code Extraction Architecture

**DO NOT** copy from `src/mcp/tools/*.ts` - those are thin MCP wrappers with formatting logic.

**DO** extract from these production-ready layers:

| Layer | Path in `n8n-mcp` | Action for CLI |
|-------|-------------------|----------------|
| **Wrappers** | `src/mcp/tools/*.ts` | ❌ **IGNORE**. MCP-specific formatting. |
| **Logic** | `src/services/*.ts` | ✅ **IMPORT/COPY**. The brain (validation, diffs, autofix). |
| **Data** | `src/database/*.ts` | ✅ **IMPORT/COPY**. The memory (FTS5, repositories). |
| **Parsers** | `src/parsers/*.ts` | ✅ **IMPORT/COPY**. Schema/property extraction. |
| **Types** | `src/types/*.ts` | ✅ **IMPORT/COPY**. All type definitions. |
| **Utils** | `src/utils/*.ts` | ✅ **IMPORT/COPY**. Helpers (errors, normalization). |
| **Network** | `src/services/n8n-api-client.ts` | ✅ **ADAPT**. Base HTTP client. |

## Directory Structure

```
cli/
├── src/
│   ├── cli.ts                          # Main CLI entry point
│   ├── index.ts                        # Library exports
│   ├── core/                           # ✅ YOUR EXISTING VALIDATION LIBRARY
│   │   ├── validator.ts                # Main validator (USE THIS)
│   │   ├── n8n-native-validator.ts     # Native n8n validation
│   │   ├── fixer.ts                    # Autofix logic
│   │   ├── sanitizer.ts                # Node sanitization
│   │   ├── json-parser.ts              # JSON parsing utilities
│   │   ├── n8n-loader.ts               # n8n workflow loader
│   │   ├── source-location.ts          # Source location tracking
│   │   └── types.ts                    # Core type definitions
│   ├── utils/
│   │   ├── input-reader.ts             # Input handling
│   │   └── output.ts                   # Output formatting
│   └── commands/                       # TO ADD: Clipanion commands
│       ├── base.ts                     # BaseCommand class
│       ├── nodes/                      # n8n nodes search/get/validate
│       ├── workflows/                  # n8n workflows list/get/create/update/...
│       ├── executions/                 # n8n executions list/get/delete
│       └── health/                     # n8n health check
├── data/
│   └── nodes.db                        # SQLite node database (copy from n8n-mcp)
├── docs/                               # Planning documentation
└── tests/                              # Unit & integration tests
```

### Existing Core Files (Your Validation Library)
Your existing `src/core/` already provides:
- **`validator.ts`** - Use instead of MCP's `workflow-validator.ts`
- **`fixer.ts`** - Use instead of MCP's `workflow-auto-fixer.ts`
- **`sanitizer.ts`** - Use instead of MCP's `node-sanitizer.ts`
- **`n8n-native-validator.ts`** - Use instead of MCP's `native-workflow-validator.ts`

### Files to Add from MCP
You still need to copy from `n8n-mcp/`:
- **API Client**: `src/services/n8n-api-client.ts` → `cli/src/core/api/client.ts`
- **Database**: `src/database/node-repository.ts` → `cli/src/core/db/nodes.ts`
- **Templates**: `src/templates/template-repository.ts` → `cli/src/core/db/templates.ts`
- **Types**: `src/types/workflow-diff.ts` → `cli/src/types/workflow-diff.ts`
- **Types**: `src/types/n8n-api.ts` → `cli/src/types/n8n-api.ts`
- **Utils**: `src/utils/n8n-errors.ts` → `cli/src/utils/errors.ts`

## Source Mapping

### MCP → CLI Source Files

| MCP Tool | MCP Source | CLI Command | CLI Source |
|----------|------------|-------------|------------|
| `search_nodes` | `src/mcp/tools/nodes.ts` | `n8n nodes search` | `src/commands/nodes/SearchCommand.ts` |
| `get_node` | `src/mcp/tools/nodes.ts` | `n8n nodes get` | `src/commands/nodes/GetCommand.ts` |
| `validate_node` | `src/mcp/tools/validation.ts` | `n8n nodes validate` | `src/commands/nodes/ValidateCommand.ts` |
| `search_templates` | `src/mcp/tools/templates.ts` | `n8n templates search` | `src/commands/templates/SearchCommand.ts` |
| `get_template` | `src/mcp/tools/templates.ts` | `n8n templates get` | `src/commands/templates/GetCommand.ts` |
| `n8n_health_check` | `src/mcp/tools/health.ts` | `n8n health` | `src/commands/health/CheckCommand.ts` |
| `n8n_list_workflows` | `src/mcp/tools/workflows.ts` | `n8n workflows list` | `src/commands/workflows/ListCommand.ts` |
| `n8n_get_workflow` | `src/mcp/tools/workflows.ts` | `n8n workflows get` | `src/commands/workflows/GetCommand.ts` |
| `n8n_create_workflow` | `src/mcp/tools/workflows.ts` | `n8n workflows create` | `src/commands/workflows/CreateCommand.ts` |
| `n8n_update_partial_workflow` | `src/mcp/tools/workflows.ts` | `n8n workflows update` | `src/commands/workflows/UpdateCommand.ts` |
| `n8n_update_full_workflow` | `src/mcp/tools/workflows.ts` | `n8n workflows replace` | `src/commands/workflows/ReplaceCommand.ts` |
| `n8n_delete_workflow` | `src/mcp/tools/workflows.ts` | `n8n workflows delete` | `src/commands/workflows/DeleteCommand.ts` |
| `n8n_validate_workflow` | `src/mcp/tools/validation.ts` | `n8n workflows validate` | `src/commands/workflows/ValidateCommand.ts` |
| `n8n_autofix_workflow` | `src/mcp/tools/autofix.ts` | `n8n workflows autofix` | `src/commands/workflows/AutofixCommand.ts` |
| `n8n_trigger_webhook_workflow` | `src/mcp/tools/workflows.ts` | `n8n workflows trigger` | `src/commands/workflows/TriggerCommand.ts` |
| `n8n_executions` | `src/mcp/tools/executions.ts` | `n8n executions *` | `src/commands/executions/*.ts` |
| `n8n_workflow_versions` | `src/mcp/tools/versions.ts` | `n8n workflows versions` | `src/commands/workflows/VersionsCommand.ts` |
| `tools_documentation` | `src/mcp/tools/docs.ts` | `n8n docs` | `src/commands/docs/DocsCommand.ts` |

## Core Components

### 1. BaseCommand

All commands extend `BaseCommand` which provides:
- `--save <path>` - Write JSON to file
- `--limit <n>` - Display limit (default: 10)
- `--verbose, -v` - Verbose output
- `--quiet, -q` - Minimal output
- Standard output methods

### 2. API Client

**Read from MCP:** `n8n-mcp/src/services/n8n-api-client.ts` (530 lines)

Provides:
- HTTP client with auth (`X-N8N-API-KEY` header)
- Retry logic with exponential backoff
- Error handling via `n8n-mcp/src/utils/n8n-errors.ts`
- Full TypeScript types from `n8n-mcp/src/types/n8n-api.ts`

**Key exports to copy:**
- `N8nApiClient` class - Full API wrapper
- `N8nApiClientConfig` interface - Configuration type
- Workflow/Execution CRUD methods

### 3. Node Database

**Read from MCP:**
- `n8n-mcp/src/database/node-repository.ts` (962 lines) - Node CRUD and search
- `n8n-mcp/src/database/database-adapter.ts` (16KB) - SQLite connection pooling
- `n8n-mcp/data/nodes.db` - Pre-built database with 500+ nodes

**Key classes to copy:**
- `NodeRepository.getNode()` - Retrieve node schema by type
- `NodeRepository.searchNodes()` - Legacy LIKE search (FTS5 is in MCP server layer)
- `DatabaseAdapter` - Connection management with prepared statements

**Template database:**
- `n8n-mcp/src/templates/template-repository.ts` (948 lines) - Template search with FTS5

### 4. Formatters

**Markdown Formatter:**
- Tables with cli-table3
- Headers with box drawing
- Summaries with stats
- Next actions section
- jq recipes section

**JSON Formatter:**
- File writing with atomic operations
- Size reporting
- Confirmation messages

### 5. Validators

**Read from MCP:** `n8n-mcp/src/services/` (NOT `src/validation/` which doesn't exist)

**Core validation files:**
- `workflow-validator.ts` (1872 lines) - Main validation orchestrator
- `native-workflow-validator.ts` (7.6KB) - n8n editor-matching validation
- `enhanced-config-validator.ts` (46KB) - Per-node config validation
- `universal-expression-validator.ts` (8.4KB) - Expression syntax parser
- `expression-format-validator.ts` (11KB) - Expression format detection

**Key exports:**
- `WorkflowValidator.validateWorkflow()` - Main entry point
- `WorkflowValidationResult` interface - Result type
- Validation profiles: `minimal`, `runtime`, `ai-friendly`, `strict`

## Implementation Order

### Phase 1: Foundation
1. Project setup (package.json, tsconfig)
2. BaseCommand class
3. Config loader
4. Formatters (markdown, json)

### Phase 2: Read-Only (Safe)
1. `n8n health`
2. `n8n nodes search`
3. `n8n nodes get`
4. `n8n templates search`
5. `n8n templates get`
6. `n8n workflows list`
7. `n8n workflows get`
8. `n8n executions list`
9. `n8n executions get`
10. `n8n docs`

### Phase 3: Validation
1. `n8n nodes validate`
2. `n8n workflows validate`
3. `n8n workflows versions list/get`

### Phase 4: Write (Preview Default)
1. `n8n workflows create`
2. `n8n workflows update`
3. `n8n workflows autofix`
4. `n8n workflows trigger`

### Phase 5: Advanced
1. `n8n workflows replace`
2. `n8n workflows versions rollback/prune`
3. `n8n executions delete`
4. `n8n workflows delete` (disabled)
