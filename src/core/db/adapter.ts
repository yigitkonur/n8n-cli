/**
 * Database Adapter
 * Simplified from n8n-mcp/src/database/database-adapter.ts
 * CLI uses better-sqlite3 only (no sql.js fallback needed)
 */

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Unified database interface
 */
export interface DatabaseAdapter {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): void;
  close(): void;
  pragma(key: string, value?: any): any;
  readonly inTransaction: boolean;
  transaction<T>(fn: () => T): T;
  checkFTS5Support(): boolean;
}

export interface PreparedStatement {
  run(...params: any[]): RunResult;
  get(...params: any[]): any;
  all(...params: any[]): any[];
  iterate(...params: any[]): IterableIterator<any>;
  pluck(toggle?: boolean): this;
  expand(toggle?: boolean): this;
  raw(toggle?: boolean): this;
  columns(): ColumnDefinition[];
  bind(...params: any[]): this;
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface ColumnDefinition {
  name: string;
  column: string | null;
  table: string | null;
  database: string | null;
  type: string | null;
}

/**
 * Get default database path
 */
export function getDefaultDbPath(): string {
  // Try to find in package data directory
  const possiblePaths = [
    // Development: relative to src
    join(process.cwd(), 'data', 'nodes.db'),
    // Installed: relative to dist
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'data', 'nodes.db'),
    // Global install
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'nodes.db'),
  ];
  
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }
  
  // Default to cwd/data
  return join(process.cwd(), 'data', 'nodes.db');
}

/**
 * Create database adapter using better-sqlite3
 */
export async function createDatabaseAdapter(dbPath?: string): Promise<DatabaseAdapter> {
  const path = dbPath || getDefaultDbPath();
  
  if (!existsSync(path)) {
    throw new Error(`Database not found: ${path}. Run from package root or set N8N_DB_PATH.`);
  }
  
  try {
    // Dynamic import for better-sqlite3
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(path, { readonly: true });
    
    // Note: WAL and cache_size pragmas not needed in readonly mode
    // The database is already optimized
    
    return new BetterSQLiteAdapter(db);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    
    if (msg.includes('NODE_MODULE_VERSION')) {
      throw new Error(
        `better-sqlite3 was compiled for a different Node.js version. ` +
        `Run: npm rebuild better-sqlite3`
      );
    }
    
    throw new Error(`Failed to open database: ${msg}`);
  }
}

/**
 * Adapter for better-sqlite3
 */
class BetterSQLiteAdapter implements DatabaseAdapter {
  constructor(private db: any) {}
  
  prepare(sql: string): PreparedStatement {
    const stmt = this.db.prepare(sql);
    return new BetterSQLiteStatement(stmt);
  }
  
  exec(sql: string): void {
    this.db.exec(sql);
  }
  
  close(): void {
    this.db.close();
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
      this.exec("CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_test USING fts5(content);");
      this.exec("DROP TABLE IF EXISTS _fts5_test;");
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Statement wrapper for better-sqlite3
 */
class BetterSQLiteStatement implements PreparedStatement {
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

// Singleton instance
let _db: DatabaseAdapter | null = null;

/**
 * Get database singleton
 */
export async function getDatabase(): Promise<DatabaseAdapter> {
  if (!_db) {
    _db = await createDatabaseAdapter();
  }
  return _db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
