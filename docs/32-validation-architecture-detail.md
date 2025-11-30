# Validation Architecture Detail

## Overview

Deep-dive into the validation and autofix system - the most complex part of the CLI.

## Validation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION PIPELINE                              │
└─────────────────────────────────────────────────────────────────────────┘

     Input                  Validators                    Output
  ┌─────────┐         ┌─────────────────┐          ┌─────────────┐
  │Workflow │───────▶ │ Structure       │─────────▶│ Errors      │
  │  JSON   │         │ Validator       │          │ Warnings    │
  └─────────┘         └────────┬────────┘          │ Suggestions │
                               │                    └─────────────┘
                               ▼
                      ┌─────────────────┐
                      │ Node            │
                      │ Validator       │
                      └────────┬────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │ Connection      │
                      │ Validator       │
                      └────────┬────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │ Expression      │
                      │ Validator       │
                      └─────────────────┘
```

## Validation Profiles

### Profile Definitions

```typescript
// src/core/validators/profiles.ts
export const VALIDATION_PROFILES = {
  minimal: {
    name: 'minimal',
    description: 'Quick sanity check - required fields only',
    checks: {
      structure: true,
      nodes: false,
      connections: false,
      expressions: false,
    },
    strictness: 'low',
    tokenCost: 200,
  },
  
  runtime: {
    name: 'runtime',
    description: 'Match n8n editor behavior',
    checks: {
      structure: true,
      nodes: true,
      connections: true,
      expressions: false,  // n8n validates at runtime
    },
    strictness: 'medium',
    tokenCost: 800,
  },
  
  'ai-friendly': {
    name: 'ai-friendly',
    description: 'For AI/LLM generated workflows',
    checks: {
      structure: true,
      nodes: true,
      connections: true,
      expressions: true,
    },
    extraChecks: {
      typeVersionLatest: true,     // Warn if not latest version
      credentialPlaceholders: true, // Warn about placeholder creds
      webhookPaths: true,          // Warn about generic paths
    },
    strictness: 'medium-high',
    tokenCost: 1200,
  },
  
  strict: {
    name: 'strict',
    description: 'Production deployment - all checks',
    checks: {
      structure: true,
      nodes: true,
      connections: true,
      expressions: true,
    },
    extraChecks: {
      typeVersionLatest: true,
      credentialPlaceholders: true,
      webhookPaths: true,
      unusedNodes: true,           // Nodes with no connections
      duplicateNames: true,        // Same name used twice
      positionOverlap: true,       // Nodes at same position
    },
    strictness: 'high',
    tokenCost: 1500,
  },
};
```

### Profile Selection Logic

```typescript
export function selectProfile(context: ValidationContext): ValidationProfile {
  // If explicitly specified, use that
  if (context.profile) return VALIDATION_PROFILES[context.profile];
  
  // Auto-detect based on context
  if (context.isAIGenerated) return VALIDATION_PROFILES['ai-friendly'];
  if (context.isProduction) return VALIDATION_PROFILES['strict'];
  if (context.isQuickCheck) return VALIDATION_PROFILES['minimal'];
  
  // Default
  return VALIDATION_PROFILES['runtime'];
}
```

## Structure Validator

```typescript
// src/core/validators/structure.ts

export interface StructureValidationResult {
  valid: boolean;
  errors: StructureError[];
  warnings: StructureWarning[];
  stats: {
    nodeCount: number;
    connectionCount: number;
    hasTrigger: boolean;
  };
}

export function validateStructure(workflow: Workflow): StructureValidationResult {
  const errors: StructureError[] = [];
  const warnings: StructureWarning[] = [];
  
  // Required fields
  if (!workflow.name) {
    errors.push({ code: 'MISSING_NAME', message: 'Workflow name is required' });
  }
  
  if (!Array.isArray(workflow.nodes)) {
    errors.push({ code: 'MISSING_NODES', message: 'Nodes array is required' });
    return { valid: false, errors, warnings, stats: null };
  }
  
  // Check for trigger node
  const triggerNodes = workflow.nodes.filter(n => isTriggerNode(n.type));
  if (triggerNodes.length === 0) {
    warnings.push({ 
      code: 'NO_TRIGGER', 
      message: 'No trigger node found - workflow cannot start automatically' 
    });
  }
  
  // Check for duplicate node names
  const names = workflow.nodes.map(n => n.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  for (const dup of duplicates) {
    errors.push({ 
      code: 'DUPLICATE_NAME', 
      message: `Duplicate node name: "${dup}"` 
    });
  }
  
  // Check node IDs
  for (const node of workflow.nodes) {
    if (!node.id) {
      errors.push({ 
        code: 'MISSING_NODE_ID', 
        message: `Node "${node.name}" is missing an ID`,
        node: node.name,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      nodeCount: workflow.nodes.length,
      connectionCount: countConnections(workflow.connections),
      hasTrigger: triggerNodes.length > 0,
    },
  };
}

function isTriggerNode(type: string): boolean {
  const triggerTypes = [
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.manualTrigger',
    // ... more trigger types
  ];
  return triggerTypes.includes(type) || type.includes('Trigger');
}
```

## Node Validator

```typescript
// src/core/validators/node.ts

export interface NodeValidationResult {
  valid: boolean;
  nodeName: string;
  nodeType: string;
  errors: NodeError[];
  warnings: NodeWarning[];
}

export function validateNode(
  node: WorkflowNode,
  schema: NodeSchema,
  profile: ValidationProfile
): NodeValidationResult {
  const errors: NodeError[] = [];
  const warnings: NodeWarning[] = [];
  
  // Check node type exists
  if (!schema) {
    errors.push({
      code: 'UNKNOWN_NODE_TYPE',
      message: `Unknown node type: ${node.type}`,
      field: 'type',
    });
    return { valid: false, nodeName: node.name, nodeType: node.type, errors, warnings };
  }
  
  // Check typeVersion
  if (node.typeVersion > schema.latestVersion) {
    errors.push({
      code: 'INVALID_TYPE_VERSION',
      message: `Version ${node.typeVersion} does not exist. Latest: ${schema.latestVersion}`,
      field: 'typeVersion',
    });
  }
  
  // Check required parameters
  const requiredParams = getRequiredParams(schema, node.parameters);
  for (const param of requiredParams) {
    if (!(param.name in node.parameters)) {
      errors.push({
        code: 'MISSING_REQUIRED_PARAM',
        message: `Missing required parameter: ${param.name}`,
        field: `parameters.${param.name}`,
      });
    }
  }
  
  // Type-check parameters
  for (const [key, value] of Object.entries(node.parameters)) {
    const paramSchema = schema.properties.find(p => p.name === key);
    if (!paramSchema) {
      warnings.push({
        code: 'UNKNOWN_PARAMETER',
        message: `Unknown parameter: ${key}`,
        field: `parameters.${key}`,
      });
      continue;
    }
    
    const typeError = checkType(value, paramSchema.type);
    if (typeError) {
      errors.push({
        code: 'TYPE_MISMATCH',
        message: `Parameter "${key}": ${typeError}`,
        field: `parameters.${key}`,
      });
    }
  }
  
  // Profile-specific checks
  if (profile.extraChecks?.typeVersionLatest && node.typeVersion < schema.latestVersion) {
    warnings.push({
      code: 'NOT_LATEST_VERSION',
      message: `Using v${node.typeVersion}, latest is v${schema.latestVersion}`,
    });
  }
  
  return {
    valid: errors.length === 0,
    nodeName: node.name,
    nodeType: node.type,
    errors,
    warnings,
  };
}

function getRequiredParams(schema: NodeSchema, currentParams: object): ParamSchema[] {
  return schema.properties.filter(p => {
    // Always required
    if (p.required) return true;
    
    // Conditionally required based on other params
    if (p.displayOptions?.show) {
      return Object.entries(p.displayOptions.show).every(([key, values]) => {
        return values.includes(currentParams[key]);
      });
    }
    
    return false;
  });
}
```

## Expression Validator

```typescript
// src/core/validators/expression.ts

export interface ExpressionValidationResult {
  valid: boolean;
  expression: string;
  errors: ExpressionError[];
}

export function validateExpression(expression: string): ExpressionValidationResult {
  const errors: ExpressionError[] = [];
  
  // Must start with =
  if (!expression.startsWith('=')) {
    errors.push({
      code: 'MISSING_EQUALS',
      message: 'Expression must start with "="',
      position: 0,
      fixable: true,
    });
    // Continue validation with assumed =
    expression = '=' + expression;
  }
  
  // Extract expression content (after =)
  const content = expression.slice(1);
  
  // Check for balanced brackets
  const brackets = { '{': 0, '[': 0, '(': 0 };
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') brackets['{']++;
    if (char === '}') brackets['{']--;
    if (char === '[') brackets['[']++;
    if (char === ']') brackets['[']--;
    if (char === '(') brackets['(']++;
    if (char === ')') brackets['(']--;
    
    if (Object.values(brackets).some(v => v < 0)) {
      errors.push({
        code: 'UNBALANCED_BRACKETS',
        message: `Unbalanced bracket at position ${i}`,
        position: i + 1,
      });
      break;
    }
  }
  
  // Check for valid references
  const refPattern = /\$\{?\$?(\w+)(\.\w+)*\}?/g;
  let match;
  while ((match = refPattern.exec(content))) {
    const ref = match[1];
    if (!isValidReference(ref)) {
      errors.push({
        code: 'INVALID_REFERENCE',
        message: `Invalid reference: ${ref}`,
        position: match.index + 1,
      });
    }
  }
  
  // Check for {{ }} vs ${ } confusion
  if (content.includes('{{') || content.includes('}}')) {
    errors.push({
      code: 'WRONG_TEMPLATE_SYNTAX',
      message: 'Use ${} not {{}} for expressions',
      fixable: true,
    });
  }
  
  return { valid: errors.length === 0, expression, errors };
}

function isValidReference(ref: string): boolean {
  const validRefs = ['json', 'item', 'items', 'node', 'workflow', 'env', 'execution'];
  return validRefs.includes(ref);
}
```

## Autofix Confidence Scoring

```typescript
// src/core/validators/autofix.ts

export interface DetectedFix {
  id: string;
  type: FixType;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;  // 0-100
  description: string;
  node?: string;
  field?: string;
  current: unknown;
  proposed: unknown;
}

export const FIX_CONFIDENCE = {
  'expression-format': {
    // Missing = prefix: Very confident
    base: 95,
    adjustments: {
      hasTemplateVars: 0,     // Confirmed expression
      looksLikeJson: -30,     // Might be intentional JSON string
    },
  },
  
  'typeversion-correction': {
    // Downgrade to existing version
    base: 90,
    adjustments: {
      oneVersionDiff: 0,      // Just one version, safe
      multiVersionDiff: -10,  // Multiple versions, might break
    },
  },
  
  'webhook-missing-path': {
    // Generate unique path
    base: 75,
    adjustments: {
      productionWorkflow: -15, // Might need specific path
      testWorkflow: 0,         // Generic path fine
    },
  },
  
  'error-output-config': {
    // Remove conflicting continueOnFail
    base: 85,
    adjustments: {},
  },
  
  'node-type-correction': {
    // Fix unknown node type
    base: 60,
    adjustments: {
      exactMatch: 30,        // Found exact alternative
      fuzzyMatch: 0,         // Best guess
    },
  },
  
  'typeversion-upgrade': {
    // Smart version upgrade
    base: 70,
    adjustments: {
      noBreakingChanges: 10, // Safe upgrade
      hasBreakingChanges: -20, // Risky
    },
  },
};

export function calculateConfidence(fix: PartialFix, context: FixContext): number {
  const config = FIX_CONFIDENCE[fix.type];
  if (!config) return 50; // Unknown fix type
  
  let score = config.base;
  
  // Apply adjustments
  for (const [condition, adjustment] of Object.entries(config.adjustments)) {
    if (context[condition]) {
      score += adjustment;
    }
  }
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

export function confidenceToLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 85) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}
```

## Autofix Application

```typescript
// src/core/validators/autofix-applier.ts

export interface ApplyResult {
  success: boolean;
  workflow: Workflow;
  applied: DetectedFix[];
  skipped: DetectedFix[];
  failed: Array<{ fix: DetectedFix; error: string }>;
}

export function applyFixes(
  workflow: Workflow,
  fixes: DetectedFix[],
  options: ApplyOptions
): ApplyResult {
  const { confidenceThreshold = 'medium', maxFixes = 50 } = options;
  const thresholdScore = { high: 85, medium: 60, low: 0 }[confidenceThreshold];
  
  // Sort by confidence (highest first)
  const sortedFixes = [...fixes].sort((a, b) => b.confidenceScore - a.confidenceScore);
  
  // Filter by threshold
  const eligibleFixes = sortedFixes.filter(f => f.confidenceScore >= thresholdScore);
  const skipped = sortedFixes.filter(f => f.confidenceScore < thresholdScore);
  
  // Limit fixes
  const toApply = eligibleFixes.slice(0, maxFixes);
  
  // Apply fixes in order
  let result = structuredClone(workflow);
  const applied: DetectedFix[] = [];
  const failed: Array<{ fix: DetectedFix; error: string }> = [];
  
  for (const fix of toApply) {
    try {
      result = applyFix(result, fix);
      applied.push(fix);
    } catch (error) {
      failed.push({ fix, error: error.message });
    }
  }
  
  return {
    success: failed.length === 0,
    workflow: result,
    applied,
    skipped: [...skipped, ...eligibleFixes.slice(maxFixes)],
    failed,
  };
}

function applyFix(workflow: Workflow, fix: DetectedFix): Workflow {
  switch (fix.type) {
    case 'expression-format':
      return applyExpressionFix(workflow, fix);
    case 'typeversion-correction':
      return applyTypeVersionFix(workflow, fix);
    case 'webhook-missing-path':
      return applyWebhookPathFix(workflow, fix);
    // ... other fix types
    default:
      throw new Error(`Unknown fix type: ${fix.type}`);
  }
}
```

## Native n8n Validation Bridge

```typescript
// src/core/validators/native-bridge.ts

/**
 * For future: Bridge to n8n's native validation API
 * This would call n8n's internal validation endpoint if available
 */
export async function validateWithNative(
  client: N8NClient,
  workflow: Workflow
): Promise<NativeValidationResult | null> {
  try {
    // n8n doesn't expose validation API publicly yet
    // This is a placeholder for when/if it becomes available
    
    // Option 1: Use workflow save endpoint in dry-run mode
    // Option 2: Call internal validation endpoint (if exposed)
    // Option 3: Execute workflow with test data
    
    return null; // Not implemented
  } catch {
    return null;
  }
}
```

## Integration Example

```typescript
// Usage in ValidateCommand
async execute(): Promise<number> {
  const workflow = await this.loadWorkflow();
  const profile = VALIDATION_PROFILES[this.profile];
  
  // Run validation pipeline
  const structureResult = validateStructure(workflow);
  
  if (!structureResult.valid) {
    this.outputValidationResult(structureResult);
    return 1;
  }
  
  // Node validation (requires database for schemas)
  const nodeResults: NodeValidationResult[] = [];
  for (const node of workflow.nodes) {
    const schema = await getNodeSchema(node.type);
    nodeResults.push(validateNode(node, schema, profile));
  }
  
  // Connection validation
  const connectionResult = validateConnections(workflow, nodeResults);
  
  // Expression validation (if enabled)
  let expressionResults: ExpressionValidationResult[] = [];
  if (profile.checks.expressions) {
    expressionResults = validateAllExpressions(workflow);
  }
  
  // Combine results
  const combined = combineResults(structureResult, nodeResults, connectionResult, expressionResults);
  
  this.outputValidationResult(combined);
  return combined.valid ? 0 : 1;
}
```
