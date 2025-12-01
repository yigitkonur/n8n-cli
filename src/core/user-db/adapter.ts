/**
 * User Database Adapter
 * Writable SQLite database for user-specific data (workflow versions, settings)
 * Location: ~/.n8n-cli/data.db
 */

import { existsSync, chmodSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { DatabaseAdapter, PreparedStatement, RunResult, ColumnDefinition } from '../db/adapter.js';

// Database paths
const USER_DATA_DIR = join(homedir(), '.n8n-cli');
const USER_DB_PATH = join(USER_DATA_DIR, 'data.db');

// Current schema version
const CURRENT_SCHEMA_VERSION = 1;

// Embedded schema SQL (avoids file path resolution issues in bundled CLI)
const SCHEMA_SQL = `
-- n8n CLI User Database Schema
-- Location: ~/.n8n-cli/data.db

-- Schema version tracking for migrations
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workflow versions table for rollback and version history tracking
CREATE TABLE IF NOT EXISTS workflow_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  workflow_name TEXT NOT NULL,
  workflow_snapshot TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK(trigger IN (
    'partial_update',
    'full_update',
    'autofix',
    'manual'
  )),
  operations TEXT,
  fix_types TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, version_number)
);

-- Indexes for workflow version queries
CREATE INDEX IF NOT EXISTS idx_wv_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wv_created_at ON workflow_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_wv_trigger ON workflow_versions(trigger);
`;

/**
 * Initialize the user database with schema
 */
async function initializeDatabase(db: any): Promise<void> {
  // Check current schema version
  let currentVersion = 0;
  try {
    const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as any;
    currentVersion = row?.version || 0;
  } catch {
    // Table doesn't exist yet, will be created by schema
    currentVersion = 0;
  }
  
  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    // Apply schema
    db.exec(SCHEMA_SQL);
    
    // Record schema version
    if (currentVersion === 0) {
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(CURRENT_SCHEMA_VERSION);
    }
  }
}

/**
 * Check database integrity
 */
function checkIntegrity(db: any): boolean {
  try {
    const result = db.pragma('quick_check');
    return result[0]?.quick_check === 'ok';
  } catch {
    return false;
  }
}

/**
 * Create user database adapter
 */
export async function createUserDatabaseAdapter(): Promise<UserDatabaseAdapter> {
  // Ensure directory exists with secure permissions
  if (!existsSync(USER_DATA_DIR)) {
    await mkdir(USER_DATA_DIR, { recursive: true, mode: 0o700 });
  }
  
  try {
    // Dynamic import for better-sqlite3
    const Database = (await import('better-sqlite3')).default;
    
    // Create or open database
    const db = new Database(USER_DB_PATH);
    
    // Set file permissions (owner read/write only)
    try {
      chmodSync(USER_DB_PATH, 0o600);
    } catch {
      // May fail on Windows, continue anyway
    }
    
    // Configure for performance and safety
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000'); // 64MB cache
    db.pragma('temp_store = MEMORY');
    db.pragma('wal_autocheckpoint = 100');
    
    // Check integrity
    if (!checkIntegrity(db)) {
      throw new Error('Database integrity check failed');
    }
    
    // Initialize schema
    await initializeDatabase(db);
    
    return new BetterSQLiteUserAdapter(db);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    
    if (msg.includes('NODE_MODULE_VERSION')) {
      throw new Error(
        'better-sqlite3 was compiled for a different Node.js version. ' +
        'Run: npm rebuild better-sqlite3'
      );
    }
    
    throw new Error(`Failed to open user database: ${msg}`);
  }
}

/**
 * Adapter implementation for better-sqlite3 (writable)
 */
class BetterSQLiteUserAdapter implements UserDatabaseAdapter {
  constructor(private db: any) {
    // Register cleanup on process exit
    process.on('SIGINT', () => this.close());
    process.on('SIGTERM', () => this.close());
    process.on('beforeExit', () => this.close());
  }
  
  prepare(sql: string): PreparedStatement {
    const stmt = this.db.prepare(sql);
    return new BetterSQLiteUserStatement(stmt);
  }
  
  exec(sql: string): void {
    this.db.exec(sql);
  }
  
  close(): void {
    try {
      // Checkpoint WAL before closing
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      this.db.close();
    } catch {
      // Already closed or error, ignore
    }
  }
  
  pragma(key: string, value?: any): any {
    return this.db.pragma(key, value);
  }
  
  get inTransaction(): boolean {
    return this.db.inTransaction;
  }
  
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
  
  checkFTS5Support(): boolean {
    try {
      this.exec('CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_test USING fts5(content);');
      this.exec('DROP TABLE IF EXISTS _fts5_test;');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Statement wrapper for better-sqlite3
 */
class BetterSQLiteUserStatement implements PreparedStatement {
  constructor(private stmt: any) {}
  
  run(...params: any[]): RunResult {
    return this.stmt.run(...params);
  }
  
  get(...params: any[]): any {
    return this.stmt.get(...params);
  }
  
  all(...params: any[]): any[] {
    return this.stmt.all(...params);
  }
  
  iterate(...params: any[]): IterableIterator<any> {
    return this.stmt.iterate(...params);
  }
  
  pluck(toggle?: boolean): this {
    this.stmt.pluck(toggle);
    return this;
  }
  
  expand(toggle?: boolean): this {
    this.stmt.expand(toggle);
    return this;
  }
  
  raw(toggle?: boolean): this {
    this.stmt.raw(toggle);
    return this;
  }
  
  columns(): ColumnDefinition[] {
    return this.stmt.columns();
  }
  
  bind(...params: any[]): this {
    this.stmt.bind(...params);
    return this;
  }
}

/**
 * User database adapter interface (extends base with writable operations)
 */
export interface UserDatabaseAdapter extends DatabaseAdapter {
  // Inherits all methods from DatabaseAdapter
}

// Singleton instance
let _userDb: UserDatabaseAdapter | null = null;

/**
 * Get user database singleton
 */
export async function getUserDatabase(): Promise<UserDatabaseAdapter> {
  if (!_userDb) {
    _userDb = await createUserDatabaseAdapter();
  }
  return _userDb;
}

/**
 * Close user database connection
 */
export function closeUserDatabase(): void {
  if (_userDb) {
    _userDb.close();
    _userDb = null;
  }
}

/**
 * Get user data directory path
 */
export function getUserDataDir(): string {
  return USER_DATA_DIR;
}

/**
 * Get user database path
 */
export function getUserDbPath(): string {
  return USER_DB_PATH;
}
