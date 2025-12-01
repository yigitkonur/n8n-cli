# P1: Template Search Modes

## Business Value

**User Impact:** Users currently spend significant time manually browsing n8n.io templates or guessing keyword combinations. With 4 search modes (keyword, by_nodes, by_task, by_metadata), users can find relevant templates in seconds instead of minutes.

**Workflow Improvement:** Enables discovery of templates based on actual implementation needs (specific nodes, complexity level, required services) rather than hoping keywords match template descriptions. This is especially valuable for:
- Finding templates that integrate with specific services (e.g., all Slack+OpenAI templates)
- Discovering beginner-friendly templates (complexity: simple, max 15-min setup)
- Locating task-specific solutions (e.g., all webhook processing templates)

**Time Saved:** Reduces template discovery from 5-10 minutes of manual searching to <30 seconds with targeted queries. For teams adopting n8n, this accelerates onboarding by providing curated starting points for common automation patterns.

---

## CLI Commands Reference

### Current Commands (README.md)

| Command | Syntax | File | Purpose |
|---------|--------|------|---------|
| `templates search` | `n8n templates search <query> [options]` | `src/commands/templates/search.ts` | Search templates by keyword |
| `templates get` | `n8n templates get <id> [options]` | `src/commands/templates/get.ts` | Get template by ID |

### New Commands (This Feature)

| Command | Syntax | File | Purpose |
|---------|--------|------|---------|
| `templates search` | `n8n templates search [query] [options]` | `src/commands/templates/search.ts` | Extended: 4 search modes |
| `templates list-tasks` | `n8n templates list-tasks [options]` | `src/commands/templates/list-tasks.ts` | List available task types |
| `templates list-categories` | `n8n templates list-categories [options]` | `src/commands/templates/list-categories.ts` | List template categories |
| `templates list-audiences` | `n8n templates list-audiences [options]` | `src/commands/templates/list-audiences.ts` | List target audiences |

### Command Patterns (Following README.md Conventions)

**Structure:** `n8n <resource> <action> [positional] [options]`

**Standard Options (all commands):**
| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Limit results |
| `-s, --save <path>` | Save to JSON file |
| `--json` | Output as JSON |

**Resource-specific patterns:**
- **List commands:** Support `--limit`, `--cursor`, `--save`, `--json`
- **Search commands:** Support `--limit`, `--save`, `--json`, mode flags
- **Get commands:** Support `-m, --mode`, `-s, --save`, `--json`

---

## Current CLI Status

| Aspect | Status |
|--------|--------|
| **Implemented** | Partial (keyword-only) |
| **Location** | `src/commands/templates/search.ts:1-132` |
| **Gap Reason** | CLI uses n8n.io public API which only supports basic keyword search. MCP uses local SQLite database with FTS5 and rich metadata for advanced search modes. |

### What Currently Works
```typescript
// src/commands/templates/search.ts:23-41
const TEMPLATES_API = 'https://api.n8n.io/api/templates';

// Current implementation - keyword only via public API
const params: any = {
  search: query,
  rows: limit,
};
if (opts.category) {
  params.category = opts.category;
}
const response = await axios.get(`${TEMPLATES_API}/search`, { params });
```

### Why Advanced Modes Are Not Yet Implemented

1. **No Local Template Database:** CLI currently fetches templates from n8n.io on every search. The MCP maintains a local SQLite database with 2,700+ templates including:
   - Full workflow JSON (compressed via gzip)
   - AI-generated metadata (complexity, services, use cases)
   - FTS5 full-text search indexes

2. **No Metadata Infrastructure:** The n8n.io public API doesn't expose:
   - Template complexity ratings
   - Estimated setup time
   - Required services
   - Target audience
   - Node type indexes for fast lookup

3. **Architecture Decision Pending:** Two paths forward:
   - **Option A:** Bundle template database with CLI (like MCP does) - adds ~15MB to package size
   - **Option B:** Create hybrid approach - use n8n.io API for keyword, local DB for advanced modes

---

## MCP Reference Implementation

### Source Files (Complete Reference)

| File | Lines | Purpose |
|------|-------|---------|
| `n8n-mcp/src/templates/template-service.ts` | 1-447 | **Core service** - all 4 search modes, pagination, field selection |
| `n8n-mcp/src/templates/template-repository.ts` | 1-948 | **Database layer** - SQL queries, FTS5 search, metadata filtering |
| `n8n-mcp/src/utils/template-node-resolver.ts` | 1-234 | **Node type resolver** - handles node name variations (e.g., "slack" → "n8n-nodes-base.slack", "slackTrigger") |
| `n8n-mcp/src/templates/metadata-generator.ts` | 1-322 | **AI metadata** - OpenAI-powered metadata generation for templates |
| `n8n-mcp/src/mcp/tool-docs/templates/search-templates.ts` | 1-141 | **Tool documentation** - parameter specs, examples, best practices |
| `n8n-mcp/src/services/task-templates.ts` | 1-1507 | **Task mappings** - predefined node configurations for common tasks |

### Architecture Pattern: How MCP Implements 4 Search Modes

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Search Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Input                                                     │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ searchMode Detection (tools.ts:218-222)                 │   │
│  │  - keyword (default)                                     │   │
│  │  - by_nodes                                              │   │
│  │  - by_task                                               │   │
│  │  - by_metadata                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│      ┌───────────────────────┼───────────────────────┐          │
│      ▼                       ▼                       ▼          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │   Keyword    │   │   By Nodes   │   │   By Metadata    │    │
│  │ FTS5 Search  │   │ Node Resolver│   │  JSON Filtering  │    │
│  │ (repo:253-308)│  │ (repo:179-207)│  │  (repo:709-784) │    │
│  └──────────────┘   └──────────────┘   └──────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ TemplateInfo Response                                    │   │
│  │  - id, name, description, author                         │   │
│  │  - nodes[], views, created, url                          │   │
│  │  - metadata (complexity, services, audience)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Services Extracted from MCP

#### 1. Template Service Methods (`template-service.ts:61-298`)
```typescript
// Mode 1: Keyword Search (FTS5 or LIKE fallback)
async searchTemplates(query: string, limit = 20, offset = 0, fields?: string[]): Promise<PaginatedResponse<PartialTemplateInfo>>

// Mode 2: Search by Node Types (with smart resolution)
async listNodeTemplates(nodeTypes: string[], limit = 10, offset = 0): Promise<PaginatedResponse<TemplateInfo>>

// Mode 3: Search by Task (predefined node combinations)
async getTemplatesForTask(task: string, limit = 10, offset = 0): Promise<PaginatedResponse<TemplateInfo>>

// Mode 4: Search by Metadata (JSON filtering)
async searchTemplatesByMetadata(filters: MetadataFilters, limit = 20, offset = 0): Promise<PaginatedResponse<TemplateInfo>>

// Discovery helpers
async getAvailableCategories(): Promise<string[]>
async getAvailableTargetAudiences(): Promise<string[]>
listAvailableTasks(): string[]  // Returns 10 predefined tasks
```

#### 2. Node Type Resolution (`template-node-resolver.ts:21-82`)
```typescript
// Handles flexible node type input
resolveTemplateNodeTypes(['slack'])  
// Returns: ['n8n-nodes-base.slack', 'n8n-nodes-base.slackTrigger']

resolveTemplateNodeTypes(['http'])   
// Returns: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.webhook']

// Supports multiple input formats:
// - Bare names: "slack", "webhook", "httpRequest"
// - Partial prefix: "nodes-base.slack"
// - Full type: "n8n-nodes-base.slack"
```

#### 3. Task-to-Node Mappings (`template-repository.ts:313-334`)
```typescript
const taskNodeMap: Record<string, string[]> = {
  'ai_automation': ['@n8n/n8n-nodes-langchain.openAi', '@n8n/n8n-nodes-langchain.agent', 'n8n-nodes-base.openAi'],
  'data_sync': ['n8n-nodes-base.googleSheets', 'n8n-nodes-base.postgres', 'n8n-nodes-base.mysql'],
  'webhook_processing': ['n8n-nodes-base.webhook', 'n8n-nodes-base.httpRequest'],
  'email_automation': ['n8n-nodes-base.gmail', 'n8n-nodes-base.emailSend', 'n8n-nodes-base.emailReadImap'],
  'slack_integration': ['n8n-nodes-base.slack', 'n8n-nodes-base.slackTrigger'],
  'data_transformation': ['n8n-nodes-base.code', 'n8n-nodes-base.set', 'n8n-nodes-base.merge'],
  'file_processing': ['n8n-nodes-base.readBinaryFile', 'n8n-nodes-base.writeBinaryFile', 'n8n-nodes-base.googleDrive'],
  'scheduling': ['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.cron'],
  'api_integration': ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.graphql'],
  'database_operations': ['n8n-nodes-base.postgres', 'n8n-nodes-base.mysql', 'n8n-nodes-base.mongodb']
};
```

#### 4. Metadata Structure & Filtering (`template-repository.ts:653-784`)
```typescript
interface TemplateMetadata {
  categories: string[];                    // ["automation", "integration"]
  complexity: 'simple' | 'medium' | 'complex';
  use_cases: string[];                     // ["Process automation", "Data sync"]
  estimated_setup_minutes: number;         // 5-480
  required_services: string[];             // ["openai", "slack"]
  key_features: string[];                  // ["Workflow automation"]
  target_audience: string[];               // ["developers", "marketers"]
}

// SQL filtering uses json_extract for parameterized queries
buildMetadataFilterConditions(filters): { conditions: string[], params: any[] }
```

#### 5. FTS5 Full-Text Search (`template-repository.ts:253-308`)
```typescript
// FTS5 initialization with triggers for sync
CREATE VIRTUAL TABLE templates_fts USING fts5(name, description, content=templates);

// Search with FTS5 (falls back to LIKE if unavailable)
searchTemplates(query: string, limit = 20, offset = 0): StoredTemplate[] {
  if (this.hasFTS5Support) {
    // FTS5 query with ranking
    const ftsQuery = query.split(' ').map(term => `"${term}"`).join(' OR ');
    return db.prepare(`
      SELECT t.* FROM templates t
      JOIN templates_fts ON t.id = templates_fts.rowid
      WHERE templates_fts MATCH ?
      ORDER BY rank, t.views DESC
      LIMIT ? OFFSET ?
    `).all(ftsQuery, limit, offset);
  }
  // LIKE fallback
  return this.searchTemplatesLIKE(query, limit, offset);
}
```

### Tool Definition (MCP Schema)
```typescript
// n8n-mcp/src/mcp/tools.ts:212-306
{
  name: 'search_templates',
  description: 'Search templates with multiple modes...',
  inputSchema: {
    type: 'object',
    properties: {
      searchMode: {
        type: 'string',
        enum: ['keyword', 'by_nodes', 'by_task', 'by_metadata'],
        default: 'keyword'
      },
      // Keyword mode
      query: { type: 'string' },
      fields: { type: 'array', items: { type: 'string', enum: ['id', 'name', 'description', 'author', 'nodes', 'views', 'created', 'url', 'metadata'] } },
      
      // By nodes mode
      nodeTypes: { type: 'array', items: { type: 'string' } },
      
      // By task mode
      task: {
        type: 'string',
        enum: ['ai_automation', 'data_sync', 'webhook_processing', 'email_automation', 'slack_integration', 'data_transformation', 'file_processing', 'scheduling', 'api_integration', 'database_operations']
      },
      
      // By metadata mode
      category: { type: 'string' },
      complexity: { type: 'string', enum: ['simple', 'medium', 'complex'] },
      maxSetupMinutes: { type: 'number', minimum: 5, maximum: 480 },
      minSetupMinutes: { type: 'number', minimum: 5, maximum: 480 },
      requiredService: { type: 'string' },
      targetAudience: { type: 'string' },
      
      // Pagination
      limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
      offset: { type: 'number', default: 0, minimum: 0 }
    }
  }
}
```

---

## CLI Architecture Overview

### Entry Point & Command Registration

```
src/cli.ts                          # Main entry point, Commander.js setup
├── Global options: -v, -q, --no-color, --profile
├── Command registration via .command()
└── Dynamic imports for lazy loading
```

**Command Registration Pattern** (from `src/cli.ts`):
```typescript
const templatesCmd = program
  .command('templates')
  .description('Search and get workflow templates');

templatesCmd
  .command('search [query]')
  .description('Search templates by keyword, nodes, task, or metadata')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('--json', 'Output as JSON')
  .action(async (query, opts) => {
    const { templatesSearchCommand } = await import('./commands/templates/search.js');
    await templatesSearchCommand(query, mergeOpts(opts));
  });
```

### Shared Modules

| Module | Path | Purpose |
|--------|------|---------|
| **API Client** | `src/core/api/client.ts` | n8n REST API with retry, auth, error handling |
| **Database** | `src/core/db/adapter.ts` | SQLite adapter (better-sqlite3), FTS5 support |
| **Node DB** | `src/core/db/nodes.ts` | Node search, 800+ nodes bundled |
| **Formatters** | `src/core/formatters/` | Table, JSON, header, tree output |
| **Config** | `src/core/config/loader.ts` | Profile-based config, env vars |
| **Validator** | `src/core/validator.ts` | Workflow validation engine |
| **Output Utils** | `src/utils/output.ts` | Color control, console helpers |
| **Exit Codes** | `src/utils/exit-codes.ts` | POSIX exit codes (0, 64, 65, 70, 73, 78) |

### Config & Auth Flow

```
1. CLI reads ~/.n8nrc or .n8nrc (src/core/config/loader.ts)
2. Environment vars override: N8N_HOST, N8N_API_KEY
3. --profile selects from profiles.{name}
4. API client initialized with host + apiKey (src/core/api/client.ts)
```

### Command Implementation Pattern

All commands follow this structure:
```typescript
// src/commands/<resource>/<action>.ts
export async function <resource><Action>Command(
  positionalArg: string,
  opts: <Action>Options & GlobalOptions
): Promise<void> {
  // 1. Validate inputs
  // 2. Call API or local service
  // 3. Format output (table for human, JSON for --json)
  // 4. Use process.exitCode for errors (never throw to CLI)
}
```

---

## CLI Integration Path

### Phase 1: Hybrid Approach (Recommended)

Keep n8n.io API for basic keyword search while adding local database for advanced modes.

### Implementation File Matrix

#### Files to Create (New)

| File | LOC | Purpose | MCP Reference |
|------|-----|---------|---------------|
| `src/core/templates/service.ts` | ~200 | Template search service (all 4 modes) | `n8n-mcp/src/templates/template-service.ts` |
| `src/core/templates/repository.ts` | ~400 | SQLite queries, FTS5, metadata filtering | `n8n-mcp/src/templates/template-repository.ts` |
| `src/utils/template-node-resolver.ts` | ~234 | Node type resolution (slack → n8n-nodes-base.slack) | `n8n-mcp/src/utils/template-node-resolver.ts` |
| `src/commands/templates/list-tasks.ts` | ~50 | List available task types | N/A (new command) |
| `src/commands/templates/list-categories.ts` | ~40 | List template categories | N/A (new command) |
| `src/commands/templates/list-audiences.ts` | ~40 | List target audiences | N/A (new command) |
| `src/types/templates.ts` | ~60 | Type definitions | N/A (consolidate types) |

#### Files to Modify (Existing)

| File | Changes | Impact |
|------|---------|--------|
| `src/commands/templates/search.ts` | Add 4 search modes, new options | Major - rewrite search logic |
| `src/cli.ts` | Register new commands, extend search options | Minor - add ~50 lines |
| `src/types/index.ts` | Export template types | Minor - add exports |
| `src/core/db/adapter.ts` | Add template database path support | Minor - optional |

#### Core Dependencies Used

| Dependency | Import Path | Usage |
|------------|-------------|-------|
| Database Adapter | `src/core/db/adapter.ts` | SQLite connection, FTS5 check |
| Table Formatter | `src/core/formatters/table.ts` | Format results for terminal |
| Header Formatter | `src/core/formatters/header.ts` | Format command headers |
| JSON Formatter | `src/core/formatters/json.ts` | `--json` output |
| Exit Codes | `src/utils/exit-codes.ts` | Error handling |
| Output Utils | `src/utils/output.ts` | Color, console helpers |

---

## Implementation Guide

### 1. Template Service (`src/core/templates/service.ts`)

**Port from:** `n8n-mcp/src/templates/template-service.ts`

```typescript
import { DatabaseAdapter } from '../db/adapter.js';
import { TemplateRepository } from './repository.js';
import type { TemplateInfo, PaginatedResponse, MetadataFilters } from '../../types/templates.js';

export class TemplateService {
  private repository: TemplateRepository;
  
  constructor(db: DatabaseAdapter) {
    this.repository = new TemplateRepository(db);
  }
  
  // Mode 1: Keyword search (FTS5)
  async searchTemplates(query: string, limit = 20, offset = 0): Promise<PaginatedResponse<TemplateInfo>> {
    // Port from template-service.ts:130-151
  }
  
  // Mode 2: Search by node types
  async listNodeTemplates(nodeTypes: string[], limit = 10, offset = 0): Promise<PaginatedResponse<TemplateInfo>> {
    // Port from template-service.ts:153-166
  }
  
  // Mode 3: Search by task
  async getTemplatesForTask(task: string, limit = 10, offset = 0): Promise<PaginatedResponse<TemplateInfo>> {
    // Port from template-service.ts:168-181
  }
  
  // Mode 4: Search by metadata
  async searchTemplatesByMetadata(filters: MetadataFilters, limit = 20, offset = 0): Promise<PaginatedResponse<TemplateInfo>> {
    // Port from template-service.ts:183-204
  }
  
  // Discovery helpers
  getAvailableTasks(): string[] { /* hardcoded list */ }
  async getAvailableCategories(): Promise<string[]> { /* from repository */ }
  async getAvailableAudiences(): Promise<string[]> { /* from repository */ }
}
```

### 2. Template Repository (`src/core/templates/repository.ts`)

**Port from:** `n8n-mcp/src/templates/template-repository.ts`

Key methods to port:
- `searchTemplates()` - FTS5 with LIKE fallback (lines 253-308)
- `getTemplatesByNodes()` - node type matching (lines 179-207)
- `getTemplatesForTask()` - task-to-nodes mapping (lines 313-334)
- `searchTemplatesByMetadata()` - JSON filtering (lines 709-784)
- `buildMetadataFilterConditions()` - SQL condition builder (lines 653-704)

### 3. Search Command Update (`src/commands/templates/search.ts`)

**Current file:** `src/commands/templates/search.ts` (132 lines)

```typescript
import { GlobalOptions } from '../../types/global-options.js';
import { TemplateService } from '../../core/templates/service.js';
import { getDatabase } from '../../core/db/adapter.js';
import { formatTable } from '../../core/formatters/table.js';
import { formatHeader } from '../../core/formatters/header.js';
import { formatJson } from '../../core/formatters/json.js';
import axios from 'axios';

interface SearchOptions extends GlobalOptions {
  // Existing options
  limit?: string;
  save?: string;
  json?: boolean;
  
  // New: Search mode flags
  byNodes?: string;      // Comma-separated node types
  byTask?: string;       // Task name
  
  // New: Metadata filters (trigger by_metadata mode)
  complexity?: 'simple' | 'medium' | 'complex';
  maxSetup?: string;     // Max setup minutes
  minSetup?: string;     // Min setup minutes
  service?: string;      // Required service
  audience?: string;     // Target audience
  
  // New: Force local database
  local?: boolean;
}

export async function templatesSearchCommand(
  query: string | undefined,
  opts: SearchOptions
): Promise<void> {
  // Determine if local search is needed
  const useLocalSearch = opts.local || opts.byNodes || opts.byTask || 
    opts.complexity || opts.maxSetup || opts.minSetup || 
    opts.service || opts.audience;
  
  if (useLocalSearch) {
    return localTemplateSearch(query, opts);
  }
  
  // Default: Remote n8n.io API (existing behavior)
  return remoteTemplateSearch(query!, opts);
}

async function localTemplateSearch(query: string | undefined, opts: SearchOptions): Promise<void> {
  const db = await getDatabase();
  const service = new TemplateService(db);
  const limit = parseInt(opts.limit || '10');
  
  let result;
  
  if (opts.byNodes) {
    const nodeTypes = opts.byNodes.split(',').map(n => n.trim());
    result = await service.listNodeTemplates(nodeTypes, limit);
  } else if (opts.byTask) {
    result = await service.getTemplatesForTask(opts.byTask, limit);
  } else if (opts.complexity || opts.maxSetup || opts.service || opts.audience) {
    result = await service.searchTemplatesByMetadata({
      complexity: opts.complexity,
      maxSetupMinutes: opts.maxSetup ? parseInt(opts.maxSetup) : undefined,
      minSetupMinutes: opts.minSetup ? parseInt(opts.minSetup) : undefined,
      requiredService: opts.service,
      targetAudience: opts.audience
    }, limit);
  } else {
    // Local keyword search with FTS5
    result = await service.searchTemplates(query || '', limit);
  }
  
  formatAndOutput(result, opts);
}

async function remoteTemplateSearch(query: string, opts: SearchOptions): Promise<void> {
  // Existing implementation using axios to n8n.io API
  // Keep unchanged for backward compatibility
}

function formatAndOutput(result: PaginatedResponse<TemplateInfo>, opts: SearchOptions): void {
  if (opts.json) {
    console.log(formatJson(result));
    return;
  }
  
  console.log(formatHeader({ title: 'Template Search Results', icon: '🔍' }));
  console.log(formatTable(result.items, {
    columns: [
      { key: 'id', header: 'ID', width: 8 },
      { key: 'name', header: 'Name', width: 40 },
      { key: 'complexity', header: 'Complexity', width: 12 },
      { key: 'views', header: 'Views', width: 10 }
    ]
  }));
  console.log(`\nShowing ${result.items.length} of ${result.total} templates`);
}
```

### 4. CLI Registration (`src/cli.ts`)

**Location:** Around line 1205 (TEMPLATES COMMANDS section)

```typescript
// ============================================================================
// TEMPLATES COMMANDS
// ============================================================================
const templatesCmd = program
  .command('templates')
  .description('Search and get workflow templates');

// Extended search command with 4 modes
templatesCmd
  .command('search [query]')
  .description('Search templates by keyword, nodes, task, or metadata')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('-s, --save <path>', 'Save to JSON file')
  .option('--json', 'Output as JSON')
  // Search mode options
  .option('--by-nodes <types>', 'Search by node types (comma-separated)')
  .option('--by-task <task>', 'Search by task type')
  .option('--complexity <level>', 'Filter by complexity (simple, medium, complex)')
  .option('--max-setup <minutes>', 'Maximum setup time in minutes')
  .option('--min-setup <minutes>', 'Minimum setup time in minutes')
  .option('--service <name>', 'Filter by required service')
  .option('--audience <type>', 'Filter by target audience')
  .option('--local', 'Force local database search')
  .addHelpText('after', `
🔍 Search Modes:
  Keyword (default):  n8n templates search "openai chatbot"
  By Nodes:           n8n templates search --by-nodes slack,webhook
  By Task:            n8n templates search --by-task ai_automation
  By Metadata:        n8n templates search --complexity simple --max-setup 15

📋 Available Tasks:
  ai_automation, data_sync, webhook_processing, email_automation,
  slack_integration, data_transformation, file_processing, scheduling,
  api_integration, database_operations

💡 Tip: Use 'n8n templates list-tasks' for task descriptions
`)
  .action(async (query, opts) => {
    const { templatesSearchCommand } = await import('./commands/templates/search.js');
    await templatesSearchCommand(query, mergeOpts(opts));
  });

// Get template (existing - unchanged)
templatesCmd
  .command('get <id>')
  .description('Get template by ID')
  .option('-s, --save <path>', 'Save template to file')
  .option('--json', 'Output as JSON')
  .action(async (id, opts) => {
    const { templatesGetCommand } = await import('./commands/templates/get.js');
    await templatesGetCommand(id, mergeOpts(opts));
  });

// New: List available tasks
templatesCmd
  .command('list-tasks')
  .description('List available task types for template search')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { listTasksCommand } = await import('./commands/templates/list-tasks.js');
    await listTasksCommand(mergeOpts(opts));
  });

// New: List categories
templatesCmd
  .command('list-categories')
  .description('List template categories')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { listCategoriesCommand } = await import('./commands/templates/list-categories.js');
    await listCategoriesCommand(mergeOpts(opts));
  });

// New: List audiences
templatesCmd
  .command('list-audiences')
  .description('List target audiences')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const { listAudiencesCommand } = await import('./commands/templates/list-audiences.js');
    await listAudiencesCommand(mergeOpts(opts));
  });

// Default action for 'n8n templates' without subcommand
templatesCmd.action(() => {
  const args = templatesCmd.args;
  if (args.length > 0) {
    console.error(`error: unknown command 'n8n templates ${args[0]}'`);
    console.error(`Run 'n8n templates --help' to see available commands.`);
    process.exitCode = 1;
    return;
  }
  templatesCmd.help();
});
```

### 5. New Types (`src/types/templates.ts`)

```typescript
/**
 * Template Types for CLI
 * Used by: src/core/templates/service.ts, src/commands/templates/*.ts
 */

export interface TemplateInfo {
  id: number;
  name: string;
  description: string;
  author: {
    name: string;
    username: string;
    verified: boolean;
  };
  nodes: string[];
  views: number;
  created: string;
  url: string;
  metadata?: TemplateMetadata;
}

export interface TemplateMetadata {
  categories: string[];
  complexity: 'simple' | 'medium' | 'complex';
  use_cases: string[];
  estimated_setup_minutes: number;
  required_services: string[];
  key_features: string[];
  target_audience: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface MetadataFilters {
  category?: string;
  complexity?: 'simple' | 'medium' | 'complex';
  maxSetupMinutes?: number;
  minSetupMinutes?: number;
  requiredService?: string;
  targetAudience?: string;
}

export type TemplateTask = 
  | 'ai_automation' 
  | 'data_sync' 
  | 'webhook_processing' 
  | 'email_automation' 
  | 'slack_integration' 
  | 'data_transformation' 
  | 'file_processing' 
  | 'scheduling' 
  | 'api_integration' 
  | 'database_operations';

export const TEMPLATE_TASKS: ReadonlyArray<TemplateTask> = [
  'ai_automation',
  'data_sync',
  'webhook_processing',
  'email_automation',
  'slack_integration',
  'data_transformation',
  'file_processing',
  'scheduling',
  'api_integration',
  'database_operations'
] as const;
```

### 6. List Tasks Command (`src/commands/templates/list-tasks.ts`)

```typescript
import { formatHeader } from '../../core/formatters/header.js';
import { formatTable } from '../../core/formatters/table.js';
import { formatJson } from '../../core/formatters/json.js';
import type { GlobalOptions } from '../../types/global-options.js';

interface ListTasksOptions extends GlobalOptions {
  json?: boolean;
}

const TASK_DEFINITIONS = [
  { task: 'ai_automation', description: 'AI/ML workflows with OpenAI, agents, langchain', nodes: 'openAi, agent, lmChatOpenAi' },
  { task: 'data_sync', description: 'Synchronize data between services', nodes: 'googleSheets, postgres, mysql' },
  { task: 'webhook_processing', description: 'Handle incoming webhooks', nodes: 'webhook, httpRequest' },
  { task: 'email_automation', description: 'Email workflows and triggers', nodes: 'gmail, emailSend, emailReadImap' },
  { task: 'slack_integration', description: 'Slack messaging and triggers', nodes: 'slack, slackTrigger' },
  { task: 'data_transformation', description: 'Transform and process data', nodes: 'code, set, merge' },
  { task: 'file_processing', description: 'File operations and storage', nodes: 'readBinaryFile, googleDrive' },
  { task: 'scheduling', description: 'Scheduled/cron workflows', nodes: 'scheduleTrigger, cron' },
  { task: 'api_integration', description: 'External API integrations', nodes: 'httpRequest, graphql' },
  { task: 'database_operations', description: 'Database CRUD operations', nodes: 'postgres, mysql, mongodb' }
];

export async function listTasksCommand(opts: ListTasksOptions): Promise<void> {
  if (opts.json) {
    console.log(formatJson({ tasks: TASK_DEFINITIONS }));
    return;
  }
  
  console.log(formatHeader({ title: 'Available Template Tasks', icon: '📋' }));
  console.log(formatTable(TASK_DEFINITIONS, {
    columns: [
      { key: 'task', header: 'Task', width: 22 },
      { key: 'description', header: 'Description', width: 40 },
      { key: 'nodes', header: 'Key Nodes', width: 28 }
    ]
  }));
  console.log('\n💡 Usage: n8n templates search --by-task <task_name>');
}
```

---

### Database Integration

The CLI already has database infrastructure at `src/core/db/adapter.ts`:
- Uses `better-sqlite3` for synchronous queries
- FTS5 support checking: `checkFTS5Support()`
- Database path: `data/nodes.db`

**Required:** Add templates table to CLI's bundled database. Either:
1. Extend existing `nodes.db` to include templates table
2. Create separate `templates.db` with template data

Template database schema (from MCP):
```sql
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY,
  workflow_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  author_name TEXT,
  author_username TEXT,
  author_verified INTEGER DEFAULT 0,
  nodes_used TEXT,  -- JSON array
  workflow_json_compressed TEXT,  -- Base64 gzip
  categories TEXT,  -- JSON array
  views INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  url TEXT,
  metadata_json TEXT,  -- AI-generated metadata
  metadata_generated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_templates_views ON templates(views DESC);
CREATE INDEX IF NOT EXISTS idx_templates_created ON templates(created_at DESC);

-- FTS5 for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS templates_fts USING fts5(
  name, description, content=templates
);
```

---

## Dependencies

### Requires Before Implementation
- **Template Database:** Need to bundle templates.db with CLI package (~15-20MB compressed)
- **Database Schema Migration:** Add templates table if extending nodes.db

### Blocks Other Features
- `03-P0-template-deploy.md` - Template deploy benefits from advanced search to find suitable templates

### Related Features
- `11-P2-fts5-search.md` - FTS5 infrastructure shared with this feature
- Node search already uses FTS5 in CLI's nodes.db

---

## Command Reference (README.md Format)

### `templates search`

Search templates by keyword, nodes, task, or metadata.

```bash
n8n templates search [query] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Limit results | `10` |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |
| `--by-nodes <types>` | Search by node types (comma-separated) | - |
| `--by-task <task>` | Search by task type | - |
| `--complexity <level>` | Filter by complexity (simple, medium, complex) | - |
| `--max-setup <minutes>` | Maximum setup time in minutes | - |
| `--min-setup <minutes>` | Minimum setup time in minutes | - |
| `--service <name>` | Filter by required service | - |
| `--audience <type>` | Filter by target audience | - |
| `--local` | Force local database search | - |

**Search modes:**
- **Keyword** (default): Text search in template names/descriptions
- **By Nodes**: Find templates using specific node types
- **By Task**: Curated templates for common automation tasks
- **By Metadata**: Filter by complexity, setup time, services, audience

### `templates get`

Get template by ID. *(Existing - unchanged)*

```bash
n8n templates get <id> [options]
```

| Option | Description |
|--------|-------------|
| `-s, --save <path>` | Save template to file |
| `--json` | Output as JSON |

### `templates list-tasks`

List available task types for template search. *(New)*

```bash
n8n templates list-tasks [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

### `templates list-categories`

List template categories. *(New)*

```bash
n8n templates list-categories [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

### `templates list-audiences`

List target audiences. *(New)*

```bash
n8n templates list-audiences [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

---

## Usage Examples

```bash
# Mode 1: Keyword Search (default - uses n8n.io API)
n8n templates search "slack notification"
n8n templates search "openai" --limit 20
n8n templates search "data sync" --save templates.json

# Mode 2: Search by Node Types (local database)
n8n templates search --by-nodes slack
n8n templates search --by-nodes slack,webhook,httpRequest
n8n templates search --by-nodes n8n-nodes-base.openAi --limit 5 --json

# Mode 3: Search by Task (local database)
n8n templates search --by-task ai_automation
n8n templates search --by-task webhook_processing --json
n8n templates list-tasks  # Show all available tasks

# Mode 4: Search by Metadata (local database)
n8n templates search --complexity simple
n8n templates search --complexity simple --max-setup 15
n8n templates search --service openai --audience developers
n8n templates search --complexity medium --service slack --limit 10

# Combined with output options
n8n templates search --by-task data_sync --json
n8n templates search --complexity simple --save simple-templates.json

# Force local search for keyword mode
n8n templates search "webhook" --local

# Discovery commands
n8n templates list-tasks --json
n8n templates list-categories
n8n templates list-audiences --json

# Get template and save for import
n8n templates get 3121 --save my-workflow.json
```

---

## Output Examples

### By Task Mode
```
╔═══════════════════════════════════════════════════════════════════════╗
║ 📋 Templates for Task: ai_automation                                  ║
╠═══════════════════════════════════════════════════════════════════════╣
║ Found 24 templates                                                    ║
╚═══════════════════════════════════════════════════════════════════════╝

  #   ID      Name                                     Complexity  Setup
  ─── ─────── ──────────────────────────────────────── ─────────── ─────
  1   3421    AI Slack Bot with OpenAI                 medium      ~25 min
              Nodes: slackTrigger, openAi, slack
              Services: openai, slack

  2   2987    Document Summarizer                      simple      ~10 min
              Nodes: webhook, openAi, gmail
              Services: openai

  3   4102    Customer Support Agent                   complex     ~45 min
              Nodes: chatTrigger, agent, slack, postgres
              Services: openai, slack, postgresql

  Showing 3 of 24 • Use --limit to see more

💡 Next: n8n templates get 3421 --save workflow.json
```

### By Metadata Mode (JSON)
```bash
$ n8n templates search --complexity simple --max-setup 15 --service openai --json
```
```json
{
  "searchMode": "by_metadata",
  "filters": {
    "complexity": "simple",
    "maxSetupMinutes": 15,
    "requiredService": "openai"
  },
  "items": [
    {
      "id": 2987,
      "name": "Document Summarizer",
      "description": "Summarize documents using OpenAI GPT",
      "author": { "username": "n8n", "verified": true },
      "nodes": ["webhook", "openAi", "gmail"],
      "views": 4521,
      "metadata": {
        "complexity": "simple",
        "estimated_setup_minutes": 10,
        "required_services": ["openai"],
        "target_audience": ["developers", "content-creators"]
      }
    }
  ],
  "total": 8,
  "hasMore": true
}
```

### List Tasks Command
```
╔═══════════════════════════════════════════════════════════════════════╗
║ 📋 Available Template Tasks                                           ║
╚═══════════════════════════════════════════════════════════════════════╝

  Task                   Description                          Key Nodes
  ────────────────────── ──────────────────────────────────── ─────────────────────
  ai_automation          AI/ML workflows with OpenAI, agents  openAi, agent
  data_sync              Synchronize data between services    googleSheets, postgres
  webhook_processing     Handle incoming webhooks             webhook, httpRequest
  email_automation       Email workflows and triggers         gmail, emailSend
  slack_integration      Slack messaging and triggers         slack, slackTrigger
  data_transformation    Transform and process data           code, set, merge
  file_processing        File operations and storage          readBinaryFile, googleDrive
  scheduling             Scheduled/cron workflows             scheduleTrigger, cron
  api_integration        External API integrations            httpRequest, graphql
  database_operations    Database CRUD operations             postgres, mysql, mongodb

Usage: n8n templates search --by-task <task_name>
```

---

## Acceptance Criteria

### Functional Requirements
- [ ] `n8n templates search "keyword"` works as before (n8n.io API)
- [ ] `n8n templates search --by-nodes slack` returns templates using Slack nodes
- [ ] `n8n templates search --by-task ai_automation` returns AI templates
- [ ] `n8n templates search --complexity simple` filters by complexity
- [ ] `n8n templates search --max-setup 15` filters by setup time
- [ ] `n8n templates search --service openai` filters by required service
- [ ] `n8n templates list-tasks` displays all 10 tasks with descriptions
- [ ] `n8n templates list-categories` lists all template categories
- [ ] `n8n templates list-audiences` lists target audiences
- [ ] All modes support `--json` output (machine-readable)
- [ ] All modes support `-l, --limit` and `-s, --save` options
- [ ] Node type resolution handles bare names: "slack" → "n8n-nodes-base.slack"

### CLI Pattern Compliance (per README.md)
- [ ] All commands follow `n8n <resource> <action> [options]` pattern
- [ ] All commands support global options: `-v`, `-q`, `--no-color`, `--profile`
- [ ] `--json` output follows standard format: `{ "success": true, "data": {...} }`
- [ ] Error output follows format: `{ "success": false, "error": {...} }`
- [ ] Exit codes follow POSIX standards (see `src/utils/exit-codes.ts`)
- [ ] Help text includes examples and tips (using `.addHelpText('after', ...)`)

### Performance Requirements
- [ ] Local database queries complete in <100ms
- [ ] FTS5 search completes in <50ms for keyword mode
- [ ] Metadata filtering with JSON queries completes in <100ms

### Error Handling
- [ ] Graceful fallback if templates database not found
- [ ] Clear error message for invalid task names (exit code 64 USAGE)
- [ ] Clear error message for invalid complexity values
- [ ] Empty results display helpful message with suggestions

### Testing
- [ ] Unit tests for each search mode
- [ ] Unit tests for node type resolution
- [ ] Integration tests for combined metadata filters
- [ ] Test FTS5 fallback to LIKE when FTS5 unavailable

### Documentation Updates
- [ ] `README.md` templates section updated with new commands and options
- [ ] Help text for each command includes examples
- [ ] CHANGELOG.md entry for new feature

---

## README.md Updates Required

Add to `README.md` templates section (after line 766):

```markdown
#### `templates search`

Search templates by keyword, nodes, task, or metadata.

```bash
n8n templates search [query] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Limit results | `10` |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |
| `--by-nodes <types>` | Search by node types (comma-separated) | - |
| `--by-task <task>` | Search by task type | - |
| `--complexity <level>` | Filter by complexity (simple, medium, complex) | - |
| `--max-setup <minutes>` | Maximum setup time in minutes | - |
| `--min-setup <minutes>` | Minimum setup time in minutes | - |
| `--service <name>` | Filter by required service | - |
| `--audience <type>` | Filter by target audience | - |
| `--local` | Force local database search | - |

**Search modes:**
- `keyword` (default): Text search in template names/descriptions
- `by_nodes`: Find templates using specific node types
- `by_task`: Curated templates for common automation tasks
- `by_metadata`: Filter by complexity, setup time, services, audience

**Available tasks:**
`ai_automation`, `data_sync`, `webhook_processing`, `email_automation`,
`slack_integration`, `data_transformation`, `file_processing`, `scheduling`,
`api_integration`, `database_operations`

#### `templates list-tasks`

List available task types for template search.

```bash
n8n templates list-tasks [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

#### `templates list-categories`

List template categories.

```bash
n8n templates list-categories [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

#### `templates list-audiences`

List target audiences.

```bash
n8n templates list-audiences [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |
```

---

## Estimated Effort

| Aspect | Estimate |
|--------|----------|
| **Complexity** | Medium-High |
| **New Files** | 7 |
| **Modified Files** | 4 |
| **Lines of Code** | ~1,000-1,200 |
| **Database Work** | Bundle templates.db (~15MB) |
| **Time** | 3-4 days |

### File Summary

| Type | File | LOC |
|------|------|-----|
| **New** | `src/core/templates/service.ts` | ~200 |
| **New** | `src/core/templates/repository.ts` | ~400 |
| **New** | `src/utils/template-node-resolver.ts` | ~234 |
| **New** | `src/commands/templates/list-tasks.ts` | ~50 |
| **New** | `src/commands/templates/list-categories.ts` | ~40 |
| **New** | `src/commands/templates/list-audiences.ts` | ~40 |
| **New** | `src/types/templates.ts` | ~70 |
| **Modify** | `src/commands/templates/search.ts` | +150 |
| **Modify** | `src/cli.ts` | +50 |
| **Modify** | `src/types/index.ts` | +5 |
| **Modify** | `README.md` | +80 |

### Implementation Schedule

- **Day 1:** Port `TemplateService`, `TemplateRepository` from MCP
- **Day 2:** Port `template-node-resolver`, add templates database to CLI bundle
- **Day 3:** Update `search.ts` command, add `list-tasks`, `list-categories`, `list-audiences`
- **Day 4:** Testing, documentation, README.md updates

---

## Implementation Checklist

### Phase 1: Core Infrastructure
```
[ ] Create src/types/templates.ts
[ ] Create src/core/templates/service.ts (port from MCP)
[ ] Create src/core/templates/repository.ts (port from MCP)
[ ] Create src/utils/template-node-resolver.ts (port from MCP)
[ ] Add templates.db to data/ directory
[ ] Update src/core/db/adapter.ts for template database path
```

### Phase 2: Commands
```
[ ] Modify src/commands/templates/search.ts (add 4 search modes)
[ ] Create src/commands/templates/list-tasks.ts
[ ] Create src/commands/templates/list-categories.ts
[ ] Create src/commands/templates/list-audiences.ts
[ ] Update src/cli.ts (register new commands, extend search options)
```

### Phase 3: Documentation & Testing
```
[ ] Update README.md templates section
[ ] Add unit tests for TemplateService
[ ] Add unit tests for template-node-resolver
[ ] Add integration tests for search modes
[ ] Update CHANGELOG.md
```

### Verification Commands
```bash
# Test keyword search (existing behavior)
n8n templates search "openai" --json

# Test by-nodes mode
n8n templates search --by-nodes slack,webhook --json

# Test by-task mode
n8n templates search --by-task ai_automation --json

# Test metadata mode
n8n templates search --complexity simple --max-setup 15 --json

# Test discovery commands
n8n templates list-tasks --json
n8n templates list-categories --json
n8n templates list-audiences --json
```
