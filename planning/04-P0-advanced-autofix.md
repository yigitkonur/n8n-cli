# P0: Advanced Autofix Engine

## Business Value

The Advanced Autofix Engine transforms workflow maintenance from a manual, error-prone process into an automated, confidence-based correction system. **Users save 15-30 minutes per workflow** by automatically detecting and fixing common issues like missing expression prefixes, outdated node versions, and malformed webhook configurations. For teams managing 50+ workflows, this translates to **10+ hours saved per week** in debugging and maintenance. The confidence-based approach ensures high-confidence fixes are auto-applied while medium/low confidence changes are flagged for human review, striking the balance between automation and safety.

---

## Current CLI Status

### Implementation State
- **Implemented:** Partial (3 experimental fixes only)
- **Location:** `src/core/fixer.ts:28-194`, `src/commands/workflows/autofix.ts:1-204`
- **Gap Reason:** CLI has only Switch/If node fixes; missing expression validator, node similarity service, version upgrade logic, and breaking change registry that MCP implements

### Current CLI Fixes (3 total)

| Fix ID | Function | Lines | What It Does |
|--------|----------|-------|--------------|
| `empty-options-if-switch` | `fixEmptyOptionsOnConditionalNodes` | `fixer.ts:28-64` | Removes invalid empty `options: {}` from If/Switch node parameters root |
| `switch-v3-rule-conditions-options` | `fixSwitchV3RuleConditionsOptions` | `fixer.ts:66-143` | Adds missing `options` object to Switch v3+ rule conditions with defaults (`caseSensitive`, `leftValue`, `typeValidation`, `version`) |
| `switch-v3-fallback-output-location` | `fixSwitchV3FallbackOutputLocation` | `fixer.ts:145-194` | Moves `fallbackOutput` from `parameters.rules` to `parameters.options` for Switch v3+ |

### Current CLI Command Interface
```bash
# Current limited options
n8n workflows autofix <workflow-id|file>    # Basic fix
n8n workflows autofix <workflow-id> --experimental  # Enable all 3 fixes
n8n workflows autofix <workflow-id> --apply  # Apply fixes to API/file
n8n workflows autofix <workflow-id> --save <file>  # Save to file
```

### What's Missing in CLI
1. **Expression format validation** - No detection of `{{ }}` without `=` prefix
2. **Node type correction** - No typo detection (e.g., `slak` → `slack`)
3. **Webhook path generation** - No UUID generation for missing webhook paths
4. **TypeVersion upgrade** - No proactive version upgrade suggestions
5. **Breaking change detection** - No registry of version breaking changes
6. **Post-update guidance** - No AI-friendly migration instructions
7. **Confidence levels** - All fixes treated equally (no high/medium/low)

---

## MCP Reference Implementation

### Architecture Overview

The MCP autofix engine uses a **pipeline architecture** with specialized services:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WorkflowAutoFixer                                │
│                  (n8n-mcp/src/services/workflow-auto-fixer.ts)       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐   ┌──────────────────┐   ┌────────────────┐   │
│  │ ExpressionFormat │   │ NodeSimilarity   │   │ NodeVersion    │   │
│  │ Validator        │   │ Service          │   │ Service        │   │
│  │ (expression-     │   │ (node-similarity-│   │ (node-version- │   │
│  │  format-         │   │  service.ts)     │   │  service.ts)   │   │
│  │  validator.ts)   │   │                  │   │                │   │
│  └────────┬─────────┘   └────────┬─────────┘   └───────┬────────┘   │
│           │                      │                      │            │
│           ▼                      ▼                      ▼            │
│  ┌──────────────────┐   ┌──────────────────┐   ┌────────────────┐   │
│  │ Universal        │   │ NodeRepository   │   │ BreakingChange │   │
│  │ Expression       │   │ (database/       │   │ Detector       │   │
│  │ Validator        │   │  node-           │   │ (breaking-     │   │
│  │ (universal-      │   │  repository.ts)  │   │  change-       │   │
│  │  expression-     │   │                  │   │  detector.ts)  │   │
│  │  validator.ts)   │   │                  │   │                │   │
│  └──────────────────┘   └──────────────────┘   └───────┬────────┘   │
│                                                         │            │
│                                              ┌──────────▼────────┐   │
│                                              │ NodeMigration     │   │
│                                              │ Service           │   │
│                                              │ (node-migration-  │   │
│                                              │  service.ts)      │   │
│                                              └──────────┬────────┘   │
│                                                         │            │
│                                              ┌──────────▼────────┐   │
│                                              │ PostUpdate        │   │
│                                              │ Validator         │   │
│                                              │ (post-update-     │   │
│                                              │  validator.ts)    │   │
│                                              └───────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Source Files with Line References

| File | Lines | Purpose | Key Functions |
|------|-------|---------|---------------|
| `n8n-mcp/src/services/workflow-auto-fixer.ts` | 1-835 | Core autofix orchestrator | `generateFixes()`, `processExpressionFormatFixes()`, `processNodeTypeFixes()`, `processWebhookPathFixes()`, `processVersionUpgradeFixes()`, `processVersionMigrationFixes()` |
| `n8n-mcp/src/services/expression-format-validator.ts` | 1-340 | Expression `=` prefix validation | `validateAndFix()`, `validateNodeParameters()`, `generateCorrection()` |
| `n8n-mcp/src/services/universal-expression-validator.ts` | 1-286 | 100% reliable expression syntax check | `validateExpressionPrefix()`, `validateExpressionSyntax()`, `getCorrectedValue()` |
| `n8n-mcp/src/services/node-similarity-service.ts` | 1-512 | Typo detection with Levenshtein | `findSimilarNodes()`, `checkCommonMistakes()`, `calculateSimilarityScore()`, `getEditDistance()` |
| `n8n-mcp/src/services/node-version-service.ts` | 1-378 | Version discovery & comparison | `getLatestVersion()`, `analyzeVersion()`, `suggestUpgradePath()`, `compareVersions()` |
| `n8n-mcp/src/services/node-migration-service.ts` | 1-411 | Auto-migration of node configs | `migrateNode()`, `applyMigration()`, `addProperty()`, `removeProperty()`, `renameProperty()` |
| `n8n-mcp/src/services/breaking-change-detector.ts` | 1-322 | Breaking change analysis | `analyzeVersionUpgrade()`, `getRegistryChanges()`, `detectDynamicChanges()`, `generateRecommendations()` |
| `n8n-mcp/src/services/breaking-changes-registry.ts` | 1-316 | Known breaking changes DB | `getBreakingChangesForNode()`, `getAllChangesForNode()`, `getAutoMigratableChanges()` |
| `n8n-mcp/src/services/post-update-validator.ts` | 1-424 | AI-friendly migration reports | `generateGuidance()`, `generateMigrationSteps()`, `documentBehaviorChanges()` |
| `n8n-mcp/src/services/confidence-scorer.ts` | 1-211 | Confidence scoring system | `scoreResourceLocatorRecommendation()`, `getConfidenceLevel()` |

### Key Type Definitions

```typescript
// n8n-mcp/src/services/workflow-auto-fixer.ts:26-34
export type FixConfidenceLevel = 'high' | 'medium' | 'low';
export type FixType =
  | 'expression-format'      // Add missing = prefix
  | 'typeversion-correction' // Fix version exceeding max
  | 'error-output-config'    // Fix onError mismatch
  | 'node-type-correction'   // Fix typos in node types
  | 'webhook-missing-path'   // Generate webhook paths
  | 'typeversion-upgrade'    // Proactive upgrades
  | 'version-migration';     // Handle breaking changes

// n8n-mcp/src/services/workflow-auto-fixer.ts:36-41
export interface AutoFixConfig {
  applyFixes: boolean;           // Actually apply or just report
  fixTypes?: FixType[];          // Which fix types to run
  confidenceThreshold?: FixConfidenceLevel;  // Minimum confidence
  maxFixes?: number;             // Limit fixes applied (default: 50)
}

// n8n-mcp/src/services/workflow-auto-fixer.ts:43-51
export interface FixOperation {
  node: string;                  // Node name or ID
  field: string;                 // Field path (e.g., "parameters.url")
  type: FixType;                 // Which fix type
  before: any;                   // Original value
  after: any;                    // Corrected value
  confidence: FixConfidenceLevel; // How confident we are
  description: string;           // Human-readable explanation
}

// n8n-mcp/src/services/workflow-auto-fixer.ts:53-63
export interface AutoFixResult {
  operations: WorkflowDiffOperation[];  // Diff ops to apply
  fixes: FixOperation[];                // Individual fixes
  summary: string;                      // Human-readable summary
  stats: {
    total: number;
    byType: Record<FixType, number>;
    byConfidence: Record<FixConfidenceLevel, number>;
  };
  postUpdateGuidance?: PostUpdateGuidance[];  // Migration guidance
}

// n8n-mcp/src/services/breaking-changes-registry.ts:14-32
export interface BreakingChange {
  nodeType: string;              // e.g., "n8n-nodes-base.webhook"
  fromVersion: string;           // e.g., "1.0"
  toVersion: string;             // e.g., "2.0"
  propertyName: string;          // e.g., "parameters.path"
  changeType: 'added' | 'removed' | 'renamed' | 'type_changed' | 'requirement_changed' | 'default_changed';
  isBreaking: boolean;
  oldValue?: string;
  newValue?: string;
  migrationHint: string;         // Human instructions
  autoMigratable: boolean;       // Can we auto-fix?
  migrationStrategy?: {
    type: 'add_property' | 'remove_property' | 'rename_property' | 'set_default';
    defaultValue?: any;
    sourceProperty?: string;
    targetProperty?: string;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

// n8n-mcp/src/services/post-update-validator.ts:18-31
export interface PostUpdateGuidance {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  oldVersion: string;
  newVersion: string;
  migrationStatus: 'complete' | 'partial' | 'manual_required';
  requiredActions: RequiredAction[];
  deprecatedProperties: DeprecatedProperty[];
  behaviorChanges: BehaviorChange[];
  migrationSteps: string[];      // Step-by-step instructions
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedTime: string;         // e.g., "5-10 minutes"
}
```

### Data Flow: How MCP Processes Fixes

```
Input: Workflow JSON + ValidationResult + ExpressionFormatIssues
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Create Node Map (name → node, id → node)           │
│  workflow-auto-fixer.ts:130-135                             │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Process         │  │ Process         │  │ Process         │
│ Expression      │  │ TypeVersion     │  │ ErrorOutput     │
│ Format Fixes    │  │ Fixes           │  │ Fixes           │
│ (HIGH conf)     │  │ (MEDIUM conf)   │  │ (MEDIUM conf)   │
│ L:196-260       │  │ L:265-306       │  │ L:311-348       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Process         │  │ Process         │  │ Process Version │
│ NodeType        │  │ Webhook Path    │  │ Upgrade/        │
│ Fixes           │  │ Fixes           │  │ Migration       │
│ (HIGH conf)     │  │ (HIGH conf)     │  │ (HIGH/MED conf) │
│ L:353-398       │  │ L:403-460       │  │ L:671-834       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Filter by Confidence Threshold                     │
│  workflow-auto-fixer.ts:564-595                             │
│  - 'high' → only high confidence                            │
│  - 'medium' → high + medium                                 │
│  - 'low' → all                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Apply maxFixes Limit (default: 50)                 │
│  workflow-auto-fixer.ts:177-178                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
Output: AutoFixResult { operations, fixes, summary, stats, postUpdateGuidance }
```

---

## CLI Integration Path

### Phase 1: Core Types and Interfaces

**Files to Create:**

```
src/core/autofix/
├── types.ts                    # Fix types, interfaces, configs
├── index.ts                    # Module exports
└── engine.ts                   # Main AutoFixEngine class
```

**`src/core/autofix/types.ts`** - Copy from MCP with CLI adaptations:

```typescript
// Adapted from n8n-mcp/src/services/workflow-auto-fixer.ts:26-63
export type FixConfidenceLevel = 'high' | 'medium' | 'low';

export type FixType =
  | 'expression-format'
  | 'typeversion-correction'
  | 'error-output-config'
  | 'node-type-correction'
  | 'webhook-missing-path'
  | 'typeversion-upgrade'
  | 'version-migration'
  // CLI-specific (existing)
  | 'switch-empty-options'
  | 'switch-rule-conditions'
  | 'switch-fallback-location';

export interface AutoFixConfig {
  fixTypes?: FixType[];
  confidenceThreshold?: FixConfidenceLevel;
  maxFixes?: number;
  dryRun?: boolean;  // CLI-specific: preview mode
}

export interface FixOperation {
  node: string;
  field: string;
  type: FixType;
  before: unknown;
  after: unknown;
  confidence: FixConfidenceLevel;
  description: string;
}

export interface AutoFixResult {
  fixes: FixOperation[];
  summary: string;
  stats: {
    total: number;
    byType: Partial<Record<FixType, number>>;
    byConfidence: Record<FixConfidenceLevel, number>;
  };
}
```

### Phase 2: Expression Format Validator

**Files to Create:**

```
src/core/autofix/
├── expression-validator.ts     # Port of universal-expression-validator.ts
└── expression-format.ts        # Port of expression-format-validator.ts
```

**Key Implementation from MCP:**

```typescript
// Port from n8n-mcp/src/services/universal-expression-validator.ts:20-21
private static readonly EXPRESSION_PATTERN = /\{\{[\s\S]+?\}\}/;
private static readonly EXPRESSION_PREFIX = '=';

// Port from n8n-mcp/src/services/universal-expression-validator.ts:37-91
static validateExpressionPrefix(value: any): UniversalValidationResult {
  if (typeof value !== 'string') {
    return { isValid: true, hasExpression: false, needsPrefix: false, ... };
  }

  const hasExpression = this.EXPRESSION_PATTERN.test(value);
  if (!hasExpression) {
    return { isValid: true, hasExpression: false, needsPrefix: false, ... };
  }

  const hasPrefix = value.startsWith(this.EXPRESSION_PREFIX);
  if (!hasPrefix) {
    return {
      isValid: false,
      hasExpression: true,
      needsPrefix: true,
      suggestion: `${this.EXPRESSION_PREFIX}${value}`,
      explanation: 'Expression requires = prefix to be evaluated'
    };
  }

  return { isValid: true, hasExpression: true, needsPrefix: false, ... };
}
```

### Phase 3: Node Type Correction

**Leverage Existing CLI Infrastructure:**

The CLI already has Levenshtein distance in `src/core/db/nodes.ts:429-457`:

```typescript
// CLI already has this in src/core/db/nodes.ts:429-457
private levenshteinDistance(a: string, b: string): number {
  // ... implementation exists
}
```

**Create adapter for MCP-style NodeSimilarityService:**

```
src/core/autofix/
└── node-similarity.ts          # Wrap existing NodeRepository methods
```

**Key patterns from MCP to port:**

```typescript
// From n8n-mcp/src/services/node-similarity-service.ts:30-34
private static readonly SCORING_THRESHOLD = 50;
private static readonly TYPO_EDIT_DISTANCE = 2;
private static readonly SHORT_SEARCH_LENGTH = 5;
private static readonly CACHE_DURATION_MS = 5 * 60 * 1000;
private static readonly AUTO_FIX_CONFIDENCE = 0.9;  // 90% for auto-fix

// From n8n-mcp/src/services/node-similarity-service.ts:51-96
private initializeCommonMistakes(): Map<string, CommonMistakePattern[]> {
  const patterns = new Map();
  patterns.set('case_variations', [
    { pattern: 'httprequest', suggestion: 'nodes-base.httpRequest', confidence: 0.95 },
    { pattern: 'slack', suggestion: 'nodes-base.slack', confidence: 0.9 },
    // ...
  ]);
  patterns.set('typos', [
    { pattern: 'slak', suggestion: 'nodes-base.slack', confidence: 0.8 },
    { pattern: 'webook', suggestion: 'nodes-base.webhook', confidence: 0.8 },
    // ...
  ]);
  return patterns;
}
```

### Phase 4: Version Services

**Files to Create:**

```
src/core/autofix/
├── breaking-changes-registry.ts  # Port registry data
├── version-service.ts            # Version comparison logic
└── migration-service.ts          # Auto-migration strategies
```

**Breaking Changes Registry (from MCP):**

```typescript
// Port from n8n-mcp/src/services/breaking-changes-registry.ts:37-189
export const BREAKING_CHANGES_REGISTRY: BreakingChange[] = [
  // Execute Workflow Node v1.0 → v1.1
  {
    nodeType: 'n8n-nodes-base.executeWorkflow',
    fromVersion: '1.0',
    toVersion: '1.1',
    propertyName: 'parameters.inputFieldMapping',
    changeType: 'added',
    isBreaking: true,
    migrationHint: 'v1.1+ requires explicit field mapping...',
    autoMigratable: true,
    migrationStrategy: { type: 'add_property', defaultValue: { mappings: [] } },
    severity: 'HIGH'
  },
  // Webhook Node v2.0 → v2.1
  {
    nodeType: 'n8n-nodes-base.webhook',
    fromVersion: '2.0',
    toVersion: '2.1',
    propertyName: 'webhookId',
    changeType: 'added',
    isBreaking: true,
    migrationHint: 'v2.1+ requires webhookId for persistence...',
    autoMigratable: true,
    migrationStrategy: { type: 'add_property', defaultValue: null }, // Generate UUID
    severity: 'HIGH'
  },
  // ... more entries
];
```

### Phase 5: Update Command Handler

**Modify `src/commands/workflows/autofix.ts`:**

```typescript
// Enhanced options interface
interface AutofixOptions {
  file?: string;
  apply?: boolean;
  experimental?: boolean;  // Keep for backward compat
  save?: string;
  json?: boolean;
  force?: boolean;
  yes?: boolean;
  backup?: boolean;
  // NEW OPTIONS:
  fixTypes?: string;       // Comma-separated fix types
  confidence?: string;     // 'high' | 'medium' | 'low'
  maxFixes?: number;
  preview?: boolean;       // Alias for !apply
}

// Enhanced command registration (in parent file)
.option('--fix-types <types>', 'Comma-separated fix types to apply')
.option('--confidence <level>', 'Minimum confidence level (high, medium, low)')
.option('--max-fixes <n>', 'Maximum number of fixes to apply', parseInt)
.option('--preview', 'Show fixes without applying (alias for no --apply)')
```

### Phase 6: Files Summary

| New File | Lines (est.) | Purpose | Port From |
|----------|--------------|---------|-----------|
| `src/core/autofix/types.ts` | ~80 | Type definitions | `workflow-auto-fixer.ts:26-63` |
| `src/core/autofix/engine.ts` | ~300 | Main orchestrator | `workflow-auto-fixer.ts:94-191` |
| `src/core/autofix/expression-validator.ts` | ~150 | Expression prefix check | `universal-expression-validator.ts` |
| `src/core/autofix/expression-format.ts` | ~200 | Expression format fixes | `expression-format-validator.ts` |
| `src/core/autofix/node-similarity.ts` | ~100 | Typo detection wrapper | `node-similarity-service.ts` |
| `src/core/autofix/breaking-changes-registry.ts` | ~200 | Known breaking changes | `breaking-changes-registry.ts` |
| `src/core/autofix/version-service.ts` | ~150 | Version comparison | `node-version-service.ts` |
| `src/core/autofix/migration-service.ts` | ~200 | Auto-migration logic | `node-migration-service.ts` |
| `src/core/autofix/index.ts` | ~20 | Module exports | N/A |
| **Total** | **~1400** | | |

---

## Fix Type Implementation Details

### 1. Expression Format Fix (HIGH Confidence)

**Detection Logic (MCP reference: `universal-expression-validator.ts:37-91`):**
```typescript
// Pattern: {{ $json.field }} without = prefix
const EXPRESSION_PATTERN = /\{\{[\s\S]+?\}\}/;

function detectMissingPrefix(value: string): boolean {
  return EXPRESSION_PATTERN.test(value) && !value.startsWith('=');
}
```

**Fix Application:**
```typescript
// Before: "{{ $json.url }}"
// After:  "={{ $json.url }}"
const correctedValue = `=${value}`;
```

**CLI Integration Point:** `src/core/autofix/expression-format.ts`

**Why Not Implemented Yet:**
- CLI lacks recursive parameter traversal for expression detection
- No integration with validation pipeline to receive format issues
- Missing resource locator format handling for advanced nodes

### 2. TypeVersion Correction (MEDIUM Confidence)

**Detection Logic (MCP reference: `workflow-auto-fixer.ts:265-306`):**
```typescript
// Detect from validation error message pattern
const versionMatch = error.message.match(
  /typeVersion (\d+(?:\.\d+)?) exceeds maximum supported version (\d+(?:\.\d+)?)/
);
if (versionMatch) {
  const currentVersion = parseFloat(versionMatch[1]);
  const maxVersion = parseFloat(versionMatch[2]);
  // Fix: set typeVersion = maxVersion
}
```

**CLI Integration Point:** `src/core/autofix/engine.ts` (process validation errors)

**Why Not Implemented Yet:**
- CLI validator doesn't check typeVersion against database max versions
- Requires node database queries during validation
- Medium confidence = needs user review before auto-apply

### 3. Error Output Config (MEDIUM Confidence)

**Detection Logic (MCP reference: `workflow-auto-fixer.ts:311-348`):**
```typescript
// Detect: onError: 'continueErrorOutput' but no error connections
if (error.message.includes('onError: \'continueErrorOutput\'') &&
    error.message.includes('no error output connections')) {
  // Fix: Remove onError setting
  fixes.push({
    node: nodeName,
    field: 'onError',
    before: 'continueErrorOutput',
    after: undefined,  // Remove the property
    confidence: 'medium'
  });
}
```

**CLI Integration Point:** `src/core/autofix/engine.ts`

**Why Not Implemented Yet:**
- Requires connection analysis to detect error output presence
- CLI validator doesn't currently check onError/connection consistency

### 4. Node Type Correction (HIGH Confidence, 90%+ match)

**Detection Logic (MCP reference: `node-similarity-service.ts:124-165`):**
```typescript
async findSimilarNodes(invalidType: string, limit: number = 5): Promise<NodeSuggestion[]> {
  // 1. Check common mistakes first
  const mistakeSuggestion = this.checkCommonMistakes(invalidType);
  if (mistakeSuggestion) suggestions.push(mistakeSuggestion);

  // 2. Calculate similarity scores
  const allNodes = await this.getCachedNodes();
  const scores = allNodes.map(node => ({
    node,
    score: this.calculateSimilarityScore(invalidType, node)
  }));

  // 3. Only suggest if >= 50% similarity, auto-fix if >= 90%
  for (const { node, score } of scores) {
    if (score.totalScore >= 50) {
      suggestions.push(this.createSuggestion(node, score));
    }
  }
  return suggestions;
}
```

**CLI Integration Point:**
- Leverage existing `src/core/db/nodes.ts:429-457` Levenshtein distance
- Create wrapper in `src/core/autofix/node-similarity.ts`

**Why Not Implemented Yet:**
- CLI has Levenshtein but no scoring system combining multiple factors
- Missing common typo registry (`slak` → `slack`, `webook` → `webhook`)
- No integration between validation errors and similarity suggestions

### 5. Webhook Path Fix (HIGH Confidence)

**Detection Logic (MCP reference: `workflow-auto-fixer.ts:403-460`):**
```typescript
// Detect: Webhook node missing path
if (error.message === 'Webhook path is required') {
  const node = nodeMap.get(nodeName);
  if (node?.type?.includes('webhook')) {
    const webhookId = crypto.randomUUID();

    fixes.push({
      node: nodeName,
      field: 'path',
      before: undefined,
      after: webhookId,
      confidence: 'high',
      description: `Generated webhook path: ${webhookId}`
    });

    // Also set webhookId and upgrade typeVersion if needed
    const needsVersionUpdate = (node.typeVersion || 1) < 2.1;
    if (needsVersionUpdate) {
      // Also upgrade to 2.1
    }
  }
}
```

**CLI Integration Point:** `src/core/autofix/engine.ts`

**Why Not Implemented Yet:**
- CLI validator doesn't check for missing webhook paths
- Need to import `crypto.randomUUID()` for UUID generation
- Requires understanding of webhook node version requirements

### 6. TypeVersion Upgrade (HIGH/MEDIUM Confidence)

**Detection Logic (MCP reference: `workflow-auto-fixer.ts:671-748`):**
```typescript
async processVersionUpgradeFixes(workflow, nodeMap, operations, fixes, guidance) {
  for (const node of workflow.nodes) {
    const currentVersion = node.typeVersion.toString();
    const analysis = this.versionService.analyzeVersion(node.type, currentVersion);

    if (!analysis.isOutdated || !analysis.recommendUpgrade) continue;
    if (analysis.confidence === 'LOW') continue;

    const migrationResult = await this.migrationService.migrateNode(
      node, currentVersion, analysis.latestVersion
    );

    fixes.push({
      node: node.name,
      field: 'typeVersion',
      type: 'typeversion-upgrade',
      before: currentVersion,
      after: analysis.latestVersion,
      confidence: analysis.hasBreakingChanges ? 'medium' : 'high',
      description: `Upgrade to v${analysis.latestVersion}. ${analysis.reason}`
    });
  }
}
```

**CLI Integration Point:** `src/core/autofix/version-service.ts`

**Why Not Implemented Yet:**
- CLI has no version comparison service
- Requires node_versions table in database (currently only nodes table)
- Breaking change detection requires registry integration

### 7. Version Migration (MEDIUM/LOW Confidence)

**Detection Logic (MCP reference: `workflow-auto-fixer.ts:754-834`):**
```typescript
// Handle migrations with breaking changes that need manual review
async processVersionMigrationFixes(workflow, nodeMap, operations, fixes, guidance) {
  for (const node of workflow.nodes) {
    const hasBreaking = this.breakingChangeDetector.hasBreakingChanges(
      node.type, currentVersion, latestVersion
    );

    if (!hasBreaking) continue; // Already handled by typeversion-upgrade

    const analysis = await this.breakingChangeDetector.analyzeVersionUpgrade(
      node.type, currentVersion, latestVersion
    );

    // Only proceed if there are non-auto-migratable changes
    if (analysis.autoMigratableCount === analysis.changes.length) continue;

    // Generate guidance for manual migration
    const guidance = await this.postUpdateValidator.generateGuidance(...);

    fixes.push({
      node: node.name,
      field: 'typeVersion',
      type: 'version-migration',
      confidence: guidance.confidence === 'HIGH' ? 'medium' : 'low',
      description: `Migration required: ${analysis.manualRequiredCount} manual actions`
    });
  }
}
```

**CLI Integration Point:** `src/core/autofix/migration-service.ts`

**Why Not Implemented Yet:**
- Requires breaking changes registry (needs to be ported)
- Post-update guidance generation is complex
- Low confidence = primarily informational, not auto-applied

---

## Command Interface Enhancement

### Current vs Enhanced

```bash
# CURRENT (limited)
n8n workflows autofix <id>
n8n workflows autofix <id> --experimental
n8n workflows autofix <id> --apply
n8n workflows autofix <id> --save output.json

# ENHANCED (full feature set)
n8n workflows autofix <workflow>
n8n workflows autofix <workflow> --fix-types expression-format,webhook-missing-path
n8n workflows autofix <workflow> --confidence high      # Only high-confidence
n8n workflows autofix <workflow> --confidence medium    # High + medium
n8n workflows autofix <workflow> --max-fixes 10
n8n workflows autofix <workflow> --preview              # Show without applying
n8n workflows autofix <workflow> --apply                # Apply to API/file
n8n workflows autofix <workflow> --json                 # Machine-readable
n8n workflows autofix <workflow> --no-backup            # Skip backup
```

### Output Format

```
╔═══════════════════════════════════════════════════════════════╗
║ 🔧 Autofix Results                                             ║
╠═══════════════════════════════════════════════════════════════╣
║ Workflow: My Workflow (abc-123)                                ║
║ Fixes Found: 5 (3 high, 2 medium confidence)                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║ ✓ HIGH CONFIDENCE (safe to auto-apply):                        ║
║                                                                ║
║   [expression-format] "HTTP Request" node                      ║
║   └─ parameters.url: "{{$json.url}}" → "={{ $json.url }}"     ║
║                                                                ║
║   [webhook-missing-path] "Webhook" node                        ║
║   └─ parameters.path: (missing) → "abc123-def456"              ║
║   └─ webhookId: (missing) → "abc123-def456"                    ║
║   └─ typeVersion: 1 → 2.1                                      ║
║                                                                ║
║   [node-type-correction] "Slak" node                           ║
║   └─ type: "n8n-nodes-base.slak" → "n8n-nodes-base.slack"     ║
║   └─ 95% confidence (typo correction)                          ║
║                                                                ║
║ ? MEDIUM CONFIDENCE (review recommended):                      ║
║                                                                ║
║   [typeversion-upgrade] "If" node                              ║
║   └─ typeVersion: 1 → 2                                        ║
║   ⚠ Breaking: conditions parameter structure changed           ║
║                                                                ║
║   [error-output-config] "HTTP Request" node                    ║
║   └─ Removed onError: 'continueErrorOutput'                    ║
║   └─ Reason: No error output connections detected              ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝

Summary: 5 fixes available (3 high, 2 medium confidence)

Next Actions:
  n8n workflows autofix abc-123 --apply              # Apply all fixes
  n8n workflows autofix abc-123 --apply --confidence high  # Apply only high
  n8n workflows validate abc-123                     # Verify after fixing
```

---

## Dependencies

### Required Before This Feature

| Dependency | Planning Doc | Why Needed |
|------------|--------------|------------|
| Node Database with Versions | 08-P1-node-version-service.md | Version comparison, max version lookup |
| Expression Validator | (new, derived from MCP) | Detect missing `=` prefix |
| Workflow Diff Engine | 01-P0-workflow-diff-engine.md | Apply fixes as diff operations |

### Features That Depend On This

| Feature | Planning Doc | Why Dependent |
|---------|--------------|---------------|
| Workflow Versioning | 02-P0-workflow-versioning.md | Autofix before version save |
| Template Deploy | 03-P0-template-deploy.md | Autofix templates before deploy |
| Bulk Operations | (existing) | Autofix across multiple workflows |

---

## Testing Requirements

### Unit Tests

```typescript
// src/core/autofix/__tests__/expression-validator.test.ts
describe('ExpressionValidator', () => {
  it('detects missing = prefix', () => {
    const result = validateExpressionPrefix('{{ $json.url }}');
    expect(result.isValid).toBe(false);
    expect(result.needsPrefix).toBe(true);
    expect(result.suggestion).toBe('={{ $json.url }}');
  });

  it('passes valid expressions', () => {
    const result = validateExpressionPrefix('={{ $json.url }}');
    expect(result.isValid).toBe(true);
  });

  it('ignores non-expression strings', () => {
    const result = validateExpressionPrefix('hello world');
    expect(result.isValid).toBe(true);
    expect(result.hasExpression).toBe(false);
  });
});

// src/core/autofix/__tests__/node-similarity.test.ts
describe('NodeSimilarity', () => {
  it('suggests slack for slak typo', async () => {
    const suggestions = await findSimilarNodes('n8n-nodes-base.slak');
    expect(suggestions[0].nodeType).toContain('slack');
    expect(suggestions[0].confidence).toBeGreaterThan(0.8);
  });

  it('returns 90%+ confidence for auto-fixable typos', async () => {
    const suggestions = await findSimilarNodes('webook');
    const autoFixable = suggestions.filter(s => s.confidence >= 0.9);
    expect(autoFixable.length).toBeGreaterThan(0);
  });
});

// src/core/autofix/__tests__/engine.test.ts
describe('AutoFixEngine', () => {
  it('filters fixes by confidence threshold', async () => {
    const result = await engine.generateFixes(workflow, validationResult, {
      confidenceThreshold: 'high'
    });
    expect(result.fixes.every(f => f.confidence === 'high')).toBe(true);
  });

  it('respects maxFixes limit', async () => {
    const result = await engine.generateFixes(workflow, validationResult, {
      maxFixes: 3
    });
    expect(result.fixes.length).toBeLessThanOrEqual(3);
  });

  it('generates correct statistics', async () => {
    const result = await engine.generateFixes(workflow, validationResult);
    expect(result.stats.total).toBe(result.fixes.length);
    expect(Object.values(result.stats.byConfidence).reduce((a, b) => a + b, 0))
      .toBe(result.stats.total);
  });
});
```

### Integration Tests

```typescript
// src/commands/workflows/__tests__/autofix.integration.test.ts
describe('workflows autofix command', () => {
  it('preview mode shows fixes without applying', async () => {
    await runCommand('workflows', 'autofix', workflowId, '--preview');
    // Verify workflow unchanged
    const workflow = await api.getWorkflow(workflowId);
    expect(workflow).toEqual(originalWorkflow);
  });

  it('apply mode updates workflow', async () => {
    await runCommand('workflows', 'autofix', workflowId, '--apply', '--yes');
    const workflow = await api.getWorkflow(workflowId);
    expect(workflow).not.toEqual(originalWorkflow);
  });

  it('respects --fix-types filter', async () => {
    const result = await runCommand('workflows', 'autofix', workflowId,
      '--fix-types', 'expression-format', '--json');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.fixes.every(f => f.type === 'expression-format')).toBe(true);
  });

  it('creates backup before apply by default', async () => {
    await runCommand('workflows', 'autofix', workflowId, '--apply', '--yes');
    // Verify backup file exists
    expect(fs.existsSync(`./backups/workflow-${workflowId}-*.json`)).toBe(true);
  });
});
```

---

## Acceptance Criteria

### Functional
- [ ] Command runs: `n8n workflows autofix <workflow>`
- [ ] Supports file input: `n8n workflows autofix ./workflow.json`
- [ ] Supports API input: `n8n workflows autofix abc-123`
- [ ] `--preview` shows fixes without applying
- [ ] `--apply` applies fixes with confirmation
- [ ] `--apply --yes` applies without confirmation
- [ ] `--confidence high|medium|low` filters by confidence
- [ ] `--fix-types <types>` filters by fix type
- [ ] `--max-fixes <n>` limits fixes applied
- [ ] `--json` outputs machine-readable format
- [ ] Backup created before apply (unless `--no-backup`)

### Fix Types Implemented
- [ ] `expression-format`: Detects and fixes missing `=` prefix
- [ ] `typeversion-correction`: Fixes version exceeding max
- [ ] `error-output-config`: Removes invalid onError settings
- [ ] `node-type-correction`: Suggests fixes for typos (90%+ confidence)
- [ ] `webhook-missing-path`: Generates UUID paths for webhooks
- [ ] `typeversion-upgrade`: Suggests version upgrades
- [ ] `version-migration`: Handles breaking change migrations

### Output
- [ ] Table format shows fixes grouped by confidence
- [ ] JSON format includes all fix details
- [ ] Summary shows counts by type and confidence
- [ ] Next actions suggest follow-up commands

### Edge Cases
- [ ] Handles empty workflows gracefully
- [ ] Handles workflows with no issues
- [ ] Handles workflows with 100+ issues (respects maxFixes)
- [ ] Handles circular references in parameters
- [ ] Handles malformed JSON input

---

## Estimated Effort

| Phase | Files | LOC | Time |
|-------|-------|-----|------|
| Phase 1: Types & Interfaces | 2 | ~100 | 0.5 day |
| Phase 2: Expression Validator | 2 | ~350 | 1 day |
| Phase 3: Node Similarity | 1 | ~100 | 0.5 day |
| Phase 4: Version Services | 3 | ~550 | 1.5 days |
| Phase 5: Engine & Command | 2 | ~300 | 1 day |
| Phase 6: Tests | 3 | ~300 | 0.5 day |
| **Total** | **13** | **~1700** | **5 days** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| False positive fixes damage workflows | Confidence levels + `--preview` default + backup |
| Breaking changes registry incomplete | Start with MCP's registry, add incrementally |
| Performance with large workflows | Cache node lookups, limit parameter depth |
| Complex expression edge cases | Use universal validator for 100% reliable base detection |

---

## CLI Architecture Overview

### Command Structure Pattern

The CLI follows a consistent `n8n <resource> <action> [args] [options]` pattern:

```
n8n <resource> <action> [args] [options]
 │      │         │       │       │
 │      │         │       │       └── --json, --save, --force, etc.
 │      │         │       └────────── <id>, <file>, <query>
 │      │         └────────────────── list, get, create, update, delete
 │      └──────────────────────────── workflows, nodes, credentials, etc.
 └─────────────────────────────────── CLI entry point
```

### Entry Point & Routing

| File | Purpose |
|------|---------|
| `src/cli.ts` | Main entry point, Commander.js program setup, global options registration |
| `src/index.ts` | Library exports for programmatic usage |
| `src/commands/<domain>/index.ts` | Domain command group registration (e.g., `workflows`, `auth`) |
| `src/commands/<domain>/<action>.ts` | Individual action handlers |

**Routing Flow:**
```
src/cli.ts
    ├── Registers global options (-v, -q, --json, --profile)
    ├── Loads commands from src/commands/*/
    │   ├── workflows/index.ts → registers workflows subcommands
    │   │   ├── list.ts, get.ts, validate.ts, autofix.ts, ...
    │   ├── nodes/index.ts → registers nodes subcommands
    │   │   ├── list.ts, search.ts, show.ts, categories.ts, validate.ts
    │   └── ... (auth, credentials, executions, tags, variables, templates)
    └── Executes matched command with parsed options
```

### Shared Modules

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/core/api/` | `client.ts` | n8n REST API client (auth, request handling, pagination) |
| `src/core/config/` | `loader.ts` | Config file loading (~/.n8nrc, profiles, env vars) |
| `src/core/db/` | `adapter.ts`, `nodes.ts` | SQLite node database (800+ nodes bundled) |
| `src/core/formatters/` | `table.ts`, `json.ts`, `tree.ts`, `summary.ts`, `header.ts`, `theme.ts`, `next-actions.ts`, `jq-recipes.ts` | Output formatting (human/JSON) |
| `src/core/` | `validator.ts`, `sanitizer.ts`, `fixer.ts` | Workflow validation, sanitization, autofix |
| `src/utils/` | `output.ts`, `prompts.ts`, `errors.ts`, `exit-codes.ts`, `backup.ts` | Shared utilities |
| `src/types/` | `config.ts`, `global-options.ts`, `n8n-api.ts`, `workflow-diff.ts` | TypeScript type definitions |

### Global Options (all commands)

| Option | Type | Description |
|--------|------|-------------|
| `-V, --version` | flag | Output version number |
| `-v, --verbose` | flag | Enable debug output |
| `-q, --quiet` | flag | Suppress non-essential output |
| `--no-color` | flag | Disable colored output |
| `--profile <name>` | string | Use specific configuration profile |
| `--json` | flag | Machine-readable JSON output |
| `-h, --help` | flag | Display help |

### Common Option Patterns

| Pattern | Options | Used In |
|---------|---------|---------|
| **Save output** | `-s, --save <path>` | Most list/get commands |
| **Limit results** | `-l, --limit <n>` | All list commands |
| **Pagination** | `--cursor <cursor>` | API-backed list commands |
| **Confirmation bypass** | `--force, --yes` | Delete, update, bulk operations |
| **Dry run** | `--dry-run` | Create, import, update, autofix |
| **Input file** | `-f, --file <path>` | Create, update, validate |
| **Backup skip** | `--no-backup` | Delete, update operations |

---

## CLI Commands Reference

### Complete Command-to-File Mapping

#### `workflows` Commands

| Command | Syntax | Implementation File | Core Dependencies |
|---------|--------|---------------------|-------------------|
| `workflows list` | `n8n workflows list [-a] [-t tags] [-l n] [--cursor] [-s path] [--json]` | `src/commands/workflows/list.ts` | `src/core/api/client.ts` |
| `workflows get` | `n8n workflows get <id> [-m mode] [-s path] [--json]` | `src/commands/workflows/get.ts` | `src/core/api/client.ts` |
| `workflows validate` | `n8n workflows validate [idOrFile] [-f path] [--profile] [--repair] [--fix] [-s path] [--json]` | `src/commands/workflows/validate.ts` | `src/core/validator.ts`, `src/core/sanitizer.ts`, `src/core/fixer.ts` |
| `workflows create` | `n8n workflows create [-f path] [-n name] [--dry-run] [--json]` | `src/commands/workflows/create.ts` | `src/core/api/client.ts` |
| `workflows import` | `n8n workflows import <file> [-n name] [--dry-run] [--activate] [--json]` | `src/commands/workflows/import.ts` | `src/core/api/client.ts`, `src/core/validator.ts` |
| `workflows export` | `n8n workflows export <id> [-o path] [--full] [--json]` | `src/commands/workflows/export.ts` | `src/core/api/client.ts` |
| `workflows update` | `n8n workflows update <id> [-f path] [-o ops] [-n name] [--activate] [--deactivate] [--force] [--no-backup] [--json]` | `src/commands/workflows/update.ts` | `src/core/api/client.ts`, `src/utils/backup.ts` |
| `workflows bulk` | `n8n workflows activate/deactivate/delete [--ids] [--all] [--force] [--no-backup] [--json]` | `src/commands/workflows/bulk.ts` | `src/core/api/client.ts`, `src/utils/backup.ts`, `src/utils/prompts.ts` |
| `workflows trigger` | `n8n workflows trigger <webhookUrl> [-d data] [-m method] [--json]` | `src/commands/workflows/trigger.ts` | `src/core/api/client.ts` |
| `workflows tags` | `n8n workflows tags <id> [--set tagIds] [--force] [--json]` | `src/commands/workflows/tags.ts` | `src/core/api/client.ts` |
| `workflows autofix` | `n8n workflows autofix <id> [--dry-run] [--confidence level] [-s path] [--apply] [--force] [--no-backup] [--json]` | `src/commands/workflows/autofix.ts` | `src/core/fixer.ts`, `src/core/validator.ts`, `src/utils/backup.ts` |

#### `nodes` Commands (Offline)

| Command | Syntax | Implementation File | Core Dependencies |
|---------|--------|---------------------|-------------------|
| `nodes list` | `n8n nodes list [--by-category] [-c cat] [-s query] [-l n] [--compact] [--save path] [--json]` | `src/commands/nodes/list.ts` | `src/core/db/nodes.ts` |
| `nodes search` | `n8n nodes search <query> [-m mode] [-l n] [-s path] [--json]` | `src/commands/nodes/search.ts` | `src/core/db/nodes.ts` |
| `nodes show` | `n8n nodes show <nodeType> [--schema] [--minimal] [--examples] [-m mode] [-d level] [-s path] [--json]` | `src/commands/nodes/show.ts` | `src/core/db/nodes.ts` |
| `nodes categories` | `n8n nodes categories [--detailed] [-s path] [--json]` | `src/commands/nodes/categories.ts` | `src/core/db/nodes.ts` |
| `nodes validate` | `n8n nodes validate <nodeType> [-c config] [--profile] [--json]` | `src/commands/nodes/validate.ts` | `src/core/db/nodes.ts`, `src/core/n8n-native-validator.ts` |

#### `credentials` Commands

| Command | Syntax | Implementation File | Core Dependencies |
|---------|--------|---------------------|-------------------|
| `credentials list` | `n8n credentials list [-l n] [--cursor] [-s path] [--json]` | `src/commands/credentials/list.ts` | `src/core/api/client.ts` |
| `credentials create` | `n8n credentials create -t type -n name [-d data] [--json]` | `src/commands/credentials/create.ts` | `src/core/api/client.ts` |
| `credentials delete` | `n8n credentials delete <id> [--force] [--json]` | `src/commands/credentials/delete.ts` | `src/core/api/client.ts` |
| `credentials schema` | `n8n credentials schema <typeName> [-s path] [--json]` | `src/commands/credentials/schema.ts` | `src/core/api/client.ts` |
| `credentials types` | `n8n credentials types [--by-auth] [-s query] [-l n] [--save path] [--json]` | `src/commands/credentials/types.ts` | `src/core/db/nodes.ts` (offline) |
| `credentials show-type` | `n8n credentials show-type <typeName> [-s path] [--json]` | `src/commands/credentials/type-show.ts` | `src/core/db/nodes.ts` |

#### `executions` Commands

| Command | Syntax | Implementation File | Core Dependencies |
|---------|--------|---------------------|-------------------|
| `executions list` | `n8n executions list [-w id] [--status] [-l n] [--cursor] [-s path] [--json]` | `src/commands/executions/list.ts` | `src/core/api/client.ts` |
| `executions get` | `n8n executions get <id> [-m mode] [-s path] [--json]` | `src/commands/executions/get.ts` | `src/core/api/client.ts` |
| `executions retry` | `n8n executions retry <id> [--load-latest] [--json]` | `src/commands/executions/retry.ts` | `src/core/api/client.ts` |
| `executions delete` | `n8n executions delete <id> [--force] [--json]` | `src/commands/executions/delete.ts` | `src/core/api/client.ts` |

#### `tags` Commands

| Command | Syntax | Implementation File | Core Dependencies |
|---------|--------|---------------------|-------------------|
| `tags list` | `n8n tags list [-l n] [--cursor] [-s path] [--json]` | `src/commands/tags/list.ts` | `src/core/api/client.ts` |
| `tags get` | `n8n tags get <id> [-s path] [--json]` | `src/commands/tags/get.ts` | `src/core/api/client.ts` |
| `tags create` | `n8n tags create -n name [--json]` | `src/commands/tags/create.ts` | `src/core/api/client.ts` |
| `tags update` | `n8n tags update <id> -n name [--json]` | `src/commands/tags/update.ts` | `src/core/api/client.ts` |
| `tags delete` | `n8n tags delete <id> [--force] [--json]` | `src/commands/tags/delete.ts` | `src/core/api/client.ts` |

#### `variables` Commands

| Command | Syntax | Implementation File | Core Dependencies |
|---------|--------|---------------------|-------------------|
| `variables list` | `n8n variables list [-l n] [--cursor] [-s path] [--json]` | `src/commands/variables/list.ts` | `src/core/api/client.ts` |
| `variables create` | `n8n variables create -k key -v value [--json]` | `src/commands/variables/create.ts` | `src/core/api/client.ts` |
| `variables update` | `n8n variables update <id> -k key -v value [--json]` | `src/commands/variables/update.ts` | `src/core/api/client.ts` |
| `variables delete` | `n8n variables delete <id> [--force] [--json]` | `src/commands/variables/delete.ts` | `src/core/api/client.ts` |

#### `templates` Commands

| Command | Syntax | Implementation File | Core Dependencies |
|---------|--------|---------------------|-------------------|
| `templates search` | `n8n templates search <query> [-l n] [-s path] [--json]` | `src/commands/templates/search.ts` | `src/core/api/client.ts` |
| `templates get` | `n8n templates get <id> [-s path] [--json]` | `src/commands/templates/get.ts` | `src/core/api/client.ts` |

#### Utility Commands

| Command | Syntax | Implementation File | Core Dependencies |
|---------|--------|---------------------|-------------------|
| `audit` | `n8n audit [-c categories] [--days-abandoned n] [-s path] [--json]` | `src/commands/audit/index.ts` | `src/core/api/client.ts` |
| `auth login` | `n8n auth login [-H host] [-k key] [-i] [--json]` | `src/commands/auth/login.ts` | `src/core/config/loader.ts` |
| `auth status` | `n8n auth status [--json]` | `src/commands/auth/status.ts` | `src/core/config/loader.ts`, `src/core/api/client.ts` |
| `auth logout` | `n8n auth logout [--json]` | `src/commands/auth/logout.ts` | `src/core/config/loader.ts` |
| `health` | `n8n health [--json]` | `src/commands/health/index.ts` | `src/core/api/client.ts` |
| `config show` | `n8n config show [--json]` | `src/commands/config/index.ts` | `src/core/config/loader.ts` |
| `completion` | `n8n completion <shell>` | `src/commands/completion/index.ts` | — |

---

## Implementation Guide

### Adding a New Command

**1. Create command file:**

```typescript
// src/commands/workflows/autofix.ts
import { Command } from 'commander';
import type { GlobalOptions } from '../../types/global-options.js';
import { outputResult, outputError } from '../../utils/output.js';
import { ExitCodes } from '../../utils/exit-codes.js';

export function registerAutofixCommand(program: Command): void {
  program
    .command('autofix <workflowIdOrFile>')
    .description('Auto-fix workflow validation issues')
    // Standard options (follow existing patterns)
    .option('--dry-run', 'Preview fixes without applying', true)
    .option('--confidence <level>', 'Minimum confidence: high, medium, low', 'medium')
    .option('-s, --save <path>', 'Save fixed workflow locally')
    .option('--apply', 'Apply fixes (to file or n8n server)')
    .option('--force, --yes', 'Skip confirmation prompts')
    .option('--no-backup', 'Skip creating backup before changes')
    .option('--json', 'Output as JSON')
    // Action handler
    .action(async (workflowIdOrFile: string, options: AutofixOptions & GlobalOptions) => {
      try {
        const result = await executeAutofix(workflowIdOrFile, options);
        outputResult(result, options);
        process.exit(ExitCodes.SUCCESS);
      } catch (error) {
        outputError(error, options);
        process.exit(error.exitCode ?? ExitCodes.GENERAL);
      }
    });
}
```

**2. Register in domain index:**

```typescript
// src/commands/workflows/index.ts
import { registerAutofixCommand } from './autofix.js';

export function registerWorkflowsCommand(program: Command): void {
  const workflows = program.command('workflows').description('Manage n8n workflows');
  
  registerListCommand(workflows);
  registerGetCommand(workflows);
  registerValidateCommand(workflows);
  registerAutofixCommand(workflows);  // Add new command
  // ...
}
```

**3. Export from CLI entry:**

```typescript
// src/cli.ts
import { registerWorkflowsCommand } from './commands/workflows/index.js';

// Commands are auto-registered via the domain index
```

### Core Dependencies Reference

| Need | Import From | Key Functions |
|------|-------------|---------------|
| **API calls** | `src/core/api/client.ts` | `getApiClient()`, `client.get()`, `client.post()`, `client.patch()`, `client.delete()` |
| **Config access** | `src/core/config/loader.ts` | `loadConfig()`, `getProfile()` |
| **Node database** | `src/core/db/nodes.ts` | `getNodeRepository()`, `repo.getNode()`, `repo.searchNodes()` |
| **Validation** | `src/core/validator.ts` | `validateWorkflowStructure()` |
| **Sanitization** | `src/core/sanitizer.ts` | `sanitizeWorkflow()` |
| **Fixing** | `src/core/fixer.ts` | `applyExperimentalFixes()`, `fixInvalidOptionsFields()` |
| **Output formatting** | `src/core/formatters/` | `formatTable()`, `formatJson()`, `formatTree()`, `formatSummary()` |
| **User prompts** | `src/utils/prompts.ts` | `confirmAction()`, `promptInput()` |
| **Backups** | `src/utils/backup.ts` | `createBackup()`, `restoreBackup()` |
| **Exit codes** | `src/utils/exit-codes.ts` | `ExitCodes.SUCCESS`, `ExitCodes.DATAERR`, etc. |
| **Error handling** | `src/utils/errors.ts` | `CLIError`, `ValidationError`, `ApiError` |

### File Organization Pattern

```
src/commands/<domain>/
├── index.ts          # Registers all subcommands for domain
├── list.ts           # n8n <domain> list
├── get.ts            # n8n <domain> get <id>
├── create.ts         # n8n <domain> create
├── update.ts         # n8n <domain> update <id>
├── delete.ts         # n8n <domain> delete <id>
└── <custom>.ts       # Domain-specific actions (validate, autofix, trigger)
```

### Output Formatting Standards

**JSON output (--json flag):**
```typescript
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }

// Validation
{ "valid": false, "errors": [...], "warnings": [...] }

// List with pagination
{ "success": true, "data": [...], "nextCursor": "..." }
```

**Human output:**
```typescript
import { formatHeader, formatTable, formatSummary, formatNextActions } from '../core/formatters/index.js';

// Header
formatHeader('Autofix Results', { workflow: 'My Workflow', id: 'abc-123' });

// Table
formatTable(fixes, ['Node', 'Field', 'Before', 'After', 'Confidence']);

// Summary
formatSummary({ total: 5, high: 3, medium: 2 });

// Next actions
formatNextActions([
  'n8n workflows autofix abc-123 --apply',
  'n8n workflows validate abc-123'
]);
```

### Exit Codes Usage

```typescript
import { ExitCodes } from '../../utils/exit-codes.js';

// Success
process.exit(ExitCodes.SUCCESS);        // 0

// Invalid arguments
process.exit(ExitCodes.USAGE);          // 64

// Validation errors, resource not found
process.exit(ExitCodes.DATAERR);        // 65

// Cannot open input file
process.exit(ExitCodes.NOINPUT);        // 66

// Network/connection error
process.exit(ExitCodes.IOERR);          // 70

// Rate limit (retry later)
process.exit(ExitCodes.TEMPFAIL);       // 71

// API/server error
process.exit(ExitCodes.PROTOCOL);       // 72

// Authentication error
process.exit(ExitCodes.NOPERM);         // 73

// Configuration error
process.exit(ExitCodes.CONFIG);         // 78
```

---

## Files to Modify for This Feature

### New Files to Create

| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `src/core/autofix/types.ts` | Fix types, interfaces, configs | ~80 |
| `src/core/autofix/engine.ts` | Main AutoFixEngine orchestrator | ~300 |
| `src/core/autofix/expression-validator.ts` | Universal expression prefix check | ~150 |
| `src/core/autofix/expression-format.ts` | Expression format fixes | ~200 |
| `src/core/autofix/node-similarity.ts` | Typo detection wrapper | ~100 |
| `src/core/autofix/breaking-changes-registry.ts` | Known breaking changes DB | ~200 |
| `src/core/autofix/version-service.ts` | Version comparison logic | ~150 |
| `src/core/autofix/migration-service.ts` | Auto-migration strategies | ~200 |
| `src/core/autofix/index.ts` | Module exports | ~20 |

### Existing Files to Modify

| File | Changes | Lines Changed (est.) |
|------|---------|----------------------|
| `src/commands/workflows/autofix.ts` | Add new options, integrate AutoFixEngine, update output formatting | ~100 |
| `src/core/fixer.ts` | Refactor to use AutoFixEngine, keep existing fixes as adapters | ~50 |
| `src/types/workflow-diff.ts` | Add FixOperation, AutoFixResult types | ~30 |
| `src/utils/exit-codes.ts` | Add AUTOFIX_PARTIAL exit code if needed | ~5 |

### Documentation to Create/Update

| File | Changes |
|------|---------|
| `README.md` | Update `workflows autofix` section with new options |
| `docs/autofix.md` (new) | Detailed autofix usage, fix types, examples |
| `CHANGELOG.md` | Document new autofix capabilities |

---

## Autofix Command Final Specification

Based on CLI patterns from README.md, the enhanced `workflows autofix` command:

```bash
n8n workflows autofix <workflowIdOrFile> [options]
```

### Options (following CLI conventions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dry-run` | flag | `true` | Preview fixes without applying |
| `--apply` | flag | `false` | Apply fixes (to file or n8n server) |
| `--confidence <level>` | enum | `medium` | Minimum confidence: `high`, `medium`, `low` |
| `--fix-types <types>` | string | all | Comma-separated fix types to apply |
| `--max-fixes <n>` | number | `50` | Maximum number of fixes to apply |
| `-s, --save <path>` | string | — | Save fixed workflow to file |
| `--force, --yes` | flag | `false` | Skip confirmation prompts |
| `--no-backup` | flag | `false` | Skip creating backup before changes |
| `--json` | flag | `false` | Output as JSON |

### Example Usage

```bash
# Preview fixes (default)
n8n workflows autofix abc-123

# Preview with JSON output (for agents)
n8n workflows autofix workflow.json --json

# Apply only high-confidence fixes
n8n workflows autofix abc-123 --apply --confidence high --yes

# Apply specific fix types
n8n workflows autofix abc-123 --apply --fix-types expression-format,webhook-missing-path

# Save fixed workflow locally
n8n workflows autofix workflow.json --save fixed-workflow.json

# Full pipeline for agents
n8n workflows autofix workflow.json --json > result.json
# Agent processes result.json, then:
n8n workflows autofix workflow.json --apply --yes --json
```

### Exit Codes

| Code | Condition |
|------|-----------|
| `0` (SUCCESS) | All fixes applied successfully or no fixes needed |
| `65` (DATAERR) | Invalid workflow structure, cannot parse input |
| `66` (NOINPUT) | Input file not found |
| `70` (IOERR) | Network error when applying to n8n API |
| `73` (NOPERM) | Authentication error with n8n API |

### JSON Output Schema

```typescript
interface AutofixOutput {
  success: boolean;
  workflow: {
    id?: string;
    name?: string;
    source: 'file' | 'api';
  };
  fixes: {
    total: number;
    applied: number;
    skipped: number;
    byConfidence: { high: number; medium: number; low: number };
    byType: Record<FixType, number>;
  };
  operations: FixOperation[];
  nextActions: string[];  // Suggested follow-up commands
  error?: { code: string; message: string };
}
