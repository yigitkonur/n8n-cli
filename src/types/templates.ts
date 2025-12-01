/**
 * Template Types for CLI
 * Used by: src/core/templates/service.ts, src/commands/templates/*.ts
 */

/**
 * Template metadata from AI-generated analysis
 */
export interface TemplateMetadata {
  categories: string[];
  complexity: 'simple' | 'medium' | 'complex';
  use_cases: string[];
  estimated_setup_minutes: number;
  required_services: string[];
  key_features: string[];
  target_audience: string[];
}

/**
 * Template author information
 */
export interface TemplateAuthor {
  name: string;
  username: string;
  verified: boolean;
}

/**
 * Template information returned from search/get operations
 */
export interface TemplateInfo {
  id: number;
  name: string;
  description: string;
  author: TemplateAuthor;
  nodes: string[];
  views: number;
  created: string;
  url: string;
  metadata?: TemplateMetadata;
}

/**
 * Template with full workflow JSON (for get operations)
 */
export interface TemplateWithWorkflow extends TemplateInfo {
  workflow: any;
}

/**
 * Minimal template info for list operations
 */
export interface TemplateMinimal {
  id: number;
  name: string;
  description: string;
  views: number;
  nodeCount: number;
  metadata?: TemplateMetadata;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Metadata filter options for by_metadata search mode
 */
export interface MetadataFilters {
  category?: string;
  complexity?: 'simple' | 'medium' | 'complex';
  maxSetupMinutes?: number;
  minSetupMinutes?: number;
  requiredService?: string;
  targetAudience?: string;
}

/**
 * Stored template as it appears in SQLite database
 */
export interface StoredTemplate {
  id: number;
  workflow_id: number;
  name: string;
  description: string;
  author_name: string;
  author_username: string;
  author_verified: number; // 0 or 1
  nodes_used: string; // JSON string array
  workflow_json?: string; // Decompressed JSON
  workflow_json_compressed?: string; // Base64 encoded gzip
  categories: string; // JSON string array
  views: number;
  created_at: string;
  updated_at: string;
  url: string;
  scraped_at?: string;
  metadata_json?: string; // JSON string
  metadata_generated_at?: string;
}

/**
 * Available task types for by_task search mode
 */
export type TemplateTask =
  | 'ai_automation'
  | 'data_sync'
  | 'webhook_processing'
  | 'email_automation'
  | 'slack_integration'
  | 'data_transformation'
  | 'file_processing'
  | 'scheduling'
  | 'api_integration'
  | 'database_operations';

/**
 * Task definition with description and key nodes
 */
export interface TaskDefinition {
  task: TemplateTask;
  description: string;
  nodes: string;
}

/**
 * All available template tasks
 */
export const TEMPLATE_TASKS: readonly TemplateTask[] = [
  'ai_automation',
  'data_sync',
  'webhook_processing',
  'email_automation',
  'slack_integration',
  'data_transformation',
  'file_processing',
  'scheduling',
  'api_integration',
  'database_operations'
] as const;

/**
 * Task definitions with descriptions for list-tasks command
 */
export const TASK_DEFINITIONS: readonly TaskDefinition[] = [
  { task: 'ai_automation', description: 'AI/ML workflows with OpenAI, agents, langchain', nodes: 'openAi, agent, lmChatOpenAi' },
  { task: 'data_sync', description: 'Synchronize data between services', nodes: 'googleSheets, postgres, mysql' },
  { task: 'webhook_processing', description: 'Handle incoming webhooks', nodes: 'webhook, httpRequest' },
  { task: 'email_automation', description: 'Email workflows and triggers', nodes: 'gmail, emailSend, emailReadImap' },
  { task: 'slack_integration', description: 'Slack messaging and triggers', nodes: 'slack, slackTrigger' },
  { task: 'data_transformation', description: 'Transform and process data', nodes: 'code, set, merge' },
  { task: 'file_processing', description: 'File operations and storage', nodes: 'readBinaryFile, googleDrive' },
  { task: 'scheduling', description: 'Scheduled/cron workflows', nodes: 'scheduleTrigger, cron' },
  { task: 'api_integration', description: 'External API integrations', nodes: 'httpRequest, graphql' },
  { task: 'database_operations', description: 'Database CRUD operations', nodes: 'postgres, mysql, mongodb' }
] as const;

/**
 * Task to node types mapping for by_task search
 */
export const TASK_NODE_MAP: Record<TemplateTask, string[]> = {
  'ai_automation': ['@n8n/n8n-nodes-langchain.openAi', '@n8n/n8n-nodes-langchain.agent', 'n8n-nodes-base.openAi'],
  'data_sync': ['n8n-nodes-base.googleSheets', 'n8n-nodes-base.postgres', 'n8n-nodes-base.mysql'],
  'webhook_processing': ['n8n-nodes-base.webhook', 'n8n-nodes-base.httpRequest'],
  'email_automation': ['n8n-nodes-base.gmail', 'n8n-nodes-base.emailSend', 'n8n-nodes-base.emailReadImap'],
  'slack_integration': ['n8n-nodes-base.slack', 'n8n-nodes-base.slackTrigger'],
  'data_transformation': ['n8n-nodes-base.code', 'n8n-nodes-base.set', 'n8n-nodes-base.merge'],
  'file_processing': ['n8n-nodes-base.readBinaryFile', 'n8n-nodes-base.writeBinaryFile', 'n8n-nodes-base.googleDrive'],
  'scheduling': ['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.cron'],
  'api_integration': ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.graphql'],
  'database_operations': ['n8n-nodes-base.postgres', 'n8n-nodes-base.mysql', 'n8n-nodes-base.mongodb']
};
