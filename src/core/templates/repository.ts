/**
 * Template Repository
 * Handles SQLite queries for template search operations.
 * 
 * Ported from: n8n-mcp/src/templates/template-repository.ts
 */

import * as zlib from 'zlib';
import type { DatabaseAdapter } from '../db/adapter.js';
import { type StoredTemplate, type MetadataFilters, type TemplateTask, TASK_NODE_MAP } from '../../types/templates.js';
import { resolveTemplateNodeTypes } from '../../utils/template-node-resolver.js';

export class TemplateRepository {
  private hasFTS5Support: boolean = false;
  
  constructor(private db: DatabaseAdapter) {
    this.hasFTS5Support = this.db.checkFTS5Support();
  }
  
  /**
   * Search templates by name or description using FTS5 or LIKE fallback
   */
  searchTemplates(query: string, limit: number = 20, offset: number = 0): StoredTemplate[] {
    if (!this.hasFTS5Support || !query.trim()) {
      return this.searchTemplatesLIKE(query, limit, offset);
    }
    
    try {
      // Use FTS5 for search - escape quotes in terms
      const ftsQuery = query.split(' ')
        .filter(term => term.trim())
        .map(term => {
          const escaped = term.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(' OR ');
      
      const results = this.db.prepare(`
        SELECT t.* FROM templates t
        JOIN templates_fts ON t.id = templates_fts.rowid
        WHERE templates_fts MATCH ?
        ORDER BY rank, t.views DESC
        LIMIT ? OFFSET ?
      `).all(ftsQuery, limit, offset) as StoredTemplate[];
      
      return results.map(t => this.decompressWorkflow(t));
    } catch {
      // If FTS5 query fails, fallback to LIKE search
      return this.searchTemplatesLIKE(query, limit, offset);
    }
  }
  
  /**
   * Fallback search using LIKE when FTS5 is not available or fails
   */
  private searchTemplatesLIKE(query: string, limit: number = 20, offset: number = 0): StoredTemplate[] {
    const likeQuery = `%${query}%`;
    
    const results = this.db.prepare(`
      SELECT * FROM templates 
      WHERE name LIKE ? OR description LIKE ?
      ORDER BY views DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(likeQuery, likeQuery, limit, offset) as StoredTemplate[];
    
    return results.map(t => this.decompressWorkflow(t));
  }
  
  /**
   * Get templates that use specific node types
   */
  getTemplatesByNodes(nodeTypes: string[], limit: number = 10, offset: number = 0): StoredTemplate[] {
    // Resolve input node types to all possible template formats
    const resolvedTypes = resolveTemplateNodeTypes(nodeTypes);
    
    if (resolvedTypes.length === 0) {
      return [];
    }
    
    // Build query for multiple node types
    const conditions = resolvedTypes.map(() => "nodes_used LIKE ?").join(" OR ");
    const query = `
      SELECT * FROM templates 
      WHERE ${conditions}
      ORDER BY views DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const params = [...resolvedTypes.map(n => `%"${n}"%`), limit, offset];
    const results = this.db.prepare(query).all(...params) as StoredTemplate[];
    
    return results.map(t => this.decompressWorkflow(t));
  }
  
  /**
   * Get templates for a specific task/use case
   */
  getTemplatesForTask(task: string, limit: number = 10, offset: number = 0): StoredTemplate[] {
    const nodes = TASK_NODE_MAP[task as TemplateTask];
    if (!nodes) {
      return [];
    }
    
    return this.getTemplatesByNodes(nodes, limit, offset);
  }
  
  /**
   * Search templates by metadata fields using json_extract
   */
  searchTemplatesByMetadata(filters: MetadataFilters, limit: number = 20, offset: number = 0): StoredTemplate[] {
    const { conditions, params } = this.buildMetadataFilterConditions(filters);
    
    const query = `
      SELECT * FROM templates
      WHERE ${conditions.join(' AND ')}
      ORDER BY views DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    const results = this.db.prepare(query).all(...params) as StoredTemplate[];
    
    return results.map(t => this.decompressWorkflow(t));
  }
  
  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: number): StoredTemplate | null {
    const row = this.db.prepare(`
      SELECT * FROM templates WHERE id = ?
    `).get(templateId) as StoredTemplate | undefined;
    
    if (!row) {return null;}
    
    return this.decompressWorkflow(row);
  }
  
  /**
   * Get all templates with limit
   */
  getAllTemplates(limit: number = 10, offset: number = 0, sortBy: 'views' | 'created_at' | 'name' = 'views'): StoredTemplate[] {
    const orderClause = sortBy === 'name' ? 'name ASC' : 
                        sortBy === 'created_at' ? 'created_at DESC' : 
                        'views DESC, created_at DESC';
    const results = this.db.prepare(`
      SELECT * FROM templates 
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `).all(limit, offset) as StoredTemplate[];
    return results.map(t => this.decompressWorkflow(t));
  }
  
  /**
   * Get total template count
   */
  getTemplateCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM templates').get() as { count: number };
    return result.count;
  }
  
  /**
   * Get count for search results
   */
  getSearchCount(query: string): number {
    if (!this.hasFTS5Support || !query.trim()) {
      const likeQuery = `%${query}%`;
      const result = this.db.prepare(`
        SELECT COUNT(*) as count FROM templates 
        WHERE name LIKE ? OR description LIKE ?
      `).get(likeQuery, likeQuery) as { count: number };
      return result.count;
    }
    
    try {
      const ftsQuery = query.split(' ')
        .filter(term => term.trim())
        .map(term => {
          const escaped = term.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(' OR ');
      
      const result = this.db.prepare(`
        SELECT COUNT(*) as count FROM templates t
        JOIN templates_fts ON t.id = templates_fts.rowid
        WHERE templates_fts MATCH ?
      `).get(ftsQuery) as { count: number };
      return result.count;
    } catch {
      const likeQuery = `%${query}%`;
      const result = this.db.prepare(`
        SELECT COUNT(*) as count FROM templates 
        WHERE name LIKE ? OR description LIKE ?
      `).get(likeQuery, likeQuery) as { count: number };
      return result.count;
    }
  }
  
  /**
   * Get count for node templates
   */
  getNodeTemplatesCount(nodeTypes: string[]): number {
    const resolvedTypes = resolveTemplateNodeTypes(nodeTypes);
    
    if (resolvedTypes.length === 0) {
      return 0;
    }
    
    const conditions = resolvedTypes.map(() => "nodes_used LIKE ?").join(" OR ");
    const query = `SELECT COUNT(*) as count FROM templates WHERE ${conditions}`;
    const params = resolvedTypes.map(n => `%"${n}"%`);
    const result = this.db.prepare(query).get(...params) as { count: number };
    return result.count;
  }
  
  /**
   * Get count for task templates
   */
  getTaskTemplatesCount(task: string): number {
    const nodes = TASK_NODE_MAP[task as TemplateTask];
    if (!nodes) {
      return 0;
    }
    
    return this.getNodeTemplatesCount(nodes);
  }
  
  /**
   * Get count for metadata search results
   */
  getMetadataSearchCount(filters: MetadataFilters): number {
    const { conditions, params } = this.buildMetadataFilterConditions(filters);
    
    const query = `SELECT COUNT(*) as count FROM templates WHERE ${conditions.join(' AND ')}`;
    const result = this.db.prepare(query).get(...params) as { count: number };
    return result.count;
  }
  
  /**
   * Get unique categories from template metadata
   */
  getAvailableCategories(): string[] {
    try {
      const results = this.db.prepare(`
        SELECT DISTINCT json_extract(value, '$') as category
        FROM templates, json_each(json_extract(metadata_json, '$.categories'))
        WHERE metadata_json IS NOT NULL
        ORDER BY category
      `).all() as { category: string }[];
      
      return results.map(r => r.category).filter(Boolean);
    } catch {
      return [];
    }
  }
  
  /**
   * Get unique target audiences from template metadata
   */
  getAvailableTargetAudiences(): string[] {
    try {
      const results = this.db.prepare(`
        SELECT DISTINCT json_extract(value, '$') as audience
        FROM templates, json_each(json_extract(metadata_json, '$.target_audience'))
        WHERE metadata_json IS NOT NULL
        ORDER BY audience
      `).all() as { audience: string }[];
      
      return results.map(r => r.audience).filter(Boolean);
    } catch {
      return [];
    }
  }
  
  /**
   * Build WHERE conditions for metadata filtering
   */
  private buildMetadataFilterConditions(filters: MetadataFilters): { conditions: string[], params: any[] } {
    const conditions: string[] = ['metadata_json IS NOT NULL'];
    const params: any[] = [];

    if (filters.category !== undefined) {
      conditions.push("json_extract(metadata_json, '$.categories') LIKE '%' || ? || '%'");
      const sanitizedCategory = JSON.stringify(filters.category).slice(1, -1);
      params.push(sanitizedCategory);
    }

    if (filters.complexity) {
      conditions.push("json_extract(metadata_json, '$.complexity') = ?");
      params.push(filters.complexity);
    }

    if (filters.maxSetupMinutes !== undefined) {
      conditions.push("CAST(json_extract(metadata_json, '$.estimated_setup_minutes') AS INTEGER) <= ?");
      params.push(filters.maxSetupMinutes);
    }

    if (filters.minSetupMinutes !== undefined) {
      conditions.push("CAST(json_extract(metadata_json, '$.estimated_setup_minutes') AS INTEGER) >= ?");
      params.push(filters.minSetupMinutes);
    }

    if (filters.requiredService !== undefined) {
      conditions.push("json_extract(metadata_json, '$.required_services') LIKE '%' || ? || '%'");
      const sanitizedService = JSON.stringify(filters.requiredService).slice(1, -1);
      params.push(sanitizedService);
    }

    if (filters.targetAudience !== undefined) {
      conditions.push("json_extract(metadata_json, '$.target_audience') LIKE '%' || ? || '%'");
      const sanitizedAudience = JSON.stringify(filters.targetAudience).slice(1, -1);
      params.push(sanitizedAudience);
    }

    return { conditions, params };
  }
  
  /**
   * Decompress workflow JSON for a template
   */
  private decompressWorkflow(template: StoredTemplate): StoredTemplate {
    if (template.workflow_json_compressed && !template.workflow_json) {
      try {
        const compressed = Buffer.from(template.workflow_json_compressed, 'base64');
        const decompressed = zlib.gunzipSync(compressed);
        template.workflow_json = decompressed.toString();
      } catch {
        // Silently fail - workflow_json will remain undefined
      }
    }
    return template;
  }
}
