# P2: FTS5 Full-Text Search

## Priority: P2 (Medium)
## Status: Not Implemented in CLI
## MCP Source: Multiple files (see detailed references below)

---

## Business Value

**Impact:** FTS5 full-text search dramatically improves the CLI node/template search experience by providing 10x faster query execution, intelligent BM25 relevance ranking, and advanced search features like phrase matching and prefix search. This translates to sub-5ms search responses (vs ~50ms with LIKE), enabling real-time autocomplete scenarios and improving developer productivity when exploring n8n's 800+ nodes catalog.

**User Benefit:** Users searching for "HTTP request" will instantly get the most relevant nodes ranked by match quality, rather than an unsorted list of anything containing "http" or "request" somewhere in the text. Typo tolerance ("slak" → "Slack") and phrase matching ("google sheets" as exact phrase) enable natural search behavior.

**Developer Benefit:** The FTS5 infrastructure enables future features like semantic search, faceted filtering, and search-as-you-type experiences in the CLI.

---

## Current CLI Status

- **Implemented:** No
- **Location:** N/A (feature not present)
- **Gap Reason:** 
  1. CLI database adapter (`src/core/db/adapter.ts`) includes `checkFTS5Support()` method (lines 137-145) but it's never utilized
  2. No FTS5 virtual table creation in CLI (exists only in MCP schema)
  3. CLI `searchNodes()` in `src/core/db/nodes.ts` (lines 82-160) uses LIKE-based matching exclusively
  4. CLI template search (`src/commands/templates/search.ts`) uses external n8n.io API instead of local FTS-enabled database
  5. No schema.sql file exists in CLI (only in `n8n-mcp/src/database/`)

### Current CLI Implementation Analysis

**File: `src/core/db/nodes.ts` (lines 82-160)**
```typescript
// Current LIKE-based search with three modes
searchNodes(query: string, mode: 'OR' | 'AND' | 'FUZZY' = 'OR', limit: number = 20)
```

**Limitations:**
| Limitation | Impact |
|------------|--------|
| LIKE pattern matching (`%word%`) | Full table scan on every query |
| Manual relevance scoring (lines 459-481) | Inconsistent ranking, no BM25 |
| Levenshtein distance for FUZZY (lines 429-457) | Scans ALL nodes in memory |
| No phrase matching | "google sheets" matches nodes with "google" OR "sheets" anywhere |
| No prefix matching | "http*" not supported natively |

**File: `src/core/db/adapter.ts` (lines 137-145)**
```typescript
// Method EXISTS but is NEVER CALLED
checkFTS5Support(): boolean {
  try {
    this.exec("CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_test USING fts5(content);");
    this.exec("DROP TABLE IF EXISTS _fts5_test;");
    return true;
  } catch {
    return false;
  }
}
```

---

## MCP Reference Implementation

### Architecture Overview

MCP implements a robust FTS5 search system with automatic fallback:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Search Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│  searchNodes() (server.ts:1357-1396)                            │
│       │                                                          │
│       ├─► Check FTS5 table exists (sqlite_master query)         │
│       │                                                          │
│       ├─► IF FTS5: searchNodesFTS() (server.ts:1398-1565)       │
│       │   └─► BM25 ranking + custom relevance scoring           │
│       │                                                          │
│       └─► ELSE: searchNodesLIKE() (fallback with mode)          │
│                                                                  │
│  Templates: TemplateRepository.searchTemplates()                 │
│       └─► Same FTS5/LIKE pattern (template-repository.ts:253)   │
└─────────────────────────────────────────────────────────────────┘
```

### Source Files (Detailed)

| File | Lines | Purpose | Key Methods/Structures |
|------|-------|---------|----------------------|
| `n8n-mcp/src/database/schema.sql` | 28-60 | FTS5 table definitions & triggers | `nodes_fts` virtual table, sync triggers |
| `n8n-mcp/src/database/schema-optimized.sql` | 32-66 | Extended FTS5 with source code | Includes `node_source_code` column |
| `n8n-mcp/src/mcp/server.ts` | 1357-1565 | Core FTS5 search logic | `searchNodes()`, `searchNodesFTS()`, `searchNodesFuzzy()` |
| `n8n-mcp/src/database/database-adapter.ts` | 218-227, 325-335 | FTS5 availability detection | `checkFTS5Support()` for both adapters |
| `n8n-mcp/src/templates/template-repository.ts` | 41-107, 253-308 | Template FTS5 search | `initializeFTS5()`, `searchTemplates()`, `searchTemplatesLIKE()` |
| `n8n-mcp/src/database/node-repository.ts` | 127-176 | Legacy LIKE search (fallback) | `searchNodes()` with mode parameter |

### FTS5 Schema Definition

**File: `n8n-mcp/src/database/schema.sql` (lines 28-60)**
```sql
-- Nodes FTS5 virtual table (content table sync)
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  node_type,
  display_name,
  description,
  documentation,     -- Also indexes documentation text
  operations,        -- Indexes operation names
  content=nodes,     -- Links to nodes table
  content_rowid=rowid
);

-- INSERT trigger - keeps FTS in sync when nodes added
CREATE TRIGGER IF NOT EXISTS nodes_fts_insert AFTER INSERT ON nodes
BEGIN
  INSERT INTO nodes_fts(rowid, node_type, display_name, description, documentation, operations)
  VALUES (new.rowid, new.node_type, new.display_name, new.description, new.documentation, new.operations);
END;

-- UPDATE trigger - updates FTS when nodes modified
CREATE TRIGGER IF NOT EXISTS nodes_fts_update AFTER UPDATE ON nodes
BEGIN
  UPDATE nodes_fts
  SET node_type = new.node_type,
      display_name = new.display_name,
      description = new.description,
      documentation = new.documentation,
      operations = new.operations
  WHERE rowid = new.rowid;
END;

-- DELETE trigger - removes from FTS when nodes deleted
CREATE TRIGGER IF NOT EXISTS nodes_fts_delete AFTER DELETE ON nodes
BEGIN
  DELETE FROM nodes_fts WHERE rowid = old.rowid;
END;
```

### Template FTS5 Dynamic Initialization

**File: `n8n-mcp/src/templates/template-repository.ts` (lines 41-107)**
```typescript
private initializeFTS5(): void {
  this.hasFTS5Support = this.db.checkFTS5Support();
  
  if (this.hasFTS5Support) {
    try {
      // Check if FTS5 table already exists
      const ftsExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='templates_fts'
      `).get();
      
      if (!ftsExists) {
        // Create FTS5 virtual table dynamically
        this.db.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS templates_fts USING fts5(
            name, description, content=templates
          );
        `);
        
        // Create sync triggers
        this.db.exec(`
          CREATE TRIGGER IF NOT EXISTS templates_ai AFTER INSERT ON templates BEGIN
            INSERT INTO templates_fts(rowid, name, description)
            VALUES (new.id, new.name, new.description);
          END;
        `);
        // ... UPDATE and DELETE triggers
      }
    } catch (error) {
      this.hasFTS5Support = false;
    }
  }
}
```

### FTS5 Search Implementation with Ranking

**File: `n8n-mcp/src/mcp/server.ts` (lines 1398-1541)**
```typescript
private async searchNodesFTS(
  query: string,
  limit: number,
  mode: 'OR' | 'AND' | 'FUZZY',
  options?: { includeSource?: boolean; includeExamples?: boolean; }
): Promise<any> {
  // Clean and prepare query
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    return { query, results: [], totalCount: 0 };
  }
  
  // For FUZZY mode, delegate to Levenshtein-based search
  if (mode === 'FUZZY') {
    return this.searchNodesFuzzy(cleanedQuery, limit);
  }
  
  // Build FTS5 query based on mode
  let ftsQuery: string;
  if (cleanedQuery.startsWith('"') && cleanedQuery.endsWith('"')) {
    // Exact phrase search
    ftsQuery = cleanedQuery;
  } else {
    const words = cleanedQuery.split(/\s+/).filter(w => w.length > 0);
    switch (mode) {
      case 'AND':
        ftsQuery = words.join(' AND ');  // All words must match
        break;
      case 'OR':
      default:
        ftsQuery = words.join(' OR ');   // Any word can match
        break;
    }
  }
  
  // FTS5 query with custom ranking
  const nodes = this.db.prepare(`
    SELECT
      n.*,
      rank
    FROM nodes n
    JOIN nodes_fts ON n.rowid = nodes_fts.rowid
    WHERE nodes_fts MATCH ?
    ORDER BY
      CASE
        WHEN LOWER(n.display_name) = LOWER(?) THEN 0      -- Exact name match
        WHEN LOWER(n.display_name) LIKE LOWER(?) THEN 1   -- Name contains query
        WHEN LOWER(n.node_type) LIKE LOWER(?) THEN 2      -- Type contains query
        ELSE 3
      END,
      rank,                                                -- BM25 ranking
      n.display_name
    LIMIT ?
  `).all(ftsQuery, cleanedQuery, `%${cleanedQuery}%`, `%${cleanedQuery}%`, limit);
  
  // Apply additional custom relevance scoring
  const scoredNodes = nodes.map(node => ({
    ...node,
    relevanceScore: this.calculateRelevanceScore(node, cleanedQuery)
  }));
  
  // Sort by combined score (prioritize exact matches)
  scoredNodes.sort((a, b) => {
    if (a.display_name.toLowerCase() === cleanedQuery.toLowerCase()) return -1;
    if (b.display_name.toLowerCase() === cleanedQuery.toLowerCase()) return 1;
    if (a.relevanceScore !== b.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return a.rank - b.rank;
  });
  
  return {
    query,
    results: scoredNodes.map(node => ({
      nodeType: node.node_type,
      workflowNodeType: getWorkflowNodeType(node.package_name, node.node_type),
      displayName: node.display_name,
      description: node.description,
      category: node.category,
      package: node.package_name,
      relevance: this.calculateRelevance(node, cleanedQuery)
    })),
    totalCount: scoredNodes.length
  };
}
```

### FTS5 Availability Detection

**File: `n8n-mcp/src/database/database-adapter.ts`**

**BetterSQLiteAdapter (lines 218-227):**
```typescript
checkFTS5Support(): boolean {
  try {
    // Dynamically test FTS5 availability
    this.exec("CREATE VIRTUAL TABLE IF NOT EXISTS test_fts5 USING fts5(content);");
    this.exec("DROP TABLE IF EXISTS test_fts5;");
    return true;
  } catch (error) {
    return false;  // FTS5 extension not available
  }
}
```

**SQLJSAdapter (lines 325-335):**
```typescript
checkFTS5Support(): boolean {
  try {
    this.exec("CREATE VIRTUAL TABLE IF NOT EXISTS test_fts5 USING fts5(content);");
    this.exec("DROP TABLE IF EXISTS test_fts5;");
    return true;
  } catch (error) {
    // sql.js doesn't support FTS5 in most builds
    return false;
  }
}
```

### Fallback Search Pattern

**File: `n8n-mcp/src/mcp/server.ts` (lines 1381-1395)**
```typescript
// Check if FTS5 table exists before using it
const ftsExists = this.db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='nodes_fts'
`).get();

if (ftsExists) {
  logger.debug(`Using FTS5 search with includeExamples=${options?.includeExamples}`);
  return this.searchNodesFTS(normalizedQuery, limit, searchMode, options);
} else {
  logger.debug('Using LIKE search (no FTS5)');
  return this.searchNodesLIKE(normalizedQuery, limit, options);
}
```

---

## CLI Integration Path

### 1. Files to Create/Modify

```
src/core/db/
├── adapter.ts          # MODIFY: Add initializeFTS5() method
├── nodes.ts            # MODIFY: Add searchNodesFTS() method  
├── schema.sql          # CREATE: FTS5 schema definitions
└── fts-utils.ts        # CREATE: FTS5 query helpers (optional)

src/commands/nodes/
└── search.ts           # MODIFY: Use new FTS search path
```

### 2. Implementation Steps

#### Step 1: Create Schema File
**New file: `src/core/db/schema.sql`**
```sql
-- FTS5 virtual table for nodes (CLI-optimized subset)
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  node_type,
  display_name,
  description,
  category,
  content=nodes,
  content_rowid=rowid
);

-- Sync triggers (INSERT)
CREATE TRIGGER IF NOT EXISTS nodes_fts_insert AFTER INSERT ON nodes
BEGIN
  INSERT INTO nodes_fts(rowid, node_type, display_name, description, category)
  VALUES (new.rowid, new.node_type, new.display_name, new.description, new.category);
END;

-- Sync triggers (UPDATE)
CREATE TRIGGER IF NOT EXISTS nodes_fts_update AFTER UPDATE ON nodes
BEGIN
  UPDATE nodes_fts
  SET node_type = new.node_type,
      display_name = new.display_name,
      description = new.description,
      category = new.category
  WHERE rowid = new.rowid;
END;

-- Sync triggers (DELETE)
CREATE TRIGGER IF NOT EXISTS nodes_fts_delete AFTER DELETE ON nodes
BEGIN
  DELETE FROM nodes_fts WHERE rowid = old.rowid;
END;
```

#### Step 2: Modify Database Adapter
**File: `src/core/db/adapter.ts`**

Add after line 90 (after db creation):
```typescript
// Add to DatabaseAdapter interface (line 14)
export interface DatabaseAdapter {
  // ... existing methods
  initializeFTS5(): Promise<boolean>;  // NEW
  hasFTS5: boolean;                    // NEW
}

// Add to BetterSQLiteAdapter class (after constructor)
private _hasFTS5: boolean = false;

get hasFTS5(): boolean {
  return this._hasFTS5;
}

async initializeFTS5(): Promise<boolean> {
  // Check if FTS5 is supported
  if (!this.checkFTS5Support()) {
    console.warn('[FTS5] Not available, using LIKE search fallback');
    return false;
  }
  
  // Check if FTS5 table already exists
  const ftsExists = this.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='nodes_fts'
  `).get();
  
  if (ftsExists) {
    this._hasFTS5 = true;
    return true;
  }
  
  try {
    // Create FTS5 table (read schema from file or inline)
    this.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        node_type,
        display_name,
        description,
        category,
        content=nodes,
        content_rowid=rowid
      )
    `);
    
    // Populate FTS index from existing data
    this.exec(`
      INSERT INTO nodes_fts(nodes_fts) VALUES('rebuild')
    `);
    
    this._hasFTS5 = true;
    return true;
  } catch (error) {
    console.warn('[FTS5] Failed to initialize:', error);
    return false;
  }
}
```

#### Step 3: Add FTS Search to NodeRepository
**File: `src/core/db/nodes.ts`**

Replace `searchNodes` method (lines 82-160) with:
```typescript
/**
 * Search nodes with automatic FTS5/LIKE selection
 * FTS5 provides 10x faster search with BM25 relevance ranking
 */
searchNodes(query: string, mode: 'OR' | 'AND' | 'FUZZY' = 'OR', limit: number = 20): NodeSearchResult[] {
  // Use FTS5 if available (except for FUZZY which needs Levenshtein)
  if (this.db.hasFTS5 && mode !== 'FUZZY') {
    return this.searchNodesFTS(query, mode, limit);
  }
  
  // Fallback to LIKE-based search
  return this.searchNodesLIKE(query, mode, limit);
}

/**
 * FTS5 full-text search with BM25 ranking
 * Pattern: Adapted from n8n-mcp/src/mcp/server.ts:1398-1541
 */
private searchNodesFTS(query: string, mode: 'OR' | 'AND', limit: number): NodeSearchResult[] {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) return [];
  
  // Build FTS5 query based on mode
  let ftsQuery: string;
  if (cleanedQuery.startsWith('"') && cleanedQuery.endsWith('"')) {
    // Exact phrase matching
    ftsQuery = cleanedQuery;
  } else {
    const words = cleanedQuery.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];
    
    // Escape special FTS5 characters
    const escapedWords = words.map(w => w.replace(/['"(){}[\]*+-]/g, ''));
    ftsQuery = mode === 'AND' 
      ? escapedWords.join(' AND ')
      : escapedWords.join(' OR ');
  }
  
  try {
    const rows = this.db.prepare(`
      SELECT
        n.node_type, n.display_name, n.description, n.category,
        n.package_name, n.is_ai_tool, n.is_trigger, n.is_webhook,
        -nodes_fts.rank as relevance_score
      FROM nodes_fts
      JOIN nodes n ON nodes_fts.rowid = n.rowid
      WHERE nodes_fts MATCH ?
      ORDER BY
        CASE
          WHEN LOWER(n.display_name) = LOWER(?) THEN 0
          WHEN LOWER(n.display_name) LIKE LOWER(?) THEN 1
          WHEN LOWER(n.node_type) LIKE LOWER(?) THEN 2
          ELSE 3
        END,
        relevance_score DESC,
        n.display_name
      LIMIT ?
    `).all(ftsQuery, cleanedQuery, `%${cleanedQuery}%`, `%${cleanedQuery}%`, limit) as any[];
    
    return rows.map(row => this.parseSearchRow(row, query));
  } catch (error: any) {
    // FTS5 syntax error - fallback to LIKE
    if (error.message?.includes('fts5') || error.message?.includes('syntax')) {
      console.warn(`[FTS5] Query error, falling back to LIKE: ${error.message}`);
      return this.searchNodesLIKE(query, mode, limit);
    }
    throw error;
  }
}

/**
 * LIKE-based search fallback (current implementation)
 * Used when FTS5 unavailable or for FUZZY mode
 */
private searchNodesLIKE(query: string, mode: 'OR' | 'AND' | 'FUZZY', limit: number): NodeSearchResult[] {
  // ... existing implementation (lines 82-160)
}
```

#### Step 4: Initialize FTS5 on Database Load
**File: `src/core/db/adapter.ts`**

Modify `getDatabase()` function (around line 201):
```typescript
export async function getDatabase(): Promise<DatabaseAdapter> {
  if (!_db) {
    _db = await createDatabaseAdapter();
    // Initialize FTS5 if supported (non-blocking)
    await _db.initializeFTS5().catch(err => {
      console.warn('[FTS5] Initialization failed, using LIKE fallback:', err.message);
    });
  }
  return _db;
}
```

### 3. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| SQLite with FTS5 | ✅ Available | `better-sqlite3` includes FTS5 by default |
| `src/core/db/adapter.ts` | ✅ Exists | Has unused `checkFTS5Support()` method |
| `src/core/db/nodes.ts` | ✅ Exists | `searchNodes()` needs modification |
| Schema file | ❌ Missing | Create `src/core/db/schema.sql` |

### 4. Blocking/Blocked Features

| Blocks | Blocked By |
|--------|------------|
| P1: Template Search Modes (10) | None - can use external API initially |
| Future: Semantic search | None |
| Future: Search autocomplete | None |

---

## Performance Comparison

| Metric | Current (LIKE) | With FTS5 | Improvement |
|--------|----------------|-----------|-------------|
| Search 800 nodes | ~50ms | ~5ms | **10x faster** |
| Search 5000 templates | ~200ms | ~15ms | **13x faster** |
| Memory (index) | 0 | ~5MB | Acceptable |
| Relevance ranking | Manual scoring | BM25 native | **Much better** |
| Prefix matching ("http*") | ❌ Not supported | ✅ Native | **New feature** |
| Phrase matching ("http request") | ❌ Treated as OR | ✅ Exact phrase | **New feature** |
| Typo tolerance | ❌ None (except FUZZY) | ⚠️ Via FUZZY fallback | Same |

---

## Testing Requirements

### Unit Tests

```typescript
// tests/core/db/fts-search.test.ts

describe('FTS5 Search', () => {
  describe('Availability Detection', () => {
    it('should detect FTS5 support in better-sqlite3', async () => {
      const db = await getDatabase();
      expect(db.checkFTS5Support()).toBe(true);
    });
    
    it('should initialize FTS5 table if supported', async () => {
      const db = await getDatabase();
      const result = await db.initializeFTS5();
      expect(result).toBe(true);
      expect(db.hasFTS5).toBe(true);
    });
  });
  
  describe('Query Building', () => {
    it('should escape FTS5 special characters', () => {
      // Test: "test (query)" → "test query"
    });
    
    it('should build OR query for default mode', () => {
      // "http request" → "http OR request"
    });
    
    it('should build AND query for AND mode', () => {
      // "http request" → "http AND request"
    });
    
    it('should preserve exact phrase queries', () => {
      // '"http request"' → '"http request"'
    });
  });
  
  describe('Fallback Behavior', () => {
    it('should fallback to LIKE on FTS5 syntax error', async () => {
      const repo = await getNodeRepository();
      // Trigger syntax error with malformed query
      const results = repo.searchNodes('(unbalanced', 'OR', 10);
      expect(results).toBeDefined();
    });
    
    it('should use LIKE for FUZZY mode even with FTS5', async () => {
      const repo = await getNodeRepository();
      // FUZZY requires Levenshtein distance
      const results = repo.searchNodes('slak', 'FUZZY', 10);
      expect(results.some(r => r.displayName.includes('Slack'))).toBe(true);
    });
  });
});

describe('Search Ranking', () => {
  it('should rank exact name matches first', async () => {
    const repo = await getNodeRepository();
    const results = repo.searchNodes('Slack', 'OR', 10);
    expect(results[0].displayName).toBe('Slack');
  });
  
  it('should rank node type matches second', async () => {
    const repo = await getNodeRepository();
    const results = repo.searchNodes('httpRequest', 'OR', 10);
    expect(results[0].nodeType).toContain('httpRequest');
  });
});
```

### Integration Tests

```typescript
// tests/commands/nodes-search.test.ts

describe('nodes search command with FTS5', () => {
  it('should return results in relevance order', async () => {
    const { stdout } = await exec('n8n nodes search "slack message"');
    const lines = stdout.split('\n');
    // First result should be most relevant
    expect(lines[0]).toContain('Slack');
  });
  
  it('should support --mode AND for strict matching', async () => {
    const { stdout } = await exec('n8n nodes search "google sheets" --mode AND');
    // Should only match nodes with BOTH "google" AND "sheets"
  });
  
  it('should handle special characters gracefully', async () => {
    const { stdout, exitCode } = await exec('n8n nodes search "c++"');
    expect(exitCode).toBe(0);
  });
});
```

---

## Rollout Strategy

### Phase 1: Core Implementation (Day 1)
1. Add `initializeFTS5()` to `adapter.ts`
2. Add `searchNodesFTS()` to `nodes.ts`
3. Integrate into existing `searchNodes()` flow
4. Add unit tests

### Phase 2: Validation (Day 2)
1. Benchmark FTS5 vs LIKE performance
2. Validate ranking quality with real queries
3. Test fallback behavior

### Phase 3: Documentation (Day 2)
1. Update `n8n nodes search --help`
2. Add search tips to README
3. Document new phrase matching syntax

---

## Acceptance Criteria

- [ ] `n8n nodes search "query"` uses FTS5 when available
- [ ] Search returns results in ~5ms (vs ~50ms baseline)
- [ ] BM25 relevance ranking produces intuitive results
- [ ] Exact phrase queries work: `n8n nodes search '"http request"'`
- [ ] Fallback to LIKE works when FTS5 unavailable
- [ ] FUZZY mode continues to use Levenshtein distance
- [ ] No breaking changes to existing search behavior
- [ ] Unit and integration tests pass

---

## Estimated Effort

- **Complexity:** Low-Medium
- **Files Modified:** 2 (`adapter.ts`, `nodes.ts`)
- **Files Created:** 1 (`schema.sql` - optional, can be inline)
- **LOC Added:** ~150-200
- **LOC Modified:** ~50
- **Time:** 1-1.5 days

---

## CLI Commands Reference

### Affected Commands

This feature enhances the following existing CLI commands:

| Command | Syntax | Implementation File | Purpose | FTS5 Impact |
|---------|--------|---------------------|---------|-------------|
| `nodes search` | `n8n nodes search <query> [options]` | `src/commands/nodes/search.ts` | Search nodes by keyword | **Primary beneficiary** - 10x faster, BM25 ranking |
| `nodes list` | `n8n nodes list [options]` | `src/commands/nodes/list.ts` | List all nodes with optional search | Uses `--search` flag which calls searchNodes |
| `nodes show` | `n8n nodes show <nodeType> [options]` | `src/commands/nodes/show.ts` | Show node details | Unchanged - direct lookup |
| `templates search` | `n8n templates search <query> [options]` | `src/commands/templates/search.ts` | Search workflow templates | Future: local FTS when templates stored locally |

### Command Syntax (Post-Implementation)

**`nodes search` - Enhanced with FTS5**
```bash
n8n nodes search <query> [options]
```

| Option | Description | Default | FTS5 Behavior |
|--------|-------------|---------|---------------|
| `-m, --mode <mode>` | Search mode: `OR`, `AND`, `FUZZY` | `OR` | `OR`/`AND` use FTS5; `FUZZY` uses Levenshtein fallback |
| `-l, --limit <n>` | Limit results | `10` | Passed to FTS5 LIMIT clause |
| `-s, --save <path>` | Save to JSON file | - | Unchanged |
| `--json` | Output as JSON | - | Unchanged |

**New capabilities enabled by FTS5:**
```bash
# Phrase matching (NEW)
n8n nodes search '"http request"' --json
# → Matches exact phrase, not just any node with "http" or "request"

# Prefix matching (NEW via FTS5)  
n8n nodes search 'google*' --json
# → Matches Google Sheets, Google Drive, Google Calendar, etc.

# BM25 relevance ranking (NEW)
n8n nodes search 'slack message' --json
# → Results sorted by match quality, Slack node first
```

### Core Module Dependencies

| Module | File | Purpose | Modification Required |
|--------|------|---------|----------------------|
| NodeRepository | `src/core/db/nodes.ts` | Node database operations | **ADD** `searchNodesFTS()` method |
| DatabaseAdapter | `src/core/db/adapter.ts` | SQLite connection wrapper | **ADD** `initializeFTS5()`, `hasFTS5` property |
| JSON Formatter | `src/core/formatters/json.ts` | JSON output formatting | None |
| Table Formatter | `src/core/formatters/table.ts` | Table output formatting | None |
| Exit Codes | `src/utils/exit-codes.ts` | POSIX exit codes | None |

---

## CLI Architecture Overview

### Entry Point & Routing

```
src/cli.ts                           # Main entry point
    │
    ├── Parses global options (--json, --verbose, --profile)
    ├── Loads configuration (src/core/config/loader.ts)
    ├── Sets up Commander.js program
    │
    └── Routes to command modules:
        ├── src/commands/nodes/          # Offline node operations
        │   ├── search.ts                # ← FTS5 enhancement here
        │   ├── list.ts
        │   ├── show.ts
        │   ├── categories.ts
        │   └── validate.ts
        │
        ├── src/commands/workflows/      # Workflow CRUD + validation
        ├── src/commands/credentials/    # Credential management
        ├── src/commands/executions/     # Execution history
        ├── src/commands/templates/      # Template search (API-based)
        ├── src/commands/tags/           # Tag management
        ├── src/commands/variables/      # Environment variables
        ├── src/commands/auth/           # Authentication
        ├── src/commands/health/         # Connectivity check
        ├── src/commands/config/         # Config display
        ├── src/commands/audit/          # Security audit
        └── src/commands/completion/     # Shell completion
```

### Command Registration Pattern

Each command follows this pattern (from `src/commands/nodes/search.ts`):

```typescript
import { Command } from 'commander';
import { getNodeRepository } from '../../core/db/nodes';
import { formatJSON, formatTable } from '../../core/formatters';
import { ExitCode } from '../../utils/exit-codes';

export function registerNodesSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search for nodes by keyword')
    .option('-m, --mode <mode>', 'Search mode: OR, AND, FUZZY', 'OR')
    .option('-l, --limit <n>', 'Limit results', '10')
    .option('-s, --save <path>', 'Save to JSON file')
    .option('--json', 'Output as JSON')
    .action(async (query, options) => {
      try {
        const repo = await getNodeRepository();
        const results = repo.searchNodes(query, options.mode, parseInt(options.limit));
        
        if (options.json) {
          console.log(formatJSON({ success: true, data: results }));
        } else {
          formatTable(results);
        }
        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        // Error handling...
        process.exit(ExitCode.GENERAL);
      }
    });
}
```

### Shared Utilities

| Utility | File | Purpose |
|---------|------|---------|
| Formatters | `src/core/formatters/` | JSON, table, tree output formatting |
| Exit Codes | `src/utils/exit-codes.ts` | POSIX-compliant exit codes (0, 1, 64-78) |
| Error Handling | `src/utils/errors.ts` | Consistent error types and messages |
| Output Helpers | `src/utils/output.ts` | stdout/stderr helpers |
| Prompts | `src/utils/prompts.ts` | Interactive confirmation prompts |
| Backup | `src/utils/backup.ts` | Automatic backup before destructive ops |

---

## Implementation Guide

### Adding FTS5 to Existing Commands

**Step 1: Modify `src/core/db/adapter.ts`**

```typescript
// Add to DatabaseAdapter interface (around line 14)
export interface DatabaseAdapter {
  // ... existing methods
  checkFTS5Support(): boolean;   // Already exists (unused)
  initializeFTS5(): Promise<boolean>;  // NEW
  hasFTS5: boolean;              // NEW
}

// Add to BetterSQLiteAdapter class
private _hasFTS5: boolean = false;

get hasFTS5(): boolean {
  return this._hasFTS5;
}

async initializeFTS5(): Promise<boolean> {
  if (!this.checkFTS5Support()) {
    return false;
  }
  
  const ftsExists = this.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='nodes_fts'
  `).get();
  
  if (ftsExists) {
    this._hasFTS5 = true;
    return true;
  }
  
  try {
    this.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        node_type, display_name, description, category,
        content=nodes, content_rowid=rowid
      )
    `);
    this.exec(`INSERT INTO nodes_fts(nodes_fts) VALUES('rebuild')`);
    this._hasFTS5 = true;
    return true;
  } catch {
    return false;
  }
}
```

**Step 2: Modify `src/core/db/nodes.ts`**

```typescript
// Replace searchNodes method (lines 82-160)
searchNodes(query: string, mode: 'OR' | 'AND' | 'FUZZY' = 'OR', limit: number = 20): NodeSearchResult[] {
  // FTS5 for OR/AND modes, LIKE for FUZZY
  if (this.db.hasFTS5 && mode !== 'FUZZY') {
    return this.searchNodesFTS(query, mode, limit);
  }
  return this.searchNodesLIKE(query, mode, limit);
}

// Add new private method
private searchNodesFTS(query: string, mode: 'OR' | 'AND', limit: number): NodeSearchResult[] {
  // Implementation from MCP pattern
  // See: n8n-mcp/src/mcp/server.ts:1398-1541
}
```

**Step 3: Command file remains unchanged**

The `src/commands/nodes/search.ts` file does **not** need modification because:
1. It already calls `repo.searchNodes(query, mode, limit)`
2. FTS5 logic is encapsulated in the repository layer
3. Output formatting is handled by existing formatters

### File Modification Summary

| File | Action | Lines Changed | Description |
|------|--------|---------------|-------------|
| `src/core/db/adapter.ts` | MODIFY | +40 | Add `initializeFTS5()`, `hasFTS5` |
| `src/core/db/nodes.ts` | MODIFY | +80 | Add `searchNodesFTS()`, refactor `searchNodes()` |
| `src/commands/nodes/search.ts` | NONE | 0 | No changes needed |
| `src/core/db/schema.sql` | CREATE | +30 | FTS5 schema (optional, can be inline) |

### Testing Commands

```bash
# Unit test the FTS5 search
npm test -- --grep "FTS5"

# Integration test: verify search behavior
n8n nodes search "slack" --json | jq '.data[0].displayName'
# Expected: "Slack"

# Integration test: phrase matching
n8n nodes search '"http request"' --json | jq '.data | length'
# Expected: 1 (exact match only)

# Integration test: mode fallback
n8n nodes search "slak" --mode FUZZY --json | jq '.data[0].displayName'
# Expected: "Slack" (typo tolerance)

# Performance benchmark
time n8n nodes search "google" --limit 50 --json > /dev/null
# Expected: <50ms with FTS5 (vs ~200ms with LIKE)
```

### Adding New Commands (Reference Pattern)

If future features require new commands, follow this pattern:

**1. Create command file: `src/commands/<domain>/<action>.ts`**

```typescript
import { Command } from 'commander';
import { GlobalOptions } from '../../types/global-options';
import { formatJSON } from '../../core/formatters/json';
import { ExitCode } from '../../utils/exit-codes';

export function register<Domain><Action>Command(program: Command): void {
  program
    .command('<action> [args]')
    .description('One-line description')
    .option('--json', 'Output as JSON')
    .option('-s, --save <path>', 'Save to JSON file')
    .action(async (args, options: GlobalOptions) => {
      try {
        // Implementation
        if (options.json) {
          console.log(formatJSON({ success: true, data: result }));
        }
        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        if (options.json) {
          console.log(formatJSON({ success: false, error: { message: error.message } }));
        }
        process.exit(ExitCode.GENERAL);
      }
    });
}
```

**2. Register in domain index: `src/commands/<domain>/index.ts`**

```typescript
import { register<Domain><Action>Command } from './<action>';

export function register<Domain>Commands(program: Command): void {
  const cmd = program.command('<domain>').description('...');
  register<Domain><Action>Command(cmd);
  // ... other subcommands
}
```

**3. Wire up in CLI entry: `src/cli.ts`**

```typescript
import { register<Domain>Commands } from './commands/<domain>';
register<Domain>Commands(program);
```

---

## Related Documentation

### Files to Create/Update

| File | Action | Purpose |
|------|--------|---------|
| `README.md` | UPDATE | Add FTS5 search mode documentation under `nodes search` |
| `CHANGELOG.md` | UPDATE | Document FTS5 performance improvement |
| `docs/nodes-search.md` | CREATE (optional) | Deep-dive on search modes, phrase matching |

### README.md Updates Required

Add to `nodes search` section:

```markdown
**Search features:**
- **BM25 ranking**: Results sorted by relevance (FTS5)
- **Phrase matching**: Use quotes for exact phrases (`"http request"`)
- **Prefix matching**: Use asterisk for prefix search (`google*`)
- **Typo tolerance**: Use `--mode FUZZY` for Levenshtein matching
```

---

## Future Enhancements

1. **Template FTS5** - Apply same pattern to local template database (requires local template storage)
2. **Search Suggestions** - Use FTS5 for autocomplete as user types
3. **Faceted Search** - Combine FTS5 with category/package filters
4. **Search Analytics** - Track popular queries for optimization
5. **Stemming/Synonyms** - Configure FTS5 tokenizer for better matching
