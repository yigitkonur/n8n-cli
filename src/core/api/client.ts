/**
 * n8n API Client
 * Adapted from n8n-mcp/src/services/n8n-api-client.ts
 * Simplified for CLI use
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getConfig } from '../config/loader.js';
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
} from '../../types/n8n-api.js';

export interface N8nApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export class N8nApiClient {
  private client: AxiosInstance;
  private debug: boolean;

  constructor(config: N8nApiClientConfig) {
    const { baseUrl, apiKey, timeout = 30000 } = config;
    this.debug = process.env.N8N_DEBUG === 'true';

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

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const n8nError = handleN8nApiError(error);
        return Promise.reject(n8nError);
      }
    );
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
      const response = await this.client.get(`/workflows/${id}`);
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
      const cleaned = this.cleanWorkflowForUpdate(workflow as Workflow);
      // Try PUT first, then PATCH
      try {
        const response = await this.client.put(`/workflows/${id}`, cleaned);
        return response.data;
      } catch (putError: any) {
        if (putError.statusCode === 405) {
          const response = await this.client.patch(`/workflows/${id}`, cleaned);
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
      const response = await this.client.delete(`/workflows/${id}`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async activateWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await this.client.post(`/workflows/${id}/activate`);
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deactivateWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await this.client.post(`/workflows/${id}/deactivate`);
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
      const response = await this.client.get(`/executions/${id}`, {
        params: { includeData },
      });
      return response.data;
    } catch (error) {
      throw handleN8nApiError(error);
    }
  }

  async deleteExecution(id: string): Promise<void> {
    try {
      await this.client.delete(`/executions/${id}`);
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
    const { id, createdAt, updatedAt, versionId, active, ...rest } = workflow as any;
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
