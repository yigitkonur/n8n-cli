# P1: Node Version Service

## Priority: P1 (High)
## Status: Not Implemented in CLI
## MCP Source: `n8n-mcp/src/services/node-version-service.ts`

---

## Business Value

**User Impact:** n8n workflows often break silently when node typeVersions become outdated. Users currently have no visibility into which nodes need upgrades, what breaking changes exist between versions, or how to safely migrate. This leads to:
- **Production failures** when n8n upgrades deprecate old node versions
- **Wasted debugging time** tracking down version-related parameter issues
- **Fear of upgrading** n8n instances due to unknown breaking changes

**Time Saved:** Automated version analysis and upgrade recommendations eliminate hours of manual documentation research. The migration service can auto-apply 60-80% of version upgrades without manual intervention.

**Workflow Improvement:** Teams can proactively maintain workflow health by running periodic version audits, catching outdated nodes before they cause production issues.

---

## Current CLI Status

### Implemented: ❌ No

### Existing Related Code
| File | Purpose | Gap |
|------|---------|-----|
| `src/core/db/nodes.ts` | NodeRepository with basic getNode() | **No version methods** - only returns `version` field from nodes table, no multi-version tracking |
| `src/core/db/adapter.ts` | Read-only database adapter | **No write operations** - CLI DB is read-only, cannot populate version tables |
| `src/commands/nodes/show.ts` | Node info display | **Placeholder only** - `outputVersions()` at line 424 just says "requires API access" |
| `src/core/validator.ts` | Workflow validation | **No version checks** - validates structure but never checks if typeVersion is outdated |
| `src/core/fixer.ts` | Autofix capabilities | **No version upgrades** - only fixes options fields, no `typeversion-upgrade` fix type |

### Gap Reasons
1. **Database Schema Missing:** CLI's bundled `nodes.db` only has the `nodes` table. MCP's schema includes `node_versions` and `version_property_changes` tables that don't exist in CLI's database.

2. **Read-Only Architecture:** CLI's database adapter (`src/core/db/adapter.ts:86`) opens DB in `readonly: true` mode. Version data would need to be pre-populated during build/publish or fetched from external source.

3. **No Breaking Changes Registry:** MCP has `BREAKING_CHANGES_REGISTRY` (n8n-mcp/src/services/breaking-changes-registry.ts) with hardcoded known breaking changes. CLI has no equivalent.

4. **Dependency on Breaking Change Detector:** NodeVersionService requires BreakingChangeDetector for upgrade analysis, which also doesn't exist in CLI.

---

## CLI Command Reference

### Command Structure Overview

Following the CLI's `n8n <resource> <action> [options]` pattern from README.md:

| Domain | Pattern | Example |
|--------|---------|---------|
| `nodes` | `n8n nodes <action> [args] [options]` | `n8n nodes show httpRequest --versions` |
| `workflows` | `n8n workflows <action> [args] [options]` | `n8n workflows validate file.json --check-versions` |

### New Commands to Implement

#### `nodes show` (Enhanced)

Enhance existing `nodes show` command with version-related modes.

```bash
n8n nodes show <nodeType> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--versions` | Show all available versions with breaking change markers | - |
| `--mode versions` | Alias for `--versions` | - |
| `--breaking <from> <to>` | Show breaking changes between two versions | - |
| `--compare <from> <to>` | Compare two versions showing all differences | - |
| `--upgrade-path <from>` | Show recommended upgrade path from version | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

**Implementation File:** `src/commands/nodes/show.ts` (modify existing)

**Examples:**
```bash
# Show all versions for HTTP Request node
n8n nodes show n8n-nodes-base.httpRequest --versions

# Show breaking changes between versions
n8n nodes show n8n-nodes-base.httpRequest --breaking 1 4.2

# Get upgrade path from v1 to latest
n8n nodes show n8n-nodes-base.httpRequest --upgrade-path 1

# JSON output for AI agents
n8n nodes show n8n-nodes-base.httpRequest --versions --json
```

#### `nodes versions` (New Subcommand)

Alternative dedicated subcommand for version operations.

```bash
n8n nodes versions <nodeType> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--from <version>` | Starting version for comparison | (earliest) |
| `--to <version>` | Target version for comparison | (latest) |
| `--breaking-only` | Show only breaking changes | - |
| `--auto-migratable` | Show only auto-migratable changes | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

**Implementation File:** `src/commands/nodes/versions.ts` (new file)

#### `workflows validate` (Enhanced)

Enhance existing validate command with version checking.

```bash
n8n workflows validate [idOrFile] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--check-versions` | Check for outdated node typeVersions | - |
| `--version-severity <level>` | Minimum severity: `info`, `warning`, `error` | `warning` |
| `--skip-community-nodes` | Skip version checks for non-n8n-nodes-base | - |
| `--profile <profile>` | Existing: `minimal`, `runtime`, `ai-friendly`, `strict` | `runtime` |
| `--json` | Output as JSON | - |

**Implementation File:** `src/commands/workflows/validate.ts` (modify existing)

**Examples:**
```bash
# Validate with version checking
n8n workflows validate workflow.json --check-versions

# Only report breaking changes as errors
n8n workflows validate workflow.json --check-versions --version-severity error

# JSON output with version warnings
n8n workflows validate workflow.json --check-versions --json
```

#### `workflows autofix` (Enhanced)

Enhance existing autofix with version upgrade capability.

```bash
n8n workflows autofix <idOrFile> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--fix-types <types>` | Comma-separated fix types to apply | (all) |
| `--upgrade-versions` | Auto-upgrade outdated node typeVersions | - |
| `--confidence <level>` | Existing: `high`, `medium`, `low` | `medium` |
| `--dry-run` | Preview fixes without applying | `true` |
| `-s, --save <path>` | Save fixed workflow locally | - |
| `--apply` | Apply fixes to file or n8n server | - |
| `--force, --yes` | Skip confirmation prompts | - |
| `--no-backup` | Skip creating backup before changes | - |
| `--json` | Output as JSON | - |

**Fix Types:**
- `invalidOptions` - Fix invalid options fields (existing)
- `switchConditions` - Fix Switch v3+ rule conditions (existing)
- `fallbackOutput` - Fix Switch fallbackOutput location (existing)
- `typeversion-upgrade` - **NEW:** Upgrade outdated node typeVersions

**Implementation File:** `src/commands/workflows/autofix.ts` (modify existing)

**Examples:**
```bash
# Preview version upgrades (dry-run by default)
n8n workflows autofix workflow.json --upgrade-versions

# Apply all fixes including version upgrades
n8n workflows autofix workflow.json --apply --upgrade-versions

# Only apply version upgrades
n8n workflows autofix workflow.json --fix-types typeversion-upgrade --apply

# JSON output for AI agents
n8n workflows autofix workflow.json --upgrade-versions --json
```

### JSON Output Schema

All commands with `--json` follow CLI's standard output format:

```typescript
// Version analysis output (nodes show --versions --json)
interface VersionAnalysisOutput {
  success: true;
  data: {
    nodeType: string;
    currentVersion?: string;      // If checking specific version
    latestVersion: string;
    versions: {
      version: string;
      isLatest: boolean;
      hasBreakingChanges: boolean;
      releasedAt?: string;
      description?: string;
    }[];
    upgradePath?: {
      fromVersion: string;
      toVersion: string;
      steps: UpgradeStep[];
      estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  };
}

// Validation with version checking (workflows validate --check-versions --json)
interface ValidationWithVersionsOutput {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  versionIssues: {
    code: 'OUTDATED_TYPE_VERSION';
    severity: 'info' | 'warning' | 'error';
    nodeName: string;
    nodeType: string;
    currentVersion: string;
    latestVersion: string;
    hasBreakingChanges: boolean;
    autoMigratable: boolean;
    hint: string;
  }[];
}

// Autofix with version upgrades (workflows autofix --upgrade-versions --json)
interface AutofixWithVersionsOutput {
  success: true;
  data: {
    source: string;
    totalFixes: number;
    fixes: {
      type: string;
      count: number;
      description: string;
      details?: {
        nodeName: string;
        fromVersion: string;
        toVersion: string;
        appliedMigrations: string[];
        manualActionsRequired: string[];
      }[];
    }[];
    workflow?: object;  // If --apply used
  };
}
```

---

## CLI Architecture Overview

### Entry Point & Command Routing

```
src/cli.ts                        # Main entry point, Commander.js setup
├── Registers all command modules
├── Parses global options (--json, --verbose, --profile)
└── Routes to appropriate command handler

src/commands/                     # Command modules (one dir per resource)
├── nodes/                        # Offline commands (bundled database)
│   ├── show.ts                  # n8n nodes show <type>
│   ├── search.ts                # n8n nodes search <query>
│   ├── list.ts                  # n8n nodes list
│   ├── categories.ts            # n8n nodes categories
│   └── validate.ts              # n8n nodes validate <type>
├── workflows/                    # API + offline commands
│   ├── validate.ts              # n8n workflows validate (offline)
│   ├── autofix.ts               # n8n workflows autofix (offline)
│   ├── list.ts                  # n8n workflows list (API)
│   ├── get.ts                   # n8n workflows get (API)
│   └── ...                      
└── ...
```

### Shared Core Modules

```
src/core/                         # Shared business logic
├── db/
│   ├── adapter.ts               # SQLite database adapter (better-sqlite3)
│   └── nodes.ts                 # NodeRepository for node lookups
├── validator.ts                 # Workflow validation logic
├── fixer.ts                     # Autofix logic (ExperimentalFix pattern)
├── formatters/
│   ├── header.ts                # formatHeader() for CLI output
│   ├── table.ts                 # Table formatting
│   ├── json.ts                  # JSON output helpers
│   ├── next-actions.ts          # "Next Steps" suggestions
│   └── theme.ts                 # Colors, icons (chalk)
├── api/
│   └── client.ts                # n8n API client
└── config/
    └── loader.ts                # Config file loading (.n8nrc)

src/utils/                        # Utilities
├── errors.ts                    # Error types, printError()
├── exit-codes.ts                # POSIX exit codes
├── prompts.ts                   # confirmAction(), displayChangeSummary()
├── backup.ts                    # maybeBackupFile(), maybeBackupWorkflow()
└── output.ts                    # Output helpers

src/types/                        # TypeScript types
├── index.ts                     # Re-exports
├── config.ts                    # Config types
├── global-options.ts            # Global CLI options
├── n8n-api.ts                   # n8n API types
└── workflow-diff.ts             # Diff types
```

### Command Pattern

Every command follows this pattern:

```typescript
// src/commands/<resource>/<action>.ts
import { formatHeader, formatNextActions } from '../../core/formatters/index.js';
import { outputJson, saveToJson } from '../../core/formatters/json.js';
import { printError, N8nApiError } from '../../utils/errors.js';

interface CommandOptions {
  json?: boolean;
  save?: string;
  // ... command-specific options
}

export async function resourceActionCommand(
  arg: string,
  opts: CommandOptions
): Promise<void> {
  try {
    // 1. Execute business logic
    const result = await doSomething(arg, opts);
    
    // 2. JSON output path
    if (opts.json) {
      outputJson({ success: true, data: result });
      return;
    }
    
    // 3. Human-friendly output
    console.log(formatHeader({ title: '...', icon: '...', context: {...} }));
    // ... display results
    
    // 4. Save if requested
    if (opts.save) {
      await saveToJson(result, { path: opts.save });
    }
    
    // 5. Show next actions
    console.log(formatNextActions([...]));
    
  } catch (error) {
    if (error instanceof N8nApiError) {
      printError(error);
    } else {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
    }
    process.exitCode = 1;
  }
}
```

---

## Implementation Guide

### Files to Create

| File | Purpose | LOC Est |
|------|---------|---------|
| `src/core/versioning/index.ts` | Re-exports all version modules | ~20 |
| `src/core/versioning/types.ts` | TypeScript interfaces | ~80 |
| `src/core/versioning/breaking-changes-registry.ts` | Hardcoded breaking changes | ~200 |
| `src/core/versioning/breaking-change-detector.ts` | Change detection logic | ~200 |
| `src/core/versioning/node-version-service.ts` | Version analysis service | ~150 |
| `src/core/versioning/node-migration-service.ts` | Migration logic for autofix | ~250 |
| `src/commands/nodes/versions.ts` | (Optional) Dedicated versions command | ~150 |

### Files to Modify

| File | Modification | Lines Est |
|------|--------------|-----------|
| `src/commands/nodes/show.ts` | Add `--versions`, `--breaking`, `--upgrade-path` options | +80 |
| `src/commands/workflows/validate.ts` | Add `--check-versions` option | +40 |
| `src/commands/workflows/autofix.ts` | Add `--upgrade-versions`, `--fix-types` options | +60 |
| `src/core/fixer.ts` | Add `fixOutdatedTypeVersions` ExperimentalFix | +80 |
| `src/core/validator.ts` | Add version checking to validation loop | +40 |
| `src/core/db/nodes.ts` | (Optional) Add version query methods | +100 |

### Step-by-Step Implementation Plan

**Phase 1: Core Services (2 days)**

1. Create `src/core/versioning/types.ts` with interfaces
2. Copy breaking changes registry from MCP
3. Implement `BreakingChangeDetector` (registry-only for MVP)
4. Implement `NodeVersionService` (simplified, no DB)

**Phase 2: Validator Integration (0.5 day)**

1. Add `checkVersions` option to `ValidateOptions`
2. Add version checking loop in `validateWorkflowStructure()`
3. Add `--check-versions` flag to `validate.ts` command

**Phase 3: Fixer Integration (1 day)**

1. Implement `NodeMigrationService`
2. Add `fixOutdatedTypeVersions` ExperimentalFix
3. Add `--upgrade-versions` and `--fix-types` to autofix command

**Phase 4: Show Command Enhancement (0.5 day)**

1. Implement real `outputVersions()` in `nodes/show.ts`
2. Add `--versions`, `--breaking`, `--upgrade-path` options
3. (Optional) Create dedicated `nodes/versions.ts` command

**Phase 5: Testing (1 day)**

1. Unit tests for version services
2. Integration tests for commands
3. Test JSON output schemas

### Adding a New Command

To add a new command (e.g., `nodes versions`):

1. **Create command file:** `src/commands/nodes/versions.ts`
2. **Export the handler function:**
   ```typescript
   export async function nodesVersionsCommand(nodeType: string, opts: Options): Promise<void>
   ```
3. **Register in CLI:** Add to `src/cli.ts`:
   ```typescript
   nodes
     .command('versions <nodeType>')
     .description('Show available versions for a node type')
     .option('--from <version>', 'Starting version')
     .option('--to <version>', 'Target version')
     .option('--json', 'Output as JSON')
     .action(nodesVersionsCommand);
   ```
4. **Follow the command pattern** (error handling, JSON output, next actions)

### Core Dependencies

| Dependency | Module | Purpose |
|------------|--------|---------|
| `chalk` | `src/core/formatters/theme.ts` | Colors and icons |
| `better-sqlite3` | `src/core/db/adapter.ts` | SQLite database access |
| `commander` | `src/cli.ts` | Command parsing |
| Node.js built-ins | Various | fs, path, etc. |

---

## MCP Reference Implementation

### Architecture Overview
```
┌──────────────────────────────────────────────────────────────────┐
│                    MCP Version System                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐     ┌──────────────────────────┐        │
│  │ NodeVersionService  │────▶│ BreakingChangeDetector   │        │
│  │                     │     │                          │        │
│  │ • getLatestVersion  │     │ • analyzeVersionUpgrade  │        │
│  │ • analyzeVersion    │     │ • hasBreakingChanges     │        │
│  │ • suggestUpgradePath│     │ • getRegistryChanges     │        │
│  │ • compareVersions   │     │ • detectDynamicChanges   │        │
│  └────────┬────────────┘     └───────────┬──────────────┘        │
│           │                              │                        │
│           ▼                              ▼                        │
│  ┌─────────────────────┐     ┌──────────────────────────┐        │
│  │   NodeRepository    │     │BreakingChangesRegistry   │        │
│  │                     │     │                          │        │
│  │ • getNodeVersions   │     │ • BREAKING_CHANGES_REGISTRY│       │
│  │ • getNodeVersion    │     │ • getBreakingChangesForNode│       │
│  │ • getPropertyChanges│     │ • getAllChangesForNode   │        │
│  └────────┬────────────┘     └──────────────────────────┘        │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────────────────────────────────────────┐         │
│  │              SQLite Database                         │         │
│  │ • node_versions table                               │         │
│  │ • version_property_changes table                    │         │
│  └─────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

### Source Files Reference

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `n8n-mcp/src/services/node-version-service.ts` | 1-378 | Version tracking & analysis | `NodeVersionService`, `VersionComparison`, `UpgradePath` |
| `n8n-mcp/src/services/breaking-change-detector.ts` | 1-322 | Breaking change detection | `BreakingChangeDetector`, `DetectedChange`, `VersionUpgradeAnalysis` |
| `n8n-mcp/src/services/breaking-changes-registry.ts` | 1-316 | Known breaking changes | `BREAKING_CHANGES_REGISTRY`, `BreakingChange`, helper functions |
| `n8n-mcp/src/services/node-migration-service.ts` | 1-411 | Auto-migration logic | `NodeMigrationService`, `MigrationResult`, `AppliedMigration` |
| `n8n-mcp/src/database/node-repository.ts` | 466-741 | DB operations for versions | `saveNodeVersion`, `getNodeVersions`, `getPropertyChanges` |
| `n8n-mcp/src/database/schema.sql` | 149-210 | Database schema | `node_versions`, `version_property_changes` tables |

### Key Types (from MCP)

```typescript
// n8n-mcp/src/services/node-version-service.ts:11-22
export interface NodeVersion {
  nodeType: string;
  version: string;
  packageName: string;
  displayName: string;
  isCurrentMax: boolean;
  minimumN8nVersion?: string;
  breakingChanges: any[];
  deprecatedProperties: string[];
  addedProperties: string[];
  releasedAt?: Date;
}

// n8n-mcp/src/services/node-version-service.ts:24-34
export interface VersionComparison {
  nodeType: string;
  currentVersion: string;
  latestVersion: string;
  isOutdated: boolean;
  versionGap: number;           // How many versions behind
  hasBreakingChanges: boolean;
  recommendUpgrade: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

// n8n-mcp/src/services/node-version-service.ts:36-47
export interface UpgradePath {
  nodeType: string;
  fromVersion: string;
  toVersion: string;
  direct: boolean;              // Can upgrade directly or needs intermediate steps
  intermediateVersions: string[];
  totalBreakingChanges: number;
  autoMigratableChanges: number;
  manualRequiredChanges: number;
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  steps: UpgradeStep[];
}

// n8n-mcp/src/services/breaking-change-detector.ts:20-31
export interface DetectedChange {
  propertyName: string;
  changeType: 'added' | 'removed' | 'renamed' | 'type_changed' | 'requirement_changed' | 'default_changed';
  isBreaking: boolean;
  oldValue?: any;
  newValue?: any;
  migrationHint: string;
  autoMigratable: boolean;
  migrationStrategy?: MigrationStrategy;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  source: 'registry' | 'dynamic';
}

// n8n-mcp/src/services/breaking-changes-registry.ts:14-32
export interface BreakingChange {
  nodeType: string;
  fromVersion: string;
  toVersion: string;
  propertyName: string;
  changeType: 'added' | 'removed' | 'renamed' | 'type_changed' | 'requirement_changed' | 'default_changed';
  isBreaking: boolean;
  oldValue?: string;
  newValue?: string;
  migrationHint: string;
  autoMigratable: boolean;
  migrationStrategy?: {
    type: 'add_property' | 'remove_property' | 'rename_property' | 'set_default';
    defaultValue?: any;
    sourceProperty?: string;
    targetProperty?: string;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

### Database Schema (from n8n-mcp/src/database/schema.sql:149-210)

```sql
-- Node versions table for tracking all available versions
CREATE TABLE IF NOT EXISTS node_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_type TEXT NOT NULL,
  version TEXT NOT NULL,
  package_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_current_max INTEGER DEFAULT 0,
  properties_schema TEXT,
  operations TEXT,
  credentials_required TEXT,
  outputs TEXT,
  minimum_n8n_version TEXT,
  breaking_changes TEXT,
  deprecated_properties TEXT,
  added_properties TEXT,
  released_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(node_type, version)
);

-- Version property changes for detailed migration tracking
CREATE TABLE IF NOT EXISTS version_property_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_type TEXT NOT NULL,
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  property_name TEXT NOT NULL,
  change_type TEXT NOT NULL,
  is_breaking INTEGER DEFAULT 0,
  old_value TEXT,
  new_value TEXT,
  migration_hint TEXT,
  auto_migratable INTEGER DEFAULT 0,
  migration_strategy TEXT,
  severity TEXT DEFAULT 'MEDIUM',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Core Methods (from node-version-service.ts)

```typescript
export class NodeVersionService {
  private versionCache: Map<string, NodeVersion[]>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    private nodeRepository: NodeRepository,
    private breakingChangeDetector: BreakingChangeDetector
  ) {}

  // Get all available versions for a node type (with caching)
  getAvailableVersions(nodeType: string): NodeVersion[]

  // Get the latest version for a node type
  getLatestVersion(nodeType: string): string | null

  // Compare two versions numerically
  compareVersions(currentVersion: string, latestVersion: string): number

  // Analyze if a node version is outdated
  analyzeVersion(nodeType: string, currentVersion: string): VersionComparison

  // Suggest upgrade path with breaking change analysis
  async suggestUpgradePath(nodeType: string, currentVersion: string): Promise<UpgradePath | null>

  // Check if version exists
  versionExists(nodeType: string, version: string): boolean

  // Get version metadata
  getVersionMetadata(nodeType: string, version: string): NodeVersion | null

  // Cache management
  clearCache(nodeType?: string): void
}
```

### Breaking Changes Registry (Known Changes)

MCP maintains a hardcoded registry at `n8n-mcp/src/services/breaking-changes-registry.ts:37-190`:

```typescript
export const BREAKING_CHANGES_REGISTRY: BreakingChange[] = [
  // Execute Workflow v1.0 → v1.1
  {
    nodeType: 'n8n-nodes-base.executeWorkflow',
    fromVersion: '1.0',
    toVersion: '1.1',
    propertyName: 'parameters.inputFieldMapping',
    changeType: 'added',
    isBreaking: true,
    migrationHint: 'In v1.1+, requires explicit field mapping...',
    autoMigratable: true,
    migrationStrategy: { type: 'add_property', defaultValue: { mappings: [] } },
    severity: 'HIGH'
  },
  // ... more entries
];
```

### Data Flow

```
1. INPUT: Workflow node with typeVersion
   └── e.g., { type: "n8n-nodes-base.httpRequest", typeVersion: 1 }

2. VERSION ANALYSIS (NodeVersionService.analyzeVersion):
   ├── Query node_versions table for all versions of this node type
   ├── Find latest version (is_current_max = 1)
   ├── Compare current vs latest
   └── Return VersionComparison with isOutdated, versionGap, etc.

3. BREAKING CHANGE DETECTION (BreakingChangeDetector.analyzeVersionUpgrade):
   ├── Check BREAKING_CHANGES_REGISTRY for known changes
   ├── Dynamic detection: compare properties_schema between versions
   ├── Merge results, deduplicate, sort by severity
   └── Return changes[], autoMigratableCount, manualRequiredCount

4. UPGRADE PATH (NodeVersionService.suggestUpgradePath):
   ├── If versionGap > 1: calculate intermediate steps
   ├── For each step: analyze breaking changes
   ├── Determine direct vs multi-step upgrade
   └── Return UpgradePath with steps[] and estimatedEffort

5. OUTPUT: Upgrade recommendation with confidence level
```

---

## Dependencies

### Required By
- **Advanced Autofix (04-P0):** `typeversion-upgrade` fix type depends on this service
- **Breaking Change Detector (09-P1):** Uses same registry and detection logic
- **Post-Update Validator (13-P2):** Generates verification guidance after version upgrades

### Depends On
- **NodeRepository (existing):** `src/core/db/nodes.ts` for node type lookups
- **Validator (existing):** `src/core/validator.ts` integration point for version warnings
- **Fixer (existing):** `src/core/fixer.ts` for ExperimentalFix pattern

### Related Features
- **Node Migration Service:** Companion service for applying migrations
- **Workflow Versioning (02-P0):** Stores pre-upgrade workflow snapshots

---

## Testing Requirements

### Unit Tests

Create `src/core/versioning/__tests__/` directory:

```typescript
// node-version-service.test.ts
describe('NodeVersionService', () => {
  it('should detect outdated version', () => {
    const analysis = service.analyzeVersion('n8n-nodes-base.executeWorkflow', '1.0');
    expect(analysis.isOutdated).toBe(true);
    expect(analysis.latestVersion).toBe('1.1');
  });

  it('should report breaking changes', () => {
    const analysis = service.analyzeVersion('n8n-nodes-base.webhook', '2.0');
    expect(analysis.hasBreakingChanges).toBe(true);
  });

  it('should suggest upgrade path', async () => {
    const path = await service.suggestUpgradePath('n8n-nodes-base.httpRequest', '1');
    expect(path.direct).toBe(false);
    expect(path.intermediateVersions.length).toBeGreaterThan(0);
  });
});

// breaking-change-detector.test.ts
describe('BreakingChangeDetector', () => {
  it('should find registry changes', () => {
    const changes = detector.getRegistryChanges('n8n-nodes-base.executeWorkflow', '1.0', '1.1');
    expect(changes).toContainEqual(
      expect.objectContaining({ propertyName: 'parameters.inputFieldMapping' })
    );
  });

  it('should generate recommendations', async () => {
    const analysis = await detector.analyzeVersionUpgrade('n8n-nodes-base.webhook', '2.0', '2.1');
    expect(analysis.recommendations).toContain(expect.stringContaining('breaking'));
  });
});
```

### Integration Tests

```typescript
// workflows-validate-versions.test.ts
describe('Workflow Version Validation', () => {
  it('should warn about outdated nodes', () => {
    const workflow = {
      nodes: [{ type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1, name: 'Test', ... }],
      connections: {}
    };
    const result = validateWorkflowStructure(workflow, { checkVersions: true });
    expect(result.warnings).toContainEqual(
      expect.stringContaining('OUTDATED_TYPE_VERSION')
    );
  });
});

// workflows-autofix-versions.test.ts
describe('Autofix Version Upgrade', () => {
  it('should upgrade Execute Workflow from v1.0 to v1.1', () => {
    const workflow = {
      nodes: [{
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1,
        name: 'Execute',
        parameters: {}
      }],
      connections: {}
    };
    
    const result = applyExperimentalFixes(workflow);
    
    expect(result.fixed).toBe(1);
    expect(workflow.nodes[0].typeVersion).toBe(1.1);
    expect(workflow.nodes[0].parameters.inputFieldMapping).toEqual({ mappings: [] });
  });
});
```

---

## Acceptance Criteria

### Commands
- [ ] `n8n nodes show <node> --versions` displays available versions with breaking change markers
- [ ] `n8n nodes show <node> --breaking 1 2.1` shows breaking changes between versions
- [ ] `n8n nodes show <node> --upgrade-path 1` shows recommended upgrade path
- [ ] `n8n workflows validate <file> --check-versions` reports outdated typeVersions as warnings
- [ ] `n8n workflows autofix <file> --upgrade-versions` upgrades outdated nodes with auto-migration
- [ ] All commands support `--json` flag with structured output

### Output Format

**Human-friendly output:**
```
╔═══════════════════════════════════════════════════════════╗
║ 📊 Node Version Analysis: n8n-nodes-base.httpRequest      ║
╠═══════════════════════════════════════════════════════════╣
║ Current Version: 1                                        ║
║ Latest Version:  4.2                                      ║
║ Status:          ⚠️ Outdated                              ║
╠═══════════════════════════════════════════════════════════╣
║ Available Versions:                                       ║
║   • 4.2 (latest) - Added pagination support               ║
║   • 4.1          - Fixed timeout handling                 ║
║   • 4.0          - ⚠️ BREAKING: auth parameter renamed    ║
║   • 3.0          - Added retry logic                      ║
║   • 2.0          - ⚠️ BREAKING: response structure        ║
║   • 1.0          - Initial version                        ║
╠═══════════════════════════════════════════════════════════╣
║ Upgrade Recommendation: MEDIUM confidence                 ║
║ Breaking changes: 2 (v2.0, v4.0)                          ║
║ Auto-migratable: Yes (3 of 4 changes)                     ║
╚═══════════════════════════════════════════════════════════╝

╭─────────────────────────────────────────────────────────────╮
│ 📋 Next Steps                                                │
├─────────────────────────────────────────────────────────────┤
│ n8n nodes show httpRequest --breaking 1 4.2                 │
│   → View breaking changes between versions                  │
│ n8n workflows autofix workflow.json --upgrade-versions      │
│   → Auto-upgrade this node in a workflow                    │
╰─────────────────────────────────────────────────────────────╯
```

### Error Handling
- [ ] Graceful fallback when node not in registry (return "no version info available")
- [ ] Handle malformed typeVersion values (string, null, etc.)
- [ ] Skip version checks for community nodes (non n8n-nodes-base)
- [ ] Exit codes follow CLI standard (see README.md Exit Codes section)

---

## Estimated Effort

| Component | Complexity | Files | LOC | Time |
|-----------|------------|-------|-----|------|
| Types & interfaces | Low | 1 | ~80 | 0.5 day |
| Breaking changes registry | Low | 1 | ~200 (copy) | 0.5 day |
| NodeVersionService | Medium | 1 | ~150 | 1 day |
| BreakingChangeDetector | Medium | 1 | ~200 | 1 day |
| NodeMigrationService | Medium-High | 1 | ~250 | 1 day |
| Validator integration | Low | 1 | ~40 | 0.5 day |
| Fixer integration | Medium | 1 | ~80 | 0.5 day |
| Show command enhancement | Low | 1 | ~100 | 0.5 day |
| Tests | Medium | 2-3 | ~300 | 1 day |
| **Total** | **Medium-High** | **~10** | **~1,400** | **6-7 days** |

---

## Implementation Notes

### Why Registry-First Approach
The MCP implementation combines database queries with a hardcoded registry. For CLI, we recommend starting with **registry-only** because:
1. CLI's database is read-only and bundled at build time
2. Breaking changes are relatively stable (don't change often)
3. Avoids complex database migration/update processes
4. Can expand to DB-backed later when version data is more complete

### Caching Strategy
Port the MCP caching pattern (5-minute TTL) to avoid repeated expensive operations, especially if we later add DB queries.

### Version Number Handling
n8n typeVersions can be integers (1, 2, 3) or decimals (1.1, 2.1, 4.2). The MCP handles this with a `compareVersions()` method that splits on `.` and compares numerically. Port this exactly.

### Migration Safety
Always recommend `--dry-run` before applying version upgrades. The MCP's migration service tracks `remainingIssues` for changes that can't be auto-migrated - surface these clearly to users.

### CLI Output Conventions
Follow existing patterns from `src/core/formatters/`:
- Use `formatHeader()` for box-style headers
- Use `formatNextActions()` for suggested next commands
- Use `outputJson()` for `--json` flag handling
- Use `saveToJson()` for `--save` flag handling
