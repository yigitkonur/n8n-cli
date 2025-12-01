/**
 * Template Service
 * Business logic layer for template search operations.
 * 
 * Ported from: n8n-mcp/src/templates/template-service.ts
 */

import type { DatabaseAdapter } from '../db/adapter.js';
import { TemplateRepository } from './repository.js';
import {
  type TemplateInfo,
  type PaginatedResponse,
  type MetadataFilters,
  type StoredTemplate,
  type TemplateMetadata,
  TEMPLATE_TASKS,
} from '../../types/templates.js';

export class TemplateService {
  private repository: TemplateRepository;
  
  constructor(db: DatabaseAdapter) {
    this.repository = new TemplateRepository(db);
  }
  
  /**
   * Search templates by query string (FTS5 or LIKE)
   */
  async searchTemplates(query: string, limit: number = 20, offset: number = 0): Promise<PaginatedResponse<TemplateInfo>> {
    const templates = this.repository.searchTemplates(query, limit, offset);
    const total = this.repository.getSearchCount(query);
    
    return {
      items: templates.map(t => this.formatTemplateInfo(t)),
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }
  
  /**
   * List templates that use specific node types
   */
  async listNodeTemplates(nodeTypes: string[], limit: number = 10, offset: number = 0): Promise<PaginatedResponse<TemplateInfo>> {
    const templates = this.repository.getTemplatesByNodes(nodeTypes, limit, offset);
    const total = this.repository.getNodeTemplatesCount(nodeTypes);
    
    return {
      items: templates.map(t => this.formatTemplateInfo(t)),
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }
  
  /**
   * Get templates for a specific task
   */
  async getTemplatesForTask(task: string, limit: number = 10, offset: number = 0): Promise<PaginatedResponse<TemplateInfo>> {
    const templates = this.repository.getTemplatesForTask(task, limit, offset);
    const total = this.repository.getTaskTemplatesCount(task);
    
    return {
      items: templates.map(t => this.formatTemplateInfo(t)),
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }
  
  /**
   * Search templates by metadata filters
   */
  async searchTemplatesByMetadata(
    filters: MetadataFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResponse<TemplateInfo>> {
    const templates = this.repository.searchTemplatesByMetadata(filters, limit, offset);
    const total = this.repository.getMetadataSearchCount(filters);
    
    return {
      items: templates.map(t => this.formatTemplateInfo(t)),
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }
  
  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: number): Promise<TemplateInfo | null> {
    const template = this.repository.getTemplate(templateId);
    if (!template) {return null;}
    return this.formatTemplateInfo(template);
  }
  
  /**
   * List all templates with minimal data
   */
  async listTemplates(
    limit: number = 10, 
    offset: number = 0, 
    sortBy: 'views' | 'created_at' | 'name' = 'views'
  ): Promise<PaginatedResponse<TemplateInfo>> {
    const templates = this.repository.getAllTemplates(limit, offset, sortBy);
    const total = this.repository.getTemplateCount();
    
    return {
      items: templates.map(t => this.formatTemplateInfo(t)),
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }
  
  /**
   * List available tasks
   */
  listAvailableTasks(): readonly string[] {
    return TEMPLATE_TASKS;
  }
  
  /**
   * Get available categories from template metadata
   */
  async getAvailableCategories(): Promise<string[]> {
    return this.repository.getAvailableCategories();
  }
  
  /**
   * Get available target audiences from template metadata
   */
  async getAvailableTargetAudiences(): Promise<string[]> {
    return this.repository.getAvailableTargetAudiences();
  }
  
  /**
   * Get total template count
   */
  getTemplateCount(): number {
    return this.repository.getTemplateCount();
  }
  
  /**
   * Format stored template for API response
   */
  private formatTemplateInfo(template: StoredTemplate): TemplateInfo {
    const info: TemplateInfo = {
      id: template.id,
      name: template.name,
      description: template.description || '',
      author: {
        name: template.author_name || '',
        username: template.author_username || '',
        verified: template.author_verified === 1
      },
      nodes: this.parseJsonArray(template.nodes_used),
      views: template.views || 0,
      created: template.created_at || '',
      url: template.url || `https://n8n.io/workflows/${template.id}`
    };
    
    // Include metadata if available
    if (template.metadata_json) {
      try {
        info.metadata = JSON.parse(template.metadata_json) as TemplateMetadata;
      } catch {
        // Silently ignore parse errors
      }
    }
    
    return info;
  }
  
  /**
   * Parse JSON array string safely
   */
  private parseJsonArray(jsonStr: string | undefined): string[] {
    if (!jsonStr) {return [];}
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
