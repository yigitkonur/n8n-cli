# Database Wrapper Design

## Overview

SQLite database wrapper for node search using FTS5 full-text search, copied from MCP server.

## MCP Source Reference

**Read from:** `n8n-mcp/src/db/` - Database queries
**Copy:** `n8n-mcp/data/nodes.db` - SQLite database file

## Architecture

```
src/core/db/
├── connection.ts     # SQLite connection management
├── nodes.ts          # Node search queries
├── templates.ts      # Template queries
└── versions.ts       # Version storage (local)

data/
└── nodes.db          # Bundled SQLite database
```

## Connection Management

```typescript
// src/core/db/connection.ts
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DatabaseError } from '../formatters/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = join(__dirname, '../../data/nodes.db');

  try {
    db = new Database(dbPath, { readonly: true });
    return db;
  } catch (error) {
    throw new DatabaseError(
      `Failed to open node database: ${dbPath}`,
      error instanceof Error ? error : undefined
    );
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
```

## Node Search

```typescript
// src/core/db/nodes.ts
import { getDatabase } from './connection.js';
import { NodeSearchResult, NodeInfo } from '../../types/node.js';

export interface SearchNodesOptions {
  query: string;
  mode?: 'OR' | 'AND' | 'FUZZY';
  limit?: number;
  includeExamples?: boolean;
}

export interface SearchNodesResult {
  nodes: NodeSearchResult[];
  totalFound: number;
  query: string;
  mode: string;
}

/**
 * Search nodes using FTS5 full-text search
 * Logic adapted from n8n-mcp/src/mcp/tools/nodes.ts
 */
export function searchNodes(options: SearchNodesOptions): SearchNodesResult {
  const { query, mode = 'OR', limit = 100, includeExamples = false } = options;
  const db = getDatabase();

  // Build FTS5 query based on mode
  const ftsQuery = buildFTS5Query(query, mode);

  // Main search query
  const sql = `
    SELECT 
      n.node_type as nodeType,
      n.display_name as displayName,
      n.description,
      n.category,
      n.subcategory,
      bm25(node_fts) as relevanceScore
    FROM node_fts
    JOIN node_info n ON node_fts.node_type = n.node_type
    WHERE node_fts MATCH ?
    ORDER BY relevanceScore
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(ftsQuery, limit) as NodeSearchResult[];

  // Count total matches
  const countSql = `
    SELECT COUNT(*) as count
    FROM node_fts
    WHERE node_fts MATCH ?
  `;
  const { count } = db.prepare(countSql).get(ftsQuery) as { count: number };

  return {
    nodes: rows,
    totalFound: count,
    query,
    mode,
  };
}

/**
 * Build FTS5 query string based on search mode
 */
function buildFTS5Query(query: string, mode: 'OR' | 'AND' | 'FUZZY'): string {
  const terms = query.trim().split(/\s+/).filter(Boolean);

  switch (mode) {
    case 'AND':
      return terms.join(' AND ');
    case 'FUZZY':
      // Use prefix matching for fuzzy
      return terms.map(t => `${t}*`).join(' OR ');
    case 'OR':
    default:
      return terms.join(' OR ');
  }
}

/**
 * Get detailed node information
 */
export function getNodeInfo(nodeType: string): NodeInfo | null {
  const db = getDatabase();

  const sql = `
    SELECT 
      node_type as nodeType,
      display_name as displayName,
      description,
      category,
      subcategory,
      version,
      defaults,
      properties,
      credentials
    FROM node_info
    WHERE node_type = ?
  `;

  const row = db.prepare(sql).get(nodeType) as NodeInfo | undefined;
  
  if (!row) return null;

  // Parse JSON fields
  return {
    ...row,
    defaults: JSON.parse(row.defaults || '{}'),
    properties: JSON.parse(row.properties || '[]'),
    credentials: JSON.parse(row.credentials || '[]'),
  };
}

/**
 * Search node properties
 */
export function searchNodeProperties(
  nodeType: string,
  propertyQuery: string,
  limit = 20
): PropertySearchResult[] {
  const db = getDatabase();

  const sql = `
    SELECT 
      path,
      name,
      type,
      description,
      bm25(property_fts) as relevanceScore
    FROM property_fts
    WHERE node_type = ? AND property_fts MATCH ?
    ORDER BY relevanceScore
    LIMIT ?
  `;

  return db.prepare(sql).all(nodeType, propertyQuery, limit) as PropertySearchResult[];
}
```

## Template Search

```typescript
// src/core/db/templates.ts
import { getDatabase } from './connection.js';
import { Template, TemplateSearchResult } from '../../types/template.js';

export interface SearchTemplatesOptions {
  query?: string;
  nodeTypes?: string[];
  category?: string;
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
}

export function searchTemplates(options: SearchTemplatesOptions): TemplateSearchResult {
  const { query, nodeTypes, category, complexity, limit = 50 } = options;
  const db = getDatabase();

  let sql = `
    SELECT 
      id,
      name,
      description,
      node_count as nodeCount,
      views,
      complexity,
      category
    FROM templates
    WHERE 1=1
  `;

  const params: unknown[] = [];

  if (query) {
    sql += ` AND (name LIKE ? OR description LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
  }

  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }

  if (complexity) {
    sql += ` AND complexity = ?`;
    params.push(complexity);
  }

  sql += ` ORDER BY views DESC LIMIT ?`;
  params.push(limit);

  const templates = db.prepare(sql).all(...params) as Template[];

  return {
    templates,
    totalFound: templates.length,
  };
}

export function getTemplate(id: number): Template | null {
  const db = getDatabase();

  const sql = `
    SELECT 
      id,
      name,
      description,
      workflow_json as workflowJson,
      node_count as nodeCount,
      views,
      complexity,
      category
    FROM templates
    WHERE id = ?
  `;

  const row = db.prepare(sql).get(id) as Template | undefined;
  
  if (!row) return null;

  return {
    ...row,
    workflowJson: JSON.parse(row.workflowJson || '{}'),
  };
}
```

## Local Version Storage

```typescript
// src/core/db/versions.ts
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';

const VERSION_DB_PATH = join(homedir(), '.n8n-cli', 'versions.db');

let versionDb: Database.Database | null = null;

function getVersionDb(): Database.Database {
  if (versionDb) return versionDb;

  // Ensure directory exists
  const dir = join(homedir(), '.n8n-cli');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  versionDb = new Database(VERSION_DB_PATH);

  // Initialize schema
  versionDb.exec(`
    CREATE TABLE IF NOT EXISTS workflow_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workflow_id, version)
    );
    
    CREATE INDEX IF NOT EXISTS idx_workflow_versions_wf 
    ON workflow_versions(workflow_id);
  `);

  return versionDb;
}

export function saveWorkflowVersion(
  workflowId: string,
  workflow: unknown
): number {
  const db = getVersionDb();

  // Get next version number
  const row = db.prepare(`
    SELECT COALESCE(MAX(version), 0) + 1 as nextVersion
    FROM workflow_versions
    WHERE workflow_id = ?
  `).get(workflowId) as { nextVersion: number };

  // Insert new version
  db.prepare(`
    INSERT INTO workflow_versions (workflow_id, version, snapshot)
    VALUES (?, ?, ?)
  `).run(workflowId, row.nextVersion, JSON.stringify(workflow));

  return row.nextVersion;
}

export function getWorkflowVersions(workflowId: string): WorkflowVersion[] {
  const db = getVersionDb();

  return db.prepare(`
    SELECT id, workflow_id, version, created_at
    FROM workflow_versions
    WHERE workflow_id = ?
    ORDER BY version DESC
  `).all(workflowId) as WorkflowVersion[];
}

export function getWorkflowVersion(
  workflowId: string,
  version: number
): unknown | null {
  const db = getVersionDb();

  const row = db.prepare(`
    SELECT snapshot
    FROM workflow_versions
    WHERE workflow_id = ? AND version = ?
  `).get(workflowId, version) as { snapshot: string } | undefined;

  return row ? JSON.parse(row.snapshot) : null;
}
```

## Dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "^9.4.3"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8"
  }
}
```

## Database Schema (from MCP)

```sql
-- node_info: Main node information
CREATE TABLE node_info (
  node_type TEXT PRIMARY KEY,
  display_name TEXT,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  version REAL,
  defaults TEXT,      -- JSON
  properties TEXT,    -- JSON
  credentials TEXT    -- JSON
);

-- node_fts: Full-text search index
CREATE VIRTUAL TABLE node_fts USING fts5(
  node_type,
  display_name,
  description,
  category
);

-- property_fts: Property search index
CREATE VIRTUAL TABLE property_fts USING fts5(
  node_type,
  path,
  name,
  type,
  description
);

-- templates: Workflow templates
CREATE TABLE templates (
  id INTEGER PRIMARY KEY,
  name TEXT,
  description TEXT,
  workflow_json TEXT,
  node_count INTEGER,
  views INTEGER,
  complexity TEXT,
  category TEXT
);
```
