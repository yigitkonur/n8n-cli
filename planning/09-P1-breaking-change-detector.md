# P1: Breaking Change Detector

## Priority: P1 (High)
## Status: Not Implemented in CLI
## MCP Source: `n8n-mcp/src/services/breaking-change-detector.ts`

---

## Business Value

**User Impact:** Prevents workflow failures during n8n upgrades by proactively identifying which nodes will break when their version changes. Users currently have no warning system—workflows fail silently after upgrades, requiring manual debugging.

**Workflow Improvement:** Enables confident version upgrades with actionable migration guidance. Instead of discovering issues post-upgrade, users receive severity-ranked breaking change reports with specific migration steps.

**Time Saved:** Eliminates hours of post-upgrade debugging by providing pre-upgrade analysis. Auto-migratable changes can be fixed automatically via integration with the autofix system, reducing manual intervention by 60-80% for common upgrade scenarios.

---

## CLI Architecture Overview

### Entry Point & Command Routing

The CLI follows a consistent `n8n <resource> <action> [options]` pattern as defined in README.md.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLI ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ENTRY POINT: src/cli.ts                                               │
│  └── Registers all command groups via Commander.js                     │
│      └── Each group: src/commands/<resource>/index.ts                  │
│                                                                         │
│  COMMAND ROUTING:                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ n8n workflows validate file.json --json                          │  │
│  │      ↓         ↓         ↓          ↓                            │  │
│  │  [resource] [action]  [arg]    [options]                         │  │
│  │      │         │                                                  │  │
│  │      └─────────┴──→ src/commands/workflows/validate.ts           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  SHARED MODULES:                                                        │
│  ├── src/core/api/client.ts         API client for n8n instance       │
│  ├── src/core/config/loader.ts      Config file + env vars            │
│  ├── src/core/db/nodes.ts           Node database (800+ bundled)      │
│  ├── src/core/validator.ts          Workflow validation logic         │
│  ├── src/core/fixer.ts              Autofix logic                     │
│  ├── src/core/formatters/*          Output formatting (table, JSON)   │
│  └── src/utils/*                    Errors, prompts, backup           │
│                                                                         │
│  GLOBAL OPTIONS (all commands):                                         │
│  ├── -V, --version                  Output version                     │
│  ├── -v, --verbose                  Debug output                       │
│  ├── -q, --quiet                    Suppress non-essential            │
│  ├── --no-color                     Disable colors                     │
│  ├── --profile <name>               Use config profile                 │
│  └── -h, --help                     Display help                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Existing Commands Reference

| Domain | Command | Syntax | Implementation File |
|--------|---------|--------|---------------------|
| **workflows** | list | `n8n workflows list [options]` | `src/commands/workflows/list.ts` |
| | get | `n8n workflows get <id> [options]` | `src/commands/workflows/get.ts` |
| | validate | `n8n workflows validate [idOrFile] [options]` | `src/commands/workflows/validate.ts` |
| | create | `n8n workflows create [options]` | `src/commands/workflows/create.ts` |
| | import | `n8n workflows import <file> [options]` | `src/commands/workflows/import.ts` |
| | export | `n8n workflows export <id> [options]` | `src/commands/workflows/export.ts` |
| | update | `n8n workflows update <id> [options]` | `src/commands/workflows/update.ts` |
| | trigger | `n8n workflows trigger <webhookUrl> [options]` | `src/commands/workflows/trigger.ts` |
| | tags | `n8n workflows tags <id> [options]` | `src/commands/workflows/tags.ts` |
| | autofix | `n8n workflows autofix <id> [options]` | `src/commands/workflows/autofix.ts` |
| | bulk ops | `n8n workflows activate/deactivate/delete [options]` | `src/commands/workflows/bulk.ts` |
| **nodes** | list | `n8n nodes list [options]` | `src/commands/nodes/list.ts` |
| | search | `n8n nodes search <query> [options]` | `src/commands/nodes/search.ts` |
| | show | `n8n nodes show <nodeType> [options]` | `src/commands/nodes/show.ts` |
| | categories | `n8n nodes categories [options]` | `src/commands/nodes/categories.ts` |
| | validate | `n8n nodes validate <nodeType> [options]` | `src/commands/nodes/validate.ts` |
| **credentials** | list | `n8n credentials list [options]` | `src/commands/credentials/list.ts` |
| | create | `n8n credentials create [options]` | `src/commands/credentials/create.ts` |
| | delete | `n8n credentials delete <id> [options]` | `src/commands/credentials/delete.ts` |
| | schema | `n8n credentials schema <typeName> [options]` | `src/commands/credentials/schema.ts` |
| | types | `n8n credentials types [options]` | `src/commands/credentials/types.ts` |
| | show-type | `n8n credentials show-type <typeName> [options]` | `src/commands/credentials/type-show.ts` |
| **executions** | list | `n8n executions list [options]` | `src/commands/executions/list.ts` |
| | get | `n8n executions get <id> [options]` | `src/commands/executions/get.ts` |
| | retry | `n8n executions retry <id> [options]` | `src/commands/executions/retry.ts` |
| | delete | `n8n executions delete <id> [options]` | `src/commands/executions/delete.ts` |
| **variables** | list | `n8n variables list [options]` | `src/commands/variables/list.ts` |
| | create | `n8n variables create [options]` | `src/commands/variables/create.ts` |
| | update | `n8n variables update <id> [options]` | `src/commands/variables/update.ts` |
| | delete | `n8n variables delete <id> [options]` | `src/commands/variables/delete.ts` |
| **tags** | list | `n8n tags list [options]` | `src/commands/tags/list.ts` |
| | get | `n8n tags get <id> [options]` | `src/commands/tags/get.ts` |
| | create | `n8n tags create [options]` | `src/commands/tags/create.ts` |
| | update | `n8n tags update <id> [options]` | `src/commands/tags/update.ts` |
| | delete | `n8n tags delete <id> [options]` | `src/commands/tags/delete.ts` |
| **templates** | search | `n8n templates search <query> [options]` | `src/commands/templates/search.ts` |
| | get | `n8n templates get <id> [options]` | `src/commands/templates/get.ts` |
| **auth** | login | `n8n auth login [options]` | `src/commands/auth/login.ts` |
| | logout | `n8n auth logout [options]` | `src/commands/auth/logout.ts` |
| | status | `n8n auth status [options]` | `src/commands/auth/status.ts` |
| **health** | - | `n8n health [options]` | `src/commands/health/index.ts` |
| **audit** | - | `n8n audit [options]` | `src/commands/audit/index.ts` |
| **config** | show | `n8n config show [options]` | `src/commands/config/index.ts` |
| **completion** | - | `n8n completion <shell>` | `src/commands/completion/index.ts` |

### Core Module Dependencies

| Module | Path | Purpose |
|--------|------|---------|
| API Client | `src/core/api/client.ts` | HTTP client for n8n REST API |
| Config Loader | `src/core/config/loader.ts` | Load `.n8nrc`, env vars, profiles |
| Node Repository | `src/core/db/nodes.ts` | SQLite access to 800+ bundled nodes |
| DB Adapter | `src/core/db/adapter.ts` | SQLite connection wrapper |
| Validator | `src/core/validator.ts` | Workflow structural validation |
| Native Validator | `src/core/n8n-native-validator.ts` | n8n parameter validation |
| Fixer | `src/core/fixer.ts` | Experimental autofix logic |
| JSON Parser | `src/core/json-parser.ts` | Robust JSON parsing with repair |
| Sanitizer | `src/core/sanitizer.ts` | Strip server fields from workflows |
| Source Location | `src/core/source-location.ts` | Map errors to file line numbers |
| n8n Loader | `src/core/n8n-loader.ts` | Dynamic n8n package loading |
| Credential Loader | `src/core/credential-loader.ts` | Load credential schemas |

### Formatter Modules

| Formatter | Path | Purpose |
|-----------|------|---------|
| Header | `src/core/formatters/header.ts` | CLI banner/header output |
| Table | `src/core/formatters/table.ts` | Tabular data formatting |
| JSON | `src/core/formatters/json.ts` | Structured JSON output |
| Tree | `src/core/formatters/tree.ts` | Hierarchical tree display |
| Summary | `src/core/formatters/summary.ts` | Summary blocks |
| Next Actions | `src/core/formatters/next-actions.ts` | Suggested next commands |
| Theme | `src/core/formatters/theme.ts` | Color theming |
| JQ Recipes | `src/core/formatters/jq-recipes.ts` | jq filter suggestions |

### Utility Modules

| Utility | Path | Purpose |
|---------|------|---------|
| Errors | `src/utils/errors.ts` | Custom error classes |
| Exit Codes | `src/utils/exit-codes.ts` | POSIX exit codes (0, 1, 64-78) |
| Backup | `src/utils/backup.ts` | Workflow backup before changes |
| Prompts | `src/utils/prompts.ts` | Interactive confirmation prompts |
| Output | `src/utils/output.ts` | Console output helpers |
| Node Type Normalizer | `src/utils/node-type-normalizer.ts` | Normalize node type strings |

---

## Current CLI Status

- **Implemented:** No
- **Location:** N/A
- **Gap Reason:** Multiple factors:
  1. **Missing Database Schema:** CLI's `src/core/db/nodes.ts` lacks `node_versions` and `version_property_changes` tables that MCP uses for tracking breaking changes across versions
  2. **No Registry System:** CLI has no equivalent to MCP's `breaking-changes-registry.ts` which catalogs known breaking changes for major nodes
  3. **Manual Fixer Pattern:** Current `src/core/fixer.ts` uses hardcoded, per-node fixes (Switch v3, If node) rather than a registry-driven approach
  4. **No Version Service:** CLI cannot query available versions or compare version metadata
  5. **No Dynamic Detection:** Cannot compare property schemas between versions to detect changes automatically

### Current CLI Fixer Approach (What We Have)

```typescript
@/Users/yigitkonur/n8n-workspace/cli/src/core/fixer.ts#28:64
const fixEmptyOptionsOnConditionalNodes: ExperimentalFix = {
  id: 'empty-options-if-switch',
  description: "Remove invalid empty 'options' field from the root parameters of If/Switch nodes.",
  apply(workflow: Workflow): FixResult {
    // ... hardcoded fix for specific nodes
  }
};
```

This manual approach:
- Requires code changes for each new breaking change
- Has no severity categorization
- Cannot analyze workflows before applying fixes
- Doesn't integrate with version upgrade analysis

---

## MCP Reference Implementation

### Architecture Overview

The MCP implements a 3-tier breaking change system:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BREAKING CHANGE SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: Registry (Static Knowledge)                          │
│  ├── breaking-changes-registry.ts                               │
│  │   └── BREAKING_CHANGES_REGISTRY[] - hardcoded known changes  │
│  │       ├── Execute Workflow 1.0→1.1 (inputFieldMapping)       │
│  │       ├── Webhook 1.0→2.0, 2.0→2.1 (webhookId, path)        │
│  │       ├── HTTP Request 4.1→4.2 (sendBody)                    │
│  │       ├── Code 1.0→2.0 (mode)                                │
│  │       ├── Schedule Trigger 1.0→1.1 (interval type)           │
│  │       └── Global * 1.0→2.0 (continueOnFail→onError)          │
│  │                                                               │
│  LAYER 2: Detector (Dynamic Analysis)                           │
│  ├── breaking-change-detector.ts                                 │
│  │   ├── getRegistryChanges() - pull from static registry       │
│  │   ├── detectDynamicChanges() - compare property schemas      │
│  │   ├── mergeChanges() - deduplicate registry + dynamic        │
│  │   └── analyzeVersionUpgrade() - full analysis with recs      │
│  │                                                               │
│  LAYER 3: Migration (Execution)                                  │
│  └── node-migration-service.ts                                   │
│      ├── migrateNode() - apply migration strategies             │
│      ├── applyMigration() - execute single change               │
│      │   ├── add_property - add with default                    │
│      │   ├── remove_property - remove deprecated                │
│      │   ├── rename_property - rename key                       │
│      │   └── set_default - set default if missing               │
│      └── validateMigratedNode() - verify result                 │
└─────────────────────────────────────────────────────────────────┘
```

### Source Files Deep Dive

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `n8n-mcp/src/services/breaking-changes-registry.ts` | 316 | Static registry of known breaking changes | `BREAKING_CHANGES_REGISTRY`, `getBreakingChangesForNode()`, `getAllChangesForNode()`, `getAutoMigratableChanges()`, `hasBreakingChanges()`, `getMigrationHints()`, `getNodesWithVersionMigrations()`, `getTrackedVersionsForNode()` |
| `n8n-mcp/src/services/breaking-change-detector.ts` | 322 | Detection logic combining registry + dynamic analysis | `BreakingChangeDetector`, `DetectedChange`, `VersionUpgradeAnalysis` |
| `n8n-mcp/src/services/node-migration-service.ts` | 411 | Applies migration strategies to nodes | `NodeMigrationService`, `MigrationResult`, `AppliedMigration` |
| `n8n-mcp/src/services/node-version-service.ts` | 378 | Version discovery, comparison, upgrade path suggestion | `NodeVersionService`, `NodeVersion`, `VersionComparison`, `UpgradePath`, `UpgradeStep` |
| `n8n-mcp/src/database/node-repository.ts` | 962 | Database access including version tables | `getNodeVersions()`, `getLatestNodeVersion()`, `getNodeVersion()`, `savePropertyChange()`, `getPropertyChanges()`, `getBreakingChanges()`, `getAutoMigratableChanges()` |
| `n8n-mcp/src/database/schema.sql` | 236 | Database schema with `node_versions` and `version_property_changes` tables | Table definitions with indexes |

### Key Types

```typescript
// n8n-mcp/src/services/breaking-changes-registry.ts
export interface BreakingChange {
  nodeType: string;                    // e.g., "n8n-nodes-base.executeWorkflow" or "*" for global
  fromVersion: string;                 // e.g., "1.0"
  toVersion: string;                   // e.g., "1.1"
  propertyName: string;                // e.g., "parameters.inputFieldMapping"
  changeType: 'added' | 'removed' | 'renamed' | 'type_changed' | 'requirement_changed' | 'default_changed';
  isBreaking: boolean;                 // true if workflow may fail without migration
  oldValue?: string;                   // for renamed/type_changed
  newValue?: string;                   // for renamed/type_changed
  migrationHint: string;               // human-readable guidance
  autoMigratable: boolean;             // true if can be auto-fixed
  migrationStrategy?: {
    type: 'add_property' | 'remove_property' | 'rename_property' | 'set_default';
    defaultValue?: any;
    sourceProperty?: string;           // for rename
    targetProperty?: string;           // for rename
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

// n8n-mcp/src/services/breaking-change-detector.ts
export interface DetectedChange {
  propertyName: string;
  changeType: 'added' | 'removed' | 'renamed' | 'type_changed' | 'requirement_changed' | 'default_changed';
  isBreaking: boolean;
  oldValue?: any;
  newValue?: any;
  migrationHint: string;
  autoMigratable: boolean;
  migrationStrategy?: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  source: 'registry' | 'dynamic';       // Where this change was detected
}

export interface VersionUpgradeAnalysis {
  nodeType: string;
  fromVersion: string;
  toVersion: string;
  hasBreakingChanges: boolean;
  changes: DetectedChange[];
  autoMigratableCount: number;
  manualRequiredCount: number;
  overallSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendations: string[];
}

// n8n-mcp/src/services/node-migration-service.ts
export interface MigrationResult {
  success: boolean;
  nodeId: string;
  nodeName: string;
  fromVersion: string;
  toVersion: string;
  appliedMigrations: AppliedMigration[];
  remainingIssues: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  updatedNode: any;
}

export interface AppliedMigration {
  propertyName: string;
  action: string;                       // "Added property", "Removed property", etc.
  oldValue?: any;
  newValue?: any;
  description: string;
}

// n8n-mcp/src/services/node-version-service.ts
export interface UpgradePath {
  nodeType: string;
  fromVersion: string;
  toVersion: string;
  direct: boolean;                      // Can upgrade directly or needs intermediate steps
  intermediateVersions: string[];       // If multi-step upgrade needed
  totalBreakingChanges: number;
  autoMigratableChanges: number;
  manualRequiredChanges: number;
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  steps: UpgradeStep[];
}
```

### Breaking Changes Registry Contents

```typescript
// n8n-mcp/src/services/breaking-changes-registry.ts (actual entries)
export const BREAKING_CHANGES_REGISTRY: BreakingChange[] = [
  // Execute Workflow Node 1.0 → 1.1
  {
    nodeType: 'n8n-nodes-base.executeWorkflow',
    fromVersion: '1.0', toVersion: '1.1',
    propertyName: 'parameters.inputFieldMapping',
    changeType: 'added', isBreaking: true, severity: 'HIGH',
    migrationHint: 'In v1.1+, requires explicit field mapping. Add "inputFieldMapping" with "mappings" array.',
    autoMigratable: true,
    migrationStrategy: { type: 'add_property', defaultValue: { mappings: [] } }
  },
  
  // Webhook Node 2.0 → 2.1
  {
    nodeType: 'n8n-nodes-base.webhook',
    fromVersion: '2.0', toVersion: '2.1',
    propertyName: 'webhookId',
    changeType: 'added', isBreaking: true, severity: 'HIGH',
    migrationHint: 'In v2.1+, requires unique "webhookId" field. UUID auto-generated if not provided.',
    autoMigratable: true,
    migrationStrategy: { type: 'add_property', defaultValue: null }  // UUID at runtime
  },
  
  // Webhook Node 1.0 → 2.0
  {
    nodeType: 'n8n-nodes-base.webhook',
    fromVersion: '1.0', toVersion: '2.0',
    propertyName: 'parameters.path',
    changeType: 'requirement_changed', isBreaking: true, severity: 'HIGH',
    migrationHint: 'In v2.0+, webhook path must be explicitly defined.',
    autoMigratable: false
  },
  
  // HTTP Request Node 4.1 → 4.2
  {
    nodeType: 'n8n-nodes-base.httpRequest',
    fromVersion: '4.1', toVersion: '4.2',
    propertyName: 'parameters.sendBody',
    changeType: 'requirement_changed', isBreaking: false, severity: 'MEDIUM',
    migrationHint: 'In v4.2+, "sendBody" must be explicitly true for POST/PUT/PATCH.',
    autoMigratable: true,
    migrationStrategy: { type: 'add_property', defaultValue: true }
  },
  
  // Code Node 1.0 → 2.0
  {
    nodeType: 'n8n-nodes-base.code',
    fromVersion: '1.0', toVersion: '2.0',
    propertyName: 'parameters.mode',
    changeType: 'added', isBreaking: false, severity: 'MEDIUM',
    migrationHint: 'v2.0 introduces execution modes: "runOnceForAllItems" (default) and "runOnceForEachItem".',
    autoMigratable: true,
    migrationStrategy: { type: 'add_property', defaultValue: 'runOnceForAllItems' }
  },
  
  // Schedule Trigger Node 1.0 → 1.1
  {
    nodeType: 'n8n-nodes-base.scheduleTrigger',
    fromVersion: '1.0', toVersion: '1.1',
    propertyName: 'parameters.rule.interval',
    changeType: 'type_changed', isBreaking: true, severity: 'HIGH',
    oldValue: 'string', newValue: 'array',
    migrationHint: 'Interval changed from string to array. Convert to: [{field: "hours", value: 1}]',
    autoMigratable: false
  },
  
  // Global: continueOnFail → onError
  {
    nodeType: '*',  // Applies to ALL nodes
    fromVersion: '1.0', toVersion: '2.0',
    propertyName: 'continueOnFail',
    changeType: 'removed', isBreaking: false, severity: 'MEDIUM',
    migrationHint: '"continueOnFail" deprecated. Use "onError" with "continueErrorOutput" or "continueRegularOutput".',
    autoMigratable: true,
    migrationStrategy: {
      type: 'rename_property',
      sourceProperty: 'continueOnFail',
      targetProperty: 'onError',
      defaultValue: 'continueErrorOutput'
    }
  }
];
```

### Database Schema (MCP)

```sql
-- n8n-mcp/src/database/schema.sql (Lines 149-210)

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
  properties_schema TEXT,               -- JSON schema for this version
  operations TEXT,
  credentials_required TEXT,
  outputs TEXT,
  minimum_n8n_version TEXT,
  breaking_changes TEXT,                -- JSON array
  deprecated_properties TEXT,           -- JSON array
  added_properties TEXT,                -- JSON array
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
  change_type TEXT NOT NULL CHECK(change_type IN (
    'added', 'removed', 'renamed', 'type_changed', 
    'requirement_changed', 'default_changed'
  )),
  is_breaking INTEGER DEFAULT 0,
  old_value TEXT,
  new_value TEXT,
  migration_hint TEXT,
  auto_migratable INTEGER DEFAULT 0,
  migration_strategy TEXT,              -- JSON
  severity TEXT CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Core Detection Algorithm

```typescript
// n8n-mcp/src/services/breaking-change-detector.ts (Lines 51-87)
async analyzeVersionUpgrade(
  nodeType: string,
  fromVersion: string,
  toVersion: string
): Promise<VersionUpgradeAnalysis> {
  // STEP 1: Get known changes from registry
  const registryChanges = this.getRegistryChanges(nodeType, fromVersion, toVersion);

  // STEP 2: Detect dynamic changes by comparing schemas
  const dynamicChanges = this.detectDynamicChanges(nodeType, fromVersion, toVersion);

  // STEP 3: Merge and deduplicate (registry takes precedence)
  const allChanges = this.mergeChanges(registryChanges, dynamicChanges);

  // STEP 4: Calculate statistics
  const hasBreakingChanges = allChanges.some(c => c.isBreaking);
  const autoMigratableCount = allChanges.filter(c => c.autoMigratable).length;
  const manualRequiredCount = allChanges.filter(c => !c.autoMigratable).length;

  // STEP 5: Determine overall severity (highest wins)
  const overallSeverity = this.calculateOverallSeverity(allChanges);

  // STEP 6: Generate actionable recommendations
  const recommendations = this.generateRecommendations(allChanges);

  return {
    nodeType, fromVersion, toVersion,
    hasBreakingChanges, changes: allChanges,
    autoMigratableCount, manualRequiredCount,
    overallSeverity, recommendations
  };
}
```

### Dynamic Change Detection

```typescript
// n8n-mcp/src/services/breaking-change-detector.ts (Lines 116-206)
private detectDynamicChanges(
  nodeType: string, fromVersion: string, toVersion: string
): DetectedChange[] {
  const oldVersionData = this.nodeRepository.getNodeVersion(nodeType, fromVersion);
  const newVersionData = this.nodeRepository.getNodeVersion(nodeType, toVersion);
  
  if (!oldVersionData || !newVersionData) return [];
  
  const changes: DetectedChange[] = [];
  
  // Flatten nested properties for comparison
  const oldProps = this.flattenProperties(oldVersionData.propertiesSchema || []);
  const newProps = this.flattenProperties(newVersionData.propertiesSchema || []);
  
  // Detect ADDED properties
  for (const propName of Object.keys(newProps)) {
    if (!oldProps[propName]) {
      const prop = newProps[propName];
      const isRequired = prop.required === true;
      changes.push({
        propertyName: propName,
        changeType: 'added',
        isBreaking: isRequired,  // Breaking only if required
        newValue: prop.type || 'unknown',
        migrationHint: isRequired
          ? `Property "${propName}" is now required in v${toVersion}.`
          : `Property "${propName}" was added in v${toVersion}. Optional.`,
        autoMigratable: !isRequired,
        severity: isRequired ? 'HIGH' : 'LOW',
        source: 'dynamic'
      });
    }
  }
  
  // Detect REMOVED properties
  for (const propName of Object.keys(oldProps)) {
    if (!newProps[propName]) {
      changes.push({
        propertyName: propName,
        changeType: 'removed',
        isBreaking: true,
        oldValue: oldProps[propName].type || 'unknown',
        migrationHint: `Property "${propName}" was removed in v${toVersion}.`,
        autoMigratable: true,
        migrationStrategy: { type: 'remove_property' },
        severity: 'MEDIUM',
        source: 'dynamic'
      });
    }
  }
  
  // Detect REQUIREMENT changes
  for (const propName of Object.keys(newProps)) {
    if (oldProps[propName]) {
      const oldRequired = oldProps[propName].required === true;
      const newRequired = newProps[propName].required === true;
      if (oldRequired !== newRequired) {
        changes.push({
          propertyName: propName,
          changeType: 'requirement_changed',
          isBreaking: newRequired && !oldRequired,  // Breaking if became required
          oldValue: oldRequired ? 'required' : 'optional',
          newValue: newRequired ? 'required' : 'optional',
          migrationHint: newRequired
            ? `Property "${propName}" is now required.`
            : `Property "${propName}" is now optional.`,
          autoMigratable: false,
          severity: newRequired ? 'HIGH' : 'LOW',
          source: 'dynamic'
        });
      }
    }
  }
  
  return changes;
}
```

### Migration Execution

```typescript
// n8n-mcp/src/services/node-migration-service.ts (Lines 110-132)
private applyMigration(node: any, change: DetectedChange): AppliedMigration | null {
  if (!change.migrationStrategy) return null;
  
  const { type, defaultValue, sourceProperty, targetProperty } = change.migrationStrategy;
  
  switch (type) {
    case 'add_property':
      return this.addProperty(node, change.propertyName, defaultValue, change);
    case 'remove_property':
      return this.removeProperty(node, change.propertyName, change);
    case 'rename_property':
      return this.renameProperty(node, sourceProperty!, targetProperty!, change);
    case 'set_default':
      return this.setDefault(node, change.propertyName, defaultValue, change);
    default:
      return null;
  }
}
```

---

## CLI Integration Path

### New CLI Commands (Following README Patterns)

This feature adds/enhances the following commands following the `n8n <resource> <action> [options]` pattern:

---

#### `nodes breaking-changes` (NEW)

Analyze breaking changes between node versions. **Offline - uses bundled registry.**

```bash
n8n nodes breaking-changes <nodeType> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--from <version>` | Source version | - |
| `--to <version>` | Target version (omit for latest) | latest |
| `--severity <level>` | Filter by severity: `LOW`, `MEDIUM`, `HIGH` | - |
| `--auto-only` | Show only auto-migratable changes | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

**Example usage:**
```bash
# Show all breaking changes from v1 to v2
n8n nodes breaking-changes httpRequest --from 4.1 --to 4.2 --json

# Show only HIGH severity changes
n8n nodes breaking-changes webhook --from 1.0 --severity HIGH

# Save analysis to file
n8n nodes breaking-changes executeWorkflow --from 1.0 --to 1.1 -s analysis.json
```

**Example JSON output:**
```json
{
  "nodeType": "n8n-nodes-base.executeWorkflow",
  "fromVersion": "1.0",
  "toVersion": "1.1",
  "hasBreakingChanges": true,
  "overallSeverity": "HIGH",
  "changes": [{
    "propertyName": "parameters.inputFieldMapping",
    "changeType": "added",
    "isBreaking": true,
    "severity": "HIGH",
    "autoMigratable": true,
    "migrationHint": "Add inputFieldMapping with mappings array"
  }],
  "autoMigratableCount": 1,
  "manualRequiredCount": 0,
  "recommendations": ["Run: n8n workflows autofix <file> --upgrade-versions"]
}
```

**Implementation file:** `src/commands/nodes/breaking-changes.ts` (NEW)

---

#### `nodes show` (ENHANCED)

Enhanced to show breaking changes with `--mode versions`.

```bash
n8n nodes show <nodeType> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--schema` | Show full property schema | - |
| `--minimal` | Show operations only | - |
| `--examples` | Show usage examples | - |
| `-m, --mode <mode>` | Output mode: `info`, `docs`, `versions`, `breaking` | `info` |
| `--from <version>` | **NEW:** For breaking mode, source version | - |
| `--to <version>` | **NEW:** For breaking mode, target version | - |
| `-d, --detail <level>` | Detail level: `minimal`, `standard`, `full` | `standard` |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

**New mode:**
```bash
# Show breaking changes between versions (alias for nodes breaking-changes)
n8n nodes show webhook --mode breaking --from 1.0 --to 2.1
```

**Implementation file:** `src/commands/nodes/show.ts` (MODIFY)

---

#### `workflows validate` (ENHANCED)

Enhanced to detect version upgrade impacts.

```bash
n8n workflows validate [idOrFile] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | Path to workflow JSON file | - |
| `--profile <profile>` | Validation profile: `minimal`, `runtime`, `ai-friendly`, `strict` | `runtime` |
| `--repair` | Attempt to repair malformed JSON | - |
| `--fix` | Auto-fix known issues | - |
| `--check-upgrades` | **NEW:** Check for breaking changes on version upgrade paths | - |
| `--upgrade-severity <level>` | **NEW:** Minimum severity to report: `LOW`, `MEDIUM`, `HIGH` | `MEDIUM` |
| `-s, --save <path>` | Save fixed workflow | - |
| `--json` | Output as JSON | - |

**New behavior with `--check-upgrades`:**
```bash
# Validate and check for breaking changes
n8n workflows validate workflow.json --check-upgrades --json
```

**Enhanced JSON output:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "upgradeAnalysis": {
    "nodesWithUpgrades": 2,
    "breakingChangesTotal": 3,
    "autoMigratableTotal": 2,
    "nodes": [{
      "nodeName": "Execute Workflow",
      "nodeType": "n8n-nodes-base.executeWorkflow",
      "currentVersion": "1.0",
      "latestVersion": "1.1",
      "breakingChanges": 1,
      "autoMigratable": 1,
      "severity": "HIGH"
    }]
  }
}
```

**Implementation file:** `src/commands/workflows/validate.ts` (MODIFY)

---

#### `workflows autofix` (ENHANCED)

Enhanced to apply version migrations.

```bash
n8n workflows autofix <idOrFile> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Preview fixes without applying | `true` |
| `--confidence <level>` | Minimum confidence: `high`, `medium`, `low` | `medium` |
| `--upgrade-versions` | **NEW:** Apply auto-migratable version upgrades | - |
| `--target-version <version>` | **NEW:** Target version for upgrades (default: latest) | latest |
| `-s, --save <path>` | Save fixed workflow locally | - |
| `--apply` | Apply fixes (to file or n8n server) | - |
| `--force, --yes` | Skip confirmation prompts | - |
| `--no-backup` | Skip creating backup before changes | - |
| `--json` | Output as JSON | - |

**New behavior with `--upgrade-versions`:**
```bash
# Preview version upgrade migrations
n8n workflows autofix workflow.json --upgrade-versions --dry-run

# Apply auto-migratable version upgrades
n8n workflows autofix workflow.json --upgrade-versions --apply --json
```

**Enhanced JSON output:**
```json
{
  "success": true,
  "fixesApplied": 3,
  "versionMigrations": [{
    "nodeName": "Execute Workflow",
    "fromVersion": "1.0",
    "toVersion": "1.1",
    "appliedMigrations": [{
      "propertyName": "parameters.inputFieldMapping",
      "action": "Added property",
      "newValue": { "mappings": [] }
    }],
    "remainingIssues": [],
    "confidence": "HIGH"
  }],
  "workflow": { /* updated workflow */ }
}
```

**Implementation file:** `src/commands/workflows/autofix.ts` (MODIFY)

---

### Files to Create

| File | Purpose | LOC Est. |
|------|---------|----------|
| `src/commands/nodes/breaking-changes.ts` | New command for breaking change analysis | ~150 |
| `src/core/versioning/types.ts` | TypeScript interfaces for breaking changes | ~80 |
| `src/core/versioning/breaking-changes-registry.ts` | Static registry of known breaking changes | ~350 |
| `src/core/versioning/breaking-change-detector.ts` | Detection logic (registry + dynamic) | ~300 |
| `src/core/versioning/migration-strategies.ts` | Apply migrations to nodes | ~200 |
| `src/core/versioning/node-version-service.ts` | Version comparison and upgrade paths | ~200 |
| `src/core/versioning/index.ts` | Barrel exports | ~10 |
| `src/core/db/schema.sql` | Database schema additions | ~30 |

### Files to Modify

| File | Change | Purpose |
|------|--------|---------|
| `src/cli.ts` | Register `nodes breaking-changes` command | Entry point |
| `src/commands/nodes/index.ts` | Add breaking-changes subcommand | Command group |
| `src/commands/nodes/show.ts` | Add `--mode breaking`, `--from`, `--to` options | Enhanced node show |
| `src/commands/workflows/validate.ts` | Add `--check-upgrades`, `--upgrade-severity` options | Enhanced validation |
| `src/commands/workflows/autofix.ts` | Add `--upgrade-versions`, `--target-version` options | Enhanced autofix |
| `src/core/db/nodes.ts` | Add `getNodeVersions()`, `getNodeVersion()`, `getPropertyChanges()` methods | Version data access |
| `src/core/db/adapter.ts` | Initialize new tables on startup | Schema migration |
| `src/core/validator.ts` | Import detector, add version warnings to validation | Validation integration |
| `src/core/fixer.ts` | Replace hardcoded fixes with registry-based migration | Unified fix approach |
| `src/core/formatters/index.ts` | Add breaking change output formatters | Output formatting |

### 3. Database Schema Additions

Add to CLI's database initialization (or create migration script):

```sql
-- Add to src/core/db/schema.sql (create if not exists)

CREATE TABLE IF NOT EXISTS node_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_type TEXT NOT NULL,
  version TEXT NOT NULL,
  package_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_current_max INTEGER DEFAULT 0,
  properties_schema TEXT,
  minimum_n8n_version TEXT,
  breaking_changes TEXT,
  deprecated_properties TEXT,
  added_properties TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(node_type, version)
);

CREATE TABLE IF NOT EXISTS version_property_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_type TEXT NOT NULL,
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  property_name TEXT NOT NULL,
  change_type TEXT NOT NULL,
  is_breaking INTEGER DEFAULT 0,
  migration_hint TEXT,
  auto_migratable INTEGER DEFAULT 0,
  migration_strategy TEXT,
  severity TEXT DEFAULT 'MEDIUM',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_node_versions_type ON node_versions(node_type);
CREATE INDEX idx_prop_changes_versions ON version_property_changes(node_type, from_version, to_version);
```

### 4. Minimal Implementation

#### Step 1: Create Types (`src/core/versioning/types.ts`)

```typescript
export type ChangeType = 'added' | 'removed' | 'renamed' | 'type_changed' | 'requirement_changed' | 'default_changed';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface MigrationStrategy {
  type: 'add_property' | 'remove_property' | 'rename_property' | 'set_default';
  defaultValue?: any;
  sourceProperty?: string;
  targetProperty?: string;
}

export interface BreakingChange {
  nodeType: string;
  fromVersion: string;
  toVersion: string;
  propertyName: string;
  changeType: ChangeType;
  isBreaking: boolean;
  severity: Severity;
  oldValue?: string;
  newValue?: string;
  migrationHint: string;
  autoMigratable: boolean;
  migrationStrategy?: MigrationStrategy;
}

export interface DetectedChange extends Omit<BreakingChange, 'nodeType' | 'fromVersion' | 'toVersion'> {
  source: 'registry' | 'dynamic';
}

export interface VersionUpgradeAnalysis {
  nodeType: string;
  fromVersion: string;
  toVersion: string;
  hasBreakingChanges: boolean;
  changes: DetectedChange[];
  autoMigratableCount: number;
  manualRequiredCount: number;
  overallSeverity: Severity;
  recommendations: string[];
}
```

#### Step 2: Port Registry (`src/core/versioning/breaking-changes-registry.ts`)

```typescript
import type { BreakingChange } from './types.js';

export const BREAKING_CHANGES_REGISTRY: BreakingChange[] = [
  // Copy all entries from n8n-mcp/src/services/breaking-changes-registry.ts
  // ...
];

export function getBreakingChangesForNode(
  nodeType: string, fromVersion: string, toVersion: string
): BreakingChange[] {
  return BREAKING_CHANGES_REGISTRY.filter(change => {
    const nodeMatches = change.nodeType === nodeType || change.nodeType === '*';
    const versionMatches = 
      compareVersions(fromVersion, change.fromVersion) >= 0 &&
      compareVersions(toVersion, change.toVersion) <= 0;
    return nodeMatches && versionMatches && change.isBreaking;
  });
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}
```

#### Step 3: Integrate with Validator (`src/core/validator.ts`)

```typescript
// Add import at top
import { getBreakingChangesForNode } from './versioning/breaking-changes-registry.js';
import { getNodeRepository } from './db/nodes.js';

// Add to validateWorkflowStructure() after node validation loop
// Check for breaking changes if typeVersion is outdated
if (node.typeVersion !== undefined && typeof node.type === 'string') {
  const repo = await getNodeRepository();
  const nodeInfo = repo.getNode(node.type);
  
  if (nodeInfo && nodeInfo.version) {
    const currentVersion = node.typeVersion.toString();
    const latestVersion = nodeInfo.version;
    
    if (compareVersions(currentVersion, latestVersion) < 0) {
      const breakingChanges = getBreakingChangesForNode(
        node.type, currentVersion, latestVersion
      );
      
      if (breakingChanges.length > 0) {
        const highSeverity = breakingChanges.filter(c => c.severity === 'HIGH');
        const autoMigratable = breakingChanges.filter(c => c.autoMigratable);
        
        issues.push({
          code: 'BREAKING_CHANGES_DETECTED',
          severity: highSeverity.length > 0 ? 'error' : 'warning',
          message: `Node "${nodeName}" v${currentVersion}→v${latestVersion} has ${breakingChanges.length} breaking change(s)`,
          location: { path: `${nodePath}.typeVersion`, nodeName, nodeType },
          context: {
            fromVersion: currentVersion,
            toVersion: latestVersion,
            totalChanges: breakingChanges.length,
            autoMigratable: autoMigratable.length,
            manualRequired: breakingChanges.length - autoMigratable.length,
            changes: breakingChanges.map(c => ({
              property: c.propertyName,
              severity: c.severity,
              hint: c.migrationHint
            }))
          },
          hint: `Run: n8n nodes show ${node.type} --breaking ${currentVersion} ${latestVersion}`
        });
      }
    }
  }
}
```

### 5. Command Interface

```bash
# Show breaking changes between versions
n8n nodes show httpRequest --breaking 3 4
n8n nodes show webhook --breaking 1.0 2.1

# Analyze workflow for all upgrade impacts
n8n workflows validate workflow.json --analyze-upgrades

# Dry-run auto-migration
n8n workflows autofix workflow.json --upgrade-versions --dry-run
```

### 6. Output Example

```
╔═══════════════════════════════════════════════════════════════════════════╗
║ ⚠️  Breaking Changes: n8n-nodes-base.executeWorkflow v1.0 → v1.1          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║ HIGH Severity (1):                                                        ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║ 1. Property Added: parameters.inputFieldMapping                          ║
║    Change: Required in v1.1+                                              ║
║    Migration: ✓ Auto-migratable                                           ║
║    Hint: Add "inputFieldMapping" object with "mappings" array defining    ║
║          how to map fields from parent to child workflow.                 ║
║                                                                           ║
║ MEDIUM Severity (1):                                                      ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║ 2. Behavior Changed: parameters.mode                                     ║
║    Old: Implicit "list" mode                                              ║
║    New: Default is now "static"                                           ║
║    Migration: ✗ Manual review required                                    ║
║    Hint: Ensure your workflow ID specification matches selected mode.     ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ Summary:                                                                  ║
║   Total changes: 2                                                        ║
║   Auto-migratable: 1                                                      ║
║   Manual required: 1                                                      ║
║   Overall severity: HIGH                                                  ║
║                                                                           ║
║ Recommendations:                                                          ║
║   ⚠ 1 breaking change(s) detected. Review carefully before applying.     ║
║   ✓ 1 change(s) can be automatically migrated.                            ║
║   ✋ 1 change(s) require manual intervention:                              ║
║     - parameters.mode: Ensure workflow ID matches selected mode.          ║
╚═══════════════════════════════════════════════════════════════════════════╝

Next Actions:
  • n8n workflows autofix workflow.json --upgrade-versions    Apply auto-migrations
  • n8n nodes show executeWorkflow --schema                   View full schema
```

---

## Dependencies

### Requires (This Feature Needs)

| Dependency | Status | Notes |
|------------|--------|-------|
| Node database with version info | Partial | CLI has nodes table but lacks `node_versions` table |
| NodeRepository version methods | Missing | Need `getNodeVersions()`, `getNodeVersion()` in CLI |
| Comparison utilities | Missing | Version comparison functions |

### Required By (Other Features Need This)

| Feature | Planning Doc | Why It Needs This |
|---------|--------------|-------------------|
| Node Version Service | `08-P1-node-version-service.md` | Version service depends on breaking change data |
| Advanced Autofix | `04-P0-autofix-enhancements.md` | `version-migration` fix type uses breaking change migrations |
| Workflow Validation | N/A | Add upgrade warnings during validation |
| Post-Update Validator | `13-P2-post-update-validator.md` | Verify migrations succeeded |

### Blocks (Features Waiting on This)

- Intelligent version upgrade autofix
- Pre-upgrade impact analysis
- Migration confidence scoring

---

## Testing Requirements

### Unit Tests

```typescript
// tests/core/versioning/breaking-change-detector.test.ts
describe('BreakingChangeDetector', () => {
  describe('getRegistryChanges', () => {
    it('returns changes for exact node type match');
    it('returns changes for wildcard (*) node type');
    it('filters by version range correctly');
    it('returns empty array for unknown node type');
  });
  
  describe('detectDynamicChanges', () => {
    it('detects added properties');
    it('detects removed properties');
    it('detects requirement changes (optional→required)');
    it('marks required additions as breaking');
    it('handles nested property paths');
  });
  
  describe('analyzeVersionUpgrade', () => {
    it('merges registry and dynamic changes');
    it('deduplicates overlapping changes');
    it('calculates overall severity correctly');
    it('generates meaningful recommendations');
  });
});

describe('MigrationStrategies', () => {
  describe('add_property', () => {
    it('adds property with default value');
    it('handles nested property paths');
    it('generates UUID for webhookId');
  });
  
  describe('remove_property', () => {
    it('removes deprecated property');
    it('returns null if property does not exist');
  });
  
  describe('rename_property', () => {
    it('moves value from old to new property');
    it('deletes old property after rename');
  });
});
```

### Integration Tests

```typescript
// tests/integration/breaking-changes.test.ts
describe('Breaking Change Integration', () => {
  it('detects Execute Workflow v1.0→v1.1 changes');
  it('detects Webhook v1.0→v2.1 multi-step changes');
  it('applies auto-migrations correctly');
  it('leaves non-auto-migratable changes for manual review');
  it('integrates with workflow validation');
  it('integrates with autofix command');
});
```

---

## Estimated Effort

| Task | Complexity | Files | LOC | Time |
|------|------------|-------|-----|------|
| Types + Registry | Low | 2 | ~350 | 0.5 day |
| Breaking Change Detector | Medium | 1 | ~300 | 1 day |
| Migration Strategies | Medium | 1 | ~250 | 0.5 day |
| Version Service | Medium | 1 | ~200 | 0.5 day |
| Database schema + repo methods | Low | 2 | ~100 | 0.5 day |
| Validator integration | Low | 1 | ~50 | 0.25 day |
| Fixer integration | Medium | 1 | ~100 | 0.5 day |
| Command enhancements | Low | 2 | ~100 | 0.5 day |
| Unit tests | Medium | 2 | ~400 | 1 day |
| Integration tests | Low | 1 | ~150 | 0.5 day |
| **Total** | **Medium** | **~14** | **~2000** | **~6 days** |

---

## Acceptance Criteria

### Functional

- [ ] `n8n nodes show <type> --breaking <from> <to>` displays breaking changes between versions
- [ ] `n8n workflows validate <file> --analyze-upgrades` reports all node version upgrade impacts
- [ ] Validation produces warnings/errors for nodes with breaking changes on upgrade path
- [ ] Autofix can apply auto-migratable changes via `--upgrade-versions` flag
- [ ] Registry covers all nodes listed in MCP's `BREAKING_CHANGES_REGISTRY`

### Technical

- [ ] `BreakingChangeDetector` class exists in `src/core/versioning/`
- [ ] `BREAKING_CHANGES_REGISTRY` exported from `src/core/versioning/breaking-changes-registry.ts`
- [ ] Database schema includes `node_versions` and `version_property_changes` tables
- [ ] Unit tests cover registry lookup, dynamic detection, and migration application
- [ ] Integration tests verify end-to-end breaking change flow

### Output

- [ ] Breaking change output follows box-drawing format shown in example
- [ ] JSON output available via `--json` flag
- [ ] Severity properly color-coded (HIGH=red, MEDIUM=yellow, LOW=blue)
- [ ] Recommendations are actionable with specific commands

---

## Why Not Implemented Currently

1. **Database Schema Gap:** The CLI inherited a simplified database schema from MCP without the `node_versions` and `version_property_changes` tables required for tracking version-specific breaking changes.

2. **Priority Trade-off:** Initial CLI focus was on core workflow operations (get, create, update, validate) rather than version intelligence features.

3. **Manual Fixer Pattern:** The `src/core/fixer.ts` was implemented as a quick solution for known issues (Switch v3) without building the registry infrastructure that would enable a scalable approach.

4. **Version Data Availability:** The current node database only stores the latest version's schema. Tracking historical versions requires either:
   - Seeding historical data from n8n source code
   - Building a version extraction pipeline
   - Hardcoding known changes (which MCP does via registry)

5. **No Upstream API:** n8n's public API does not expose version history or breaking change data, so this must be maintained manually.

---

## Implementation Guide

### How to Add New Commands (CLI Pattern)

The CLI uses Commander.js with a consistent pattern. To add the `nodes breaking-changes` command:

#### Step 1: Create Command File

```typescript
// src/commands/nodes/breaking-changes.ts
import { Command } from 'commander';
import { getNodeRepository } from '../../core/db/nodes.js';
import { BreakingChangeDetector } from '../../core/versioning/breaking-change-detector.js';
import { formatJSON, formatTable } from '../../core/formatters/index.js';
import { GlobalOptions } from '../../types/global-options.js';
import { ExitCodes } from '../../utils/exit-codes.js';

interface BreakingChangesOptions extends GlobalOptions {
  from?: string;
  to?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  autoOnly?: boolean;
  save?: string;
  json?: boolean;
}

export function createBreakingChangesCommand(): Command {
  return new Command('breaking-changes')
    .description('Analyze breaking changes between node versions')
    .argument('<nodeType>', 'Node type (e.g., httpRequest, webhook)')
    .option('--from <version>', 'Source version')
    .option('--to <version>', 'Target version (omit for latest)')
    .option('--severity <level>', 'Filter by severity: LOW, MEDIUM, HIGH')
    .option('--auto-only', 'Show only auto-migratable changes')
    .option('-s, --save <path>', 'Save to JSON file')
    .option('--json', 'Output as JSON')
    .action(async (nodeType: string, options: BreakingChangesOptions) => {
      try {
        const repo = await getNodeRepository();
        const detector = new BreakingChangeDetector(repo);
        
        const fromVersion = options.from || '1.0';
        const toVersion = options.to || repo.getNode(nodeType)?.version || 'latest';
        
        const analysis = await detector.analyzeVersionUpgrade(nodeType, fromVersion, toVersion);
        
        if (options.json) {
          console.log(formatJSON(analysis));
        } else {
          // Format as table/box output
          formatBreakingChangesOutput(analysis);
        }
        
        if (options.save) {
          // Save to file logic
        }
        
        process.exit(analysis.hasBreakingChanges ? ExitCodes.DATAERR : ExitCodes.SUCCESS);
      } catch (error) {
        // Error handling
      }
    });
}
```

#### Step 2: Register in Command Group

```typescript
// src/commands/nodes/index.ts
import { createBreakingChangesCommand } from './breaking-changes.js';

export function createNodesCommand(): Command {
  const nodes = new Command('nodes')
    .description('Search, list, and inspect n8n nodes (offline)');
  
  nodes.addCommand(createListCommand());
  nodes.addCommand(createSearchCommand());
  nodes.addCommand(createShowCommand());
  nodes.addCommand(createCategoriesCommand());
  nodes.addCommand(createValidateCommand());
  nodes.addCommand(createBreakingChangesCommand()); // ADD THIS
  
  return nodes;
}
```

#### Step 3: Add Types

```typescript
// src/types/breaking-changes.ts
export interface BreakingChangeAnalysis {
  nodeType: string;
  fromVersion: string;
  toVersion: string;
  hasBreakingChanges: boolean;
  overallSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  changes: DetectedChange[];
  autoMigratableCount: number;
  manualRequiredCount: number;
  recommendations: string[];
}

// Re-export from src/types/index.ts
export * from './breaking-changes.js';
```

### Command Routing Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMMAND ROUTING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  src/cli.ts (Entry Point)                                        │
│  └── program.addCommand(createNodesCommand())                    │
│      └── src/commands/nodes/index.ts                             │
│          └── nodes.addCommand(createBreakingChangesCommand())    │
│              └── src/commands/nodes/breaking-changes.ts          │
│                                                                  │
│  Route: n8n nodes breaking-changes httpRequest --from 4.1       │
│         ↓                                                        │
│         program → nodes → breaking-changes → action()            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Dependencies Pattern

Commands should import from core modules following this pattern:

```typescript
// Database access
import { getNodeRepository } from '../../core/db/nodes.js';

// Validation
import { validateWorkflowStructure } from '../../core/validator.js';

// Formatters
import { formatJSON, formatTable, formatTree } from '../../core/formatters/index.js';

// API client (for online commands)
import { createApiClient } from '../../core/api/client.js';

// Utilities
import { ExitCodes } from '../../utils/exit-codes.js';
import { CLIError } from '../../utils/errors.js';
import { createBackup } from '../../utils/backup.js';
import { confirmAction } from '../../utils/prompts.js';
```

### Output Formatting Pattern

All commands support `--json` for machine-readable output:

```typescript
// Human-readable output (default)
if (!options.json) {
  console.log(chalk.bold.yellow('⚠️  Breaking Changes Detected'));
  console.log(formatTable(analysis.changes, columns));
  console.log(formatNextActions(recommendations));
}

// JSON output (for agents/scripts)
if (options.json) {
  console.log(JSON.stringify({
    success: true,
    data: analysis
  }, null, 2));
}
```

### Exit Codes Usage

Follow POSIX exit codes from `src/utils/exit-codes.ts`:

```typescript
import { ExitCodes } from '../../utils/exit-codes.js';

// Success
process.exit(ExitCodes.SUCCESS);        // 0

// Validation errors (data issue)
process.exit(ExitCodes.DATAERR);        // 65

// Input file not found
process.exit(ExitCodes.NOINPUT);        // 66

// Network/API error
process.exit(ExitCodes.IOERR);          // 70

// Auth error
process.exit(ExitCodes.NOPERM);         // 73

// Config error
process.exit(ExitCodes.CONFIG);         // 78
```

### Testing Pattern

```typescript
// tests/commands/nodes/breaking-changes.test.ts
import { describe, it, expect } from 'vitest';
import { createBreakingChangesCommand } from '../../../src/commands/nodes/breaking-changes.js';

describe('nodes breaking-changes command', () => {
  it('analyzes version upgrade correctly', async () => {
    const result = await runCommand('nodes breaking-changes httpRequest --from 4.1 --to 4.2 --json');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"hasBreakingChanges"');
  });

  it('filters by severity', async () => {
    const result = await runCommand('nodes breaking-changes webhook --from 1.0 --severity HIGH --json');
    const data = JSON.parse(result.stdout);
    expect(data.changes.every(c => c.severity === 'HIGH')).toBe(true);
  });

  it('exits with DATAERR when breaking changes found', async () => {
    const result = await runCommand('nodes breaking-changes executeWorkflow --from 1.0 --to 1.1');
    expect(result.exitCode).toBe(65); // DATAERR
  });
});
```

---

## Documentation to Create

When this feature is implemented, update the following documentation:

| File | Section to Add |
|------|----------------|
| `README.md` | Add `nodes breaking-changes` to Commands section |
| `README.md` | Add `--check-upgrades` to `workflows validate` options |
| `README.md` | Add `--upgrade-versions` to `workflows autofix` options |
| `CHANGELOG.md` | Document new breaking change detection feature |

### README.md Addition Template

```markdown
#### `nodes breaking-changes`

Analyze breaking changes between node versions. **Offline - uses bundled registry.**

\`\`\`bash
n8n nodes breaking-changes <nodeType> [options]
\`\`\`

| Option | Description | Default |
|--------|-------------|---------|
| `--from <version>` | Source version | - |
| `--to <version>` | Target version (omit for latest) | latest |
| `--severity <level>` | Filter by severity: `LOW`, `MEDIUM`, `HIGH` | - |
| `--auto-only` | Show only auto-migratable changes | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

**Example:**
\`\`\`bash
# Show breaking changes from v1 to v2
n8n nodes breaking-changes webhook --from 1.0 --to 2.1 --json
\`\`\`
```
