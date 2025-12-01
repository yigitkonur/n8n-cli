/**
 * Node Repository
 * Adapted from n8n-mcp/src/database/node-repository.ts
 * Read-only operations for CLI use
 */

import type { DatabaseAdapter } from './adapter.js';
import { getDatabase } from './adapter.js';
import { NodeTypeNormalizer } from '../../utils/node-type-normalizer.js';

/**
 * Node search result interface
 */
export interface NodeSearchResult {
  nodeType: string;
  displayName: string;
  description: string;
  category: string;
  package: string;
  isAITool: boolean;
  isTrigger: boolean;
  isWebhook: boolean;
  relevanceScore?: number;
}

/**
 * Full node info interface
 */
export interface NodeInfo extends NodeSearchResult {
  developmentStyle: string;
  isVersioned: boolean;
  version: string;
  properties: any[];
  operations: any[];
  credentials: any[];
  hasDocumentation: boolean;
  outputs: any | null;
  outputNames: any | null;
}

/**
 * Node Repository - Read-only access to nodes database
 */
export class NodeRepository {
  private db: DatabaseAdapter;
  
  constructor(db: DatabaseAdapter) {
    this.db = db;
  }
  
  /**
   * Get node by type with automatic normalization
   */
  getNode(nodeType: string): NodeInfo | null {
    // Normalize to database format (short form)
    const normalizedType = NodeTypeNormalizer.normalizeToShortForm(nodeType);

    const row = this.db.prepare(`
      SELECT * FROM nodes WHERE node_type = ?
    `).get(normalizedType) as any;

    // Fallback: try original type if normalization didn't help
    if (!row && normalizedType !== nodeType) {
      const originalRow = this.db.prepare(`
        SELECT * FROM nodes WHERE node_type = ?
      `).get(nodeType) as any;

      if (originalRow) {
        return this.parseNodeRow(originalRow);
      }
    }

    if (!row) return null;

    return this.parseNodeRow(row);
  }
  
  /**
   * Search nodes with LIKE-based matching
   * Modes: OR (any word), AND (all words), FUZZY (Levenshtein distance)
   */
  searchNodes(query: string, mode: 'OR' | 'AND' | 'FUZZY' = 'OR', limit: number = 20): NodeSearchResult[] {
    let sql = '';
    const params: any[] = [];

    if (mode === 'FUZZY') {
      // Fuzzy search: get all nodes and filter by Levenshtein distance
      sql = `
        SELECT node_type, display_name, description, category, package_name,
               is_ai_tool, is_trigger, is_webhook
        FROM nodes
      `;
      const allRows = this.db.prepare(sql).all() as any[];
      
      // Calculate fuzzy match score for each node
      const queryLower = query.toLowerCase();
      const scored = allRows.map(row => {
        const nodeType = (row.node_type || '').toLowerCase();
        const displayName = (row.display_name || '').toLowerCase();
        const description = (row.description || '').toLowerCase();
        
        // Calculate best Levenshtein distance across fields
        const distances = [
          this.levenshteinDistance(queryLower, nodeType),
          this.levenshteinDistance(queryLower, displayName),
          // For description, check if any word is close
          ...displayName.split(/\s+/).map((w: string) => this.levenshteinDistance(queryLower, w)),
        ];
        const minDistance = Math.min(...distances);
        
        // Also check substring containment with typo tolerance
        const containsMatch = nodeType.includes(queryLower) || 
                              displayName.includes(queryLower) ||
                              description.includes(queryLower);
        
        // Score: lower distance = better match, containment is bonus
        const score = containsMatch ? 0 : minDistance;
        
        return { row, score, minDistance };
      });
      
      // Filter by reasonable distance (max 3 edits for short queries, scale with length)
      const maxDistance = Math.max(2, Math.floor(query.length * 0.4));
      const matches = scored
        .filter(s => s.minDistance <= maxDistance || s.score === 0)
        .sort((a, b) => a.score - b.score)
        .slice(0, limit);
      
      return matches.map(m => this.parseSearchRow(m.row, query));
    } else {
      // OR/AND mode
      const words = query.split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0) {
        return [];
      }
      
      const conditions = words.map(() => 
        '(node_type LIKE ? OR display_name LIKE ? OR description LIKE ?)'
      );
      const operator = mode === 'AND' ? ' AND ' : ' OR ';
      
      sql = `
        SELECT node_type, display_name, description, category, package_name,
               is_ai_tool, is_trigger, is_webhook
        FROM nodes 
        WHERE ${conditions.join(operator)}
        ORDER BY display_name
        LIMIT ?
      `;
      
      for (const word of words) {
        const searchTerm = `%${word}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      params.push(limit);
    }
    
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.parseSearchRow(row, query));
  }
  
  /**
   * Get total node count
   */
  getNodeCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM nodes').get() as any;
    return result?.count || 0;
  }
  
  /**
   * Get all AI tool nodes
   */
  getAITools(): NodeSearchResult[] {
    const rows = this.db.prepare(`
      SELECT node_type, display_name, description, category, package_name,
             is_ai_tool, is_trigger, is_webhook
      FROM nodes 
      WHERE is_ai_tool = 1
      ORDER BY display_name
    `).all() as any[];
    
    return rows.map(row => this.parseSearchRow(row));
  }
  
  /**
   * Get all trigger nodes
   */
  getTriggerNodes(): NodeSearchResult[] {
    const rows = this.db.prepare(`
      SELECT node_type, display_name, description, category, package_name,
             is_ai_tool, is_trigger, is_webhook
      FROM nodes 
      WHERE is_trigger = 1
      ORDER BY display_name
    `).all() as any[];
    
    return rows.map(row => this.parseSearchRow(row));
  }
  
  /**
   * Get nodes by category
   */
  getNodesByCategory(category: string): NodeSearchResult[] {
    const rows = this.db.prepare(`
      SELECT node_type, display_name, description, category, package_name,
             is_ai_tool, is_trigger, is_webhook
      FROM nodes 
      WHERE category = ?
      ORDER BY display_name
    `).all(category) as any[];
    
    return rows.map(row => this.parseSearchRow(row));
  }
  
  /**
   * Get all unique categories
   */
  getCategories(): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT category FROM nodes ORDER BY category
    `).all() as any[];
    
    return rows.map(row => row.category).filter(Boolean);
  }
  
  /**
   * Get all nodes sorted by display name
   */
  getAllNodes(): NodeSearchResult[] {
    const rows = this.db.prepare(`
      SELECT node_type, display_name, description, category, package_name,
             is_ai_tool, is_trigger, is_webhook
      FROM nodes 
      ORDER BY display_name COLLATE NOCASE
    `).all() as any[];
    
    return rows.map(row => this.parseSearchRow(row));
  }
  
  /**
   * Get category statistics with counts
   */
  getCategoryStats(): Array<{ category: string; count: number }> {
    const rows = this.db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM nodes 
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category 
      ORDER BY count DESC
    `).all() as any[];
    
    return rows.map(row => ({
      category: row.category,
      count: row.count,
    }));
  }
  
  /**
   * Get nodes by first letter of display name (for alphabetical pagination)
   */
  getNodesByFirstLetter(letter: string): NodeSearchResult[] {
    const upperLetter = letter.toUpperCase();
    const rows = this.db.prepare(`
      SELECT node_type, display_name, description, category, package_name,
             is_ai_tool, is_trigger, is_webhook
      FROM nodes 
      WHERE UPPER(SUBSTR(display_name, 1, 1)) = ?
      ORDER BY display_name COLLATE NOCASE
    `).all(upperLetter) as any[];
    
    return rows.map(row => this.parseSearchRow(row));
  }
  
  /**
   * Format node type for display (add n8n-nodes-base prefix if needed)
   */
  static formatNodeType(nodeType: string): string {
    if (nodeType.includes('.')) {
      return `n8n-nodes-base.${nodeType.split('.').pop()}`;
    }
    return `n8n-nodes-base.${nodeType}`;
  }
  
  /**
   * Search node properties
   */
  searchNodeProperties(nodeType: string, query: string, maxResults: number = 20): any[] {
    const node = this.getNode(nodeType);
    if (!node || !node.properties) return [];
    
    const results: any[] = [];
    const searchLower = query.toLowerCase();
    
    function searchProperties(properties: any[], path: string[] = []) {
      for (const prop of properties) {
        if (results.length >= maxResults) break;
        
        const currentPath = [...path, prop.name || prop.displayName];
        const pathString = currentPath.join('.');
        
        if (prop.name?.toLowerCase().includes(searchLower) ||
            prop.displayName?.toLowerCase().includes(searchLower) ||
            prop.description?.toLowerCase().includes(searchLower)) {
          results.push({
            path: pathString,
            property: prop,
            description: prop.description
          });
        }
        
        // Search nested properties
        if (prop.options) {
          searchProperties(prop.options, currentPath);
        }
      }
    }
    
    searchProperties(node.properties);
    return results;
  }
  
  /**
   * Get node operations
   */
  getNodeOperations(nodeType: string): any[] {
    const node = this.getNode(nodeType);
    if (!node) return [];

    const operations: any[] = [];

    if (node.operations) {
      if (Array.isArray(node.operations)) {
        operations.push(...node.operations);
      } else if (typeof node.operations === 'object') {
        Object.values(node.operations).forEach(ops => {
          if (Array.isArray(ops)) {
            operations.push(...ops);
          }
        });
      }
    }

    // Also check properties for operation fields
    if (node.properties && Array.isArray(node.properties)) {
      for (const prop of node.properties) {
        if (prop.name === 'operation' && prop.options) {
          operations.push(...prop.options);
        }
      }
    }

    return operations;
  }
  
  /**
   * Get node resources
   */
  getNodeResources(nodeType: string): any[] {
    const node = this.getNode(nodeType);
    if (!node || !node.properties) return [];

    const resources: any[] = [];

    for (const prop of node.properties) {
      if (prop.name === 'resource' && prop.options) {
        resources.push(...prop.options);
      }
    }

    return resources;
  }

  // ===== Private helpers =====
  
  private safeJsonParse(json: string, defaultValue: any): any {
    if (!json) return defaultValue;
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }

  private parseNodeRow(row: any): NodeInfo {
    return {
      nodeType: row.node_type,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      developmentStyle: row.development_style,
      package: row.package_name,
      isAITool: Number(row.is_ai_tool) === 1,
      isTrigger: Number(row.is_trigger) === 1,
      isWebhook: Number(row.is_webhook) === 1,
      isVersioned: Number(row.is_versioned) === 1,
      version: row.version,
      properties: this.safeJsonParse(row.properties_schema, []),
      operations: this.safeJsonParse(row.operations, []),
      credentials: this.safeJsonParse(row.credentials_required, []),
      hasDocumentation: !!row.documentation,
      outputs: row.outputs ? this.safeJsonParse(row.outputs, null) : null,
      outputNames: row.output_names ? this.safeJsonParse(row.output_names, null) : null
    };
  }
  
  private parseSearchRow(row: any, query?: string): NodeSearchResult {
    const result: NodeSearchResult = {
      nodeType: row.node_type,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      package: row.package_name,
      isAITool: Number(row.is_ai_tool) === 1,
      isTrigger: Number(row.is_trigger) === 1,
      isWebhook: Number(row.is_webhook) === 1,
    };
    
    // Calculate simple relevance score if query provided
    if (query) {
      result.relevanceScore = this.calculateRelevance(result, query);
    }
    
    return result;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  private calculateRelevance(result: NodeSearchResult, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Exact match in nodeType = highest score
    if (result.nodeType.toLowerCase().includes(queryLower)) {
      score += 100;
      if (result.nodeType.toLowerCase() === queryLower) score += 50;
    }
    
    // Match in displayName
    if (result.displayName.toLowerCase().includes(queryLower)) {
      score += 75;
      if (result.displayName.toLowerCase() === queryLower) score += 25;
    }
    
    // Match in description
    if (result.description?.toLowerCase().includes(queryLower)) {
      score += 25;
    }
    
    return score;
  }
}

// ===== Singleton =====

let _repository: NodeRepository | null = null;

/**
 * Get NodeRepository singleton
 */
export async function getNodeRepository(): Promise<NodeRepository> {
  if (!_repository) {
    const db = await getDatabase();
    _repository = new NodeRepository(db);
  }
  return _repository;
}
