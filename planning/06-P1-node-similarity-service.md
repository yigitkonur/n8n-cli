# P1: Similarity Services (Node, Operation, Resource)

## Priority: P1 (High)
## Status: ⚠️ Partial (Basic Levenshtein only)
## MCP Sources:
- `n8n-mcp/src/services/node-similarity-service.ts` (512 lines)
- `n8n-mcp/src/services/operation-similarity-service.ts` (502 lines)
- `n8n-mcp/src/services/resource-similarity-service.ts` (522 lines)

---

## Business Value

**User Impact:** When users make typos or use incorrect node type formats (e.g., `n8n-nodes-base.slak` instead of `n8n-nodes-base.slack`), the CLI currently shows a cryptic "Unknown node type" error with no guidance. This wastes 5-10 minutes per occurrence as users must manually search documentation or node lists.

**Workflow Improvement:** Intelligent suggestions reduce validation friction by 80%, turning a dead-end error into an actionable suggestion with auto-fix capability for high-confidence matches.

**Time Saved:** For teams validating 50+ workflows daily, this saves 2-4 hours per week in debugging time.

---

## Current CLI Status

- **Implemented:** No
- **Location:** N/A — `NodeSimilarityService` class does not exist in CLI
- **Gap Reason:** The CLI validator (`src/core/validator.ts`) reports unknown node types but lacks any suggestion mechanism. The `NodeRepository` (`src/core/db/nodes.ts`) has a basic Levenshtein distance implementation (lines 429-457) used only for FUZZY search mode, not integrated with validation errors.

### What CLI Currently Does

```typescript
// src/core/validator.ts:182-202
// When node type format is invalid, CLI only warns:
if (node.type.startsWith('nodes-base.')) {
  const issue = enrichWithSourceInfo({
    code: 'DEPRECATED_NODE_TYPE_PREFIX',
    severity: 'warning',
    message: `Node "${nodeName}" has invalid type "${node.type}" - should be "n8n-${node.type}"`,
    // ... NO suggestions provided
  }, sourceMap, `${nodePath}.type`);
}
```

**Current CLI Output:**
```
❌ Unknown node type: n8n-nodes-base.slak
```

**Desired Output (with similarity service):**
```
❌ Unknown node type: "n8n-nodes-base.slak"

Did you mean one of these?
  • n8n-nodes-base.slack (95% match) - Slack
    → Likely typo (1 character difference)
    ✓ Can be auto-fixed

  • n8n-nodes-base.slackTrigger (78% match) - Slack Trigger
    → Similar name pattern

💡 Run with --fix to auto-correct high-confidence matches
```

---

## CLI Commands Reference

This feature integrates with existing CLI commands following the established patterns from `README.md`.

### Affected Commands

| Command | Syntax | File | Enhancement |
|---------|--------|------|-------------|
| `workflows validate` | `n8n workflows validate [idOrFile] [options]` | `src/commands/workflows/validate.ts` | Show suggestions for unknown node types |
| `workflows autofix` | `n8n workflows autofix <id> [options]` | `src/commands/workflows/autofix.ts` | Auto-fix node-type-correction with 90%+ confidence |
| `nodes search` | `n8n nodes search <query> [options]` | `src/commands/nodes/search.ts` | Already uses FUZZY mode, can share Levenshtein |
| `nodes validate` | `n8n nodes validate <nodeType> [options]` | `src/commands/nodes/validate.ts` | Suggest similar nodes if type not found |

### New Command Behavior

#### Enhanced `workflows validate`

```bash
# Current behavior
n8n workflows validate workflow.json --json
# Returns: { "valid": false, "errors": [{ "code": "UNKNOWN_NODE_TYPE", ... }] }

# Enhanced behavior (with similarity)
n8n workflows validate workflow.json --json
# Returns:
{
  "valid": false,
  "errors": [{
    "code": "UNKNOWN_NODE_TYPE",
    "nodeName": "My Slack Node",
    "message": "Unknown node type: n8n-nodes-base.slak",
    "suggestions": [
      { "nodeType": "n8n-nodes-base.slack", "confidence": 0.95, "reason": "Likely typo", "autoFixable": true },
      { "nodeType": "n8n-nodes-base.slackTrigger", "confidence": 0.78, "reason": "Similar name" }
    ]
  }]
}
```

#### Enhanced `workflows autofix`

```bash
# New fix type: node-type-correction
n8n workflows autofix workflow.json --experimental --json
# Returns:
{
  "fixes": [
    { "type": "node-type-correction", "node": "My Slack Node", "before": "n8n-nodes-base.slak", "after": "n8n-nodes-base.slack", "confidence": 0.95 }
  ]
}
```

### CLI Pattern Compliance

Following README.md semantics:

| Pattern | Implementation |
|---------|----------------|
| `--json` flag | All output includes `suggestions` array in errors |
| `--save <path>` | Fixed workflow saved with corrected node types |
| `--fix` flag | Triggers similarity-based corrections |
| Exit code `65` | `DATAERR` for validation errors with suggestions |
| Agent-friendly output | `correctUsage` includes suggested node type |

---

## CLI Architecture Overview

### Entry Point & Command Routing

```
src/cli.ts                    # Main entry point (Commander.js)
    │
    ├── program.command('workflows')
    │       ├── .command('validate')  → src/commands/workflows/validate.ts
    │       ├── .command('autofix')   → src/commands/workflows/autofix.ts
    │       └── ...
    │
    ├── program.command('nodes')
    │       ├── .command('search')    → src/commands/nodes/search.ts
    │       ├── .command('validate')  → src/commands/nodes/validate.ts
    │       └── ...
    │
    └── Global options: --json, --verbose, --quiet, --profile
```

### Command Structure Pattern

```typescript
// src/commands/{domain}/{action}.ts
import { getNodeRepository } from '../../core/db/nodes.js';
import { formatHeader } from '../../core/formatters/header.js';
import { outputJson } from '../../core/formatters/json.js';

interface CommandOptions {
  json?: boolean;
  save?: string;
  // domain-specific options
}

export async function commandName(args: string, opts: CommandOptions): Promise<void> {
  // 1. Input validation
  // 2. Core logic (using src/core/* modules)
  // 3. Output formatting (JSON or human-readable)
  // 4. Next actions suggestions
}
```

### Shared Modules

| Module | Path | Purpose |
|--------|------|---------|
| API Client | `src/core/api/client.ts` | n8n API communication |
| Config Loader | `src/core/config/loader.ts` | Profile/env config |
| Node Repository | `src/core/db/nodes.ts` | Offline node database |
| Validator | `src/core/validator.ts` | Workflow validation |
| Fixer | `src/core/fixer.ts` | Experimental fixes |
| Formatters | `src/core/formatters/` | Output formatting (table, tree, json) |
| Types | `src/types/` | TypeScript interfaces |
| Utils | `src/utils/` | Helpers (backup, errors, prompts) |

---

## MCP Reference Implementation

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `n8n-mcp/src/services/node-similarity-service.ts` | 1-512 | Main similarity service with scoring algorithm |
| `n8n-mcp/src/services/operation-similarity-service.ts` | 1-502 | Operation-level suggestions (e.g., `sendMessage` → `send`) |
| `n8n-mcp/src/services/resource-similarity-service.ts` | 1-522 | Resource-level suggestions (e.g., `files` → `file`) |
| `n8n-mcp/src/database/node-repository.ts` | 1-962 | Node data access layer |

### Key Types (from MCP)

```typescript
// n8n-mcp/src/services/node-similarity-service.ts:4-26
export interface NodeSuggestion {
  nodeType: string;       // e.g., "nodes-base.slack"
  displayName: string;    // e.g., "Slack"
  confidence: number;     // 0.0-1.0 (0.9+ = auto-fixable)
  reason: string;         // e.g., "Likely typo"
  category?: string;      // e.g., "Communication"
  description?: string;   // Node description
}

export interface SimilarityScore {
  nameSimilarity: number;   // 0-40 points (Levenshtein-based)
  categoryMatch: number;    // 0-20 points (same category bonus)
  packageMatch: number;     // 0-15 points (same package bonus)
  patternMatch: number;     // 0-25 points (substring/typo detection)
  totalScore: number;       // Sum, min 50 to suggest
}

export interface CommonMistakePattern {
  pattern: string;     // Input pattern to match
  suggestion: string;  // Correct node type
  confidence: number;  // Pre-computed confidence
  reason: string;      // Human-readable explanation
}
```

### Common Mistakes Map (MCP Lines 51-96)

```typescript
// Case variations
{ pattern: 'httprequest', suggestion: 'nodes-base.httpRequest', confidence: 0.95 }
{ pattern: 'HTTPRequest', suggestion: 'nodes-base.httpRequest', confidence: 0.95 }

// Deprecated prefixes
{ pattern: 'n8n-nodes-base.', suggestion: 'nodes-base.', confidence: 0.95 }

// Common typos
{ pattern: 'slak', suggestion: 'nodes-base.slack', confidence: 0.8 }
{ pattern: 'webook', suggestion: 'nodes-base.webhook', confidence: 0.8 }

// AI/LangChain specific
{ pattern: 'openai', suggestion: 'nodes-langchain.openAi', confidence: 0.85 }
{ pattern: 'nodes-base.openai', suggestion: 'nodes-langchain.openAi', confidence: 0.9 }
```

### Scoring Algorithm (MCP Lines 243-310)

```typescript
// Multi-factor similarity calculation
calculateSimilarityScore(invalidType, node): SimilarityScore {
  // 1. Name similarity (40% weight) - Levenshtein distance
  nameSimilarity = Math.max(
    getStringSimilarity(cleanInvalid, cleanValid),
    getStringSimilarity(cleanInvalid, displayNameClean)
  ) * 40;

  // 2. Category match (20% weight)
  if (cleanInvalid.includes(categoryClean)) categoryMatch = 20;

  // 3. Package match (15% weight)
  if (invalidParts[0] === validParts[0]) packageMatch = 15;

  // 4. Pattern match (25% weight) - substring & typo detection
  if (cleanValid.includes(cleanInvalid)) patternMatch = isShortSearch ? 45 : 25;
  else if (editDistance <= 2) patternMatch = 20;

  return { nameSimilarity, categoryMatch, packageMatch, patternMatch, totalScore };
}
```

### Constants (MCP Lines 29-35)

```typescript
SCORING_THRESHOLD = 50;        // Min 50% to suggest
TYPO_EDIT_DISTANCE = 2;        // Max 2 edits for typo
SHORT_SEARCH_LENGTH = 5;       // Searches ≤5 chars need special handling
CACHE_DURATION_MS = 5 * 60 * 1000;  // 5 minutes
AUTO_FIX_CONFIDENCE = 0.9;     // 90% for auto-fix
```

---

## CLI Implementation Guide

### Step 1: Create Similarity Module

```
src/core/similarity/
├── node-similarity.ts         # Port of NodeSimilarityService
├── common-mistakes.ts         # Common mistake patterns map
├── types.ts                   # NodeSuggestion, SimilarityScore interfaces
└── index.ts                   # Exports
```

**Files to Create:**

| File | LOC | Purpose |
|------|-----|---------|
| `src/core/similarity/types.ts` | ~40 | Interface definitions |
| `src/core/similarity/common-mistakes.ts` | ~80 | Mistake patterns map |
| `src/core/similarity/node-similarity.ts` | ~200 | Main service class |
| `src/core/similarity/index.ts` | ~10 | Re-exports |

### Step 2: Define Types

```typescript
// src/core/similarity/types.ts
export interface NodeSuggestion {
  nodeType: string;
  displayName: string;
  confidence: number;
  reason: string;
  category?: string;
  description?: string;
  autoFixable: boolean;
}

export interface SimilarityScore {
  nameSimilarity: number;
  categoryMatch: number;
  packageMatch: number;
  patternMatch: number;
  totalScore: number;
}

export interface CommonMistakePattern {
  pattern: string;
  suggestion: string;
  confidence: number;
  reason: string;
}
```

### Step 3: Port Common Mistakes

```typescript
// src/core/similarity/common-mistakes.ts
import type { CommonMistakePattern } from './types.js';

export const COMMON_MISTAKES: Map<string, CommonMistakePattern[]> = new Map([
  ['case_variations', [
    { pattern: 'httprequest', suggestion: 'n8n-nodes-base.httpRequest', confidence: 0.95, reason: 'Incorrect capitalization' },
    { pattern: 'webhook', suggestion: 'n8n-nodes-base.webhook', confidence: 0.95, reason: 'Incorrect capitalization' },
    { pattern: 'slack', suggestion: 'n8n-nodes-base.slack', confidence: 0.9, reason: 'Missing package prefix' },
  ]],
  ['typos', [
    { pattern: 'slak', suggestion: 'n8n-nodes-base.slack', confidence: 0.8, reason: 'Likely typo' },
    { pattern: 'webook', suggestion: 'n8n-nodes-base.webhook', confidence: 0.8, reason: 'Likely typo' },
    { pattern: 'htprequest', suggestion: 'n8n-nodes-base.httpRequest', confidence: 0.8, reason: 'Likely typo' },
  ]],
  ['ai_nodes', [
    { pattern: 'openai', suggestion: '@n8n/n8n-nodes-langchain.openAi', confidence: 0.85, reason: 'AI node - use LangChain package' },
    { pattern: 'n8n-nodes-base.openai', suggestion: '@n8n/n8n-nodes-langchain.openAi', confidence: 0.9, reason: 'Wrong package' },
  ]],
]);
```

### Step 4: Port NodeSimilarityService

```typescript
// src/core/similarity/node-similarity.ts
import type { NodeRepository } from '../db/nodes.js';
import type { NodeSuggestion, SimilarityScore } from './types.js';
import { COMMON_MISTAKES } from './common-mistakes.js';

export class NodeSimilarityService {
  private static readonly SCORING_THRESHOLD = 50;
  private static readonly AUTO_FIX_CONFIDENCE = 0.9;
  
  private repository: NodeRepository;
  private nodeCache: any[] | null = null;
  private cacheExpiry: number = 0;
  
  constructor(repository: NodeRepository) {
    this.repository = repository;
  }
  
  async findSimilarNodes(invalidType: string, limit: number = 5): Promise<NodeSuggestion[]> {
    // 1. Check common mistakes first (fast path)
    const mistakeSuggestion = this.checkCommonMistakes(invalidType);
    if (mistakeSuggestion) return [mistakeSuggestion];
    
    // 2. Get all nodes and score
    const allNodes = this.getCachedNodes();
    const scores = allNodes.map(node => ({
      node,
      score: this.calculateSimilarityScore(invalidType, node)
    }));
    
    // 3. Filter, sort, limit
    return scores
      .filter(s => s.score.totalScore >= NodeSimilarityService.SCORING_THRESHOLD)
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .slice(0, limit)
      .map(({ node, score }) => this.createSuggestion(node, score));
  }
  
  isAutoFixable(suggestion: NodeSuggestion): boolean {
    return suggestion.confidence >= NodeSimilarityService.AUTO_FIX_CONFIDENCE;
  }
  
  // ... port remaining methods from MCP (checkCommonMistakes, calculateSimilarityScore, etc.)
}
```

### Step 5: Modify Validator

```typescript
// src/core/validator.ts - Add import
import { NodeSimilarityService } from './similarity/index.js';
import { getNodeRepository } from './db/nodes.js';

// In validateWorkflowStructure(), modify unknown node handling:
// After line ~180 where node type validation happens:

async function validateNodeType(node: WorkflowNode, nodePath: string, sourceMap?: SourceMap): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  const repo = await getNodeRepository();
  const nodeInfo = repo.getNode(node.type);
  
  if (!nodeInfo) {
    // NEW: Get suggestions using similarity service
    const similarityService = new NodeSimilarityService(repo);
    const suggestions = await similarityService.findSimilarNodes(node.type, 3);
    
    const issue = enrichWithSourceInfo({
      code: 'UNKNOWN_NODE_TYPE',
      severity: 'error',
      message: `Unknown node type: "${node.type}"`,
      location: { nodeName: node.name, nodeType: node.type, path: `${nodePath}.type` },
      // NEW: Include suggestions
      suggestions: suggestions.map(s => ({
        value: s.nodeType,
        confidence: s.confidence,
        reason: s.reason,
        autoFixable: s.autoFixable,
      })),
      hint: suggestions.length > 0 ? `Did you mean: ${suggestions[0].nodeType}?` : undefined,
    }, sourceMap, `${nodePath}.type`);
    
    issues.push(issue);
  }
  
  return issues;
}
```

### Step 6: Add Fixer Integration

```typescript
// src/core/fixer.ts - Add new experimental fix
import { NodeSimilarityService } from './similarity/index.js';
import { getNodeRepository } from './db/nodes.js';

const fixNodeTypeCorrection: ExperimentalFix = {
  id: 'node-type-correction',
  description: "Auto-correct unknown node types with 90%+ confidence matches",
  async apply(workflow: Workflow): Promise<FixResult> {
    const warnings: string[] = [];
    let fixed = 0;
    
    const repo = await getNodeRepository();
    const similarityService = new NodeSimilarityService(repo);
    
    for (const node of workflow.nodes) {
      if (!node?.type) continue;
      
      // Check if node type exists
      const nodeInfo = repo.getNode(node.type);
      if (nodeInfo) continue;  // Valid node type
      
      // Get suggestions
      const suggestions = await similarityService.findSimilarNodes(node.type, 1);
      if (suggestions.length > 0 && suggestions[0].autoFixable) {
        const original = node.type;
        node.type = suggestions[0].nodeType;
        fixed++;
        warnings.push(
          `Fixed node "${node.name}": "${original}" → "${suggestions[0].nodeType}" (${suggestions[0].reason})`
        );
      }
    }
    
    return { fixed, warnings };
  },
};

// Add to defaultExperimentalFixes array (line ~196)
const defaultExperimentalFixes: ExperimentalFix[] = [
  fixEmptyOptionsOnConditionalNodes,
  fixSwitchV3RuleConditionsOptions,
  fixSwitchV3FallbackOutputLocation,
  fixNodeTypeCorrection,  // NEW
];
```

### Step 7: Update Types

```typescript
// src/core/types.ts - Extend ValidationIssue interface
export interface ValidationIssue {
  // ... existing fields ...
  
  // NEW: Suggestions for fixing the issue
  suggestions?: Array<{
    value: string;
    confidence: number;
    reason: string;
    autoFixable: boolean;
  }>;
}
```

---

## Files Summary

### Files to Create

| File | Purpose | LOC |
|------|---------|-----|
| `src/core/similarity/types.ts` | Interface definitions | ~40 |
| `src/core/similarity/common-mistakes.ts` | Mistake patterns | ~80 |
| `src/core/similarity/node-similarity.ts` | Main service | ~200 |
| `src/core/similarity/index.ts` | Re-exports | ~10 |

### Files to Modify

| File | Change | LOC Added |
|------|--------|-----------|
| `src/core/validator.ts` | Integrate suggestions | ~25 |
| `src/core/fixer.ts` | Add node-type-correction fix | ~35 |
| `src/core/types.ts` | Add `suggestions` to ValidationIssue | ~8 |
| `src/commands/workflows/validate.ts` | Display suggestions in output | ~20 |
| `src/commands/workflows/autofix.ts` | Show node-type corrections | ~10 |

### Dependencies Used

| Module | Status | Usage |
|--------|--------|-------|
| `src/core/db/nodes.ts` | ✅ Exists | `getNodeRepository()`, `getAllNodes()` |
| `src/core/db/nodes.ts:429-457` | ✅ Exists | Levenshtein distance (reuse or port optimized) |
| `src/core/formatters/*` | ✅ Exists | Output formatting |
| `n8n-mcp/data/nodes.db` | ✅ Exists | Bundled node database |

---

## Testing Requirements

### Unit Tests

```typescript
// tests/core/similarity/node-similarity.test.ts
describe('NodeSimilarityService', () => {
  describe('findSimilarNodes', () => {
    it('should return suggestions for typos', async () => {
      const suggestions = await service.findSimilarNodes('n8n-nodes-base.slak');
      expect(suggestions[0].nodeType).toBe('n8n-nodes-base.slack');
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0.8);
      expect(suggestions[0].autoFixable).toBe(false);  // 0.8 < 0.9
    });
    
    it('should detect common mistakes with high confidence', async () => {
      const suggestions = await service.findSimilarNodes('HTTPRequest');
      expect(suggestions[0].nodeType).toBe('n8n-nodes-base.httpRequest');
      expect(suggestions[0].confidence).toBe(0.95);
      expect(suggestions[0].autoFixable).toBe(true);
    });
    
    it('should redirect AI nodes to LangChain package', async () => {
      const suggestions = await service.findSimilarNodes('n8n-nodes-base.openai');
      expect(suggestions[0].nodeType).toContain('langchain');
    });
    
    it('should return empty for completely invalid types', async () => {
      const suggestions = await service.findSimilarNodes('xyz123invalid');
      expect(suggestions).toHaveLength(0);
    });
  });
});
```

### Integration Tests

```typescript
// tests/commands/workflows/validate-similarity.test.ts
describe('workflows validate with similarity', () => {
  it('should show suggestions in JSON output', async () => {
    const result = await runCommand(['workflows', 'validate', 'fixtures/typo-workflow.json', '--json']);
    const output = JSON.parse(result.stdout);
    
    expect(output.valid).toBe(false);
    expect(output.errors[0].suggestions).toBeDefined();
    expect(output.errors[0].suggestions.length).toBeGreaterThan(0);
  });
  
  it('should auto-fix with --experimental flag', async () => {
    const result = await runCommand(['workflows', 'autofix', 'fixtures/typo-workflow.json', '--experimental', '--json']);
    const output = JSON.parse(result.stdout);
    
    expect(output.fixes).toContainEqual(
      expect.objectContaining({ type: 'node-type-correction' })
    );
  });
});
```

---

## Acceptance Criteria

1. **Validate shows suggestions:**
   ```bash
   n8n workflows validate workflow-with-typo.json --json
   # Output includes: "suggestions": [{ "value": "...", "confidence": 0.95, ... }]
   ```

2. **Human-readable suggestions:**
   ```bash
   n8n workflows validate workflow-with-typo.json
   # Shows: "Did you mean: n8n-nodes-base.slack (95% match)?"
   ```

3. **Auto-fix works:**
   ```bash
   n8n workflows autofix workflow-with-typo.json --experimental --apply
   # Fixes node types with 90%+ confidence
   ```

4. **Exit codes preserved:**
   - `0` for valid workflow
   - `65` (DATAERR) for invalid workflow with suggestions

5. **Error handling:**
   - Graceful degradation if node database unavailable
   - Empty suggestions for completely invalid types (no crash)

---

## Why Not Yet Implemented

1. **Priority focus:** Initial CLI development prioritized core validation, API connectivity, and basic commands
2. **Complexity:** Multi-factor scoring algorithm requires careful porting (~300 lines)
3. **Async considerations:** CLI validator is currently synchronous; similarity service requires async database queries
4. **Testing burden:** Requires comprehensive test fixtures for typo detection accuracy

---

## Estimated Effort

- **Complexity:** Medium
- **New Files:** 4 files (~330 LOC)
- **Modified Files:** 5 files (~100 LOC changes)
- **Testing:** ~150 LOC
- **Time:** 1.5-2 days

---

## Related Planning Documents

- **04-P0-workflow-autofix-engine.md** - Uses this for `node-type-correction` fix type
- **08-P1-node-version-service.md** - Node version handling (complementary)
- **09-P1-breaking-change-detector.md** - Uses node database patterns
