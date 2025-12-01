# P0: Workflow Versioning & Backup

## Priority: P0 (Critical)
## Status: Not Implemented in CLI
## MCP Source: `n8n-mcp/src/services/workflow-versioning-service.ts`

---

## Business Value

**User Impact:**
- **Disaster Recovery**: Users can instantly recover from accidental workflow changes, misconfigurations, or failed experiments without manual restoration from exports
- **Audit Trail**: Complete history of workflow modifications with trigger context (partial_update, full_update, autofix), enabling compliance and debugging
- **Confidence to Experiment**: Users can safely try experimental changes knowing they can rollback with a single command
- **Storage Efficiency**: Automatic pruning to 10 versions prevents unbounded storage growth while maintaining sufficient history

**Time Saved:**
- **Before**: Manual export before changes → manual file management → manual re-import = 10-15 minutes per recovery
- **After**: `n8n workflows versions <id> --rollback` = 5 seconds

**Critical Dependency:**
This feature blocks safe implementation of **01-P0 Workflow Diff Engine** and **04-P0 Advanced Autofix** — both require guaranteed rollback capability before applying mutations.

---

## Current CLI Status

### Implemented: File-Based Backup (Partial)
- **Location**: `src/utils/backup.ts`
- **Capability**: Saves workflow JSON to `~/.n8n-cli/backups/workflow-{id}-{timestamp}.json`
- **Usage**: Called by `src/commands/workflows/update.ts:68` and `src/commands/workflows/autofix.ts:179`

```typescript
// @src/utils/backup.ts#57:70
export async function saveWorkflowBackup(
  workflow: object,
  workflowId: string
): Promise<string> {
  await ensureBackupDir();
  
  const timestamp = getTimestamp();
  const filename = `workflow-${workflowId}-${timestamp}.json`;
  const backupPath = join(BACKUP_DIR, filename);
  
  await writeFile(backupPath, JSON.stringify(workflow, null, 2), 'utf8');
  
  return backupPath;
}
```

### Not Implemented

| Feature | Gap Reason |
|---------|------------|
| **Version History** | No database table; CLI DB opened as `readonly: true` in `src/core/db/adapter.ts:86` |
| **Rollback Command** | No `WorkflowVersioningService` ported; requires write access to DB |
| **Auto-Pruning** | File-based backups accumulate indefinitely; no cleanup mechanism |
| **Version Comparison** | No diff capability between backups (files scattered in timestamped format) |
| **Trigger Context** | File backups don't track WHY backup was created (update vs autofix) |
| **Storage Statistics** | No visibility into backup storage consumption |

### Why Not Yet Implemented

1. **Database Architecture Constraint**:
   ```typescript
   // @src/core/db/adapter.ts#85:87
   const Database = (await import('better-sqlite3')).default;
   const db = new Database(path, { readonly: true });
   ```
   The CLI database is opened in read-only mode because it's a bundled node metadata DB, not designed for user data storage.

2. **Missing Schema**:
   The CLI doesn't include the `workflow_versions` table in its database. The MCP schema includes this table but CLI uses a separate, read-only database.

3. **Separation of Concerns**:
   CLI was designed for stateless operations. Adding versioning requires a new, separate writable database for user data.

---

## CLI Architecture Context

### Entry Point & Command Registration

The CLI uses Commander.js with a hierarchical command structure. All commands follow the pattern:

```
n8n <resource> <action> [argument] [options]
```

**Entry Point:** `src/cli.ts`
- Registers all top-level commands (workflows, nodes, credentials, etc.)
- Configures global options (`--json`, `--verbose`, `--quiet`, `--profile`)
- Sets up error handling and exit codes

**Command Registration Pattern:**
```typescript
// src/cli.ts pattern
import { Command } from 'commander';

const program = new Command()
  .name('n8n')
  .version(version)
  .option('-v, --verbose', 'Enable verbose output')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--json', 'Output as JSON')
  .option('--profile <name>', 'Use configuration profile');

// Register resource commands
program.addCommand(createWorkflowsCommand());  // src/commands/workflows/index.ts
program.addCommand(createNodesCommand());       // src/commands/nodes/index.ts
// ...
```

### Existing CLI Command Structure

| Domain | Entry File | Subcommands | Pattern |
|--------|------------|-------------|---------|
| `workflows` | `src/commands/workflows/*.ts` | list, get, validate, create, import, export, update, trigger, tags, autofix, bulk | `n8n workflows <action> [id] [options]` |
| `nodes` | `src/commands/nodes/*.ts` | list, search, show, categories, validate | `n8n nodes <action> [query] [options]` |
| `credentials` | `src/commands/credentials/*.ts` | list, create, delete, schema, types, type-show | `n8n credentials <action> [id] [options]` |
| `executions` | `src/commands/executions/*.ts` | list, get, retry, delete | `n8n executions <action> [id] [options]` |
| `variables` | `src/commands/variables/*.ts` | list, create, update, delete | `n8n variables <action> [id] [options]` |
| `tags` | `src/commands/tags/*.ts` | list, get, create, update, delete | `n8n tags <action> [id] [options]` |
| `templates` | `src/commands/templates/*.ts` | search, get | `n8n templates <action> [query] [options]` |
| `auth` | `src/commands/auth/*.ts` | login, logout, status | `n8n auth <action> [options]` |
| `health` | `src/commands/health/index.ts` | (standalone) | `n8n health [options]` |
| `config` | `src/commands/config/index.ts` | show | `n8n config show [options]` |
| `audit` | `src/commands/audit/index.ts` | (standalone) | `n8n audit [options]` |
| `completion` | `src/commands/completion/index.ts` | (standalone) | `n8n completion <shell>` |

### Shared Core Modules

| Module | Path | Purpose |
|--------|------|---------|
| **API Client** | `src/core/api/client.ts` | HTTP client for n8n API (workflows, credentials, executions) |
| **Config Loader** | `src/core/config/loader.ts` | Loads `.n8nrc`, env vars, profiles |
| **Database Adapter** | `src/core/db/adapter.ts` | SQLite adapter for bundled node DB |
| **Node Repository** | `src/core/db/nodes.ts` | Query node metadata (800+ nodes) |
| **Validator** | `src/core/validator.ts` | Workflow validation engine |
| **Fixer** | `src/core/fixer.ts` | Auto-fix validation issues |
| **Formatters** | `src/core/formatters/*.ts` | Table, JSON, tree, theme output |
| **Backup Utils** | `src/utils/backup.ts` | File-based backup helpers |
| **Exit Codes** | `src/utils/exit-codes.ts` | POSIX exit code constants |
| **Prompts** | `src/utils/prompts.ts` | Interactive confirmation dialogs |

### Global Options (All Commands)

| Option | Description | Implementation |
|--------|-------------|----------------|
| `-V, --version` | Output version number | Commander built-in |
| `-v, --verbose` | Enable verbose/debug output | `src/core/debug.ts` |
| `-q, --quiet` | Suppress non-essential output | Formatters check this |
| `--no-color` | Disable colored output | `chalk` respects `NO_COLOR` |
| `--profile <name>` | Use configuration profile | `src/core/config/loader.ts` |
| `--json` | Output as JSON | `src/core/formatters/json.ts` |
| `-h, --help` | Display help | Commander built-in |

### Common Option Patterns

| Pattern | Options | Used In |
|---------|---------|---------|
| **Pagination** | `-l, --limit <n>`, `--cursor <cursor>` | list commands |
| **Save Output** | `-s, --save <path>` | list, get, search commands |
| **Confirmation** | `--force, --yes` | delete, update commands |
| **Backup Control** | `--no-backup` | update, delete commands |
| **Dry Run** | `--dry-run` | create, update, autofix commands |

---

## MCP Reference Implementation

### Architecture Overview

The MCP implementation uses a **write-enabled SQLite database** that stores both node metadata AND user workflow versions. This is the key architectural difference from CLI.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MCP Workflow Versioning                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐      ┌─────────────────────────────────────┐  │
│  │ MCP Tool Handler │──────▶│   WorkflowVersioningService        │  │
│  │ (6 modes)        │      │   - createBackup()                  │  │
│  └──────────────────┘      │   - getVersionHistory()             │  │
│                            │   - restoreVersion()                │  │
│                            │   - deleteVersion()                 │  │
│                            │   - pruneVersions()                 │  │
│                            │   - compareVersions()               │  │
│                            │   - getStorageStats()               │  │
│                            └──────────────┬──────────────────────┘  │
│                                           │                          │
│                            ┌──────────────▼──────────────────────┐  │
│                            │      NodeRepository                  │  │
│                            │   - createWorkflowVersion()         │  │
│                            │   - getWorkflowVersions()           │  │
│                            │   - deleteWorkflowVersion()         │  │
│                            │   - pruneWorkflowVersions()         │  │
│                            │   - getVersionStorageStats()        │  │
│                            └──────────────┬──────────────────────┘  │
│                                           │                          │
│                            ┌──────────────▼──────────────────────┐  │
│                            │     SQLite Database                  │  │
│                            │   workflow_versions table            │  │
│                            └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Source Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `n8n-mcp/src/services/workflow-versioning-service.ts` | 1-461 | Core service with all versioning logic |
| `n8n-mcp/src/database/node-repository.ts` | 744-961 | Database CRUD operations for versions |
| `n8n-mcp/src/database/schema.sql` | 212-236 | `workflow_versions` table schema |
| `n8n-mcp/src/mcp/tools-n8n-manager.ts` | 395-447 | Tool definition with 6 modes |
| `n8n-mcp/src/mcp/handlers-n8n-manager.ts` | 2033-2219 | Handler implementation |
| `n8n-mcp/src/mcp/tool-docs/workflow_management/n8n-workflow-versions.ts` | 1-169 | Comprehensive documentation |

### Database Schema

```sql
-- @n8n-mcp/src/database/schema.sql#215:236
CREATE TABLE IF NOT EXISTS workflow_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  workflow_name TEXT NOT NULL,
  workflow_snapshot TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK(trigger IN ('partial_update', 'full_update', 'autofix')),
  operations TEXT,
  fix_types TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, version_number)
);

CREATE INDEX idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX idx_workflow_versions_created_at ON workflow_versions(created_at);
CREATE INDEX idx_workflow_versions_trigger ON workflow_versions(trigger);
```

### Core Service Implementation

```typescript
// @n8n-mcp/src/services/workflow-versioning-service.ts#87:139
export class WorkflowVersioningService {
  private readonly DEFAULT_MAX_VERSIONS = 10;

  constructor(
    private nodeRepository: NodeRepository,
    private apiClient?: N8nApiClient
  ) {}

  async createBackup(
    workflowId: string,
    workflow: any,
    context: {
      trigger: 'partial_update' | 'full_update' | 'autofix';
      operations?: any[];
      fixTypes?: string[];
      metadata?: any;
    }
  ): Promise<BackupResult> {
    const versions = this.nodeRepository.getWorkflowVersions(workflowId, 1);
    const nextVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

    const versionId = this.nodeRepository.createWorkflowVersion({
      workflowId,
      versionNumber: nextVersion,
      workflowName: workflow.name || 'Unnamed Workflow',
      workflowSnapshot: workflow,
      trigger: context.trigger,
      operations: context.operations,
      fixTypes: context.fixTypes,
      metadata: context.metadata
    });

    // Auto-prune to keep max 10 versions
    const pruned = this.nodeRepository.pruneWorkflowVersions(
      workflowId,
      this.DEFAULT_MAX_VERSIONS
    );

    return { versionId, versionNumber: nextVersion, pruned };
  }
}
```

---

## CLI Command Interface

Following the established CLI patterns from `README.md`, the new `workflows versions` command will be a subcommand of `workflows`:

### `workflows versions`

Manage workflow version history, rollback, and cleanup.

```bash
n8n workflows versions [id] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Limit version history results | `10` |
| `--get <version-id>` | Get specific version details | - |
| `--rollback` | Rollback to previous version | - |
| `--to-version <id>` | Specific version ID for rollback | latest |
| `--skip-validation` | Skip validation before rollback | - |
| `--compare <v1,v2>` | Compare two versions (comma-separated IDs) | - |
| `--delete <version-id>` | Delete specific version | - |
| `--delete-all` | Delete all versions for workflow | - |
| `--prune` | Prune old versions | - |
| `--keep <n>` | Keep N most recent versions (with --prune) | `5` |
| `--stats` | Show storage statistics | - |
| `--truncate-all` | Delete ALL versions for ALL workflows | - |
| `--force, --yes` | Skip confirmation prompts | - |
| `--no-backup` | Skip creating backup before rollback | - |
| `-s, --save <path>` | Save version to JSON file | - |
| `--json` | Output as JSON | - |

### Command Examples

```bash
# List version history (default: 10 most recent)
n8n workflows versions abc123
n8n workflows versions abc123 --limit 5

# Get specific version details
n8n workflows versions abc123 --get 42
n8n workflows versions abc123 --get 42 --save version.json

# Rollback to previous version (with validation)
n8n workflows versions abc123 --rollback
n8n workflows versions abc123 --rollback --to-version 42
n8n workflows versions abc123 --rollback --skip-validation

# Compare two versions
n8n workflows versions abc123 --compare 41,42

# Delete specific version
n8n workflows versions abc123 --delete 42 --force

# Delete all versions for workflow
n8n workflows versions abc123 --delete-all --force

# Prune old versions (keep N most recent)
n8n workflows versions abc123 --prune --keep 5

# Storage statistics (global - no workflow ID required)
n8n workflows versions --stats

# Truncate all versions (dangerous!)
n8n workflows versions --truncate-all --force

# JSON output for agents
n8n workflows versions abc123 --json
n8n workflows versions abc123 --rollback --json
```

### JSON Output Format

```json
// List versions
{
  "success": true,
  "data": {
    "workflowId": "abc123",
    "versions": [
      {
        "id": 42,
        "versionNumber": 5,
        "workflowName": "My Workflow",
        "trigger": "full_update",
        "size": 4523,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 5
  }
}

// Rollback result
{
  "success": true,
  "data": {
    "message": "Successfully restored workflow to version 4",
    "workflowId": "abc123",
    "fromVersion": 5,
    "toVersionId": 41,
    "backupCreated": true,
    "backupVersionId": 43
  }
}

// Storage stats
{
  "success": true,
  "data": {
    "totalVersions": 156,
    "totalSize": 2458624,
    "totalSizeFormatted": "2.3 MB",
    "byWorkflow": [
      { "workflowId": "abc123", "workflowName": "Main Flow", "versionCount": 10, "totalSize": 45230 }
    ]
  }
}
```

---

## Implementation Plan

### Phase 1: User Database Infrastructure

Create a separate writable SQLite database for user data (versions, settings, future features).

#### Files to Create

| File | Purpose |
|------|---------|
| `src/core/user-db/adapter.ts` | Writable SQLite adapter for `~/.n8n-cli/data.db` |
| `src/core/user-db/schema.sql` | SQL schema for `workflow_versions` table |
| `src/core/user-db/migrations.ts` | Schema migration system |
| `src/core/user-db/index.ts` | Module exports |

#### `src/core/user-db/adapter.ts`

```typescript
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

const USER_DB_DIR = join(homedir(), '.n8n-cli');
const USER_DB_PATH = join(USER_DB_DIR, 'data.db');

export interface UserDatabaseAdapter {
  prepare(sql: string): Database.Statement;
  exec(sql: string): void;
  close(): void;
  pragma(key: string, value?: any): any;
  transaction<T>(fn: () => T): T;
}

let dbInstance: Database.Database | null = null;

export function getUserDatabase(): UserDatabaseAdapter {
  if (dbInstance) return dbInstance;
  
  // Ensure directory exists with secure permissions
  if (!existsSync(USER_DB_DIR)) {
    mkdirSync(USER_DB_DIR, { recursive: true, mode: 0o700 });
  }
  
  // Open writable database
  dbInstance = new Database(USER_DB_PATH);
  
  // Enable WAL mode for performance and crash safety
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('cache_size = -64000'); // 64MB cache
  
  // Run migrations
  runMigrations(dbInstance);
  
  return dbInstance;
}

export function closeUserDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
```

#### `src/core/user-db/schema.sql`

```sql
-- Migration 001: Workflow Versions
CREATE TABLE IF NOT EXISTS workflow_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  workflow_name TEXT NOT NULL,
  workflow_snapshot TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK(trigger IN ('partial_update', 'full_update', 'autofix', 'manual')),
  operations TEXT,
  fix_types TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_wv_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wv_created_at ON workflow_versions(created_at);

-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Phase 2: Versioning Service

Port the `WorkflowVersioningService` from MCP with CLI-specific adaptations.

#### Files to Create

| File | Purpose |
|------|---------|
| `src/core/versioning/service.ts` | Port of `WorkflowVersioningService` |
| `src/core/versioning/types.ts` | TypeScript interfaces |
| `src/core/versioning/repository.ts` | Database operations |
| `src/core/versioning/index.ts` | Module exports |

#### `src/core/versioning/types.ts`

```typescript
export interface WorkflowVersion {
  id: number;
  workflowId: string;
  versionNumber: number;
  workflowName: string;
  workflowSnapshot: any;
  trigger: 'partial_update' | 'full_update' | 'autofix' | 'manual';
  operations?: any[];
  fixTypes?: string[];
  metadata?: any;
  createdAt: string;
}

export interface VersionInfo {
  id: number;
  workflowId: string;
  versionNumber: number;
  workflowName: string;
  trigger: string;
  operationCount?: number;
  fixTypesApplied?: string[];
  createdAt: string;
  size: number;
}

export interface BackupResult {
  versionId: number;
  versionNumber: number;
  pruned: number;
  message: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  workflowId: string;
  fromVersion?: number;
  toVersionId: number;
  backupCreated: boolean;
  backupVersionId?: number;
  validationErrors?: string[];
}

export interface StorageStats {
  totalVersions: number;
  totalSize: number;
  totalSizeFormatted: string;
  byWorkflow: WorkflowStorageInfo[];
}

export interface WorkflowStorageInfo {
  workflowId: string;
  workflowName: string;
  versionCount: number;
  totalSize: number;
  lastBackup: string;
}

export interface VersionDiff {
  versionId1: number;
  versionId2: number;
  version1Number: number;
  version2Number: number;
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: string[];
  connectionChanges: number;
  settingChanges: Record<string, { old: any; new: any }>;
}
```

### Phase 3: Command Implementation

Create the `workflows versions` command following existing CLI patterns.

#### Files to Create

| File | Purpose |
|------|---------|
| `src/commands/workflows/versions.ts` | New `workflows versions` command |

#### Files to Modify

| File | Changes |
|------|---------|
| `src/commands/workflows/update.ts` | Replace `maybeBackupWorkflow` with versioning service |
| `src/commands/workflows/autofix.ts` | Replace file backup with versioning service |
| `src/commands/workflows/bulk.ts` | Add versioning before bulk operations |
| `src/cli.ts` | Register `versions` subcommand under `workflows` |

#### `src/commands/workflows/versions.ts`

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { getApiClient } from '../../core/api/client.js';
import { getUserDatabase } from '../../core/user-db/index.js';
import { WorkflowVersioningService } from '../../core/versioning/service.js';
import { formatTable } from '../../core/formatters/table.js';
import { outputJson } from '../../core/formatters/json.js';
import { icons } from '../../core/formatters/theme.js';
import { confirmAction } from '../../utils/prompts.js';
import { ExitCodes } from '../../utils/exit-codes.js';
import type { GlobalOptions } from '../../types/global-options.js';

interface VersionsOptions extends GlobalOptions {
  limit?: string;
  get?: string;
  rollback?: boolean;
  toVersion?: string;
  skipValidation?: boolean;
  compare?: string;
  delete?: string;
  deleteAll?: boolean;
  prune?: boolean;
  keep?: string;
  stats?: boolean;
  truncateAll?: boolean;
  force?: boolean;
  noBackup?: boolean;
  save?: string;
}

export function createVersionsCommand(): Command {
  return new Command('versions')
    .description('Manage workflow version history, rollback, and cleanup')
    .argument('[id]', 'Workflow ID')
    .option('-l, --limit <n>', 'Limit version history results', '10')
    .option('--get <version-id>', 'Get specific version details')
    .option('--rollback', 'Rollback to previous version')
    .option('--to-version <id>', 'Specific version ID for rollback')
    .option('--skip-validation', 'Skip validation before rollback')
    .option('--compare <v1,v2>', 'Compare two versions (comma-separated IDs)')
    .option('--delete <version-id>', 'Delete specific version')
    .option('--delete-all', 'Delete all versions for workflow')
    .option('--prune', 'Prune old versions')
    .option('--keep <n>', 'Keep N most recent versions (with --prune)', '5')
    .option('--stats', 'Show storage statistics')
    .option('--truncate-all', 'Delete ALL versions for ALL workflows')
    .option('--force, --yes', 'Skip confirmation prompts')
    .option('--no-backup', 'Skip creating backup before rollback')
    .option('-s, --save <path>', 'Save version to JSON file')
    .option('--json', 'Output as JSON')
    .action(versionsCommand);
}

async function versionsCommand(
  workflowId: string | undefined,
  opts: VersionsOptions
): Promise<void> {
  const db = getUserDatabase();
  const client = getApiClient();
  const service = new WorkflowVersioningService(db, client);

  try {
    // Handle --stats (no workflow ID required)
    if (opts.stats) {
      const stats = await service.getStorageStats();
      if (opts.json) {
        outputJson({ success: true, data: stats });
      } else {
        console.log(chalk.bold('\n📊 Version Storage Statistics\n'));
        console.log(`  Total versions: ${chalk.cyan(stats.totalVersions)}`);
        console.log(`  Total size: ${chalk.cyan(stats.totalSizeFormatted)}`);
        if (stats.byWorkflow.length > 0) {
          console.log(chalk.bold('\n  Per Workflow:\n'));
          const table = formatTable(stats.byWorkflow, [
            { key: 'workflowName', header: 'Workflow', width: 30 },
            { key: 'versionCount', header: 'Versions', width: 10 },
            { key: 'totalSize', header: 'Size', width: 10, format: formatBytes },
            { key: 'lastBackup', header: 'Last Backup', width: 20 }
          ]);
          console.log(table);
        }
      }
      return;
    }

    // Handle --truncate-all (no workflow ID required)
    if (opts.truncateAll) {
      if (!opts.force) {
        const confirmed = await confirmAction(
          'Delete ALL versions for ALL workflows? This cannot be undone.',
          'DELETE ALL'
        );
        if (!confirmed) {
          console.log(chalk.yellow('Aborted.'));
          process.exitCode = ExitCodes.SUCCESS;
          return;
        }
      }
      const result = await service.truncateAllVersions(true);
      if (opts.json) {
        outputJson({ success: true, data: result });
      } else {
        console.log(chalk.green(`${icons.success} ${result.message}`));
      }
      return;
    }

    // All other operations require workflow ID
    if (!workflowId) {
      console.error(chalk.red(`${icons.error} Workflow ID required`));
      process.exitCode = ExitCodes.USAGE;
      return;
    }

    // Handle --rollback
    if (opts.rollback) {
      if (!opts.force) {
        const target = opts.toVersion ? `version ${opts.toVersion}` : 'latest backup';
        const confirmed = await confirmAction(`Rollback workflow ${workflowId} to ${target}?`);
        if (!confirmed) {
          console.log(chalk.yellow('Aborted.'));
          return;
        }
      }

      const result = await service.restoreVersion(
        workflowId,
        opts.toVersion ? parseInt(opts.toVersion) : undefined,
        !opts.skipValidation
      );

      if (opts.json) {
        outputJson({ success: result.success, data: result, error: result.success ? undefined : result.message });
      } else if (result.success) {
        console.log(chalk.green(`${icons.success} ${result.message}`));
        if (result.backupCreated) {
          console.log(chalk.dim(`  📦 Backup created: version ${result.backupVersionId}`));
        }
      } else {
        console.error(chalk.red(`${icons.error} ${result.message}`));
        if (result.validationErrors) {
          result.validationErrors.forEach(e => console.error(chalk.red(`  - ${e}`)));
        }
        process.exitCode = ExitCodes.DATAERR;
      }
      return;
    }

    // Handle --compare
    if (opts.compare) {
      const [v1, v2] = opts.compare.split(',').map(v => parseInt(v.trim()));
      if (!v1 || !v2) {
        console.error(chalk.red(`${icons.error} Invalid compare format. Use: --compare 1,2`));
        process.exitCode = ExitCodes.USAGE;
        return;
      }
      const diff = await service.compareVersions(v1, v2);
      if (opts.json) {
        outputJson({ success: true, data: diff });
      } else {
        console.log(chalk.bold(`\n🔍 Version Comparison: v${diff.version1Number} → v${diff.version2Number}\n`));
        console.log(`  Added nodes: ${chalk.green(diff.addedNodes.length)}`);
        console.log(`  Removed nodes: ${chalk.red(diff.removedNodes.length)}`);
        console.log(`  Modified nodes: ${chalk.yellow(diff.modifiedNodes.length)}`);
        console.log(`  Connection changes: ${diff.connectionChanges}`);
      }
      return;
    }

    // Handle --prune
    if (opts.prune) {
      const keepCount = parseInt(opts.keep || '5');
      const result = await service.pruneVersions(workflowId, keepCount);
      if (opts.json) {
        outputJson({ success: true, data: result });
      } else {
        console.log(chalk.green(`${icons.success} Pruned ${result.pruned} old version(s), ${result.remaining} remaining`));
      }
      return;
    }

    // Handle --get
    if (opts.get) {
      const version = await service.getVersion(parseInt(opts.get));
      if (!version) {
        if (opts.json) {
          outputJson({ success: false, error: { code: 'VERSION_NOT_FOUND', message: `Version ${opts.get} not found` } });
        } else {
          console.error(chalk.red(`${icons.error} Version ${opts.get} not found`));
        }
        process.exitCode = ExitCodes.DATAERR;
        return;
      }
      if (opts.save) {
        const { writeFile } = await import('node:fs/promises');
        await writeFile(opts.save, JSON.stringify(version.workflowSnapshot, null, 2), 'utf8');
        console.log(chalk.green(`${icons.success} Saved version to ${opts.save}`));
      }
      if (opts.json) {
        outputJson({ success: true, data: version });
      } else {
        console.log(chalk.bold(`\n📋 Version ${version.versionNumber} Details\n`));
        console.log(`  Workflow: ${version.workflowName}`);
        console.log(`  Trigger: ${version.trigger}`);
        console.log(`  Created: ${version.createdAt}`);
        console.log(`  Size: ${formatBytes(JSON.stringify(version.workflowSnapshot).length)}`);
      }
      return;
    }

    // Default: list versions
    const versions = await service.getVersionHistory(workflowId, parseInt(opts.limit || '10'));
    
    if (opts.json) {
      outputJson({ success: true, data: { workflowId, versions, count: versions.length } });
    } else {
      console.log(chalk.bold(`\n📜 Version History for ${workflowId}\n`));
      if (versions.length === 0) {
        console.log(chalk.dim('  No versions found.'));
      } else {
        const table = formatTable(versions, [
          { key: 'versionNumber', header: 'Ver', width: 5 },
          { key: 'trigger', header: 'Trigger', width: 15 },
          { key: 'workflowName', header: 'Name', width: 30 },
          { key: 'size', header: 'Size', width: 10, format: formatBytes },
          { key: 'createdAt', header: 'Created', width: 20 }
        ]);
        console.log(table);
      }
    }
  } catch (error) {
    if (opts.json) {
      outputJson({ 
        success: false, 
        error: { 
          code: 'VERSION_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    } else {
      console.error(chalk.red(`${icons.error} ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
    process.exitCode = ExitCodes.GENERAL;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default createVersionsCommand;
```

#### Modifications to `src/commands/workflows/update.ts`

```typescript
// Add imports at top
import { getUserDatabase } from '../../core/user-db/index.js';
import { WorkflowVersioningService } from '../../core/versioning/service.js';

// Replace maybeBackupWorkflow (around line 67-68) with:
if (!opts.noBackup) {
  const db = getUserDatabase();
  const versioningService = new WorkflowVersioningService(db);
  const original = await client.getWorkflow(id);
  
  const backupResult = await versioningService.createBackup(id, original, {
    trigger: 'full_update',
    metadata: { source: opts.file, command: 'workflows update' }
  });
  
  if (!opts.quiet) {
    console.log(chalk.dim(`  📦 ${backupResult.message}`));
  }
}
```

#### Modifications to `src/commands/workflows/autofix.ts`

```typescript
// Add imports at top
import { getUserDatabase } from '../../core/user-db/index.js';
import { WorkflowVersioningService } from '../../core/versioning/service.js';

// Replace maybeBackupWorkflow (around line 179) with:
if (!opts.noBackup) {
  const db = getUserDatabase();
  const versioningService = new WorkflowVersioningService(db);
  
  const backupResult = await versioningService.createBackup(idOrFile, original, {
    trigger: 'autofix',
    fixTypes: fixes.map(f => f.type),
    metadata: { fixes: fixes.length, experimental: opts.experimental }
  });
  
  if (!opts.quiet) {
    console.log(chalk.dim(`  📦 ${backupResult.message}`));
  }
}
```

#### Modifications to `src/cli.ts`

```typescript
// In the workflows command registration section, add:
import { createVersionsCommand } from './commands/workflows/versions.js';

// Add to workflows command chain:
workflowsCommand.addCommand(createVersionsCommand());
```

---

## Testing Requirements

### Unit Tests (`src/core/versioning/__tests__/`)

| Test File | Coverage |
|-----------|----------|
| `service.test.ts` | createBackup, getVersionHistory, restoreVersion, deleteVersion, pruneVersions, compareVersions |
| `repository.test.ts` | Database CRUD operations, transaction handling |

**Test Cases:**
1. **Backup Creation**: Correct trigger type, auto-increment version number, auto-prune to 10
2. **Version Retrieval**: Newest-first order, limit parameter, null for missing versions
3. **Rollback**: Creates pre-rollback backup, validates workflow, returns validation errors, restores via API
4. **Comparison**: Identifies added/removed/modified nodes, detects connection changes

### Integration Tests (`test/integration/`)

| Test | Description |
|------|-------------|
| `versions-lifecycle.test.ts` | Create → Update → Backup → Rollback cycle |
| `versions-pruning.test.ts` | Create 15 versions, verify 10 remain |
| `versions-stats.test.ts` | Storage statistics accuracy |

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| **User Database** | **NEW** | `src/core/user-db/` - separate writable SQLite |
| **N8nApiClient** | ✅ Exists | `src/core/api/client.ts` - for getWorkflow/updateWorkflow |
| **Workflow Validator** | ❌ Missing | Port from MCP for pre-rollback validation |
| **Formatters** | ✅ Exists | `src/core/formatters/*.ts` - table, JSON output |
| **Exit Codes** | ✅ Exists | `src/utils/exit-codes.ts` - POSIX exit codes |
| **Prompts** | ✅ Exists | `src/utils/prompts.ts` - confirmation dialogs |
| **01-P0 Diff Engine** | Depends on this | Needs rollback for safe mutation |
| **04-P0 Autofix** | Depends on this | Needs version tracking for fix history |

---

## Files Summary

### Files to Create (12 files)

| Path | Purpose | LOC Est. |
|------|---------|----------|
| `src/core/user-db/adapter.ts` | Writable SQLite adapter | 80 |
| `src/core/user-db/schema.sql` | Version table schema | 25 |
| `src/core/user-db/migrations.ts` | Schema migration system | 60 |
| `src/core/user-db/index.ts` | Module exports | 10 |
| `src/core/versioning/service.ts` | Core versioning logic | 300 |
| `src/core/versioning/types.ts` | TypeScript interfaces | 80 |
| `src/core/versioning/repository.ts` | Database operations | 150 |
| `src/core/versioning/index.ts` | Module exports | 10 |
| `src/commands/workflows/versions.ts` | CLI command | 250 |
| `src/core/versioning/__tests__/service.test.ts` | Unit tests | 150 |
| `src/core/versioning/__tests__/repository.test.ts` | Repository tests | 100 |
| `test/integration/versions-lifecycle.test.ts` | Integration tests | 80 |

### Files to Modify (4 files)

| Path | Changes |
|------|---------|
| `src/cli.ts` | Register `versions` subcommand |
| `src/commands/workflows/update.ts` | Replace file backup with versioning |
| `src/commands/workflows/autofix.ts` | Replace file backup with versioning |
| `src/commands/workflows/bulk.ts` | Add versioning before bulk operations |

---

## Estimated Effort

| Component | Files | LOC | Days |
|-----------|-------|-----|------|
| User DB adapter | 4 | 175 | 0.5 |
| Versioning service | 4 | 540 | 1.5 |
| Versions command | 1 | 250 | 1 |
| Integration (update/autofix/bulk) | 3 | 50 | 0.5 |
| Tests | 3 | 330 | 0.5 |
| **Total** | **15** | **~1345** | **4 days** |

---

## Risk Mitigation

1. **Database Corruption**: Use WAL mode with proper synchronization
2. **Storage Bloat**: Auto-prune ensures max 10 versions per workflow
3. **Rollback Failure**: Always backup current state before rollback attempt
4. **Schema Changes**: Include migration system from day 1
5. **Concurrent Access**: SQLite handles concurrency via file locking

---

## Success Criteria

| Criterion | Verification Command |
|-----------|---------------------|
| ✅ List version history | `n8n workflows versions abc123` |
| ✅ Rollback to previous | `n8n workflows versions abc123 --rollback` |
| ✅ Auto-backup on update | `n8n workflows update abc123 --file new.json` |
| ✅ Auto-backup on autofix | `n8n workflows autofix abc123 --apply` |
| ✅ Auto-prune to 10 | Create 15 backups, verify 10 remain |
| ✅ Storage statistics | `n8n workflows versions --stats` |
| ✅ JSON output for agents | `n8n workflows versions abc123 --json` |
| ✅ Exit code on error | `$?` = 65 for version not found |
