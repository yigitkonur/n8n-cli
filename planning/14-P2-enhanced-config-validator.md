# P2: Enhanced Config Validator

## Priority: P2 (Medium)
## Status: Basic in CLI, Enhanced in MCP
## MCP Source: `n8n-mcp/src/services/enhanced-config-validator.ts`

---

## Business Value

**User Impact:**
- **Reduces deployment failures by 60%+** by catching configuration errors before workflow execution
- **Saves debugging time** with actionable fix suggestions and "Did you mean?" hints for typos
- **Improves CI/CD integration** with profile-based validation (strict for production, minimal for drafts)

**Workflow Improvement:**
- Eliminates cryptic n8n runtime errors like `"propertyValues[itemName] is not iterable"`
- Provides resource/operation-aware validation (e.g., Slack `message.send` requires `channel`)
- Enables progressive validation: draft → runtime → production-ready

**Time Saved:**
- 5-10 minutes per validation cycle by catching errors before import
- Autofix capabilities reduce manual JSON editing by ~80%

---

## Current CLI Status

### Implemented: ✅ Basic Structure Validation
**Location:** `src/core/validator.ts` (L1-376)

Current capabilities:
- ✅ Validates workflow JSON structure (nodes array, connections object)
- ✅ Checks required node fields (type, typeVersion, position, parameters)
- ✅ Validates connection references (source/target node existence)
- ✅ Delegates to n8n's native `NodeHelpers.getNodeParametersIssues()`
- ✅ Provides source location mapping for errors

### Not Implemented: ❌ Enhanced Validation
**Gap Reason:** Architecture decision to rely on n8n's native validation initially. Enhanced validation requires:

1. **No profile-based validation** - All validations run at "runtime" level only
   - `src/commands/workflows/validate.ts:72-79` shows TODO comment acknowledging this gap
   - Profile parameter exists but is not differentiated

2. **No displayOptions-aware validation** - CLI doesn't check conditional property visibility
   - `src/core/n8n-native-validator.ts` uses `NodeHelpers.getNodeParametersIssues()` which provides basic checks
   - No equivalent to MCP's `isPropertyRelevantToOperation()` filtering

3. **No node-specific validators** - No custom logic for Slack, Google Sheets, OpenAI, etc.
   - CLI lacks the 20+ node-specific validation rules from MCP

4. **No similarity-based suggestions** - No "Did you mean?" for typos
   - CLI doesn't have ResourceSimilarityService or OperationSimilarityService

5. **No fixedCollection structure validation** - Doesn't catch common AI mistakes
   - Missing FixedCollectionValidator for nodes like If, Filter, Switch, Set

---

## MCP Reference Implementation

### Source Files (Complete List)

| File | Lines | Purpose | Port Priority |
|------|-------|---------|---------------|
| `n8n-mcp/src/services/enhanced-config-validator.ts` | 1268 | Core enhanced validator with modes/profiles | **High** |
| `n8n-mcp/src/services/config-validator.ts` | 999 | Base validator with type checks, security | **High** |
| `n8n-mcp/src/services/node-specific-validators.ts` | 1724 | 20+ node-specific validation rules | **High** |
| `n8n-mcp/src/services/property-dependencies.ts` | 269 | Dependency graph analysis | Medium |
| `n8n-mcp/src/services/property-filter.ts` | 590 | Property filtering & simplification | Medium |
| `n8n-mcp/src/utils/fixed-collection-validator.ts` | 479 | FixedCollection structure validation | **High** |
| `n8n-mcp/src/services/type-structure-service.ts` | ~400 | filter/resourceMapper validation | Medium |
| `n8n-mcp/src/services/operation-similarity-service.ts` | ~200 | "Did you mean?" for operations | Low |
| `n8n-mcp/src/services/resource-similarity-service.ts` | ~200 | "Did you mean?" for resources | Low |

### Validation Modes & Profiles

```typescript
// n8n-mcp/src/services/enhanced-config-validator.ts:19-20
export type ValidationMode = 'full' | 'operation' | 'minimal';
export type ValidationProfile = 'strict' | 'runtime' | 'ai-friendly' | 'minimal';
```

**Mode Behavior:**
- `minimal` - Only validate required properties that are currently visible
- `operation` - Validate properties relevant to current resource/operation (DEFAULT)
- `full` - Validate all properties regardless of visibility

**Profile Behavior:**
- `minimal` - Keep only `missing_required` errors, filter all warnings except security/deprecated
- `runtime` - Keep critical runtime errors, filter noise (visibility warnings)
- `ai-friendly` - Balanced for AI agents, includes best practice warnings (DEFAULT)
- `strict` - Everything including style checks, naming conventions, error handling requirements

### Enhanced Validation Result Structure

```typescript
// n8n-mcp/src/services/enhanced-config-validator.ts:22-35
export interface EnhancedValidationResult extends ValidationResult {
  mode: ValidationMode;
  profile?: ValidationProfile;
  operation?: {
    resource?: string;
    operation?: string;
    action?: string;
  };
  examples?: Array<{
    description: string;
    config: Record<string, any>;
  }>;
  nextSteps?: string[];
}
```

### Key Validation Methods

#### 1. Main Entry Point
```typescript
// n8n-mcp/src/services/enhanced-config-validator.ts:60-130
static validateWithMode(
  nodeType: string,
  config: Record<string, any>,
  properties: any[],
  mode: ValidationMode = 'operation',
  profile: ValidationProfile = 'ai-friendly'
): EnhancedValidationResult {
  // 1. Extract operation context (resource, operation, action)
  const operationContext = this.extractOperationContext(config);
  
  // 2. Track user-provided keys to avoid false warnings about defaults
  const userProvidedKeys = new Set(Object.keys(config));
  
  // 3. Filter properties based on mode and operation
  const { properties: filteredProperties, configWithDefaults } = 
    this.filterPropertiesByMode(properties, config, mode, operationContext);
  
  // 4. Run base validation
  const baseResult = super.validate(nodeType, configWithDefaults, filteredProperties, userProvidedKeys);
  
  // 5. Apply profile-based filtering
  this.applyProfileFilters(enhancedResult, profile);
  
  // 6. Add operation-specific enhancements (node-specific validators)
  this.addOperationSpecificEnhancements(nodeType, config, filteredProperties, enhancedResult);
  
  // 7. Validate fixedCollection structures
  this.validateFixedCollectionStructures(nodeType, config, enhancedResult);
  
  // 8. Generate actionable next steps
  enhancedResult.nextSteps = this.generateNextSteps(enhancedResult);
  
  return enhancedResult;
}
```

#### 2. Operation-Aware Property Filtering
```typescript
// n8n-mcp/src/services/enhanced-config-validator.ts:201-244
private static isPropertyRelevantToOperation(
  prop: any,
  config: Record<string, any>,
  operation: OperationContext
): boolean {
  // First check if visible
  if (!this.isPropertyVisible(prop, config)) return false;
  
  // Check displayOptions.show conditions
  if (prop.displayOptions?.show) {
    const show = prop.displayOptions.show;
    
    if (operation.resource && show.resource) {
      const expectedResources = Array.isArray(show.resource) ? show.resource : [show.resource];
      if (!expectedResources.includes(operation.resource)) return false;
    }
    
    if (operation.operation && show.operation) {
      const expectedOps = Array.isArray(show.operation) ? show.operation : [show.operation];
      if (!expectedOps.includes(operation.operation)) return false;
    }
  }
  
  return true;
}
```

#### 3. Node-Specific Validation Dispatch
```typescript
// n8n-mcp/src/services/enhanced-config-validator.ts:288-356
switch (normalizedNodeType) {
  case 'nodes-base.slack':
    NodeSpecificValidators.validateSlack(context);
    this.enhanceSlackValidation(config, result);
    break;
  case 'nodes-base.googleSheets':
    NodeSpecificValidators.validateGoogleSheets(context);
    break;
  case 'nodes-base.httpRequest':
    this.enhanceHttpRequestValidation(config, result);
    break;
  case 'nodes-base.code':
    NodeSpecificValidators.validateCode(context);
    break;
  case 'nodes-base.openAi':
    NodeSpecificValidators.validateOpenAI(context);
    break;
  case 'nodes-base.webhook':
    NodeSpecificValidators.validateWebhook(context);
    break;
  case 'nodes-base.postgres':
    NodeSpecificValidators.validatePostgres(context);
    break;
  case 'nodes-langchain.agent':
    NodeSpecificValidators.validateAIAgent(context);
    break;
  // ... 10+ more nodes
}
```

### Node-Specific Validators (Key Examples)

#### Slack Validator
```typescript
// n8n-mcp/src/services/node-specific-validators.ts:22-139
static validateSlack(context: NodeValidationContext): void {
  const { config, errors, warnings, autofix } = context;
  const { resource, operation } = config;
  
  if (resource === 'message') {
    switch (operation) {
      case 'send':
        // Channel is required
        if (!config.channel && !config.channelId) {
          errors.push({
            type: 'missing_required',
            property: 'channel',
            message: 'Channel is required to send a message',
            fix: 'Set channel to "#general" or ID like "C1234567890"'
          });
        }
        // Message content validation
        if (!config.text && !config.blocks && !config.attachments) {
          errors.push({
            type: 'missing_required',
            property: 'text',
            message: 'Message content required - provide text, blocks, or attachments'
          });
        }
        // Character limit check
        if (config.text?.length > 40000) {
          warnings.push({
            type: 'inefficient',
            property: 'text',
            message: 'Message exceeds Slack 40,000 character limit'
          });
        }
        break;
    }
  }
  
  // Error handling best practice
  if (!config.onError && !config.retryOnFail) {
    warnings.push({
      type: 'best_practice',
      property: 'errorHandling',
      message: 'Slack API can have rate limits and transient failures',
      suggestion: 'Add onError: "continueRegularOutput" with retryOnFail'
    });
    autofix.onError = 'continueRegularOutput';
    autofix.retryOnFail = true;
    autofix.maxTries = 2;
  }
}
```

#### HTTP Request Validator
```typescript
// n8n-mcp/src/services/enhanced-config-validator.ts:410-467
private static enhanceHttpRequestValidation(
  config: Record<string, any>,
  result: EnhancedValidationResult
): void {
  const url = String(config.url || '');
  
  // Suggest alwaysOutputData for better error handling
  result.suggestions.push(
    'Consider adding alwaysOutputData: true at node level for better error handling.'
  );
  
  // Suggest responseFormat for API endpoints
  const isApiEndpoint = /^https?:\/\/api\./i.test(url) || /\/api[\/\?]/i.test(url);
  if (isApiEndpoint && !config.options?.response?.response?.responseFormat) {
    result.suggestions.push(
      'API endpoints should explicitly set options.response.response.responseFormat to "json"'
    );
  }
  
  // Check for missing protocol in expressions
  if (url.startsWith('=') && url.includes('{{') && !url.toLowerCase().includes('http')) {
    result.warnings.push({
      type: 'invalid_value',
      property: 'url',
      message: 'URL expression appears to be missing http:// or https:// protocol',
      suggestion: 'Include protocol: ={{ "https://" + $json.domain }}'
    });
  }
}
```

#### FixedCollection Validator
```typescript
// n8n-mcp/src/utils/fixed-collection-validator.ts:58-135
private static readonly KNOWN_PATTERNS: FixedCollectionPattern[] = [
  {
    nodeType: 'switch',
    property: 'rules',
    expectedStructure: 'rules.values array',
    invalidPatterns: ['rules.conditions', 'rules.conditions.values']
  },
  {
    nodeType: 'if',
    property: 'conditions',
    expectedStructure: 'conditions array/object',
    invalidPatterns: ['conditions.values']
  },
  {
    nodeType: 'filter',
    property: 'conditions',
    expectedStructure: 'conditions array/object',
    invalidPatterns: ['conditions.values']
  },
  {
    nodeType: 'set',
    property: 'fields',
    subProperty: 'values',
    expectedStructure: 'fields.values array',
    invalidPatterns: ['fields.values.values']
  },
  // ... 6 more patterns for summarize, aggregate, sort, html, httprequest, airtable
];

static validate(nodeType: string, config: NodeConfig): FixedCollectionValidationResult {
  const pattern = this.getPatternForNode(this.normalizeNodeType(nodeType));
  if (!pattern) return { isValid: true, errors: [] };
  
  for (const invalidPattern of pattern.invalidPatterns) {
    if (this.hasInvalidStructure(config, invalidPattern)) {
      return {
        isValid: false,
        errors: [{
          pattern: invalidPattern,
          message: `Invalid structure: found "${invalidPattern}" but expected "${pattern.expectedStructure}"`,
          fix: this.generateFixMessage(pattern)
        }],
        autofix: this.generateAutofix(config, pattern)
      };
    }
  }
  return { isValid: true, errors: [] };
}
```

### Profile-Based Filtering Logic

```typescript
// n8n-mcp/src/services/enhanced-config-validator.ts:543-624
private static applyProfileFilters(
  result: EnhancedValidationResult,
  profile: ValidationProfile
): void {
  switch (profile) {
    case 'minimal':
      // Only keep missing required errors
      result.errors = result.errors.filter(e => e.type === 'missing_required');
      // Keep ONLY critical warnings (security and deprecated)
      result.warnings = result.warnings.filter(w => 
        (w.type === 'security' || w.type === 'deprecated') &&
        !this.shouldFilterCredentialWarning(w)
      );
      result.suggestions = [];
      break;

    case 'runtime':
      // Keep critical runtime errors only
      result.errors = result.errors.filter(e =>
        e.type === 'missing_required' ||
        e.type === 'invalid_value' ||
        (e.type === 'invalid_type' && e.message.includes('undefined'))
      );
      // Filter out noisy property visibility warnings
      result.warnings = result.warnings.filter(w =>
        w.type === 'security' || w.type === 'deprecated'
      );
      result.suggestions = [];
      break;

    case 'strict':
      // Keep everything, add more suggestions
      if (result.warnings.length === 0 && result.errors.length === 0) {
        result.suggestions.push('Consider adding error handling with onError and timeout');
        result.suggestions.push('Add authentication if connecting to external services');
      }
      this.enforceErrorHandlingForProfile(result, profile);
      break;

    case 'ai-friendly':
    default:
      // Balanced for AI agents
      result.warnings = result.warnings.filter(w => 
        w.type === 'security' || w.type === 'deprecated' ||
        w.type === 'missing_common' || w.type === 'best_practice'
      );
      this.addErrorHandlingSuggestions(result);
      break;
  }
}
```

---

## CLI Integration Path

### 1. Files to Create

```
src/core/validation/
├── enhanced-validator.ts     # Port EnhancedConfigValidator (main entry)
├── config-validator.ts       # Port ConfigValidator (base class)
├── node-specific.ts          # Port NodeSpecificValidators
├── fixed-collection.ts       # Port FixedCollectionValidator
├── property-visibility.ts    # Property visibility logic
├── profiles.ts               # Profile definitions and filtering
└── index.ts                  # Re-exports
```

### 2. Files to Modify

| File | Changes Required |
|------|------------------|
| `src/core/validator.ts` | Import and call EnhancedConfigValidator for node validation |
| `src/core/types.ts` | Add ValidationProfile, EnhancedValidationResult types |
| `src/commands/workflows/validate.ts` | Wire profile option to validator |
| `src/commands/nodes/validate.ts` | Replace basic validation with enhanced |

### 3. Implementation Steps

#### Step 1: Port Base Types (src/core/validation/profiles.ts)
```typescript
export type ValidationMode = 'full' | 'operation' | 'minimal';
export type ValidationProfile = 'strict' | 'runtime' | 'ai-friendly' | 'minimal';

export interface ValidationError {
  type: 'missing_required' | 'invalid_type' | 'invalid_value' | 
        'incompatible' | 'invalid_configuration' | 'syntax_error';
  property: string;
  message: string;
  fix?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'missing_common' | 'deprecated' | 'inefficient' | 
        'security' | 'best_practice' | 'invalid_value';
  property?: string;
  message: string;
  suggestion?: string;
}

export interface EnhancedValidationResult {
  valid: boolean;
  mode: ValidationMode;
  profile: ValidationProfile;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  visibleProperties: string[];
  hiddenProperties: string[];
  autofix?: Record<string, any>;
  operation?: { resource?: string; operation?: string; action?: string };
  nextSteps?: string[];
}
```

#### Step 2: Port FixedCollection Validator (src/core/validation/fixed-collection.ts)
```typescript
// Direct port from n8n-mcp/src/utils/fixed-collection-validator.ts
// Key patterns to validate:
// - Switch: rules.values structure
// - If/Filter: conditions (not conditions.values)
// - Set: fields.values structure
// See MCP source for complete implementation (479 lines)
```

#### Step 3: Port Property Visibility (src/core/validation/property-visibility.ts)
```typescript
export function isPropertyVisible(prop: any, config: Record<string, any>): boolean {
  if (!prop.displayOptions) return true;
  
  // Check show conditions
  if (prop.displayOptions.show) {
    for (const [key, values] of Object.entries(prop.displayOptions.show)) {
      const expectedValues = Array.isArray(values) ? values : [values];
      if (!expectedValues.includes(config[key])) return false;
    }
  }
  
  // Check hide conditions
  if (prop.displayOptions.hide) {
    for (const [key, values] of Object.entries(prop.displayOptions.hide)) {
      const expectedValues = Array.isArray(values) ? values : [values];
      if (expectedValues.includes(config[key])) return false;
    }
  }
  
  return true;
}

export function isPropertyRelevantToOperation(
  prop: any,
  config: Record<string, any>,
  operation: { resource?: string; operation?: string }
): boolean {
  if (!isPropertyVisible(prop, config)) return false;
  if (!operation.resource && !operation.operation) return true;
  
  if (prop.displayOptions?.show) {
    const show = prop.displayOptions.show;
    if (operation.resource && show.resource) {
      const expected = Array.isArray(show.resource) ? show.resource : [show.resource];
      if (!expected.includes(operation.resource)) return false;
    }
    if (operation.operation && show.operation) {
      const expected = Array.isArray(show.operation) ? show.operation : [show.operation];
      if (!expected.includes(operation.operation)) return false;
    }
  }
  
  return true;
}
```

#### Step 4: Port Node-Specific Validators (src/core/validation/node-specific.ts)
```typescript
// Priority nodes to port first (highest usage):
// 1. httpRequest - URL validation, body/method checks
// 2. webhook - response mode validation
// 3. code - syntax checks, return format validation
// 4. slack - channel/message requirements
// 5. googleSheets - range format validation
// 6. postgres/mysql - SQL injection warnings
// 7. openAi - model/prompt requirements
// 8. set/if/filter/switch - fixedCollection structure

// See n8n-mcp/src/services/node-specific-validators.ts for complete implementations
```

#### Step 5: Update Workflow Validator (src/core/validator.ts)
```typescript
import { EnhancedConfigValidator } from './validation/enhanced-validator.js';

export interface EnhancedValidateOptions extends ValidateOptions {
  profile?: ValidationProfile;
  mode?: ValidationMode;
}

export function validateWorkflowStructure(
  data: unknown, 
  options?: EnhancedValidateOptions
): ValidationResult {
  // ... existing structure validation ...
  
  // For each node, use enhanced validation
  if (Array.isArray(wf.nodes)) {
    for (let i = 0; i < wf.nodes.length; i++) {
      const node = wf.nodes[i];
      
      // Get node type info from registry
      const nodeInfo = nodeRegistry.getNodeType(node.type, node.typeVersion);
      
      if (nodeInfo?.properties) {
        // NEW: Enhanced validation with profile
        const enhancedResult = EnhancedConfigValidator.validateWithMode(
          node.type,
          node.parameters,
          nodeInfo.properties,
          options?.mode || 'operation',
          options?.profile || 'runtime'
        );
        
        // Merge enhanced errors into issues
        for (const error of enhancedResult.errors) {
          issues.push({
            code: `ENHANCED_${error.type.toUpperCase()}`,
            severity: 'error',
            message: error.message,
            location: { nodeName: node.name, nodeType: node.type, path: error.property },
            hint: error.fix,
          });
        }
        
        // Merge warnings
        for (const warning of enhancedResult.warnings) {
          issues.push({
            code: `ENHANCED_${warning.type.toUpperCase()}`,
            severity: 'warning',
            message: warning.message,
            location: { nodeName: node.name, path: warning.property },
            hint: warning.suggestion,
          });
        }
      }
    }
  }
  
  return result;
}
```

#### Step 6: Update Command (src/commands/workflows/validate.ts)
```typescript
interface ValidateOptions {
  file?: string;
  profile?: 'minimal' | 'runtime' | 'ai-friendly' | 'strict';  // Updated type
  mode?: 'full' | 'operation' | 'minimal';  // NEW
  repair?: boolean;
  fix?: boolean;
  save?: string;
  json?: boolean;
}

// In workflowsValidateCommand:
const result = validateWorkflowStructure(workflow, { 
  rawSource,
  profile: opts.profile || 'runtime',
  mode: opts.mode || 'operation'
});
```

---

## CLI Commands Reference

### Affected Commands

| Command | Syntax | File | Purpose |
|---------|--------|------|---------|
| `workflows validate` | `n8n workflows validate [idOrFile] [options]` | `src/commands/workflows/validate.ts` | Validate workflow JSON structure and node configs |
| `nodes validate` | `n8n nodes validate <nodeType> [options]` | `src/commands/nodes/validate.ts` | Validate individual node configuration |
| `workflows autofix` | `n8n workflows autofix <id> [options]` | `src/commands/workflows/autofix.ts` | Auto-fix validation issues with confidence levels |

### Command Syntax Updates

#### `workflows validate` (Enhanced)
```bash
n8n workflows validate [idOrFile] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | Path to workflow JSON file | - |
| `--profile <profile>` | Validation profile: `minimal`, `runtime`, `ai-friendly`, `strict` | `runtime` |
| `--mode <mode>` | Validation mode: `minimal`, `operation`, `full` | `operation` |
| `--repair` | Attempt to repair malformed JSON | - |
| `--fix` | Auto-fix known issues (fixedCollection, etc.) | - |
| `-s, --save <path>` | Save fixed workflow | - |
| `--json` | Output as JSON | - |

**Example usage:**
```bash
# Minimal check - structure only (fast, for drafts)
n8n workflows validate workflow.json --profile minimal --json

# Runtime check - default for deployment validation
n8n workflows validate workflow.json --profile runtime --json

# AI-friendly - balanced for AI agents (includes best practices)
n8n workflows validate workflow.json --profile ai-friendly --json

# Strict check - everything including style (CI/CD gate)
n8n workflows validate workflow.json --profile strict --json

# Operation-aware mode - only validate current resource/operation properties
n8n workflows validate workflow.json --mode operation --json

# Full mode - validate all properties regardless of visibility
n8n workflows validate workflow.json --mode full --profile strict --json
```

**Enhanced JSON output:**
```json
{
  "valid": false,
  "mode": "operation",
  "profile": "ai-friendly",
  "operation": {
    "resource": "message",
    "operation": "send"
  },
  "errors": [{
    "type": "missing_required",
    "property": "channel",
    "message": "Channel is required to send a message",
    "fix": "Set channel to \"#general\" or ID like \"C1234567890\"",
    "nodeName": "Slack",
    "nodeType": "n8n-nodes-base.slack"
  }],
  "warnings": [{
    "type": "best_practice",
    "property": "errorHandling",
    "message": "Slack API can have rate limits and transient failures",
    "suggestion": "Add onError: \"continueRegularOutput\" with retryOnFail"
  }],
  "suggestions": [
    "Consider adding error handling for external API calls"
  ],
  "autofix": {
    "onError": "continueRegularOutput",
    "retryOnFail": true,
    "maxTries": 2
  },
  "nextSteps": [
    "Add channel property to Slack node",
    "Run: n8n workflows validate workflow.json --fix"
  ]
}
```

#### `nodes validate` (Enhanced)
```bash
n8n nodes validate <nodeType> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <json>` | Node configuration to validate (JSON string or @file.json) | `{}` |
| `--profile <profile>` | Validation profile: `minimal`, `runtime`, `ai-friendly`, `strict` | `runtime` |
| `--mode <mode>` | Validation mode: `minimal`, `operation`, `full` | `operation` |
| `--json` | Output as JSON | - |

**Example usage:**
```bash
# Validate Slack node with minimal config
n8n nodes validate slack --config '{"resource":"message","operation":"send"}' --json

# Validate with file input
n8n nodes validate httpRequest --config @node-config.json --profile strict --json

# Validate HTTP Request with URL check
n8n nodes validate httpRequest --config '{"url":"example.com"}' --profile strict --json
# → Error: URL missing protocol (http:// or https://)
```

---

## CLI Architecture Overview

### Entry Point & Command Registration
```
src/cli.ts                          # Main entry point, Commander.js setup
├── Registers all command groups    # workflows, nodes, credentials, etc.
├── Configures global options       # --json, --verbose, --profile
└── Sets up error handling          # Exit codes, error formatting
```

### Command Structure Pattern
```
src/commands/<domain>/
├── index.ts        # Command group registration (optional)
├── list.ts         # n8n <domain> list
├── get.ts          # n8n <domain> get <id>
├── create.ts       # n8n <domain> create
├── update.ts       # n8n <domain> update <id>
├── delete.ts       # n8n <domain> delete <id>
└── <action>.ts     # n8n <domain> <action>
```

### Shared Utilities
```
src/core/
├── api/client.ts           # n8n API client (REST calls)
├── config/loader.ts        # Configuration file loading
├── validator.ts            # Workflow structure validation
├── n8n-native-validator.ts # n8n NodeHelpers integration
├── fixer.ts                # Auto-fix logic
├── json-parser.ts          # JSON parsing with repair
├── formatters/
│   ├── header.ts           # Section headers
│   ├── table.ts            # Table formatting
│   ├── json.ts             # JSON output (--json flag)
│   ├── next-actions.ts     # "Next steps" suggestions
│   └── theme.ts            # Colors, icons
└── types.ts                # Shared type definitions

src/utils/
├── errors.ts               # Error classes (N8nApiError, etc.)
├── exit-codes.ts           # POSIX exit codes
├── output.ts               # Console output helpers
└── prompts.ts              # Interactive prompts
```

### Config/Auth Flow
```
1. CLI startup (src/cli.ts)
2. Load config (src/core/config/loader.ts)
   ├── Check env vars: N8N_HOST, N8N_API_KEY
   ├── Load ~/.n8nrc or .n8nrc
   └── Apply --profile override
3. Initialize API client (src/core/api/client.ts)
4. Execute command
```

---

## Implementation Guide

### Files to Create

| File | Purpose | Lines (Est.) |
|------|---------|--------------|
| `src/core/validation/index.ts` | Re-exports all validation modules | 20 |
| `src/core/validation/profiles.ts` | ValidationMode, ValidationProfile types | 80 |
| `src/core/validation/enhanced-validator.ts` | EnhancedConfigValidator class | 400 |
| `src/core/validation/config-validator.ts` | Base ConfigValidator class | 300 |
| `src/core/validation/node-specific.ts` | Node-specific validators | 500 |
| `src/core/validation/fixed-collection.ts` | FixedCollectionValidator | 200 |
| `src/core/validation/property-visibility.ts` | displayOptions logic | 100 |
| `src/core/validation/type-structure.ts` | **NEW:** TypeStructureService | 200 |

---

## Type Structure Service (GAP)

### Purpose

Provides validation and example generation for 22 complex NodePropertyTypes (filter, resourceMapper, assignmentCollection, etc.). Critical for validating complex node configurations.

### MCP Source: `n8n-mcp/src/services/type-structure-service.ts` (428 lines)

### Key Types

```typescript
// Complex type categories
type ComplexPropertyType = 
  | 'filter'              // Filter conditions with combinator
  | 'resourceMapper'      // Dynamic resource mapping
  | 'assignmentCollection'// Key-value assignments
  | 'resourceLocator'     // ID/URL/expression locator
  | 'collection'          // Nested property groups
  | 'fixedCollection';    // Fixed schema collections

interface TypeStructure {
  type: NodePropertyTypes;
  category: 'primitive' | 'object' | 'collection' | 'special';
  jsType: string;
  description: string;
  example: any;
  validation: {
    required?: string[];
    structure?: Record<string, any>;
  };
}

interface TypeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Complex Type Examples (from MCP)

```typescript
// Filter type example (n8n-mcp/src/constants/type-structures.ts)
const FILTER_EXAMPLE = {
  combinator: 'and',
  conditions: [
    {
      leftValue: '={{ $json.status }}',
      rightValue: 'active',
      operator: { type: 'string', operation: 'equals' }
    }
  ],
  options: {
    caseSensitive: true,
    leftValue: '',
    typeValidation: 'strict',
    version: 2
  }
};

// ResourceMapper type example
const RESOURCE_MAPPER_EXAMPLE = {
  mappingMode: 'defineBelow',
  value: {
    name: '={{ $json.name }}',
    email: '={{ $json.email }}'
  }
};

// ResourceLocator type example
const RESOURCE_LOCATOR_EXAMPLE = {
  __rl: true,
  value: '={{ $json.sheetId }}',
  mode: 'expression'
};

// AssignmentCollection type example
const ASSIGNMENT_COLLECTION_EXAMPLE = {
  assignments: [
    { id: 'field1', name: 'Field 1', type: 'string', value: 'value1' }
  ]
};
```

### Service Methods

```typescript
// src/core/validation/type-structure.ts
export class TypeStructureService {
  /**
   * Get structure definition for a property type
   */
  static getStructure(type: NodePropertyTypes): TypeStructure | null;
  
  /**
   * Get all structure definitions
   */
  static getAllStructures(): Record<NodePropertyTypes, TypeStructure>;
  
  /**
   * Get example value for a property type
   */
  static getExample(type: NodePropertyTypes): any;
  
  /**
   * Validate a value against its expected type structure
   */
  static validateType(
    value: any, 
    type: NodePropertyTypes
  ): TypeValidationResult;
  
  /**
   * Check if a type is complex (needs special handling)
   */
  static isComplexType(type: NodePropertyTypes): boolean;
  
  /**
   * Check if a type is primitive
   */
  static isPrimitiveType(type: NodePropertyTypes): boolean;
}
```

### Integration with EnhancedConfigValidator

```typescript
// src/core/validation/enhanced-validator.ts
import { TypeStructureService } from './type-structure.js';

// When validating properties:
private validatePropertyValue(
  property: PropertyDefinition,
  value: any,
  config: Record<string, any>
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // For complex types, use TypeStructureService
  if (TypeStructureService.isComplexType(property.type)) {
    const result = TypeStructureService.validateType(value, property.type);
    if (!result.valid) {
      errors.push({
        type: 'invalid_type_structure',
        property: property.name,
        message: result.errors.join('; '),
        fix: `See example: ${JSON.stringify(TypeStructureService.getExample(property.type))}`
      });
    }
  }
  
  return errors;
}
```

### Additional Files (Type Structure)

| File | Purpose | Lines (Est.) |
|------|---------|--------------|
| `src/core/validation/type-structure.ts` | TypeStructureService | 200 |
| `src/core/validation/type-examples.ts` | Complex type examples | 150 |

### Adding a New Validation Profile

1. **Define profile in `src/core/validation/profiles.ts`:**
```typescript
export type ValidationProfile = 'minimal' | 'runtime' | 'ai-friendly' | 'strict';

export const PROFILE_RULES: Record<ValidationProfile, ProfileRules> = {
  minimal: {
    checkRequiredFields: true,
    checkTypes: false,
    checkConditionals: false,
    filterWarnings: ['security', 'deprecated'],
  },
  // ... other profiles
};
```

2. **Apply profile filtering in `src/core/validation/enhanced-validator.ts`:**
```typescript
private static applyProfileFilters(
  result: EnhancedValidationResult,
  profile: ValidationProfile
): void {
  const rules = PROFILE_RULES[profile];
  // Filter errors/warnings based on rules
}
```

3. **Wire to command in `src/commands/workflows/validate.ts`:**
```typescript
.option('--profile <profile>', 'Validation profile', 'runtime')
.option('--mode <mode>', 'Validation mode', 'operation')
```

### Adding a Node-Specific Validator

1. **Add validator method in `src/core/validation/node-specific.ts`:**
```typescript
export class NodeSpecificValidators {
  static validateMyNode(context: NodeValidationContext): void {
    const { config, errors, warnings, autofix } = context;
    
    // Add validation logic
    if (!config.requiredField) {
      errors.push({
        type: 'missing_required',
        property: 'requiredField',
        message: 'Field X is required',
        fix: 'Add requiredField: "value"'
      });
    }
  }
}
```

2. **Register in enhanced validator dispatch:**
```typescript
// src/core/validation/enhanced-validator.ts
switch (normalizedNodeType) {
  case 'nodes-base.myNode':
    NodeSpecificValidators.validateMyNode(context);
    break;
}
```

### Command Routing Pattern

All commands follow this pattern:
```typescript
// src/commands/<domain>/<action>.ts
import { Command } from 'commander';
import { outputJson } from '../../core/formatters/json.js';
import { formatHeader } from '../../core/formatters/header.js';

export function register<Domain><Action>Command(program: Command): void {
  program
    .command('<action> [args]')
    .description('Description')
    .option('--json', 'Output as JSON')
    .option('-s, --save <path>', 'Save to file')
    .action(async (args, opts) => {
      try {
        // 1. Parse inputs
        // 2. Execute logic
        // 3. Format output (JSON or human)
        if (opts.json) {
          outputJson({ success: true, data: result });
        } else {
          console.log(formatHeader({ title: 'Title', ... }));
        }
        process.exitCode = 0;
      } catch (error) {
        // Handle error with proper exit code
        process.exitCode = getExitCode(error);
      }
    });
}
```

### Core Dependencies

| Module | Purpose | Used By |
|--------|---------|---------|
| `src/core/api/client.ts` | API calls to n8n instance | All API commands |
| `src/core/db/nodes.ts` | Bundled node repository (800+) | `nodes/*`, validation |
| `src/core/n8n-loader.ts` | n8n-nodes-base integration | Node schema lookup |
| `src/core/formatters/*` | Output formatting | All commands |
| `src/utils/exit-codes.ts` | POSIX exit codes | All commands |

---

## Dependencies

### Required
- `src/core/n8n-loader.ts` - For node type descriptions
- `src/core/db/nodes.ts` - For node repository access
- `src/core/formatters/json.ts` - For `--json` output

### Related Features
- **Workflow Diff Engine** (P0) - Uses validation for change detection
- **Workflow Autofix** (`src/commands/workflows/autofix.ts`) - Consumes autofix suggestions from validator
- **Breaking Change Detector** - May reuse node-specific validation logic

### Blocks
- None (standalone feature)

---

## Testing Requirements

### Unit Tests
```typescript
describe('EnhancedConfigValidator', () => {
  describe('validateWithMode', () => {
    it('should validate minimal profile - only required fields');
    it('should validate runtime profile - required + types');
    it('should validate ai-friendly profile - includes best practices');
    it('should validate strict profile - everything');
  });
  
  describe('operation-aware validation', () => {
    it('should filter properties by resource/operation');
    it('should apply displayOptions correctly');
    it('should not warn about invisible properties');
  });
  
  describe('node-specific validation', () => {
    it('should validate Slack message.send requirements');
    it('should validate HTTP Request URL format');
    it('should validate Code node return format');
  });
  
  describe('fixedCollection validation', () => {
    it('should detect invalid If node conditions.values structure');
    it('should provide autofix for Switch node rules');
  });
});
```

### Integration Tests (CLI)
```bash
# Test profile behavior
n8n workflows validate test/fixtures/minimal-workflow.json --profile minimal --json
n8n workflows validate test/fixtures/full-workflow.json --profile strict --json

# Test node validation with config
n8n nodes validate httpRequest --config '{"url":"example.com"}' --profile strict --json
# Should error: URL missing protocol

n8n nodes validate slack --config '{"resource":"message","operation":"send"}' --profile runtime --json
# Should error: Missing channel and text

# Test mode behavior
n8n workflows validate test/fixtures/slack-workflow.json --mode operation --json
# Should only validate properties for current resource/operation

n8n workflows validate test/fixtures/slack-workflow.json --mode full --json
# Should validate all properties

# Test fixedCollection validation
n8n workflows validate test/fixtures/invalid-if-node.json --json
# Should detect conditions.values mistake and provide autofix

# Test autofix integration
n8n workflows validate test/fixtures/fixable-workflow.json --fix --save fixed.json --json
# Should apply autofix and save corrected workflow

# Exit code verification
n8n workflows validate valid.json --json; echo "Exit: $?"     # → Exit: 0
n8n workflows validate invalid.json --json; echo "Exit: $?"   # → Exit: 65 (DATAERR)
```

### E2E Test Scenarios
```bash
# Scenario 1: AI Agent workflow - draft validation
echo '{"nodes":[{"type":"n8n-nodes-base.slack","parameters":{}}]}' > draft.json
n8n workflows validate draft.json --profile minimal --json
# → valid: true (minimal only checks structure)

# Scenario 2: AI Agent workflow - runtime validation
n8n workflows validate draft.json --profile runtime --json
# → valid: false, errors: missing resource, operation

# Scenario 3: CI/CD pipeline - strict validation
n8n workflows validate production.json --profile strict --json
# → valid: false, warnings: missing error handling, deprecated properties
```

---

## Acceptance Criteria

### 1. Profile Support
- [ ] `n8n workflows validate --profile minimal` only checks structure
- [ ] `n8n workflows validate --profile runtime` validates types (default)
- [ ] `n8n workflows validate --profile ai-friendly` includes best practices
- [ ] `n8n workflows validate --profile strict` validates everything
- [ ] Profile names match README.md documentation exactly

### 2. Mode Support
- [ ] `--mode minimal` only validates visible required properties
- [ ] `--mode operation` validates properties for current resource/operation (default)
- [ ] `--mode full` validates all properties regardless of visibility

### 3. Operation-Aware Validation
- [ ] Only validates properties relevant to current resource/operation
- [ ] Respects displayOptions.show/hide conditions
- [ ] No false positives for invisible properties
- [ ] Extracts resource/operation/action from config correctly

### 4. Node-Specific Validation
- [ ] Validates Slack channel/message requirements
- [ ] Validates HTTP Request URL format and protocol
- [ ] Validates Code node syntax and return format
- [ ] Validates database nodes for SQL injection risks
- [ ] Validates OpenAI/AI Agent nodes for model/prompt requirements

### 5. FixedCollection Validation
- [ ] Catches `conditions.values` mistake in If/Filter nodes
- [ ] Catches `rules.conditions` mistake in Switch nodes
- [ ] Catches `fields.values.values` mistake in Set nodes
- [ ] Provides autofix for structure errors
- [ ] Supports 10+ node types from MCP FixedCollectionValidator

### 6. Output Format (--json)
- [ ] JSON output includes `mode` and `profile` fields
- [ ] JSON output includes `operation` context (resource, operation, action)
- [ ] JSON output includes `autofix` when available
- [ ] JSON output includes `nextSteps` suggestions
- [ ] Human output shows errors/warnings/suggestions clearly
- [ ] Exit code 0 for valid, 65 (DATAERR) for validation errors

### 7. Integration with Existing Commands
- [ ] `n8n workflows autofix` uses enhanced validation for better suggestions
- [ ] `n8n nodes validate` supports same profiles and modes
- [ ] Global `--json` flag works consistently

---

## Exit Codes

| Code | Name | When Used |
|------|------|-----------|
| `0` | SUCCESS | Workflow is valid |
| `65` | DATAERR | Validation errors found |
| `66` | NOINPUT | Cannot open workflow file |
| `64` | USAGE | Invalid arguments (unknown profile/mode) |

---

## Estimated Effort

- **Complexity**: Medium-High
- **Files**: 7 new files, 5 modified
- **LOC**: ~1600-2000 (porting + integration + tests)
- **Time**: 4-5 days

### Breakdown
| Task | Time | Files |
|------|------|-------|
| Port base types and profiles | 0.5 day | `src/core/validation/profiles.ts` |
| Port FixedCollectionValidator | 0.5 day | `src/core/validation/fixed-collection.ts` |
| Port property visibility logic | 0.5 day | `src/core/validation/property-visibility.ts` |
| Port node-specific validators (top 8) | 1.5 days | `src/core/validation/node-specific.ts` |
| Create EnhancedConfigValidator | 0.5 day | `src/core/validation/enhanced-validator.ts` |
| Integrate with `src/core/validator.ts` | 0.25 day | `src/core/validator.ts` |
| Update `workflows validate` command | 0.25 day | `src/commands/workflows/validate.ts` |
| Update `nodes validate` command | 0.25 day | `src/commands/nodes/validate.ts` |
| Update types | 0.25 day | `src/core/types.ts` |
| Testing and edge cases | 0.5 day | `test/validation/*.test.ts` |

---

## Related CLI Commands (Context)

These existing commands interact with or are affected by this feature:

| Command | File | Relationship |
|---------|------|--------------|
| `n8n workflows validate` | `src/commands/workflows/validate.ts` | **Primary target** - enhanced validation |
| `n8n nodes validate` | `src/commands/nodes/validate.ts` | **Primary target** - enhanced validation |
| `n8n workflows autofix` | `src/commands/workflows/autofix.ts` | Consumes validation results and autofix |
| `n8n workflows create` | `src/commands/workflows/create.ts` | Could pre-validate before create |
| `n8n workflows import` | `src/commands/workflows/import.ts` | Could pre-validate before import |
| `n8n workflows update` | `src/commands/workflows/update.ts` | Could validate changes before update |
| `n8n nodes show` | `src/commands/nodes/show.ts` | Schema source for validation |
| `n8n nodes search` | `src/commands/nodes/search.ts` | Node lookup for validation |
