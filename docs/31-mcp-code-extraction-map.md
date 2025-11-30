# MCP Code Extraction Map

## Overview

This document maps exactly what code to extract from `n8n-mcp/` for each CLI component.

## ✅ YOUR EXISTING VALIDATION LIBRARY

You already have a validation library in `cli/src/core/`. **USE THESE** instead of MCP equivalents:

| Your File | Purpose | MCP Equivalent (SKIP) |
|-----------|---------|----------------------|
| `src/core/validator.ts` | Main validation | `services/workflow-validator.ts` |
| `src/core/fixer.ts` | Autofix logic | `services/workflow-auto-fixer.ts` |
| `src/core/sanitizer.ts` | Node sanitization | `services/node-sanitizer.ts` |
| `src/core/n8n-native-validator.ts` | Native n8n validation | `services/native-workflow-validator.ts` |
| `src/core/types.ts` | Core types | (merge with MCP types) |
| `src/core/json-parser.ts` | JSON parsing | (keep) |
| `src/core/n8n-loader.ts` | Workflow loading | (keep) |
| `src/core/source-location.ts` | Source tracking | (keep) |
| `src/utils/output.ts` | Output formatting | (keep) |
| `src/utils/input-reader.ts` | Input handling | (keep) |

## ⚠️ CRITICAL: What to Copy from MCP

**DO NOT** copy validation services - you have your own.

**DO** extract these (you don't have equivalents):

| What | MCP Source | Target |
|------|------------|--------|
| **API Client** | `services/n8n-api-client.ts` | `src/core/api/client.ts` |
| **Node Repository** | `database/node-repository.ts` | `src/core/db/nodes.ts` |
| **Database Adapter** | `database/database-adapter.ts` | `src/core/db/adapter.ts` |
| **Template Repository** | `templates/template-repository.ts` | `src/core/db/templates.ts` |
| **Diff Engine** | `services/workflow-diff-engine.ts` | `src/core/diff-engine.ts` |
| **Versioning** | `services/workflow-versioning-service.ts` | `src/core/versioning.ts` |
| **Execution Processor** | `services/execution-processor.ts` | `src/core/execution-processor.ts` |
| **Diff Types** | `types/workflow-diff.ts` | `src/types/workflow-diff.ts` |
| **API Types** | `types/n8n-api.ts` | `src/types/n8n-api.ts` |
| **Error Classes** | `utils/n8n-errors.ts` | `src/utils/errors.ts` |
| **SSRF Protection** | `utils/ssrf-protection.ts` | `src/utils/ssrf-protection.ts` |
| **Node Type Utils** | `utils/node-type-normalizer.ts` | `src/utils/node-type-normalizer.ts` |
| **nodes.db** | `data/nodes.db` | `data/nodes.db` |

## MCP Directory Reference (for copying)

```
n8n-mcp/
├── src/
│   ├── services/                    ← ✅ CORE LOGIC (33 files, ~400KB)
│   │   ├── n8n-api-client.ts        ← HTTP client (530 lines)
│   │   ├── workflow-validator.ts    ← Main validation (1872 lines)
│   │   ├── workflow-auto-fixer.ts   ← Autofix engine (835 lines)
│   │   ├── workflow-diff-engine.ts  ← Diff operations (1197 lines)
│   │   ├── workflow-versioning-service.ts ← Version control (461 lines)
│   │   ├── execution-processor.ts   ← Execution modes (520 lines)
│   │   ├── node-documentation-service.ts ← Node docs (710 lines)
│   │   ├── node-sanitizer.ts        ← Pre-create cleanup (362 lines)
│   │   ├── confidence-scorer.ts     ← Fix confidence (211 lines)
│   │   └── ... (24 more services)
│   │
│   ├── database/                    ← ✅ DATA LAYER
│   │   ├── node-repository.ts       ← Node queries (962 lines)
│   │   ├── database-adapter.ts      ← SQLite wrapper (16KB)
│   │   └── schema.sql               ← Database schema
│   │
│   ├── templates/                   ← ✅ TEMPLATE LAYER
│   │   ├── template-repository.ts   ← Template search (948 lines)
│   │   └── template-service.ts      ← Template logic (13KB)
│   │
│   ├── parsers/                     ← ✅ SCHEMA PARSING
│   │   ├── node-parser.ts           ← Node schema (14KB)
│   │   └── property-extractor.ts    ← Property extraction (7.6KB)
│   │
│   ├── types/                       ← ✅ TYPE DEFINITIONS
│   │   ├── workflow-diff.ts         ← 17 diff operation types (216 lines)
│   │   ├── n8n-api.ts               ← API response types (8.3KB)
│   │   └── node-types.ts            ← Node type definitions (6.3KB)
│   │
│   ├── utils/                       ← ✅ UTILITIES (27 files)
│   │   ├── n8n-errors.ts            ← Error classes (157 lines)
│   │   ├── node-type-utils.ts       ← Type normalization (8KB)
│   │   ├── ssrf-protection.ts       ← Webhook security (188 lines)
│   │   └── ... (24 more utilities)
│   │
│   └── mcp/tools/                   ← ❌ IGNORE (thin wrappers)
│
└── data/
    └── nodes.db                     ← ✅ Copy directly (500+ nodes pre-indexed)
```

---

## Component Extraction Details

### 1. Database Connection

**Extract from**: `n8n-mcp/src/database/database-adapter.ts` (16KB)

```typescript
// COPY: DatabaseAdapter class with connection pooling
import Database from 'better-sqlite3';

export class DatabaseAdapter {
  private db: Database.Database;
  
  constructor(dbPath: string, options?: { readonly?: boolean }) {
    this.db = new Database(dbPath, options);
  }
  
  // Prepared statement caching
  prepare(sql: string): Database.Statement { /* COPY */ }
  
  // FTS5 support detection
  checkFTS5Support(): boolean { /* COPY */ }
  
  // Transaction helpers
  transaction<T>(fn: () => T): T { /* COPY */ }
}
```

**Adaptation**:
- Copy `DatabaseAdapter` class completely
- Adapt path resolution for CLI bundling (`__dirname` handling)
- Use `readonly: true` for all CLI queries

---

### 2. Node Search (`n8n nodes search`)

**Extract from**: `n8n-mcp/src/database/node-repository.ts` (962 lines)

**Key class to copy**:
```typescript
export class NodeRepository {
  constructor(db: DatabaseAdapter) { /* COPY */ }
  
  // Line 138-180: Main search with OR/AND/FUZZY modes
  searchNodes(query: string, mode: 'OR' | 'AND' | 'FUZZY', limit: number): any[] {
    // COPY VERBATIM - Contains SQL with LIKE fallback
  }
  
  // Line 57-79: Get single node by type
  getNode(nodeType: string): any {
    // COPY - Includes type normalization
  }
}
```

**Also extract from**: `n8n-mcp/src/utils/node-type-normalizer.ts` (7.2KB)
```typescript
export class NodeTypeNormalizer {
  // Normalize "webhook" → "n8n-nodes-base.webhook"
  static normalizeToFullForm(nodeType: string): string { /* COPY */ }
  
  // Normalize "n8n-nodes-base.webhook" → "webhook"
  static normalizeToShortForm(nodeType: string): string { /* COPY */ }
}
```

**For relevance scoring**: `n8n-mcp/src/services/node-similarity-service.ts` (17.6KB)
```typescript
export class NodeSimilarityService {
  // Fuzzy matching and relevance scoring
  findSimilarNodes(query: string, limit: number): NodeSuggestion[] { /* COPY */ }
}
```

---

### 3. Node Get (`n8n nodes get`)

**Extract from**: `n8n-mcp/src/services/node-documentation-service.ts` (710 lines)

**Key class for mode=docs**:
```typescript
export class NodeDocumentationService {
  constructor(dbPath?: string) { /* COPY */ }
  
  // Line 59-81: Initialize DB connection
  private async initializeAsync(): Promise<void> { /* COPY */ }
  
  // Main documentation generation (called by mode=docs)
  async getNodeDocumentation(nodeType: string): Promise<NodeInfo> { /* COPY */ }
}
```

**For property extraction**: `n8n-mcp/src/parsers/property-extractor.ts` (238 lines)
```typescript
export class PropertyExtractor {
  // Line 7-42: Extract properties with versioned node handling
  extractProperties(nodeClass: NodeClass): any[] { /* COPY */ }
  
  // Line 73-80+: Extract operations
  extractOperations(nodeClass: NodeClass): any[] { /* COPY */ }
}
```

**For mode=search_properties**: Use FTS5 query in `NodeRepository` or implement property filtering locally

---

### 4. API Client

**Extract from**: `n8n-mcp/src/services/n8n-api-client.ts` (530 lines)

**Complete class to copy**:
```typescript
import axios, { AxiosInstance } from 'axios';
import { handleN8nApiError } from '../utils/n8n-errors';

export interface N8nApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
}

export class N8nApiClient {
  private client: AxiosInstance;
  private maxRetries: number;

  constructor(config: N8nApiClientConfig) { /* COPY lines 39-85 */ }
  
  // Health check (lines 87-100)
  async healthCheck(): Promise<HealthCheckResponse> { /* COPY */ }
  
  // Workflow operations (lines 100-200)
  async listWorkflows(params: WorkflowListParams): Promise<WorkflowListResponse> { /* COPY */ }
  async getWorkflow(id: string): Promise<Workflow> { /* COPY */ }
  async createWorkflow(workflow: WorkflowInput): Promise<Workflow> { /* COPY */ }
  async updateWorkflow(id: string, workflow: Workflow): Promise<Workflow> { /* COPY */ }
  async deleteWorkflow(id: string): Promise<void> { /* COPY */ }
  async activateWorkflow(id: string): Promise<void> { /* COPY */ }
  async deactivateWorkflow(id: string): Promise<void> { /* COPY */ }
  
  // Execution operations (lines 200-300)
  async listExecutions(params: ExecutionListParams): Promise<ExecutionListResponse> { /* COPY */ }
  async getExecution(id: string): Promise<Execution> { /* COPY */ }
  async deleteExecution(id: string): Promise<void> { /* COPY */ }
}
```

**Also copy error handling**: `n8n-mcp/src/utils/n8n-errors.ts` (157 lines)
```typescript
// Custom error classes - COPY ALL
export class N8nApiError extends Error { /* COPY */ }
export class N8nAuthenticationError extends N8nApiError { /* COPY */ }
export class N8nNotFoundError extends N8nApiError { /* COPY */ }
export class N8nValidationError extends N8nApiError { /* COPY */ }
export class N8nRateLimitError extends N8nApiError { /* COPY */ }
export class N8nServerError extends N8nApiError { /* COPY */ }

// Error handler - COPY
export function handleN8nApiError(error: unknown): N8nApiError { /* COPY lines 57-96 */ }
export function getUserFriendlyErrorMessage(error: N8nApiError): string { /* COPY */ }
```

---

### 5. Workflow Operations (Diff Engine)

**Extract from**: `n8n-mcp/src/services/workflow-diff-engine.ts` (1197 lines)

**Main class to copy**:
```typescript
import { WorkflowDiffOperation, WorkflowDiffResult } from '../types/workflow-diff';

export class WorkflowDiffEngine {
  private renameMap: Map<string, string> = new Map();
  private warnings: WorkflowDiffValidationError[] = [];

  // Line 50-140: Main diff application
  async applyDiff(workflow: Workflow, request: WorkflowDiffRequest): Promise<WorkflowDiffResult> {
    // COPY VERBATIM - Handles atomic vs continueOnError modes
  }
  
  // Line 200+: Individual operation handlers
  private applyAddNode(workflow: Workflow, op: AddNodeOperation): void { /* COPY */ }
  private applyRemoveNode(workflow: Workflow, op: RemoveNodeOperation): void { /* COPY */ }
  private applyUpdateNode(workflow: Workflow, op: UpdateNodeOperation): void { /* COPY */ }
  private applyAddConnection(workflow: Workflow, op: AddConnectionOperation): void { /* COPY */ }
  // ... (all 17 operation handlers)
}
```

**Type definitions**: `n8n-mcp/src/types/workflow-diff.ts` (216 lines) - **COPY ENTIRELY**
```typescript
// All 17 operation types defined
export type WorkflowDiffOperation = 
  | AddNodeOperation | RemoveNodeOperation | UpdateNodeOperation
  | MoveNodeOperation | EnableNodeOperation | DisableNodeOperation
  | AddConnectionOperation | RemoveConnectionOperation | RewireConnectionOperation
  | UpdateSettingsOperation | UpdateNameOperation | AddTagOperation | RemoveTagOperation
  | ActivateWorkflowOperation | DeactivateWorkflowOperation
  | CleanStaleConnectionsOperation | ReplaceConnectionsOperation;
```

**Pre-create sanitization**: `n8n-mcp/src/services/node-sanitizer.ts` (362 lines)
```typescript
// Line 19-32: Sanitize single node (fixes filter-based nodes)
export function sanitizeNode(node: WorkflowNode): WorkflowNode { /* COPY */ }

// Line 37-46: Sanitize all workflow nodes
export function sanitizeWorkflowNodes(workflow: any): any { /* COPY */ }
```

---

### 6. Execution Operations

**Extract from**: `n8n-mcp/src/services/execution-processor.ts` (520 lines)

**Key class for mode handling**:
```typescript
export class ExecutionProcessor {
  // Line 44-90: Extract structure from execution data
  static extractStructure(data: unknown, maxDepth?: number): Record<string, unknown> { /* COPY */ }
  
  // Line 95-100: Estimate data size
  static estimateDataSize(data: unknown): number { /* COPY */ }
  
  // Used internally by N8nApiClient.getExecution() for mode transformation
  // Modes: 'preview', 'summary', 'filtered', 'full'
}
```

**Types from**: `n8n-mcp/src/types/n8n-api.ts` (8.3KB)
```typescript
export interface Execution { /* COPY */ }
export interface ExecutionListParams { /* COPY */ }
export interface ExecutionListResponse { /* COPY */ }
export type ExecutionMode = 'preview' | 'summary' | 'filtered' | 'full';
```

---

### 7. Validation Logic

**Extract from**: `n8n-mcp/src/services/workflow-validator.ts` (1872 lines)

**Main orchestrator class**:
```typescript
export class WorkflowValidator {
  constructor(
    private nodeRepository: NodeRepository,
    private nodeValidator: typeof EnhancedConfigValidator
  ) { /* COPY */ }
  
  // Line 97-200: Main validation entry point
  async validateWorkflow(
    workflow: WorkflowJson,
    options: { validateNodes?: boolean; validateConnections?: boolean; 
              validateExpressions?: boolean; profile?: string }
  ): Promise<WorkflowValidationResult> { /* COPY */ }
  
  // Line 148+: Structure validation
  private validateWorkflowStructure(workflow: WorkflowJson, result: WorkflowValidationResult): void { /* COPY */ }
}
```

**Also extract**:
- `n8n-mcp/src/services/native-workflow-validator.ts` (7.6KB) - n8n editor matching
- `n8n-mcp/src/services/enhanced-config-validator.ts` (46KB) - Per-node validation
- `n8n-mcp/src/services/universal-expression-validator.ts` (8.4KB) - Expression parsing
- `n8n-mcp/src/services/expression-format-validator.ts` (11KB) - Format detection
- `n8n-mcp/src/services/node-specific-validators.ts` (61KB) - Node-type-specific rules
- `n8n-mcp/src/services/type-structure-service.ts` (12KB) - Complex types (FilterValue, etc.)
- `n8n-mcp/src/services/property-dependencies.ts` (8.3KB) - Conditional required fields

---

### 8. Autofix Logic

**Extract from**: `n8n-mcp/src/services/workflow-auto-fixer.ts` (835 lines)

**Main autofix class**:
```typescript
export type FixType = 
  | 'expression-format' | 'typeversion-correction' | 'error-output-config'
  | 'node-type-correction' | 'webhook-missing-path' | 'typeversion-upgrade' | 'version-migration';

export interface AutoFixResult {
  operations: WorkflowDiffOperation[];
  fixes: FixOperation[];
  summary: string;
  stats: { total: number; byType: Record<FixType, number>; byConfidence: Record<string, number> };
  postUpdateGuidance?: PostUpdateGuidance[];
}

export class WorkflowAutoFixer {
  // Line 106-114: Constructor with optional repository
  constructor(repository?: NodeRepository) { /* COPY */ }
  
  // Line 119-180: Main fix generation
  async generateFixes(
    workflow: Workflow,
    validationResult: WorkflowValidationResult,
    formatIssues: ExpressionFormatIssue[],
    config: Partial<AutoFixConfig>
  ): Promise<AutoFixResult> { /* COPY */ }
}
```

**Also extract confidence scoring**: `n8n-mcp/src/services/confidence-scorer.ts` (211 lines)
```typescript
export class ConfidenceScorer {
  static scoreResourceLocatorRecommendation(...): ConfidenceScore { /* COPY */ }
}
```

**Version-related fixers**:
- `n8n-mcp/src/services/node-version-service.ts` (10.7KB) - Version info
- `n8n-mcp/src/services/node-migration-service.ts` (11KB) - Migration logic
- `n8n-mcp/src/services/breaking-change-detector.ts` (10.4KB) - Breaking changes

---

### 9. Workflow Versioning

**Extract from**: `n8n-mcp/src/services/workflow-versioning-service.ts` (461 lines)

```typescript
export interface WorkflowVersion {
  id: number;
  workflowId: string;
  versionNumber: number;
  workflowName: string;
  workflowSnapshot: any;
  trigger: 'partial_update' | 'full_update' | 'autofix';
  createdAt: string;
}

export class WorkflowVersioningService {
  // Backup before updates
  async createBackup(workflow: Workflow, trigger: string): Promise<BackupResult> { /* COPY */ }
  
  // List versions
  async listVersions(workflowId: string): Promise<VersionInfo[]> { /* COPY */ }
  
  // Rollback
  async rollbackToVersion(workflowId: string, versionId: number): Promise<RestoreResult> { /* COPY */ }
  
  // Storage stats
  async getStorageStats(): Promise<StorageStats> { /* COPY */ }
}
```

---

### 10. Templates

**Extract from**: `n8n-mcp/src/templates/template-repository.ts` (948 lines)

```typescript
export class TemplateRepository {
  constructor(db: DatabaseAdapter) { /* COPY */ }
  
  // FTS5 search
  searchTemplates(query: string, limit: number): StoredTemplate[] { /* COPY */ }
  
  // Get by ID
  getTemplateById(id: number): StoredTemplate | null { /* COPY */ }
  
  // Filter by nodes used
  searchByNodeTypes(nodeTypes: string[]): StoredTemplate[] { /* COPY */ }
}
```

**Also extract**: `n8n-mcp/src/templates/template-service.ts` (13KB) - Higher-level template logic

---

### 11. Security (Webhook Trigger)

**Extract from**: `n8n-mcp/src/utils/ssrf-protection.ts` (188 lines)

```typescript
export class SSRFProtection {
  // Validate webhook URLs before triggering
  static async validateWebhookUrl(urlString: string): Promise<{ valid: boolean; reason?: string }> {
    // Blocks: localhost, private IPs, cloud metadata endpoints
    // COPY VERBATIM for webhook trigger command
  }
}
```

---

## Copy Checklist (Updated for Your Existing Library)

> **NOTE:** You already have validation logic in `src/core/`. Skip copying MCP validation services.

### Phase 1: Database Layer
- [ ] Copy `n8n-mcp/data/nodes.db` → `cli/data/nodes.db`
- [ ] Copy `n8n-mcp/src/database/database-adapter.ts` → `cli/src/core/db/adapter.ts`
- [ ] Copy `n8n-mcp/src/database/node-repository.ts` → `cli/src/core/db/nodes.ts`
- [ ] Copy `n8n-mcp/src/templates/template-repository.ts` → `cli/src/core/db/templates.ts`

### Phase 2: Types (Copy First - No Dependencies)
- [ ] Copy `n8n-mcp/src/types/workflow-diff.ts` → `cli/src/types/workflow-diff.ts`
- [ ] Copy `n8n-mcp/src/types/n8n-api.ts` → `cli/src/types/n8n-api.ts`

### Phase 3: Utilities
- [ ] Copy `n8n-mcp/src/utils/n8n-errors.ts` → `cli/src/utils/errors.ts`
- [ ] Copy `n8n-mcp/src/utils/node-type-normalizer.ts` → `cli/src/utils/node-type-normalizer.ts`
- [ ] Copy `n8n-mcp/src/utils/ssrf-protection.ts` → `cli/src/utils/ssrf-protection.ts`

### Phase 4: API Client
- [ ] Copy `n8n-mcp/src/services/n8n-api-client.ts` → `cli/src/core/api/client.ts`

### Phase 5: Services (Non-Validation Only)
- [ ] Copy `n8n-mcp/src/services/workflow-diff-engine.ts` → `cli/src/core/diff-engine.ts`
- [ ] Copy `n8n-mcp/src/services/workflow-versioning-service.ts` → `cli/src/core/versioning.ts`
- [ ] Copy `n8n-mcp/src/services/execution-processor.ts` → `cli/src/core/execution-processor.ts`
- [ ] Copy `n8n-mcp/src/services/node-documentation-service.ts` → `cli/src/core/node-docs.ts`
- [ ] Copy `n8n-mcp/src/services/node-similarity-service.ts` → `cli/src/core/node-similarity.ts`

### ⏭️ SKIP - You Have These Already
- ~~`workflow-validator.ts`~~ → Use `src/core/validator.ts`
- ~~`workflow-auto-fixer.ts`~~ → Use `src/core/fixer.ts`
- ~~`node-sanitizer.ts`~~ → Use `src/core/sanitizer.ts`
- ~~`native-workflow-validator.ts`~~ → Use `src/core/n8n-native-validator.ts`
- ~~All validation services~~ → Use your existing library

---

## Adaptation Notes

### Remove MCP-specific code (from any copied file):
- Remove `import { Logger } from '../utils/logger'` → Use your own logger
- Remove `ContentBlock` return types → Plain objects
- Remove `ToolResult` wrappers → Direct returns
- Remove MCP error formatting → Use `N8nApiError` classes

### Add CLI-specific code:
- Clipanion command wrappers (in `src/commands/`)
- Markdown table formatting (use `cli-table3`)
- File I/O for `--save` (use `fs/promises`)
- Spinner integration (use `ora`)
- Color coding (use `chalk`)

### Import path fixes after copying:
```typescript
// MCP paths → CLI paths
'../utils/logger' → '../core/utils/logger'
'../database/node-repository' → '../core/db/node-repository'
'../types/workflow-diff' → '../types/workflow-diff'
```

---

## Quick Start: Minimum Viable Copy

For a working CLI with basic commands, run these commands:

```bash
cd /Users/yigitkonur/n8n-workspace

# 1. Create directories
mkdir -p cli/data cli/src/core/db cli/src/core/api cli/src/types

# 2. Database
cp n8n-mcp/data/nodes.db cli/data/
cp n8n-mcp/src/database/database-adapter.ts cli/src/core/db/adapter.ts
cp n8n-mcp/src/database/node-repository.ts cli/src/core/db/nodes.ts

# 3. Types
cp n8n-mcp/src/types/n8n-api.ts cli/src/types/
cp n8n-mcp/src/types/workflow-diff.ts cli/src/types/

# 4. Utils (merge with your existing src/utils/)
cp n8n-mcp/src/utils/n8n-errors.ts cli/src/utils/errors.ts
cp n8n-mcp/src/utils/node-type-normalizer.ts cli/src/utils/

# 5. API Client
cp n8n-mcp/src/services/n8n-api-client.ts cli/src/core/api/client.ts

# NOTE: You already have validation in src/core/validator.ts - skip MCP validation services
```

This gives you: `n8n health`, `n8n nodes search`, `n8n nodes get`, `n8n workflows validate`

**Your existing files handle:**
- `src/core/validator.ts` → Workflow validation
- `src/core/fixer.ts` → Autofix logic
- `src/core/sanitizer.ts` → Node sanitization
