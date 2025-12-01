# P2: Node Detail Modes

## Priority: P2 (Medium)
## Status: Partially Implemented in CLI, Full Implementation in MCP
## Estimated Effort: 2-3 days (Medium complexity)

---

## Business Value

**User Impact:** Developers and automation engineers need flexible ways to query node information based on their current task context. A quick overview requires ~200 tokens while debugging complex configurations may need full 8K+ token schemas. Progressive detail levels reduce cognitive load, API costs (for AI agents), and improve response times.

**Workflow Improvement:** Currently, `nodes show` returns all information regardless of need. Users must manually filter output or run multiple commands. With detail modes, a single command adapts output to task requirements—from quick reference lookups to comprehensive debugging sessions.

**Time Saved:** Estimated 60% reduction in output parsing time for simple lookups. AI agents using CLI can reduce token costs by 80-90% when using minimal/standard modes instead of full dumps.

---

## CLI Architecture Overview

### Entry Point & Command Registration

```
src/cli.ts                           # Main entry point, Commander.js program setup
    ↓
src/commands/<domain>/index.ts       # Domain command registration (e.g., nodes, workflows)
    ↓
src/commands/<domain>/<action>.ts    # Individual command handlers
```

### Command Pattern (from README.md)

The CLI follows a predictable resource-action pattern:

```bash
n8n <resource> <action> [arguments] [options]
```

**Resources:** `workflows`, `nodes`, `credentials`, `executions`, `variables`, `tags`, `templates`, `audit`, `auth`, `health`, `config`, `completion`

### Global Options (all commands)

| Option | Description |
|--------|-------------|
| `-V, --version` | Output version number |
| `-v, --verbose` | Enable verbose/debug output |
| `-q, --quiet` | Suppress non-essential output |
| `--no-color` | Disable colored output |
| `--profile <name>` | Use specific configuration profile |
| `--json` | Output as JSON (machine-readable) |
| `-h, --help` | Display help |

### Core Shared Modules

| Module | Path | Purpose |
|--------|------|---------|
| API Client | `src/core/api/client.ts` | HTTP client for n8n API |
| Config Loader | `src/core/config/loader.ts` | Profile and env var loading |
| Formatters | `src/core/formatters/*.ts` | Output formatting (table, JSON, tree) |
| Validator | `src/core/validator.ts` | Workflow/node validation |
| Node Repository | `src/core/db/nodes.ts` | SQLite-based node database |
| Utilities | `src/utils/*.ts` | Errors, prompts, output helpers |

---

## Current CLI Status

### Implemented Features ✅

**Location:** `src/commands/nodes/show.ts`

| Command | Status | File |
|---------|--------|------|
| `n8n nodes show <nodeType>` | ✅ Basic | `src/commands/nodes/show.ts` |
| `n8n nodes show --schema` | ✅ Works | → `--detail full` equivalent |
| `n8n nodes show --minimal` | ✅ Works | → `--detail minimal` equivalent |
| `n8n nodes show --examples` | ✅ Works | Shows usage examples |
| `n8n nodes show --mode docs` | ⚠️ Basic | Missing enhanced docs from DB |
| `n8n nodes show --mode versions` | ⚠️ Stub | Returns "requires API access" |
| `n8n nodes show --json` | ✅ Works | JSON output |
| `n8n nodes show --save <path>` | ✅ Works | Save to file |

### Current Implementation

```typescript
// src/commands/nodes/show.ts:18-26 — Current options interface
interface ShowOptions {
  schema?: boolean;
  minimal?: boolean;
  examples?: boolean;
  mode?: string;
  detail?: string;
  save?: string;
  json?: boolean;
}
```

### Gap Analysis

| Feature | MCP Status | CLI Status | Gap Reason |
|---------|------------|------------|------------|
| `--detail minimal` | ✅ ~200 tokens | ⚠️ Basic | Missing `workflowNodeType`, flags |
| `--detail standard` | ✅ ~1-2K tokens | ⚠️ Basic | Missing `versionInfo`, `examples` |
| `--detail full` | ✅ ~3-8K tokens | ✅ Works | Functional via `--schema` |
| `--mode info` | ✅ Default | ✅ Default | Works |
| `--mode docs` | ✅ Markdown | ⚠️ Basic | Missing enhanced docs from DB |
| `--mode search-properties` | ✅ Full | ❌ Missing | Not implemented |
| `--mode versions` | ✅ Full history | ⚠️ Stub | Returns "requires API access" |
| `--mode compare` | ✅ Property diff | ❌ Missing | Not implemented |
| `--mode breaking` | ✅ Breaking only | ❌ Missing | Not implemented |
| `--mode migrations` | ✅ Auto-migrate | ❌ Missing | Not implemented |
| `--include-type-info` | ✅ Type metadata | ❌ Missing | Not implemented |
| `--include-examples` | ✅ Template configs | ❌ Missing | Not implemented |

---

## Command Reference (Target Implementation)

### Primary Command: `nodes show`

```bash
n8n nodes show <nodeType> [options]
```

**Purpose:** Show node details with configurable detail level and specialized modes.

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --detail <level>` | Detail level: `minimal`, `standard`, `full` | `standard` |
| `-m, --mode <mode>` | Operation mode (see table below) | `info` |
| `--query <term>` | Property search term (for `search-properties` mode) | - |
| `--from <version>` | Source version (for `compare`, `breaking`, `migrations`) | - |
| `--to <version>` | Target version (for `compare`, `migrations`) | - |
| `--max-results <n>` | Max property search results | `20` |
| `--include-type-info` | Include type structure metadata | - |
| `--include-examples` | Include real-world configuration examples | - |
| `--schema` | **Legacy.** Equivalent to `--detail full` | - |
| `--minimal` | **Legacy.** Equivalent to `--detail minimal` | - |
| `--examples` | **Legacy.** Equivalent to `--include-examples` | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

### Operation Modes

| Mode | Purpose | Required Options |
|------|---------|------------------|
| `info` | Node configuration schema (default) | - |
| `docs` | Markdown documentation | - |
| `search-properties` | Find properties by query | `--query` |
| `versions` | Complete version history | - |
| `compare` | Property diff between versions | `--from`, optionally `--to` |
| `breaking` | Breaking changes only | `--from`, optionally `--to` |
| `migrations` | Auto-migratable changes | `--from`, `--to` |

### Usage Examples (README.md Style)

```bash
# Detail levels (mode=info is default)
n8n nodes show httpRequest                         # Default: standard (~1-2K tokens)
n8n nodes show httpRequest --detail minimal        # Quick overview (~200 tokens)
n8n nodes show httpRequest --detail full           # Everything (~3-8K tokens)
n8n nodes show httpRequest --schema                # Legacy: same as --detail full

# Specialized modes
n8n nodes show httpRequest --mode docs             # Markdown documentation
n8n nodes show httpRequest --mode search-properties --query "auth"
n8n nodes show httpRequest --mode versions         # Version history
n8n nodes show httpRequest --mode compare --from 3 --to 4
n8n nodes show httpRequest --mode breaking --from 3
n8n nodes show httpRequest --mode migrations --from 3 --to 4

# Include options (combine with any mode)
n8n nodes show httpRequest --include-type-info     # Add type metadata
n8n nodes show httpRequest --include-examples      # Add real-world examples

# Output options (standard across all CLI commands)
n8n nodes show httpRequest --detail full --json    # JSON output
n8n nodes show httpRequest --save node-info.json   # Save to file
```

---

## MCP Reference Implementation

### Core Source Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `n8n-mcp/src/mcp/tools.ts:59-111` | Tool definition with all parameters | `get_node` tool schema |
| `n8n-mcp/src/mcp/server.ts:2311-2354` | Main handler routing | `getNode()` method |
| `n8n-mcp/src/mcp/server.ts:2359-2434` | Info mode handler | `handleInfoMode()` |
| `n8n-mcp/src/mcp/server.ts:2439-2469` | Version mode handler | `handleVersionMode()` |
| `n8n-mcp/src/services/property-filter.ts` | Essential property extraction | `PropertyFilter.getEssentials()` |
| `n8n-mcp/src/services/node-version-service.ts` | Version management | `NodeVersionService` class |
| `n8n-mcp/src/services/example-generator.ts` | Example generation | `ExampleGenerator` class |
| `n8n-mcp/src/mcp/tool-docs/configuration/get-node.ts` | Tool documentation | Usage patterns |

### MCP Tool Definition (Authoritative)

```typescript
// n8n-mcp/src/mcp/tools.ts:59-111
{
  name: 'get_node',
  description: `Get node info with progressive detail levels and multiple modes...`,
  inputSchema: {
    properties: {
      nodeType: { type: 'string', description: 'Full node type: "nodes-base.httpRequest"' },
      detail: {
        type: 'string',
        enum: ['minimal', 'standard', 'full'],
        default: 'standard',
        description: 'minimal (~200 tokens), standard (~1-2K), full (~3-8K)'
      },
      mode: {
        type: 'string',
        enum: ['info', 'docs', 'search_properties', 'versions', 'compare', 'breaking', 'migrations'],
        default: 'info'
      },
      includeTypeInfo: { type: 'boolean', default: false },
      includeExamples: { type: 'boolean', default: false },
      fromVersion: { type: 'string' },
      toVersion: { type: 'string' },
      propertyQuery: { type: 'string' },
      maxPropertyResults: { type: 'number', default: 20 }
    },
    required: ['nodeType']
  }
}
```

### MCP Data Flow

```
User Request → get_node(nodeType, detail, mode, ...)
                        ↓
              [Normalize nodeType via NodeTypeNormalizer]
                        ↓
              [Route by mode]
                        ↓
         ┌──────────────┴──────────────┐
     mode='info'                 mode='versions|compare|...'
         ↓                              ↓
   handleInfoMode()             handleVersionMode()
         ↓                              ↓
   [Route by detail]            [Get version data from DB]
         ↓                              ↓
  minimal: getNode()            getVersionHistory()
  standard: getNodeEssentials()  compareVersions()
  full: getNodeInfo()           getBreakingChanges()
         ↓                       getMigrations()
   [Optional enrichment]
   - includeTypeInfo → enrichPropertiesWithTypeInfo()
   - includeExamples → query template_node_configs
         ↓
   Return NodeInfoResponse
```

### Key MCP Services to Port

#### 1. PropertyFilter (Essential Properties)

```typescript
// n8n-mcp/src/services/property-filter.ts:32-177
// Pre-defined essential properties for common nodes
private static ESSENTIAL_PROPERTIES: Record<string, EssentialConfig> = {
  'nodes-base.httpRequest': {
    required: ['url'],
    common: ['method', 'authentication', 'sendBody', 'contentType', 'sendHeaders'],
    categoryPriority: ['basic', 'authentication', 'request', 'response', 'advanced']
  },
  // ... 20+ curated node configurations
};

// Usage: Reduces 200+ properties to 10-20 essential ones
static getEssentials(allProperties: any[], nodeType: string): FilteredProperties
static searchProperties(allProperties: any[], query: string, maxResults: number): SimplifiedProperty[]
```

#### 2. NodeVersionService (Version Management)

```typescript
// n8n-mcp/src/services/node-version-service.ts:59-377
export class NodeVersionService {
  getAvailableVersions(nodeType: string): NodeVersion[]
  getLatestVersion(nodeType: string): string | null
  analyzeVersion(nodeType: string, currentVersion: string): VersionComparison
  suggestUpgradePath(nodeType: string, currentVersion: string): UpgradePath | null
  versionExists(nodeType: string, version: string): boolean
}
```

#### 3. ExampleGenerator (Real-World Examples)

```typescript
// n8n-mcp/src/services/example-generator.ts:14-977
static getExamples(nodeType: string, essentials?: any): NodeExamples
static getTaskExample(nodeType: string, task: string): Record<string, any> | undefined
```

---

## Implementation Guide

### Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/commands/nodes/show.ts` | **MODIFY** | Add mode router, detail levels, new options |
| `src/core/db/nodes.ts` | **MODIFY** | Add version query methods |
| `src/core/services/property-filter.ts` | **CREATE** | Port from MCP |
| `src/core/services/node-version-service.ts` | **CREATE** | Port from MCP |
| `src/core/services/example-generator.ts` | **CREATE** | Port from MCP |
| `src/core/formatters/node-docs.ts` | **CREATE** | Markdown docs formatter |
| `src/core/formatters/version-diff.ts` | **CREATE** | Version comparison output |
| `src/types/node-detail.ts` | **CREATE** | Type definitions for detail modes |

### File Structure After Implementation

```
src/
├── commands/
│   └── nodes/
│       ├── show.ts                    # MODIFY: Add all 7 modes
│       ├── list.ts                    # Existing
│       ├── search.ts                  # Existing
│       ├── categories.ts              # Existing
│       └── validate.ts                # Existing
├── core/
│   ├── db/
│   │   └── nodes.ts                   # MODIFY: Add version methods
│   ├── services/                      # NEW DIRECTORY
│   │   ├── property-filter.ts         # NEW: Port from MCP
│   │   ├── node-version-service.ts    # NEW: Port from MCP
│   │   └── example-generator.ts       # NEW: Port from MCP
│   ├── formatters/
│   │   ├── node-docs.ts               # NEW: Markdown docs formatter
│   │   ├── version-diff.ts            # NEW: Version comparison output
│   │   ├── header.ts                  # Existing
│   │   ├── table.ts                   # Existing
│   │   ├── json.ts                    # Existing
│   │   └── index.ts                   # MODIFY: Export new formatters
│   └── validator.ts                   # Existing
├── types/
│   ├── node-detail.ts                 # NEW: Detail mode types
│   └── index.ts                       # MODIFY: Export new types
└── utils/
    ├── node-type-normalizer.ts        # Existing
    └── output.ts                      # Existing
```

### Phase 1: Enhanced Detail Levels (1 day)

#### 1.1 Update ShowOptions Interface

```typescript
// src/commands/nodes/show.ts — Replace existing ShowOptions
interface ShowOptions {
  // Detail levels (mutually exclusive with legacy flags)
  detail?: 'minimal' | 'standard' | 'full';
  
  // Operation modes
  mode?: 'info' | 'docs' | 'search-properties' | 'versions' | 'compare' | 'breaking' | 'migrations';
  
  // Mode-specific parameters
  query?: string;           // For search-properties
  from?: string;            // For compare/breaking/migrations
  to?: string;              // For compare/breaking/migrations
  maxResults?: number;      // For search-properties (default: 20)
  
  // Include options
  includeTypeInfo?: boolean;
  includeExamples?: boolean;
  
  // Output options (standard CLI pattern)
  save?: string;
  json?: boolean;
  
  // Legacy flags (deprecated, map to new options)
  schema?: boolean;         // → detail: 'full'
  minimal?: boolean;        // → detail: 'minimal'
  examples?: boolean;       // → includeExamples: true
}
```

#### 1.2 Implement Mode Router

```typescript
// src/commands/nodes/show.ts — Main command handler
export async function nodesShowCommand(nodeType: string, opts: ShowOptions): Promise<void> {
  // Normalize legacy flags (README.md backward compatibility)
  const detail = opts.schema ? 'full' : opts.minimal ? 'minimal' : (opts.detail || 'standard');
  const mode = opts.mode || 'info';
  const includeExamples = opts.examples || opts.includeExamples;
  
  const repo = await getNodeRepository();
  const normalizedType = NodeTypeNormalizer.normalizeToShortForm(nodeType);
  
  // Route by mode (following MCP pattern)
  switch (mode) {
    case 'info':
      return handleInfoMode(repo, normalizedType, detail, opts.includeTypeInfo, includeExamples, opts);
    case 'docs':
      return handleDocsMode(repo, normalizedType, opts);
    case 'search-properties':
      if (!opts.query) throw new Error('--query required for search-properties mode');
      return handlePropertySearch(repo, normalizedType, opts.query, opts.maxResults || 20, opts);
    case 'versions':
      return handleVersionsMode(repo, normalizedType, opts);
    case 'compare':
      if (!opts.from) throw new Error('--from required for compare mode');
      return handleCompareMode(repo, normalizedType, opts.from, opts.to, opts);
    case 'breaking':
      if (!opts.from) throw new Error('--from required for breaking mode');
      return handleBreakingMode(repo, normalizedType, opts.from, opts.to, opts);
    case 'migrations':
      if (!opts.from || !opts.to) throw new Error('--from and --to required for migrations mode');
      return handleMigrationsMode(repo, normalizedType, opts.from, opts.to, opts);
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}
```

#### 1.3 Implement handleInfoMode with Detail Levels

```typescript
// src/commands/nodes/show.ts — Info mode handler
import { PropertyFilter } from '../../core/services/property-filter';
import { ExampleGenerator } from '../../core/services/example-generator';
import { outputJson, outputTable } from '../../core/formatters';

async function handleInfoMode(
  repo: NodeRepository,
  nodeType: string,
  detail: 'minimal' | 'standard' | 'full',
  includeTypeInfo?: boolean,
  includeExamples?: boolean,
  opts?: ShowOptions
): Promise<void> {
  const node = repo.getNode(nodeType);
  if (!node) {
    throw new Error(`Node not found: ${nodeType}`);
  }
  
  switch (detail) {
    case 'minimal':
      // ~200 tokens: basic metadata only
      const minimalOutput = {
        nodeType: node.nodeType,
        workflowNodeType: NodeRepository.formatNodeType(node.nodeType),
        displayName: node.displayName,
        description: node.description,
        category: node.category,
        package: node.package,
        isAITool: node.isAITool,
        isTrigger: node.isTrigger,
        isWebhook: node.isWebhook
      };
      return outputResult(minimalOutput, opts);
      
    case 'standard':
      // ~1-2K tokens: essential properties + operations
      const essentials = PropertyFilter.getEssentials(node.properties, nodeType);
      const standardOutput = {
        nodeType: node.nodeType,
        workflowNodeType: NodeRepository.formatNodeType(node.nodeType),
        displayName: node.displayName,
        description: node.description,
        category: node.category,
        requiredProperties: essentials.required,
        commonProperties: essentials.common,
        operations: extractOperations(node),
        credentials: node.credentials,
        versionInfo: {
          currentVersion: node.version || '1',
          isVersioned: node.isVersioned
        }
      };
      
      if (includeTypeInfo) {
        standardOutput.requiredProperties = enrichWithTypeInfo(standardOutput.requiredProperties);
        standardOutput.commonProperties = enrichWithTypeInfo(standardOutput.commonProperties);
      }
      
      if (includeExamples) {
        standardOutput.examples = ExampleGenerator.getExamples(nodeType, essentials);
      }
      
      return outputResult(standardOutput, opts);
      
    case 'full':
      // ~3-8K tokens: everything
      return outputFullNode(node, includeTypeInfo, opts);
  }
}
```

### Phase 2: Property Search Mode (0.5 day)

```typescript
// src/commands/nodes/show.ts — Property search handler
async function handlePropertySearch(
  repo: NodeRepository,
  nodeType: string,
  query: string,
  maxResults: number,
  opts: ShowOptions
): Promise<void> {
  const node = repo.getNode(nodeType);
  if (!node) throw new Error(`Node not found: ${nodeType}`);
  
  // Use PropertyFilter.searchProperties from ported service
  const matches = PropertyFilter.searchProperties(node.properties, query, maxResults);
  
  if (opts.json) {
    outputJson({ nodeType, query, matches, totalMatches: matches.length });
    return;
  }
  
  // Human-readable output (following CLI formatter patterns)
  console.log(formatHeader({
    title: `Property Search: "${query}" in ${node.displayName}`,
    icon: '🔍',
    context: { 'Results': `${matches.length} found` }
  }));
  
  if (matches.length === 0) {
    console.log(chalk.yellow('  No properties found matching your query.'));
    return;
  }
  
  matches.forEach((match, i) => {
    console.log(`\n  ${i + 1}. ${chalk.cyan(match.path || match.name)}`);
    console.log(`     Type: ${chalk.yellow(match.type)}`);
    if (match.description) console.log(`     ${chalk.dim(match.description)}`);
    if (match.showWhen) console.log(`     Shows when: ${chalk.dim(JSON.stringify(match.showWhen))}`);
  });
}
```

### Phase 3: Version Modes (1 day)

#### 3.1 Extend NodeRepository with Version Queries

```typescript
// src/core/db/nodes.ts — Add version methods
export class NodeRepository {
  // ... existing methods ...
  
  /**
   * Get all versions for a node type
   */
  getNodeVersions(nodeType: string): NodeVersion[] {
    const rows = this.db.prepare(`
      SELECT * FROM node_versions 
      WHERE node_type = ? 
      ORDER BY version DESC
    `).all(nodeType) as any[];
    
    return rows.map(row => ({
      nodeType: row.node_type,
      version: row.version,
      breakingChanges: this.safeJsonParse(row.breaking_changes, []),
      deprecatedProperties: this.safeJsonParse(row.deprecated_properties, []),
      addedProperties: this.safeJsonParse(row.added_properties, []),
      releasedAt: row.released_at
    }));
  }
  
  /**
   * Compare two versions
   */
  compareVersions(nodeType: string, fromVersion: string, toVersion?: string): VersionComparison {
    const versions = this.getNodeVersions(nodeType);
    const fromIdx = versions.findIndex(v => v.version === fromVersion);
    const toIdx = toVersion 
      ? versions.findIndex(v => v.version === toVersion)
      : 0; // Latest version
    
    if (fromIdx === -1) throw new Error(`Version ${fromVersion} not found`);
    if (toIdx === -1) throw new Error(`Version ${toVersion} not found`);
    
    // Collect all changes between versions
    const changes = [];
    const breakingChanges = [];
    
    for (let i = fromIdx; i > toIdx; i--) {
      const v = versions[i];
      changes.push(...v.addedProperties.map(p => ({ type: 'added', property: p, version: v.version })));
      changes.push(...v.deprecatedProperties.map(p => ({ type: 'deprecated', property: p, version: v.version })));
      breakingChanges.push(...v.breakingChanges.map(c => ({ ...c, version: v.version })));
    }
    
    return {
      nodeType,
      fromVersion,
      toVersion: toVersion || versions[0].version,
      changes,
      breakingChanges
    };
  }
}
```

#### 3.2 Implement Version Mode Handlers

```typescript
// src/commands/nodes/show.ts — Version handlers
async function handleVersionsMode(repo: NodeRepository, nodeType: string, opts: ShowOptions): Promise<void> {
  const versions = repo.getNodeVersions(nodeType);
  
  if (versions.length === 0) {
    console.log(chalk.dim('  No version history available for this node.'));
    console.log(chalk.dim('  Version data is available for nodes with multiple releases.'));
    return;
  }
  
  if (opts.json) {
    outputJson({ nodeType, versions, latestVersion: versions[0].version });
    return;
  }
  
  console.log(formatHeader({
    title: `${nodeType} - Version History`,
    icon: '📦',
    context: { 'Latest': versions[0].version, 'Total': versions.length.toString() }
  }));
  
  versions.forEach(v => {
    const breaking = v.breakingChanges.length > 0 ? chalk.red(' ⚠️ BREAKING') : '';
    console.log(`\n  ${chalk.cyan(v.version)}${breaking}`);
    if (v.addedProperties.length > 0) {
      console.log(`    + Added: ${v.addedProperties.join(', ')}`);
    }
    if (v.deprecatedProperties.length > 0) {
      console.log(`    - Deprecated: ${v.deprecatedProperties.join(', ')}`);
    }
  });
}

async function handleCompareMode(
  repo: NodeRepository,
  nodeType: string,
  fromVersion: string,
  toVersion: string | undefined,
  opts: ShowOptions
): Promise<void> {
  const comparison = repo.compareVersions(nodeType, fromVersion, toVersion);
  
  if (opts.json) {
    outputJson(comparison);
    return;
  }
  
  console.log(formatHeader({
    title: `${nodeType} - Version Comparison`,
    icon: '🔄',
    context: { 'From': comparison.fromVersion, 'To': comparison.toVersion }
  }));
  
  if (comparison.breakingChanges.length > 0) {
    console.log(chalk.red('\n  ⚠️ Breaking Changes:'));
    comparison.breakingChanges.forEach(c => {
      console.log(`    • ${c.property}: ${c.description}`);
    });
  }
  
  if (comparison.changes.length > 0) {
    console.log('\n  Changes:');
    comparison.changes.forEach(c => {
      const icon = c.type === 'added' ? chalk.green('+') : chalk.yellow('~');
      console.log(`    ${icon} ${c.property} (${c.type} in v${c.version})`);
    });
  }
}
```

### Phase 4: Port MCP Services (0.5 day)

#### 4.1 Port PropertyFilter

```bash
# Copy and adapt from MCP
cp n8n-mcp/src/services/property-filter.ts src/core/services/property-filter.ts
```

**Required adaptations:**
- Remove MCP-specific logging (use `src/core/debug.ts` instead)
- Use CLI's existing `NodeInfo` type from `src/core/types.ts`
- Remove unused methods for CLI context

#### 4.2 Port ExampleGenerator

```bash
cp n8n-mcp/src/services/example-generator.ts src/core/services/example-generator.ts
```

**Required adaptations:**
- Keep only the static `NODE_EXAMPLES` map and `getExamples()` method
- Remove database integration (CLI uses bundled examples)

---

## Output Specifications

### Minimal Output (~200 tokens)

```json
{
  "nodeType": "nodes-base.httpRequest",
  "workflowNodeType": "n8n-nodes-base.httpRequest",
  "displayName": "HTTP Request",
  "description": "Makes HTTP requests to fetch or send data",
  "category": "Core Nodes",
  "package": "nodes-base",
  "isAITool": false,
  "isTrigger": false,
  "isWebhook": false
}
```

### Standard Output (~1-2K tokens)

```json
{
  "nodeType": "nodes-base.httpRequest",
  "workflowNodeType": "n8n-nodes-base.httpRequest",
  "displayName": "HTTP Request",
  "description": "Makes HTTP requests...",
  "category": "Core Nodes",
  "requiredProperties": [
    { "name": "url", "type": "string", "description": "URL to request", "required": true }
  ],
  "commonProperties": [
    { "name": "method", "type": "options", "options": ["GET", "POST", "PUT", "DELETE", "PATCH"] },
    { "name": "authentication", "type": "options", "description": "Authentication method" },
    { "name": "sendBody", "type": "boolean", "default": false }
  ],
  "operations": [],
  "credentials": ["httpBasicAuth", "httpDigestAuth", "oAuth2Api"],
  "versionInfo": {
    "currentVersion": "4.2",
    "isVersioned": true
  }
}
```

### Property Search Output

```
╔═══════════════════════════════════════════════════════════╗
║ 🔍 Property Search: "auth" in HTTP Request               ║
╠═══════════════════════════════════════════════════════════╣
║ Found 4 matching properties                               ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  1. authentication                                        ║
║     Type: options                                         ║
║     Description: Authentication method to use             ║
║     Options: none, predefinedCredentialType, ...          ║
║                                                           ║
║  2. genericAuthType                                       ║
║     Type: options                                         ║
║     Shows when: { authentication: 'genericCredentialType' }
║     Options: httpBasicAuth, httpDigestAuth, ...           ║
║                                                           ║
║  3. options.headers.authHeader                            ║
║     Type: string                                          ║
║     Description: Custom authorization header value        ║
╚═══════════════════════════════════════════════════════════╝
```

---

## Dependencies

### Required Before This Feature
- **08-P1-node-version-service**: Version data in database (for version modes)
- **09-P1-breaking-change-detector**: Breaking change detection (for breaking mode)

### Enables After This Feature
- **13-P2-post-update-validator**: Validate after update using version comparison
- AI agent integration with reduced token costs

---

## Related CLI Commands (Existing)

| Command | File | Relevance |
|---------|------|-----------|
| `n8n nodes list` | `src/commands/nodes/list.ts` | Uses same `NodeRepository` |
| `n8n nodes search` | `src/commands/nodes/search.ts` | Search patterns to match |
| `n8n nodes categories` | `src/commands/nodes/categories.ts` | Category filtering |
| `n8n nodes validate` | `src/commands/nodes/validate.ts` | Validation integration |

---

## Testing Requirements

### Unit Tests

```typescript
// tests/commands/nodes/show.test.ts
describe('nodes show command', () => {
  describe('detail levels', () => {
    it('minimal returns ~5 fields', async () => {
      const result = await nodesShowCommand('httpRequest', { detail: 'minimal', json: true });
      expect(Object.keys(JSON.parse(result))).toHaveLength(9);
    });
    
    it('standard includes requiredProperties and commonProperties', async () => {
      const result = await nodesShowCommand('httpRequest', { detail: 'standard', json: true });
      const parsed = JSON.parse(result);
      expect(parsed.requiredProperties).toBeDefined();
      expect(parsed.commonProperties).toBeDefined();
    });
    
    it('full includes all properties', async () => {
      const result = await nodesShowCommand('httpRequest', { detail: 'full', json: true });
      const parsed = JSON.parse(result);
      expect(parsed.properties.length).toBeGreaterThan(50);
    });
  });
  
  describe('modes', () => {
    it('search-properties requires --query', async () => {
      await expect(nodesShowCommand('httpRequest', { mode: 'search-properties' }))
        .rejects.toThrow('--query required');
    });
    
    it('compare requires --from', async () => {
      await expect(nodesShowCommand('httpRequest', { mode: 'compare' }))
        .rejects.toThrow('--from required');
    });
    
    it('search-properties finds matching properties', async () => {
      const result = await nodesShowCommand('httpRequest', { 
        mode: 'search-properties', 
        query: 'auth', 
        json: true 
      });
      const parsed = JSON.parse(result);
      expect(parsed.matches.length).toBeGreaterThan(0);
      expect(parsed.matches[0].name).toContain('auth');
    });
  });
});
```

### Integration Tests

```bash
# Test all detail levels
n8n nodes show httpRequest --detail minimal --json | jq '.displayName'
n8n nodes show httpRequest --detail standard --json | jq '.requiredProperties | length'
n8n nodes show httpRequest --detail full --json | jq '.properties | length'

# Test modes
n8n nodes show httpRequest --mode docs | head -20
n8n nodes show httpRequest --mode search-properties --query "header" --json
n8n nodes show httpRequest --mode versions

# Test include options
n8n nodes show httpRequest --include-examples --json | jq '.examples'
n8n nodes show httpRequest --include-type-info --json | jq '.commonProperties[0].typeInfo'

# Test legacy flag compatibility (README.md backward compat)
n8n nodes show httpRequest --schema --json  # Should equal --detail full
n8n nodes show httpRequest --minimal --json # Should equal --detail minimal
```

---

## Acceptance Criteria

1. **Detail Levels Work:**
   - `--detail minimal` returns ≤10 fields, <500 characters JSON
   - `--detail standard` returns essential properties with descriptions
   - `--detail full` returns all properties (equivalent to `--schema`)

2. **All 7 Modes Work:**
   - `info` (default): respects detail level
   - `docs`: returns markdown documentation
   - `search-properties`: finds properties by query
   - `versions`: shows version history
   - `compare`: shows diff between versions
   - `breaking`: shows only breaking changes
   - `migrations`: shows auto-migratable changes

3. **Include Options Work:**
   - `--include-type-info` adds type metadata to properties
   - `--include-examples` adds real-world configuration examples

4. **Error Handling:**
   - Mode-specific required params validated with clear messages
   - Unknown node types return helpful suggestions
   - Missing version data returns graceful fallback

5. **Output Formats (CLI Standard):**
   - `--json` works with all modes
   - `--save` works with all modes
   - Human-readable output uses `src/core/formatters/*`

6. **Legacy Compatibility (README.md):**
   - `--schema` maps to `--detail full`
   - `--minimal` maps to `--detail minimal`
   - `--examples` maps to `--include-examples`

---

## Implementation Checklist

- [ ] **Phase 1:** Update `ShowOptions` interface in `src/commands/nodes/show.ts`
- [ ] **Phase 1:** Implement mode router in `nodesShowCommand`
- [ ] **Phase 1:** Implement `handleInfoMode` with 3 detail levels
- [ ] **Phase 2:** Create `src/core/services/property-filter.ts` (port from MCP)
- [ ] **Phase 2:** Implement `handlePropertySearch`
- [ ] **Phase 3:** Extend `src/core/db/nodes.ts` with version methods
- [ ] **Phase 3:** Implement version mode handlers
- [ ] **Phase 4:** Create `src/core/services/example-generator.ts` (port from MCP)
- [ ] **Phase 4:** Implement `--include-examples` option
- [ ] **Phase 4:** Create `src/core/formatters/node-docs.ts`
- [ ] **Phase 4:** Create `src/core/formatters/version-diff.ts`
- [ ] **Phase 4:** Create `src/types/node-detail.ts`
- [ ] **Testing:** Unit tests for all modes and detail levels
- [ ] **Testing:** Integration tests with CLI
- [ ] **Docs:** Update README.md `nodes show` section with new options
