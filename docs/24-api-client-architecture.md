# API Client Architecture

## Overview

HTTP client wrapper for n8n REST API with authentication, retry logic, and type-safe responses.

## MCP Source Reference

> ⚠️ **DO NOT** use `src/api/n8n-client.ts` - that path doesn't exist.

**COPY from:** `n8n-mcp/src/services/n8n-api-client.ts` (530 lines)

This is the production-ready API client with:
- Axios-based HTTP client with interceptors
- `X-N8N-API-KEY` header authentication
- Request/response logging
- Error handling via `handleN8nApiError()`
- Retry logic with configurable `maxRetries`
- All workflow/execution CRUD methods

**Also copy:**
- `n8n-mcp/src/utils/n8n-errors.ts` (157 lines) → Error classes
- `n8n-mcp/src/types/n8n-api.ts` (8.3KB) → All API response types

**Adapt:** Remove MCP logger, add CLI-specific formatting

## Architecture

```
src/core/api/
├── client.ts         # Base HTTP client
├── workflows.ts      # Workflow operations
├── executions.ts     # Execution operations
└── health.ts         # Health check operations
```

## Base Client

```typescript
// src/core/api/client.ts
import { Config } from '../utils/config.js';
import { APIError } from '../formatters/errors.js';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

export interface APIResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export class N8NClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: Config) {
    this.baseUrl = config.n8nUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Make authenticated request to n8n API
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const { method = 'GET', body, params, timeout = this.timeout } = options;

    // Build URL with query params
    const url = new URL(`${this.baseUrl}/api/v1${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Setup abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle error responses
      if (!response.ok) {
        const errorBody = await response.text();
        let message = `API request failed: ${response.status}`;
        
        try {
          const parsed = JSON.parse(errorBody);
          message = parsed.message || parsed.error || message;
        } catch {}

        throw new APIError(message, {
          statusCode: response.status,
          endpoint: url.toString(),
        });
      }

      // Parse response
      const data = await response.json() as T;

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) throw error;

      if (error.name === 'AbortError') {
        throw new APIError(`Request timeout after ${timeout}ms`, {
          endpoint: url.toString(),
        });
      }

      throw new APIError('Failed to connect to n8n instance', {
        endpoint: url.toString(),
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, params?: RequestOptions['params']): Promise<T> {
    const response = await this.request<T>(endpoint, { params });
    return response.data;
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await this.request<T>(endpoint, { method: 'POST', body });
    return response.data;
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await this.request<T>(endpoint, { method: 'PUT', body });
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, { method: 'DELETE' });
    return response.data;
  }
}

// Singleton instance
let clientInstance: N8NClient | null = null;

export function getClient(config: Config): N8NClient {
  if (!clientInstance) {
    clientInstance = new N8NClient(config);
  }
  return clientInstance;
}
```

## Workflow Operations

```typescript
// src/core/api/workflows.ts
import { N8NClient } from './client.js';
import { Workflow, WorkflowListResponse } from '../../types/workflow.js';

export interface ListWorkflowsOptions {
  limit?: number;
  cursor?: string;
  active?: boolean;
  tags?: string[];
  excludePinnedData?: boolean;
}

export async function listWorkflows(
  client: N8NClient,
  options: ListWorkflowsOptions = {}
): Promise<WorkflowListResponse> {
  return client.get<WorkflowListResponse>('/workflows', {
    limit: options.limit,
    cursor: options.cursor,
    active: options.active,
    tags: options.tags?.join(','),
    excludePinnedData: options.excludePinnedData,
  });
}

export async function getWorkflow(
  client: N8NClient,
  id: string
): Promise<Workflow> {
  return client.get<Workflow>(`/workflows/${id}`);
}

export async function createWorkflow(
  client: N8NClient,
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Workflow> {
  return client.post<Workflow>('/workflows', workflow);
}

export async function updateWorkflow(
  client: N8NClient,
  id: string,
  workflow: Partial<Workflow>
): Promise<Workflow> {
  return client.put<Workflow>(`/workflows/${id}`, workflow);
}

export async function triggerWebhook(
  client: N8NClient,
  options: {
    url: string;
    method: string;
    data?: unknown;
    headers?: Record<string, string>;
  }
): Promise<unknown> {
  const { url, method, data, headers = {} } = options;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new APIError(`Webhook trigger failed: ${response.status}`, {
      statusCode: response.status,
      endpoint: url,
    });
  }

  return response.json();
}
```

## Execution Operations

```typescript
// src/core/api/executions.ts
import { N8NClient } from './client.js';
import { Execution, ExecutionListResponse } from '../../types/execution.js';

export interface ListExecutionsOptions {
  workflowId?: string;
  status?: 'success' | 'error' | 'waiting' | 'running';
  limit?: number;
  cursor?: string;
  includeData?: boolean;
}

export async function listExecutions(
  client: N8NClient,
  options: ListExecutionsOptions = {}
): Promise<ExecutionListResponse> {
  return client.get<ExecutionListResponse>('/executions', {
    workflowId: options.workflowId,
    status: options.status,
    limit: options.limit,
    cursor: options.cursor,
    includeData: options.includeData,
  });
}

export async function getExecution(
  client: N8NClient,
  id: string,
  includeData = true
): Promise<Execution> {
  return client.get<Execution>(`/executions/${id}`, { includeData });
}

export async function deleteExecution(
  client: N8NClient,
  id: string
): Promise<void> {
  await client.delete(`/executions/${id}`);
}
```

## Health Operations

```typescript
// src/core/api/health.ts
import { N8NClient } from './client.js';

export interface HealthStatus {
  status: 'ok' | 'error';
  version?: string;
  databaseConnected?: boolean;
  responseTimeMs: number;
}

export async function checkHealth(client: N8NClient): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    // Try to list workflows (lightweight check)
    await client.get('/workflows', { limit: 1 });

    return {
      status: 'ok',
      responseTimeMs: Date.now() - startTime,
      databaseConnected: true,
    };
  } catch (error) {
    return {
      status: 'error',
      responseTimeMs: Date.now() - startTime,
      databaseConnected: false,
    };
  }
}
```

## Types

```typescript
// src/types/workflow.ts
export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
  settings?: WorkflowSettings;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface WorkflowListResponse {
  data: Workflow[];
  nextCursor?: string;
}

// src/types/execution.ts
export interface Execution {
  id: string;
  workflowId: string;
  status: 'success' | 'error' | 'waiting' | 'running';
  startedAt: string;
  stoppedAt?: string;
  data?: ExecutionData;
}

export interface ExecutionListResponse {
  data: Execution[];
  nextCursor?: string;
}
```
