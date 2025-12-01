# P1: Expression Format Validator

## Priority: P1 (High)
## Status: ❌ Missing in CLI
## MCP Source: `n8n-mcp/src/services/expression-format-validator.ts`

---

## Business Value

**User Impact:** Expression format validation prevents the #1 runtime failure mode for AI-generated and manually-created workflows. When an expression like `{{ $json.field }}` is used instead of `={{ $json.field }}`, n8n silently treats it as literal text—the workflow runs but produces wrong results with no clear error message.

**Workflow Improvement:** Catching missing `=` prefixes at validation time (before deployment) eliminates hours of debugging for users who don't understand why their expressions aren't evaluating. This is especially critical for AI agents (Claude, ChatGPT) that frequently generate expressions without the required prefix.

**Time Saved:** Each expression format error typically costs 15-60 minutes to diagnose. For workflows with 10+ expressions, pre-validation can save 2-4 hours of debugging time per malformed workflow.

---

## Current CLI Status

- **Implemented:** ❌ No
- **Location:** N/A
- **Gap Reason:** 
  1. **No expression-aware validation layer** — `src/core/validator.ts` validates structure (nodes, connections, types) but never inspects string values for expression syntax
  2. **n8n-native-validator is parameter-schema focused** — `src/core/n8n-native-validator.ts` delegates to n8n's `NodeHelpers.getNodeParametersIssues()` which validates required fields and types, not expression format
  3. **No confidence-scoring infrastructure** — CLI lacks the `ConfidenceScorer` pattern needed for smart resource locator recommendations
  4. **Fixer only handles structural issues** — `src/core/fixer.ts` fixes `options` field placement, not expression prefixes

### Current Validation Flow (What Exists)
```
src/commands/workflows/validate.ts
  → validateWorkflowStructure() [src/core/validator.ts:45]
    → Validates: nodes array, connections object, required node fields
    → For each node: validateNodeWithN8n() [src/core/n8n-native-validator.ts:35]
      → Uses n8n's NodeHelpers.getNodeParameters() and getNodeParametersIssues()
      → Validates: parameter types, required fields, enum values
      → Does NOT validate: expression format, missing = prefix
```

### Why Expressions Pass Current Validation
The current validator treats `"{{ $json.field }}"` and `"={{ $json.field }}"` identically—both are valid strings from a JSON schema perspective. Only at n8n runtime does the missing `=` cause the expression to be treated as literal text.

---

## CLI Architecture Overview

### Entry Point & Command Registration

```
src/cli.ts                          # Main entry point, registers all commands
  ├── src/commands/workflows/       # Workflow commands (validate, autofix, etc.)
  ├── src/commands/nodes/           # Node commands (search, show, validate)
  └── src/commands/<domain>/        # Other domain commands
```

### Command Pattern (from README.md)

All CLI commands follow this structure:
```
n8n <resource> <action> [positional] [options]
```

**Standard Options (all commands):**
| Option | Description |
|--------|-------------|
| `--json` | Machine-readable JSON output |
| `-s, --save <path>` | Save output to file |
| `--force, --yes` | Skip confirmation prompts |
| `--profile <name>` | Use specific config profile |

### Core Module Dependencies

| Module | Purpose | Relevant Files |
|--------|---------|----------------|
| **API Client** | n8n REST API calls | `src/core/api/client.ts` |
| **Validator** | Workflow structure validation | `src/core/validator.ts` |
| **Fixer** | Auto-fix known issues | `src/core/fixer.ts` |
| **Formatters** | Output formatting (JSON, table, tree) | `src/core/formatters/*.ts` |
| **Types** | Shared TypeScript interfaces | `src/types/*.ts`, `src/core/types.ts` |
| **Config** | Profile/env loading | `src/core/config/loader.ts` |

### Exit Codes (POSIX-standard)

| Code | Name | When to Use |
|------|------|-------------|
| `0` | SUCCESS | Validation passed, command succeeded |
| `1` | GENERAL | Expression validation errors found |
| `65` | DATAERR | Invalid input data (malformed workflow) |
| `66` | NOINPUT | Cannot open input file |

---

## CLI Commands Reference

### Affected Commands (This Feature)

This feature enhances existing commands and adds new flags. No new top-level commands.

| Command | Syntax | File | Change |
|---------|--------|------|--------|
| `workflows validate` | `n8n workflows validate [idOrFile] [options]` | `src/commands/workflows/validate.ts` | Add `--validate-expressions` flag |
| `workflows autofix` | `n8n workflows autofix <idOrFile> [options]` | `src/commands/workflows/autofix.ts` | Add expression fixes |
| `nodes validate` | `n8n nodes validate <nodeType> [options]` | `src/commands/nodes/validate.ts` | Add expression validation |

### New Command Flags

#### `workflows validate` — New Options

```bash
n8n workflows validate [idOrFile] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--validate-expressions` | Enable expression format validation | `true` |
| `--no-validate-expressions` | Skip expression format validation | - |

**JSON output schema addition:**
```json
{
  "valid": false,
  "errors": [{
    "code": "EXPRESSION_MISSING_PREFIX",
    "nodeName": "HTTP Request",
    "path": "parameters.url",
    "message": "Expression requires '=' prefix to be evaluated",
    "currentValue": "{{ $json.endpoint }}",
    "correctUsage": "={{ $json.endpoint }}"
  }]
}
```

#### `workflows autofix` — Enhanced Fix Types

```bash
n8n workflows autofix <idOrFile> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--fix-expressions` | Auto-fix expression format issues | `true` (with `--experimental`) |
| `--no-fix-expressions` | Skip expression format fixes | - |

**Autofix integration:**
```bash
# Preview expression fixes
n8n workflows autofix workflow.json --experimental

# Apply expression fixes to file
n8n workflows autofix workflow.json --experimental --apply

# Apply with backup skip
n8n workflows autofix workflow.json --experimental --apply --no-backup
```

---

## MCP Reference Implementation

### Architecture Overview

The MCP implements a **3-layer validation stack**:

```
ExpressionFormatValidator (node-aware, confidence-scored)
        ↓ uses
UniversalExpressionValidator (100% reliable, universal rules)
        ↓ uses  
ConfidenceScorer (field/node pattern matching)
```

### Source Files

| File | LOC | Purpose |
|------|-----|---------|
| `n8n-mcp/src/services/expression-format-validator.ts` | 340 | Main validator: combines universal rules + node-specific intelligence |
| `n8n-mcp/src/services/universal-expression-validator.ts` | 286 | Core rules: prefix detection, syntax checking, pattern validation |
| `n8n-mcp/src/services/confidence-scorer.ts` | 211 | Field/node pattern matching for resource locator recommendations |
| `n8n-mcp/src/services/expression-validator.ts` | 343 | Syntax validation: variable references, node availability, common mistakes |
| `n8n-mcp/src/utils/expression-utils.ts` | 110 | Utilities: `isExpression()`, `containsExpression()`, `hasMixedContent()` |

### Key Types

```typescript
// n8n-mcp/src/services/expression-format-validator.ts:13-21
export interface ExpressionFormatIssue {
  fieldPath: string;           // e.g., "parameters.url", "parameters.body.values[0].value"
  currentValue: any;           // The problematic value
  correctedValue: any;         // The fix (string or ResourceLocatorField)
  issueType: 'missing-prefix' | 'needs-resource-locator' | 'invalid-rl-structure' | 'mixed-format';
  explanation: string;         // Human-readable error message
  severity: 'error' | 'warning';
  confidence?: number;         // 0.0-1.0 for node-specific recommendations
}

// n8n-mcp/src/services/expression-format-validator.ts:23-27
export interface ResourceLocatorField {
  __rl: true;
  value: string;               // The expression value with = prefix
  mode: 'id' | 'url' | 'expression' | 'name' | 'list';
}

// n8n-mcp/src/services/expression-format-validator.ts:29-33
export interface ValidationContext {
  nodeType: string;            // e.g., "n8n-nodes-base.googleSheets"
  nodeName: string;            // e.g., "Google Sheets"
  nodeId?: string;
}

// n8n-mcp/src/services/universal-expression-validator.ts:9-17
export interface UniversalValidationResult {
  isValid: boolean;
  hasExpression: boolean;      // Contains {{ }} syntax
  needsPrefix: boolean;        // Missing = prefix
  isMixedContent: boolean;     // Has text outside {{ }}
  confidence: 1.0;             // Universal rules = 100% confidence
  suggestion?: string;         // Corrected value
  explanation: string;
}

// n8n-mcp/src/services/confidence-scorer.ts:8-12
export interface ConfidenceScore {
  value: number;               // 0.0 to 1.0
  reason: string;              // Human explanation
  factors: ConfidenceFactor[]; // What contributed to score
}
```

### Resource Locator Fields Map

Nodes that require resource locator format for specific fields:

```typescript
// n8n-mcp/src/services/expression-format-validator.ts:44-63
private static readonly RESOURCE_LOCATOR_FIELDS: Record<string, string[]> = {
  'github': ['owner', 'repository', 'user', 'organization'],
  'googleSheets': ['sheetId', 'documentId', 'spreadsheetId', 'rangeDefinition'],
  'googleDrive': ['fileId', 'folderId', 'driveId'],
  'slack': ['channel', 'user', 'channelId', 'userId', 'teamId'],
  'notion': ['databaseId', 'pageId', 'blockId'],
  'airtable': ['baseId', 'tableId', 'viewId'],
  'monday': ['boardId', 'itemId', 'groupId'],
  'hubspot': ['contactId', 'companyId', 'dealId'],
  'salesforce': ['recordId', 'objectName'],
  'jira': ['projectKey', 'issueKey', 'boardId'],
  'gitlab': ['projectId', 'mergeRequestId', 'issueId'],
  'mysql': ['table', 'database', 'schema'],
  'postgres': ['table', 'database', 'schema'],
  'mongodb': ['collection', 'database'],
  's3': ['bucketName', 'key', 'fileName'],
  'ftp': ['path', 'fileName'],
  'ssh': ['path', 'fileName'],
  'redis': ['key'],
};
```

### Core Methods & Data Flow

```typescript
// Entry point: validate all expressions in a node
ExpressionFormatValidator.validateNodeParameters(
  parameters: any,              // Node's parameters object
  context: ValidationContext    // { nodeType, nodeName, nodeId }
): ExpressionFormatIssue[]

// Recursive traversal
private validateRecursive(
  obj: any,
  path: string,                 // Current field path like "body.values[0]"
  context: ValidationContext,
  issues: ExpressionFormatIssue[],
  visited: WeakSet<object>,     // Circular reference protection
  depth: number                 // Max 100 to prevent stack overflow
): void

// Single value validation (the core logic)
validateAndFix(value: any, fieldPath: string, context: ValidationContext): ExpressionFormatIssue | null
  → Step 1: Skip non-strings (unless ResourceLocator object)
  → Step 2: If ResourceLocator, validate the inner value
  → Step 3: Run UniversalExpressionValidator.validate()
  → Step 4: If prefix issue found, check ConfidenceScorer for resource locator recommendation
  → Step 5: Return appropriate fix (string with = prefix OR ResourceLocator structure)
```

### Universal Validation Rules (100% Reliable)

```typescript
// n8n-mcp/src/services/universal-expression-validator.ts

// Rule 1: Any {{ }} MUST have = prefix to evaluate
validateExpressionPrefix(value: string)
  → "{{ $json.field }}" → INVALID (needsPrefix: true)
  → "={{ $json.field }}" → VALID
  → "Hello {{ $json.name }}" → INVALID (mixed content, still needs =)
  → "=Hello {{ $json.name }}" → VALID

// Rule 2: Expression syntax must be balanced
validateExpressionSyntax(value: string)
  → "{{ $json.a" → INVALID (unmatched brackets)
  → "{{ }}" → INVALID (empty expression)
  → "{{ $json.a }} and {{ $json.b }}" → VALID (multiple expressions OK)

// Rule 3: Common pattern errors
validateCommonPatterns(value: string)
  → "{{ ${variable} }}" → INVALID (template literal syntax)
  → "{{ ={{ $json.a }} }}" → INVALID (double prefix inside)
  → "{{ {{ nested }} }}" → INVALID (nested brackets)
```

### Confidence Scoring Logic

```typescript
// n8n-mcp/src/services/confidence-scorer.ts

ConfidenceScorer.scoreResourceLocatorRecommendation(fieldName, nodeType, value)
  → Factor 1 (50%): Exact field match (e.g., "sheetId" for googleSheets)
  → Factor 2 (30%): Field name pattern (ends with Id, Key, Name, Path, Url)
  → Factor 3 (10%): Value pattern (expression accesses .id, .key, .name properties)
  → Factor 4 (10%): Node category (github, slack, notion are resource-heavy)

Confidence thresholds:
  → ≥ 0.8: High confidence → Auto-suggest resource locator
  → ≥ 0.5: Medium → Suggest as warning
  → ≥ 0.3: Low → Mention as info
  → < 0.3: Very low → Skip recommendation
```

---

## CLI Integration Path

### High-Level Implementation Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                 IMPLEMENTATION PHASES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: Core Validation Module                               │
│  ├── Create src/core/validation/ directory                     │
│  ├── Port UniversalExpressionValidator                         │
│  ├── Port ExpressionFormatValidator                            │
│  ├── Port ConfidenceScorer                                     │
│  └── Export from index.ts                                       │
│                                                                 │
│  PHASE 2: Types & Interfaces                                    │
│  ├── Add types to src/core/types.ts                            │
│  ├── Add ExpressionFormatIssue interface                         │
│  ├── Add ResourceLocatorField type                               │
│  └── Extend ValidateOptions                                    │
│                                                                 │
│  PHASE 3: Validator Integration                                 │
│  ├── Modify src/core/validator.ts                               │
│  ├── Add validateExpressions option to ValidateOptions          │
│  └── Call ExpressionFormatValidator in validateWorkflowStructure│
│                                                                 │
│  PHASE 4: Fixer Integration                                     │
│  ├── Add fixExpressionFormatIssues to src/core/fixer.ts        │
│  ├── Register in defaultExperimentalFixes array                 │
│  └── Add setNestedValue helper                                  │
│                                                                 │
│  PHASE 5: Command Updates                                       │
│  ├── Add --validate-expressions flag to validate.ts             │
│  ├── Integrate into autofix.ts                                  │
│  └── Update JSON output schemas                                 │
│                                                                 │
│  PHASE 6: Testing                                               │
│  ├── Unit tests for validation module                           │
│  ├── Integration tests for CLI commands                         │
│  └── Edge case coverage                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Files to Create

| File Path | Purpose | Port From |
|-----------|---------|-----------|
| `src/core/validation/index.ts` | Module exports | - |
| `src/core/validation/expression-format.ts` | Main expression validator | `n8n-mcp/src/services/expression-format-validator.ts` |
| `src/core/validation/universal-expression.ts` | Universal validation rules | `n8n-mcp/src/services/universal-expression-validator.ts` |
| `src/core/validation/confidence-scorer.ts` | Resource locator confidence | `n8n-mcp/src/services/confidence-scorer.ts` |
| `src/core/validation/expression-utils.ts` | Expression detection utilities | `n8n-mcp/src/utils/expression-utils.ts` |

### 2. Files to Modify

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `src/core/types.ts` | **Add types** | Add `ExpressionFormatIssue`, `ResourceLocatorField`, `ExpressionValidationContext` |
| `src/core/validator.ts` | **Add logic** | Import expression validator, add to `validateWorkflowStructure()` |
| `src/core/fixer.ts` | **Add fix** | Add `fixExpressionFormatIssues` to experimental fixes |
| `src/commands/workflows/validate.ts` | **Add option** | Add `--validate-expressions` / `--no-validate-expressions` flags |
| `src/commands/workflows/autofix.ts` | **Integrate** | Include expression fixes in `--experimental` mode |
| `src/cli.ts` | **Register** | Ensure new options are registered (Commander.js) |

### 3. New Types (src/core/types.ts)

Add these interfaces to the existing types file:

```typescript
// src/core/types.ts — ADD after line 102

// Expression Format Validation Types
export interface ExpressionFormatIssue {
  fieldPath: string;
  currentValue: any;
  correctedValue: any;
  issueType: 'missing-prefix' | 'needs-resource-locator' | 'invalid-rl-structure' | 'mixed-format';
  explanation: string;
  severity: 'error' | 'warning';
  confidence?: number;
}

export interface ResourceLocatorField {
  __rl: true;
  value: string;
  mode: 'id' | 'url' | 'expression' | 'name' | 'list';
}

export interface ExpressionValidationContext {
  nodeType: string;
  nodeName: string;
  nodeId?: string;
}

// Extend ValidateOptions
export interface ValidateOptions {
  rawSource?: string;
  validateExpressions?: boolean;  // Default: true
}
```

### 4. Validator Integration (src/core/validator.ts)

```typescript
// src/core/validator.ts — MODIFY

// ADD import at top
import { ExpressionFormatValidator } from './validation/expression-format.js';

// MODIFY ValidateOptions interface
export interface ValidateOptions {
  rawSource?: string;
  validateExpressions?: boolean;  // Default: true
}

// ADD after line 315 (after node loop, before return)
// Expression format validation
if (options?.validateExpressions !== false && Array.isArray(wf.nodes)) {
  for (let i = 0; i < wf.nodes.length; i++) {
    const node = wf.nodes[i];
    if (!node?.parameters) continue;
    
    const context = {
      nodeType: node.type || 'unknown',
      nodeName: node.name || `Node ${i}`,
      nodeId: node.id,
    };
    
    const exprIssues = ExpressionFormatValidator.validateNodeParameters(
      node.parameters,
      context
    );
    
    for (const issue of exprIssues) {
      const enriched = enrichWithSourceInfo({
        code: issue.issueType === 'missing-prefix' 
          ? 'EXPRESSION_MISSING_PREFIX' 
          : `EXPRESSION_${issue.issueType.toUpperCase().replace(/-/g, '_')}`,
        severity: issue.severity,
        message: issue.explanation,
        location: {
          nodeName: context.nodeName,
          nodeId: context.nodeId,
          nodeType: context.nodeType,
          nodeIndex: i,
          path: `nodes[${i}].parameters.${issue.fieldPath}`,
        },
        context: {
          value: issue.currentValue,
          expected: issue.correctedValue,
        },
        hint: issue.confidence 
          ? `Confidence: ${Math.round(issue.confidence * 100)}%` 
          : undefined,
      }, sourceMap, `nodes[${i}].parameters.${issue.fieldPath}`);
      
      issues.push(enriched);
      if (issue.severity === 'error') {
        errors.push(enriched.message);
      } else {
        warnings.push(enriched.message);
      }
    }
  }
}
```

### 5. Fixer Integration (src/core/fixer.ts)

```typescript
// src/core/fixer.ts — ADD new fix

import { ExpressionFormatValidator } from './validation/expression-format.js';

// ADD helper function
function setNestedValue(obj: any, path: string, value: any): boolean {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined) return false;
    current = current[key];
  }
  
  current[parts[parts.length - 1]] = value;
  return true;
}

// ADD new fix
const fixExpressionFormatIssues: ExperimentalFix = {
  id: 'expression-format',
  description: "Add missing '=' prefix to expressions and convert to resource locator format where needed.",
  apply(workflow: Workflow): FixResult {
    const warnings: string[] = [];
    let fixed = 0;

    if (!Array.isArray(workflow.nodes)) {
      return { fixed, warnings };
    }

    for (const node of workflow.nodes) {
      if (!node?.parameters) continue;

      const context = {
        nodeType: node.type || 'unknown',
        nodeName: node.name || 'unnamed',
        nodeId: node.id,
      };

      const issues = ExpressionFormatValidator.validateNodeParameters(
        node.parameters,
        context
      );

      for (const issue of issues) {
        if (issue.severity !== 'error') continue;
        
        const success = setNestedValue(
          node.parameters,
          issue.fieldPath,
          issue.correctedValue
        );
        
        if (success) {
          fixed++;
          warnings.push(
            `Fixed "${node.name}": ${issue.explanation} → ${
              typeof issue.correctedValue === 'string' 
                ? issue.correctedValue 
                : 'resource locator format'
            }`
          );
        }
      }
    }

    return { fixed, warnings };
  },
};

// MODIFY defaultExperimentalFixes array — ADD to list
const defaultExperimentalFixes: ExperimentalFix[] = [
  fixEmptyOptionsOnConditionalNodes,
  fixSwitchV3RuleConditionsOptions,
  fixSwitchV3FallbackOutputLocation,
  fixExpressionFormatIssues,  // NEW
];
```

### 6. Command Updates (src/commands/workflows/validate.ts)

```typescript
// src/commands/workflows/validate.ts — MODIFY

// UPDATE interface
interface ValidateOptions {
  file?: string;
  profile?: string;
  repair?: boolean;
  fix?: boolean;
  save?: string;
  json?: boolean;
  validateExpressions?: boolean;  // NEW
}

// MODIFY validateWorkflowStructure call
const result = validateWorkflowStructure(workflow, { 
  rawSource,
  validateExpressions: opts.validateExpressions  // NEW
});
```

### 7. CLI Registration (src/cli.ts)

```typescript
// In workflows validate command registration — ADD options
.option('--validate-expressions', 'Enable expression format validation (default: true)', true)
.option('--no-validate-expressions', 'Skip expression format validation')
```

---

## Dependencies

### Requires
- None (standalone validation module)

### Enables
- **04-P0 Advanced Autofix** — The `expression-format` fix type in autofix depends on this validator
- **Template validation** — Template imports can validate expressions before deployment

### Integration Order
1. Create `src/core/validation/` module (this feature)
2. Add types to `src/core/types.ts`
3. Integrate into `src/core/validator.ts`
4. Add expression fixes to `src/core/fixer.ts`
5. Update CLI commands (`validate.ts`, `autofix.ts`)
6. Register flags in `src/cli.ts`

---

## Acceptance Criteria

### CLI Command Examples

#### 1. Validate with Expression Checking (Default)

```bash
# Human-friendly output
$ n8n workflows validate workflow.json
╔════════════════════════════════════════════╗
║  Workflow Validation                       ║
╚════════════════════════════════════════════╝

Source: workflow.json
Status: Invalid

─────────────────────── Errors (2) ───────────────────────

  1. Expression requires '=' prefix to be evaluated
     Node: HTTP Request
     Path: parameters.url
     Current:  {{ $json.endpoint }}
     Expected: ={{ $json.endpoint }}

  2. Field 'sheetId' should use resource locator format
     Node: Google Sheets
     Path: parameters.sheetId
     Confidence: 80%

💡 Auto-fix available: n8n workflows autofix workflow.json --experimental
```

```bash
# JSON output for agents
$ n8n workflows validate workflow.json --json
{
  "valid": false,
  "source": "workflow.json",
  "errors": [
    {
      "code": "EXPRESSION_MISSING_PREFIX",
      "severity": "error",
      "message": "Expression requires '=' prefix to be evaluated",
      "nodeName": "HTTP Request",
      "path": "nodes[0].parameters.url",
      "context": {
        "value": "{{ $json.endpoint }}",
        "expected": "={{ $json.endpoint }}"
      }
    }
  ],
  "warnings": [],
  "issues": [...]
}
```

#### 2. Skip Expression Validation

```bash
$ n8n workflows validate workflow.json --no-validate-expressions
✓ Workflow is valid (expression validation skipped)
```

#### 3. Autofix Expressions

```bash
# Preview fixes
$ n8n workflows autofix workflow.json --experimental
╔════════════════════════════════════════════╗
║  Workflow Autofix                          ║
╚════════════════════════════════════════════╝

Fixes Available: 3

─────────────────── Expression Format ────────────────────

  ✓ Node "HTTP Request": Added '=' prefix to url
  ✓ Node "Google Sheets": Converted sheetId to resource locator  
  ✓ Node "Set": Added '=' prefix to value

📋 Next: n8n workflows autofix workflow.json --experimental --apply
```

```bash
# Apply fixes
$ n8n workflows autofix workflow.json --experimental --apply --yes
✓ Fixed workflow.json
  - 3 expression format issues fixed
  - Backup saved to ~/.n8n-cli/backups/workflow-1701432000.json
```

#### 4. JSON Output for CI/CD

```bash
$ n8n workflows validate workflow.json --json | jq '.errors[] | select(.code | startswith("EXPRESSION_"))'
{
  "code": "EXPRESSION_MISSING_PREFIX",
  "nodeName": "HTTP Request",
  "path": "nodes[0].parameters.url",
  "message": "Expression requires '=' prefix to be evaluated",
  "context": {
    "value": "{{ $json.endpoint }}",
    "expected": "={{ $json.endpoint }}"
  }
}
```

### Exit Codes

| Scenario | Exit Code |
|----------|-----------|
| Valid workflow, no expression issues | `0` (SUCCESS) |
| Expression format errors found | `1` (GENERAL) |
| Cannot read input file | `66` (NOINPUT) |
| Malformed workflow JSON | `65` (DATAERR) |

### Error Cases Covered

| Pattern | Issue Type | Severity | Exit Code |
|---------|------------|----------|-----------|
| `{{ $json.x }}` without `=` | `missing-prefix` | error | 1 |
| `Hello {{ $json.name }}` without `=` | `missing-prefix` (mixed content) | error | 1 |
| `{{ $json.x }` (unbalanced) | `invalid-rl-structure` | error | 1 |
| `{{ }}` (empty) | `invalid-rl-structure` | error | 1 |
| Resource field without `__rl` | `needs-resource-locator` | error (≥0.8) / warning (≥0.5) | 1 or 0 |

---

## Testing Requirements

### Unit Tests (`src/core/validation/__tests__/`)

```typescript
describe('ExpressionFormatValidator', () => {
  describe('validateAndFix', () => {
    it('detects missing = prefix', () => {
      const result = ExpressionFormatValidator.validateAndFix(
        '{{ $json.value }}',
        'parameters.url',
        { nodeType: 'n8n-nodes-base.httpRequest', nodeName: 'HTTP' }
      );
      expect(result?.issueType).toBe('missing-prefix');
      expect(result?.correctedValue).toBe('={{ $json.value }}');
    });

    it('passes valid expressions', () => {
      const result = ExpressionFormatValidator.validateAndFix(
        '={{ $json.value }}',
        'parameters.url',
        { nodeType: 'n8n-nodes-base.httpRequest', nodeName: 'HTTP' }
      );
      expect(result).toBeNull();
    });

    it('handles mixed content', () => {
      const result = ExpressionFormatValidator.validateAndFix(
        'Hello {{ $json.name }}!',
        'parameters.message',
        { nodeType: 'n8n-nodes-base.slack', nodeName: 'Slack' }
      );
      expect(result?.issueType).toBe('missing-prefix');
      expect(result?.correctedValue).toBe('=Hello {{ $json.name }}!');
    });

    it('suggests resource locator for known fields', () => {
      const result = ExpressionFormatValidator.validateAndFix(
        '{{ $json.id }}',
        'parameters.sheetId',
        { nodeType: 'n8n-nodes-base.googleSheets', nodeName: 'Sheets' }
      );
      expect(result?.issueType).toBe('needs-resource-locator');
      expect(result?.correctedValue).toEqual({
        __rl: true,
        value: '={{ $json.id }}',
        mode: 'expression'
      });
    });
  });

  describe('validateNodeParameters', () => {
    it('traverses nested parameters', () => {
      const params = {
        body: {
          values: [
            { name: 'field1', value: '{{ $json.a }}' },
            { name: 'field2', value: '={{ $json.b }}' }
          ]
        }
      };
      const issues = ExpressionFormatValidator.validateNodeParameters(params, {
        nodeType: 'n8n-nodes-base.httpRequest',
        nodeName: 'HTTP'
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].fieldPath).toBe('body.values[0].value');
    });

    it('handles circular references safely', () => {
      const params: any = { a: {} };
      params.a.self = params.a;
      expect(() => {
        ExpressionFormatValidator.validateNodeParameters(params, {
          nodeType: 'test',
          nodeName: 'Test'
        });
      }).not.toThrow();
    });
  });
});
```

### Integration Tests

```bash
# Test CLI validation with expression errors
$ echo '{"nodes":[{"type":"n8n-nodes-base.set","name":"Set","typeVersion":1,"position":[0,0],"parameters":{"value":"{{ $json.x }}"}}],"connections":{}}' \
  | n8n workflows validate - --json \
  | jq '.issues[] | select(.code | startswith("EXPRESSION_"))'

# Test autofix
$ n8n workflows autofix test-expressions.json --experimental --json \
  | jq '.fixes[] | select(.type == "expression-format")'

# Test skip flag
$ n8n workflows validate workflow.json --no-validate-expressions --json \
  | jq '.valid'
# Should return true even if expressions are malformed
```

---

## Estimated Effort

| Task | Complexity | Files | LOC | Time |
|------|------------|-------|-----|------|
| Create `src/core/validation/` module | Low | 1 | ~10 | 0.5h |
| Port `UniversalExpressionValidator` | Low | 1 | ~150 | 2h |
| Port `ConfidenceScorer` | Low | 1 | ~100 | 1h |
| Port `ExpressionFormatValidator` | Medium | 1 | ~200 | 3h |
| Port expression utilities | Low | 1 | ~60 | 1h |
| Add types to `src/core/types.ts` | Low | 1 | ~30 | 0.5h |
| Integrate into `src/core/validator.ts` | Medium | 1 | ~50 | 2h |
| Add fix to `src/core/fixer.ts` | Medium | 1 | ~80 | 2h |
| Update `src/commands/workflows/validate.ts` | Low | 1 | ~20 | 1h |
| Update `src/commands/workflows/autofix.ts` | Low | 1 | ~10 | 0.5h |
| Register flags in `src/cli.ts` | Low | 1 | ~5 | 0.5h |
| Unit tests | Medium | 1 | ~200 | 3h |
| Integration tests | Low | - | - | 1h |
| **Total** | **Medium** | **~12** | **~915** | **~18h (2.5 days)** |

---

## Notes

### MCP Pattern Complexity Assessment

The MCP implementation is well-structured and directly portable:
- `UniversalExpressionValidator` — **Direct port**, no modifications needed
- `ExpressionFormatValidator` — **Direct port**, remove telemetry hooks if present
- `ConfidenceScorer` — **Simplify slightly**, CLI doesn't need all factor breakdowns

**Verdict:** MCP pattern is appropriate complexity for CLI use case. No "MCP overkill" simplification needed.

### Common AI Agent Errors This Prevents

1. **ChatGPT/Claude expression generation** — AI models frequently output `{{ $json.x }}` without `=`
2. **Template modification** — Users copy templates and forget `=` when modifying expressions
3. **Migration from other tools** — Other automation tools don't require prefix notation

### Future Enhancements

- Integration with LSP for real-time validation in editors
- Expression autocomplete suggestions
- Static analysis of referenced node outputs
- `--profile ai-friendly` mode with extra expression hints
