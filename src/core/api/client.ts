/**
 * n8n API Client
 * Adapted from n8n-mcp/src/services/n8n-api-client.ts
 * Simplified for CLI use
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { debug } from '../debug.js';
import { getConfig, maskApiKey } from '../config/loader.js';
import { 
  handleN8nApiError, 
  N8nApiError,
  N8nConnectionError 
} from '../../utils/errors.js';
import type {
  Workflow,
  WorkflowListParams,
  WorkflowListResponse,
  Execution,
  ExecutionListParams,
  ExecutionListResponse,
  HealthCheckResponse,
  WebhookRequest,
  Credential,
  CredentialListParams,
  CredentialListResponse,
  CredentialSchema,
  Variable,
  VariableListParams,
  VariableListResponse,
  Tag,
  TagListParams,
  TagListResponse,
  AuditParams,
  AuditReport,
  ExecutionRetryParams,
} from '../../types/n8n-api.js';

/**
 * Validate resource ID to prevent path injection attacks.
 * Only allows alphanumeric, dash, and underscore characters.
 */
function validateResourceId(id: string, resourceType: string): string {
  if (!id || typeof id !== 'string') {
    throw new N8nApiError(`Invalid ${resourceType} ID: must be a non-empty string`);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new N8nApiError(
      `Invalid ${resourceType} ID "${id}": must contain only alphanumeric characters, dashes, and underscores`
    );
  }
  return id;
}

export interface N8nApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
};

// Extend axios config to track retry count
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

export class N8nApiClient {
  private client: AxiosInstance;

  constructor(config: N8nApiClientConfig) {
    const { baseUrl, apiKey, timeout = 30000 } = config;

    // Ensure baseUrl ends with /api/v1
    const apiUrl = baseUrl.endsWith('/api/v1') 
      ? baseUrl 
      : `${baseUrl.replace(/\/$/, '')}/api/v1`;

    this.client = axios.create({
      baseURL: apiUrl,
      timeout,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling and credential sanitization
    // Task 06: Ensure API keys are never exposed in error messages
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Sanitize the error before handling
        const sanitizedError = this.sanitizeAxiosError(error);
        const n8nError = handleN8nApiError(sanitizedError);
        return Promise.reject(n8nError);
      }
    );
    
    // Retry interceptor for transient failures (5xx, network errors)
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RetryableRequestConfig | undefined;
        if (!config) {
          return Promise.reject(error);
        }
        
        config._retryCount = config._retryCount || 0;
        
        // Check if we should retry
        const shouldRetry = this.shouldRetryRequest(error, config._retryCount);
        
        if (shouldRetry && config._retryCount < RETRY_CONFIG.maxRetries) {
          config._retryCount++;
          
          // Calculate delay with exponential backoff + jitter
          const delay = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(2, config._retryCount) + Math.random() * 100,
            RETRY_CONFIG.maxDelayMs
          );
          
          debug('api', `Retry ${config._retryCount}/${RETRY_CONFIG.maxRetries} after ${Math.round(delay)}ms: ${config.url}`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.client.request(config);
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Determine if a request should be retried based on error type
   */
  private shouldRetryRequest(error: AxiosError, retryCount: number): boolean {
    // Don't retry if we've exhausted retries
    if (retryCount >= RETRY_CONFIG.maxRetries) {
      return false;
    }
    
    // Retry on network errors (no response)
    if (!error.response) {
      const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'ENETUNREACH'];
      if (error.code && retryableCodes.includes(error.code)) {
        debug('api', `Retryable network error: ${error.code}`);
        return true;
      }
      return false;
    }
    
    const status = error.response.status;
    
    // Don't retry client errors (4xx) - they won't succeed on retry
    if (status >= 400 && status < 500) {
      return false;
    }
    
    // Retry server errors (5xx)
    if (status >= 500) {
      debug('api', `Retryable server error: ${status}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Sanitize axios error to remove sensitive information
   * Task 06: Consistent API Key Masking
   */
  private sanitizeAxiosError(error: AxiosError): AxiosError {
    if (!error || typeof error !== 'object') {
      return error;
    }
    
    // Sanitize config headers
    if (error.config?.headers) {
      const headers = error.config.headers as Record<string, unknown>;
      if (headers['X-N8N-API-KEY']) {
        headers['X-N8N-API-KEY'] = maskApiKey(String(headers['X-N8N-API-KEY']));
      }
      if (headers['Authorization']) {
        headers['Authorization'] = '[REDACTED]';
      }
    }
    
    // Sanitize request headers if present
    if (error.request?.headers) {
      const reqHeaders = error.request.headers as Record<string, unknown>;
      for (const key of Object.keys(reqHeaders)) {
        if (/api[-_]?key|auth|token|secret|password/i.test(key)) {
          reqHeaders[key] = '[REDACTED]';
        }
      }
    }
    
    return error;
  }

  // ===== Health Check =====
  
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const baseUrl = this.client.defaults.baseURL || '';
      const healthzUrl = baseUrl.replace(/\/api\/v\d+\/?$/, '') + '/healthz';
      
      const response = await axios.get(healthzUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200 && response.data?.status === 'ok') {
        return { status: 'ok', features: {} };
      }
      
      throw new Error('healthz endpoint not available');
    } catch {
      // Fallback: try listing workflows
      try {
        await this.client.get('/workflows', { params: { limit: 1 } });
        return { status: 'ok', features: {} };
      } catch (fallbackError) {
        throw handleN8nApiError(fallbackError);
      }
    }
  }

  // ===== Workflow Management =====

  async listWorkflows(params: WorkflowListParams = {}): Promise<WorkflowListResponse> {
    try {
      const response = await this.client.get('/workflows', { params });
      return this.normalizeListResponse<Workflow>(response.data);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const safeId = validateResourceId(id, 'workflow');
      const response = await this.client.get(`/workflows/${safeId}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      const cleaned = this.cleanWorkflowForCreate(workflow);
      const response = await this.client.post('/workflows', cleaned);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      const safeId = validateResourceId(id, 'workflow');
      const cleaned = this.cleanWorkflowForUpdate(workflow as Workflow);
      // Try PUT first, then PATCH
      try {
        const response = await this.client.put(`/workflows/${safeId}`, cleaned);
        return response.data;
      } catch (putError: any) {
        if (putError.statusCode === 405) {
          const response = await this.client.patch(`/workflows/${safeId}`, cleaned);
          return response.data;
        }
        throw putError;
      }
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteWorkflow(id: string): Promise<Workflow> {
    try {
      const safeId = validateResourceId(id, 'workflow');
      const response = await this.client.delete(`/workflows/${safeId}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async activateWorkflow(id: string): Promise<Workflow> {
    try {
      const safeId = validateResourceId(id, 'workflow');
      const response = await this.client.post(`/workflows/${safeId}/activate`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deactivateWorkflow(id: string): Promise<Workflow> {
    try {
      const safeId = validateResourceId(id, 'workflow');
      const response = await this.client.post(`/workflows/${safeId}/deactivate`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // ===== Execution Management =====

  async listExecutions(params: ExecutionListParams = {}): Promise<ExecutionListResponse> {
    try {
      const response = await this.client.get('/executions', { params });
      return this.normalizeListResponse<Execution>(response.data);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async getExecution(id: string, includeData = false): Promise<Execution> {
    try {
      const safeId = validateResourceId(id, 'execution');
      const response = await this.client.get(`/executions/${safeId}`, {
        params: { includeData },
      });
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteExecution(id: string): Promise<Execution> {
    try {
      const safeId = validateResourceId(id, 'execution');
      const response = await this.client.delete(`/executions/${safeId}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async retryExecution(id: string, options: ExecutionRetryParams = {}): Promise<Execution> {
    try {
      const safeId = validateResourceId(id, 'execution');
      const response = await this.client.post(`/executions/${safeId}/retry`, {
        loadWorkflow: options.loadWorkflow || false,
      });
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // ===== Credential Management =====

  async listCredentials(params: CredentialListParams = {}): Promise<CredentialListResponse> {
    try {
      const response = await this.client.get('/credentials', { params });
      return this.normalizeListResponse<Credential>(response.data);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async getCredentialSchema(typeName: string): Promise<CredentialSchema> {
    try {
      const safeType = validateResourceId(typeName, 'credential type');
      const response = await this.client.get(`/credentials/schema/${safeType}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async createCredential(credential: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>): Promise<Credential> {
    try {
      const response = await this.client.post('/credentials', credential);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteCredential(id: string): Promise<Credential> {
    try {
      const safeId = validateResourceId(id, 'credential');
      const response = await this.client.delete(`/credentials/${safeId}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // ===== Variable Management =====

  async listVariables(params: VariableListParams = {}): Promise<VariableListResponse> {
    try {
      const response = await this.client.get('/variables', { params });
      return this.normalizeListResponse<Variable>(response.data);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async createVariable(variable: Omit<Variable, 'id'>): Promise<Variable> {
    try {
      const response = await this.client.post('/variables', variable);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async updateVariable(id: string, variable: Omit<Variable, 'id'>): Promise<void> {
    try {
      const safeId = validateResourceId(id, 'variable');
      await this.client.put(`/variables/${safeId}`, variable);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteVariable(id: string): Promise<void> {
    try {
      const safeId = validateResourceId(id, 'variable');
      await this.client.delete(`/variables/${safeId}`);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // ===== Tag Management =====

  async listTags(params: TagListParams = {}): Promise<TagListResponse> {
    try {
      const response = await this.client.get('/tags', { params });
      return this.normalizeListResponse<Tag>(response.data);
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async getTag(id: string): Promise<Tag> {
    try {
      const safeId = validateResourceId(id, 'tag');
      const response = await this.client.get(`/tags/${safeId}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async createTag(tag: { name: string }): Promise<Tag> {
    try {
      const response = await this.client.post('/tags', tag);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async updateTag(id: string, tag: { name: string }): Promise<Tag> {
    try {
      const safeId = validateResourceId(id, 'tag');
      const response = await this.client.put(`/tags/${safeId}`, tag);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteTag(id: string): Promise<Tag> {
    try {
      const safeId = validateResourceId(id, 'tag');
      const response = await this.client.delete(`/tags/${safeId}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // ===== Workflow Tags =====

  async getWorkflowTags(workflowId: string): Promise<Tag[]> {
    try {
      const safeId = validateResourceId(workflowId, 'workflow');
      const response = await this.client.get(`/workflows/${safeId}/tags`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async updateWorkflowTags(workflowId: string, tagIds: string[]): Promise<Tag[]> {
    try {
      const safeId = validateResourceId(workflowId, 'workflow');
      const response = await this.client.put(`/workflows/${safeId}/tags`, 
        tagIds.map(id => ({ id }))
      );
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // ===== Audit =====

  async generateAudit(params: AuditParams = {}): Promise<AuditReport> {
    try {
      const response = await this.client.post('/audit', params);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // ===== Webhook Execution =====

  async triggerWebhook(request: WebhookRequest): Promise<any> {
    try {
      const { webhookUrl, httpMethod, data, headers, waitForResponse = true } = request;

      const url = new URL(webhookUrl);
      const webhookPath = url.pathname;
      
      const config: AxiosRequestConfig = {
        method: httpMethod,
        url: webhookPath,
        headers: { ...headers },
        data: httpMethod !== 'GET' ? data : undefined,
        params: httpMethod === 'GET' ? data : undefined,
        timeout: waitForResponse ? 120000 : 30000,
      };

      const webhookClient = axios.create({
        baseURL: `${url.protocol}//${url.host}`,
        validateStatus: (status) => status < 500,
      });

      const response = await webhookClient.request(config);
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  // ===== Private Helpers =====

  private normalizeListResponse<T>(responseData: any): { data: T[]; nextCursor?: string | null } {
    if (!responseData || typeof responseData !== 'object') {
      throw new N8nApiError('Invalid response from n8n API');
    }

    // Handle legacy array response
    if (Array.isArray(responseData)) {
      return { data: responseData, nextCursor: null };
    }

    if (!Array.isArray(responseData.data)) {
      throw new N8nApiError('Invalid response structure from n8n API');
    }

    return responseData;
  }

  private cleanWorkflowForCreate(workflow: Partial<Workflow>): Partial<Workflow> {
    // Strip all read-only properties that cause API rejection on create
    // These are server-generated or managed via separate endpoints (tags, sharing)
    const { 
      id, 
      createdAt, 
      updatedAt, 
      versionId, 
      active,
      // Additional read-only properties from exported workflows
      tags,
      pinData,
      meta,
      staticData,
      homeProject,
      shared,
      sharedWithProjects,
      ...rest 
    } = workflow as any;
    return rest;
  }

  private cleanWorkflowForUpdate(workflow: Workflow): Partial<Workflow> {
    const { id, createdAt, updatedAt, versionId, description, ...rest } = workflow as any;
    return rest;
  }
}

// ===== Singleton =====

let _client: N8nApiClient | null = null;

/**
 * Get API client singleton (uses config from environment/file)
 */
export function getApiClient(): N8nApiClient {
  if (!_client) {
    const config = getConfig();
    
    if (!config.host) {
      throw new N8nConnectionError('N8N_HOST not configured. Set environment variable or create .n8nrc file.');
    }
    if (!config.apiKey) {
      throw new N8nConnectionError('N8N_API_KEY not configured. Set environment variable or create .n8nrc file.');
    }
    
    _client = new N8nApiClient({
      baseUrl: config.host,
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
  }
  return _client;
}

/**
 * Reset API client (for testing)
 */
export function resetApiClient(): void {
  _client = null;
}
