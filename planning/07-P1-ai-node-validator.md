# P1: AI Node Validator

## Priority: P1 (High)
## Status: Not Implemented in CLI
## MCP Source: `n8n-mcp/src/services/ai-node-validator.ts`, `n8n-mcp/src/services/ai-tool-validators.ts`

---

## Business Value

AI Agent workflows are the most complex and error-prone workflows in n8n. They involve specialized connection types (`ai_languageModel`, `ai_memory`, `ai_tool`, etc.), streaming mode constraints, and intricate configuration requirements that standard validation cannot catch. Without AI-specific validation:

1. **Users waste hours debugging silent failures** - AI Agent without LLM connection fails at runtime with cryptic errors
2. **Streaming mode misconfigurations cause data loss** - AI Agent with streaming must NOT have main output connections
3. **Tool connections are frequently misconfigured** - Using `main` instead of `ai_tool` connection type breaks tool execution

Implementing AI validation will **catch 15+ unique error conditions** before deployment, saving significant debugging time and preventing production failures.

---

## CLI Commands Reference

### Existing Commands (Enhanced with AI Validation)

This feature enhances existing validation commands rather than adding new ones. AI validation integrates seamlessly into the current command structure.

| Command | Syntax | File | Purpose |
|---------|--------|------|---------|
| `workflows validate` | `n8n workflows validate [idOrFile] [options]` | `src/commands/workflows/validate.ts` | Validate workflow structure + AI nodes |
| `workflows autofix` | `n8n workflows autofix <id> [options]` | `src/commands/workflows/autofix.ts` | Auto-fix issues including AI configs |
| `nodes validate` | `n8n nodes validate <nodeType> [options]` | `src/commands/nodes/validate.ts` | Validate single node (AI-aware) |

### Command Usage Examples

#### Validate AI Agent Workflow (File)

```bash
n8n workflows validate ai-agent-workflow.json --json
```

**Output (JSON mode):**
```json
{
  "valid": false,
  "source": "ai-agent-workflow.json",
  "errors": [
    {
      "code": "MISSING_LANGUAGE_MODEL",
      "severity": "error",
      "nodeName": "AI Agent",
      "message": "AI Agent \"AI Agent\" requires an ai_languageModel connection. Connect a language model node (e.g., OpenAI Chat Model, Anthropic Chat Model)."
    }
  ],
  "warnings": [],
  "issues": [...]
}
```

#### Validate with AI-Friendly Profile

```bash
n8n workflows validate ai-workflow.json --profile ai-friendly
```

| Profile | Description | AI Validation |
|---------|-------------|---------------|
| `minimal` | Structure only | ❌ Skipped |
| `runtime` | Structure + params (default) | ✅ Enabled |
| `ai-friendly` | Full AI-specific checks | ✅ Enhanced |
| `strict` | All checks + best practices | ✅ Enhanced |

#### Validate AI Workflow from n8n Instance

```bash
n8n workflows validate abc123 --json
```

#### Auto-fix AI Node Issues

```bash
n8n workflows autofix abc123 --confidence medium --json
```

#### Validate and Save Fixed Workflow

```bash
n8n workflows validate ai-workflow.json --fix --save fixed.json
```

### Global Options (Apply to All Commands)

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON (machine-readable) |
| `--profile <name>` | Use configuration profile |
| `-v, --verbose` | Enable debug output |
| `-q, --quiet` | Suppress non-essential output |
| `--no-color` | Disable colored output |

### Exit Codes

| Code | Name | When Returned |
|------|------|---------------|
| `0` | SUCCESS | Workflow valid, no errors |
| `1` | GENERAL | Unknown error |
| `65` | DATAERR | Validation errors (including AI errors) |
| `66` | NOINPUT | Cannot open input file |

---

## CLI Architecture Overview

### Entry Point & Command Routing

```
src/cli.ts                          # Main entry, registers all commands
    └── commander.program
            ├── workflows (group)
            │       ├── validate     → src/commands/workflows/validate.ts
            │       ├── autofix      → src/commands/workflows/autofix.ts
            │       └── ...
            ├── nodes (group)
            │       ├── validate     → src/commands/nodes/validate.ts
            │       └── ...
            └── ...
```

### Command File Pattern

Every command follows this structure (from `src/commands/workflows/validate.ts`):

```typescript
// 1. Imports
import chalk from 'chalk';
import { validateWorkflowStructure } from '../../core/validator.js';
import { formatHeader } from '../../core/formatters/header.js';
import { outputJson } from '../../core/formatters/json.js';

// 2. Options interface
interface ValidateOptions {
  file?: string;
  profile?: 'minimal' | 'runtime' | 'ai-friendly' | 'strict';
  json?: boolean;
  // ...
}

// 3. Command function (named export)
export async function workflowsValidateCommand(
  idOrFile: string | undefined,
  opts: ValidateOptions
): Promise<void> {
  // 4. JSON output path
  if (opts.json) {
    outputJson({ valid, errors, warnings, issues });
    process.exitCode = valid ? 0 : 1;
    return;
  }

  // 5. Human-friendly output path
  console.log(formatHeader({ title: 'Workflow Validation', ... }));
  // ...

  // 6. Set exit code
  process.exitCode = valid ? 0 : 1;
}
```

### Shared Modules

| Module | Location | Purpose |
|--------|----------|---------|
| **Formatters** | `src/core/formatters/` | Output formatting (JSON, table, header) |
| **Validator** | `src/core/validator.ts` | Workflow structure validation |
| **API Client** | `src/core/api/client.ts` | n8n API communication |
| **Types** | `src/core/types.ts` | Shared TypeScript interfaces |
| **Utilities** | `src/utils/` | Helpers (errors, prompts, backup) |

### Config & Auth Flow

```
User runs command
    │
    ├── src/core/config/loader.ts     # Load ~/.n8nrc or env vars
    │       ├── N8N_HOST
    │       ├── N8N_API_KEY
    │       └── N8N_PROFILE
    │
    └── src/core/api/client.ts        # Create authenticated client
            └── Axios instance with API key header
```

---

## High-Level Implementation Plan

### Phase 1: Core Validation Logic (Day 1)

**Files to Create:**

| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `src/core/validation/ai-nodes.ts` | AI Agent, Chat Trigger, LLM Chain validators | ~400 |
| `src/core/validation/ai-tool-validators.ts` | 13 AI tool type validators | ~350 |
| `src/core/validation/index.ts` | Re-exports | ~10 |

**Files to Modify:**

| File | Change | Lines Changed |
|------|--------|---------------|
| `src/core/types.ts` | Add `ReverseConnection`, `AIValidationIssue` | +15 |
| `src/core/validator.ts` | Import and call `validateAISpecificNodes()` | +20 |

### Phase 2: CLI Integration (Day 2)

**Files to Modify:**

| File | Change | Lines Changed |
|------|--------|---------------|
| `src/commands/workflows/validate.ts` | Handle `ai-friendly` profile, format AI errors | +30 |
| `src/commands/workflows/autofix.ts` | AI-specific autofix suggestions | +20 |
| `src/core/formatters/summary.ts` | AI error formatting helpers | +40 |

### Phase 3: Testing & Docs (Day 3)

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/core/validation/__tests__/ai-nodes.test.ts` | Unit tests for AI validation |
| `tests/fixtures/ai-agent-valid.json` | Test fixture: valid AI workflow |
| `tests/fixtures/ai-agent-missing-llm.json` | Test fixture: missing LLM |
| `tests/fixtures/chat-trigger-streaming.json` | Test fixture: streaming config |

**Files to Modify:**

| File | Change |
|------|--------|
| `README.md` | Document AI validation in `workflows validate` section |

---

## Current CLI Status

### Implemented: No
### Location: N/A

### Gap Analysis

| Feature | CLI Status | MCP Status |
|---------|-----------|------------|
| AI node detection (`hasAINodes`) | ❌ Missing | ✅ `ai-node-validator.ts:592-603` |
| AI Agent validation | ❌ Missing | ✅ `ai-node-validator.ts:147-332` |
| Chat Trigger validation | ❌ Missing | ✅ `ai-node-validator.ts:373-455` |
| Basic LLM Chain validation | ❌ Missing | ✅ `ai-node-validator.ts:467-535` |
| Reverse connection mapping | ❌ Missing | ✅ `ai-node-validator.ts:68-114` |
| AI tool sub-node validators (13 types) | ❌ Missing | ✅ `ai-tool-validators.ts:57-607` |

### Why Not Yet Implemented

1. **No reverse connection mapping** - CLI's `validator.ts` validates connections forward (source→target), but AI connections flow backward (LLM→Agent). The MCP solved this with `buildReverseConnectionMap()`.

2. **No AI node type awareness** - CLI's `n8n-native-validator.ts` delegates to n8n's built-in parameter validation, which doesn't understand AI-specific connection semantics.

3. **Validation architecture gap** - CLI's `validateWorkflowStructure()` in `src/core/validator.ts` only validates structural correctness (nodes exist, connections reference real nodes), not semantic correctness (AI Agent has required LLM connection).

4. **LangChain nodes explicitly skipped** - In MCP's `workflow-validator.ts:484-486`, langchain nodes are skipped from parameter validation because they have dedicated AI validators. CLI lacks this dedicated layer entirely.

---

## MCP Reference Implementation

### Architecture Pattern

The MCP uses a **layered validation architecture**:

```
WorkflowValidator.validateWorkflow()
    ├── validateWorkflowStructure()     # Basic structure
    ├── validateAllNodes()               # Per-node params (skips langchain)
    ├── validateConnections()            # Connection integrity
    ├── validateExpressions()            # Expression syntax
    └── validateAISpecificNodes()        # AI-SPECIFIC (the new layer)
            ├── buildReverseConnectionMap()
            ├── validateAIAgent()
            ├── validateChatTrigger()
            ├── validateBasicLLMChain()
            └── validateAIToolSubNode() (13 validators)
```

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `n8n-mcp/src/services/ai-node-validator.ts` | 635 | Core AI validation logic |
| `n8n-mcp/src/services/ai-tool-validators.ts` | 608 | 13 AI tool type validators |
| `n8n-mcp/src/services/workflow-validator.ts` | 173-191 | Integration point |
| `n8n-mcp/src/utils/node-type-normalizer.ts` | 76-95 | Node type normalization |

### Critical Data Structures

#### Reverse Connection Map (Essential for AI Validation)
```typescript
// n8n-mcp/src/services/ai-node-validator.ts:68-114
export function buildReverseConnectionMap(
  workflow: WorkflowJson
): Map<string, ReverseConnection[]> {
  const map = new Map<string, ReverseConnection[]>();

  for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
    for (const [outputType, connections] of Object.entries(outputs)) {
      const connArray = connections.flat().filter(c => c);
      for (const conn of connArray) {
        if (!map.has(conn.node)) {
          map.set(conn.node, []);
        }
        map.get(conn.node)!.push({
          sourceName: sourceName,
          sourceType: outputType,
          type: outputType,  // main, ai_tool, ai_languageModel, etc.
          index: conn.index ?? 0
        });
      }
    }
  }
  return map;
}
```

#### AI Connection Types
```typescript
// n8n-mcp/src/services/ai-node-validator.ts:40-49
export const AI_CONNECTION_TYPES = [
  'ai_languageModel',
  'ai_memory',
  'ai_tool',
  'ai_embedding',
  'ai_vectorStore',
  'ai_document',
  'ai_textSplitter',
  'ai_outputParser'
] as const;
```

#### Validation Issue Interface
```typescript
// n8n-mcp/src/services/ai-tool-validators.ts:45-51
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  nodeId?: string;
  nodeName?: string;
  message: string;
  code?: string;
}
```

### AI Agent Validation Rules (15 checks)

```typescript
// n8n-mcp/src/services/ai-node-validator.ts:147-332

// 1. REQUIRED: ai_languageModel connection (1 or 2 if fallback)
if (languageModelConnections.length === 0) {
  // Error: MISSING_LANGUAGE_MODEL
}
if (languageModelConnections.length > 2) {
  // Error: TOO_MANY_LANGUAGE_MODELS
}
if (languageModelConnections.length === 2 && !node.parameters.needsFallback) {
  // Warning: Has 2 LLMs but needsFallback not enabled
}
if (languageModelConnections.length === 1 && node.parameters.needsFallback === true) {
  // Error: FALLBACK_MISSING_SECOND_MODEL
}

// 2. Output parser configuration
if (node.parameters.hasOutputParser === true && outputParserConnections.length === 0) {
  // Error: MISSING_OUTPUT_PARSER
}
if (outputParserConnections.length > 1) {
  // Error: MULTIPLE_OUTPUT_PARSERS
}

// 3. Prompt type validation
if (node.parameters.promptType === 'define' && !node.parameters.text?.trim()) {
  // Error: MISSING_PROMPT_TEXT
}

// 4. System message recommendations
if (!node.parameters.systemMessage) {
  // Info: No systemMessage defined
}
if (node.parameters.systemMessage?.trim().length < 20) {
  // Info: systemMessage too short
}

// 5. CRITICAL: Streaming mode constraints
const isStreamingTarget = checkIfStreamingTarget(node, workflow, reverseConnections);
if (isStreamingTarget && hasMainOutputConnections(node, workflow)) {
  // Error: STREAMING_WITH_MAIN_OUTPUT
  // "AI Agent in streaming mode must NOT have main output connections"
}

// 6. Memory validation (0-1 allowed)
if (memoryConnections.length > 1) {
  // Error: MULTIPLE_MEMORY_CONNECTIONS
}

// 7. Tool connections
if (toolConnections.length === 0) {
  // Info: No tools connected (optional but recommended)
}

// 8. maxIterations validation
if (node.parameters.maxIterations !== undefined) {
  if (typeof node.parameters.maxIterations !== 'number') {
    // Error: INVALID_MAX_ITERATIONS_TYPE
  }
  if (node.parameters.maxIterations < 1) {
    // Error: MAX_ITERATIONS_TOO_LOW
  }
  if (node.parameters.maxIterations > 50) {
    // Warning: Very high iteration count
  }
}
```

### Chat Trigger Validation Rules

```typescript
// n8n-mcp/src/services/ai-node-validator.ts:373-455

// 1. Must have outgoing connections
if (!outgoingMain || outgoingMain.length === 0) {
  // Error: MISSING_CONNECTIONS
}

// 2. Streaming mode requires AI Agent target
if (responseMode === 'streaming') {
  if (targetType !== 'nodes-langchain.agent') {
    // Error: STREAMING_WRONG_TARGET
    // "Streaming mode only works with AI Agent"
  }
  // Check AI Agent has NO main output connections
  if (agentHasMainOutput) {
    // Error: STREAMING_AGENT_HAS_OUTPUT
  }
}

// 3. lastNode mode with AI Agent
if (responseMode === 'lastNode' && targetType === 'nodes-langchain.agent') {
  // Info: Consider using streaming for better UX
}
```

### AI Tool Sub-Node Validators (13 types)

```typescript
// n8n-mcp/src/services/ai-tool-validators.ts:544-557
export const AI_TOOL_VALIDATORS = {
  'nodes-langchain.toolHttpRequest': validateHTTPRequestTool,    // URL, placeholders, auth
  'nodes-langchain.toolCode': validateCodeTool,                  // jsCode, input schema
  'nodes-langchain.toolVectorStore': validateVectorStoreTool,    // topK validation
  'nodes-langchain.toolWorkflow': validateWorkflowTool,          // workflowId required
  'nodes-langchain.agentTool': validateAIAgentTool,              // maxIterations
  'nodes-langchain.mcpClientTool': validateMCPClientTool,        // serverUrl required
  'nodes-langchain.toolCalculator': validateCalculatorTool,      // (no-op, self-contained)
  'nodes-langchain.toolThink': validateThinkTool,                // (no-op, self-contained)
  'nodes-langchain.toolSerpApi': validateSerpApiTool,            // credentials check
  'nodes-langchain.toolWikipedia': validateWikipediaTool,        // language validation
  'nodes-langchain.toolSearXng': validateSearXngTool,            // baseUrl required
  'nodes-langchain.toolWolframAlpha': validateWolframAlphaTool,  // credentials required
};
```

---

## Dependencies

### Required (Existing)

| Dependency | Location | Status |
|-----------|----------|--------|
| `NodeTypeNormalizer` | `src/utils/node-type-normalizer.ts` | ✅ Exists |
| `Workflow` type | `src/core/types.ts` | ✅ Exists |
| `WorkflowNode` type | `src/core/types.ts` | ✅ Exists |
| `ValidationIssue` type | `src/core/types.ts` | ✅ Exists |

### Required (New Types)

| Type | Add to | Purpose |
|------|--------|---------|
| `ReverseConnection` | `src/core/types.ts` | AI connection mapping |
| `AIValidationIssue` | `src/core/types.ts` | AI-specific issue format |

### Blocks

This feature blocks:
- P2: Post-Update Validator (needs AI validation for update safety)
- P2: FTS5 Search (AI node search improvements)

---

## Detailed CLI Integration Code

### 1. Modify `src/core/validator.ts`

```typescript
// Add import at top of file (after existing imports)
import { hasAINodes, validateAISpecificNodes } from './validation/ai-nodes.js';

// Add inside validateWorkflowStructure() function, after connection validation (around line 366)
// Look for: return { valid: errors.length === 0, ...

  // AI-specific validation (add BEFORE the return statement)
  if (Array.isArray(wf.nodes) && hasAINodes(wf)) {
    const aiIssues = validateAISpecificNodes(wf);
    for (const issue of aiIssues) {
      const enriched = enrichWithSourceInfo({
        code: issue.code || 'AI_VALIDATION_ERROR',
        severity: issue.severity,
        message: issue.message,
        location: {
          nodeName: issue.nodeName,
          nodeId: issue.nodeId,
        },
      }, sourceMap, issue.nodeName ? `nodes.${issue.nodeName}` : '');
      
      issues.push(enriched);
      if (issue.severity === 'error') {
        errors.push(issue.message);
      } else if (issue.severity === 'warning') {
        warnings.push(issue.message);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings, issues, nodeTypeIssues };
```

### 2. Add Types to `src/core/types.ts`

```typescript
// Add after line 23 (after Workflow interface, around line 24)

export interface ReverseConnection {
  sourceName: string;
  sourceType: string;
  type: string;  // main, ai_tool, ai_languageModel, ai_memory, etc.
  index: number;
}

export interface AIValidationIssue {
  severity: 'error' | 'warning' | 'info';
  nodeId?: string;
  nodeName?: string;
  message: string;
  code?: string;
}
```

### 3. Create `src/core/validation/index.ts`

```typescript
/**
 * Validation Module - Re-exports all validators
 */

export { 
  hasAINodes, 
  validateAISpecificNodes,
  buildReverseConnectionMap,
  AI_CONNECTION_TYPES 
} from './ai-nodes.js';

export { 
  isAIToolSubNode, 
  validateAIToolSubNode,
  AI_TOOL_VALIDATORS 
} from './ai-tool-validators.js';
```

### 4. Create `src/core/validation/ai-nodes.ts` (Skeleton)

```typescript
/**
 * AI Node Validator
 * Port from n8n-mcp/src/services/ai-node-validator.ts
 */

import { NodeTypeNormalizer } from '../../utils/node-type-normalizer.js';
import type { Workflow, WorkflowNode, ReverseConnection, AIValidationIssue } from '../types.js';
import { isAIToolSubNode, validateAIToolSubNode } from './ai-tool-validators.js';

const MIN_SYSTEM_MESSAGE_LENGTH = 20;
const MAX_ITERATIONS_WARNING_THRESHOLD = 50;

export const AI_CONNECTION_TYPES = [
  'ai_languageModel', 'ai_memory', 'ai_tool', 'ai_embedding',
  'ai_vectorStore', 'ai_document', 'ai_textSplitter', 'ai_outputParser'
] as const;

export function buildReverseConnectionMap(workflow: Workflow): Map<string, ReverseConnection[]> {
  const map = new Map<string, ReverseConnection[]>();
  
  for (const [sourceName, outputs] of Object.entries(workflow.connections || {})) {
    if (!outputs || typeof outputs !== 'object') continue;
    
    for (const [outputType, connections] of Object.entries(outputs as Record<string, unknown>)) {
      if (!Array.isArray(connections)) continue;
      
      const connArray = connections.flat().filter((c): c is { node: string; index?: number } => 
        c && typeof c === 'object' && 'node' in c
      );
      
      for (const conn of connArray) {
        if (!map.has(conn.node)) {
          map.set(conn.node, []);
        }
        map.get(conn.node)!.push({
          sourceName,
          sourceType: outputType,
          type: outputType,
          index: conn.index ?? 0
        });
      }
    }
  }
  
  return map;
}

export function hasAINodes(workflow: Workflow): boolean {
  const aiNodeTypes = [
    'nodes-langchain.agent',
    'nodes-langchain.chatTrigger',
    'nodes-langchain.chainLlm',
  ];

  return workflow.nodes.some(node => {
    const normalized = NodeTypeNormalizer.normalizeToFullForm(node.type);
    return aiNodeTypes.includes(normalized) || isAIToolSubNode(normalized);
  });
}

export function validateAISpecificNodes(workflow: Workflow): AIValidationIssue[] {
  const issues: AIValidationIssue[] = [];
  const reverseConnectionMap = buildReverseConnectionMap(workflow);

  for (const node of workflow.nodes) {
    if (node.disabled) continue;

    const normalizedType = NodeTypeNormalizer.normalizeToFullForm(node.type);

    if (normalizedType === 'nodes-langchain.agent') {
      issues.push(...validateAIAgent(node, reverseConnectionMap, workflow));
    }
    
    if (normalizedType === 'nodes-langchain.chatTrigger') {
      issues.push(...validateChatTrigger(node, workflow, reverseConnectionMap));
    }
    
    if (normalizedType === 'nodes-langchain.chainLlm') {
      issues.push(...validateBasicLLMChain(node, reverseConnectionMap));
    }
    
    if (isAIToolSubNode(normalizedType)) {
      issues.push(...validateAIToolSubNode(node, normalizedType, reverseConnectionMap, workflow));
    }
  }

  return issues;
}

// ... validateAIAgent, validateChatTrigger, validateBasicLLMChain implementations
// Port from n8n-mcp/src/services/ai-node-validator.ts:147-535
```

### 5. Modify `src/commands/workflows/validate.ts`

```typescript
// Update ValidateOptions interface (around line 19)
interface ValidateOptions {
  file?: string;
  profile?: 'minimal' | 'runtime' | 'ai-friendly' | 'strict';  // Already has ai-friendly
  repair?: boolean;
  fix?: boolean;
  save?: string;
  json?: boolean;
}

// Add profile-specific messaging (around line 76, after profile check)
if (opts.profile === 'ai-friendly' && !opts.json) {
  console.log(chalk.cyan(`\n${icons.info} AI-Friendly Profile: Enhanced validation for AI Agent workflows`));
  console.log(chalk.dim('   Checks: LLM connections, streaming mode, tool configs, memory limits\n'));
}
```

---

## Testing Requirements

### Unit Tests (`src/core/validation/__tests__/ai-nodes.test.ts`)

```typescript
describe('AI Node Validator', () => {
  describe('hasAINodes', () => {
    it('returns true for workflow with AI Agent');
    it('returns true for workflow with Chat Trigger');
    it('returns true for workflow with Basic LLM Chain');
    it('returns true for workflow with AI tools');
    it('returns false for workflow without AI nodes');
  });

  describe('buildReverseConnectionMap', () => {
    it('maps ai_languageModel connections to consumer');
    it('maps ai_memory connections to consumer');
    it('maps ai_tool connections to consumer');
    it('handles multiple connections to same node');
  });

  describe('validateAIAgent', () => {
    it('errors on missing ai_languageModel connection');
    it('errors on > 2 ai_languageModel connections');
    it('warns on 2 LLMs without needsFallback');
    it('errors on needsFallback with only 1 LLM');
    it('errors on hasOutputParser=true without parser connection');
    it('errors on streaming mode with main output connections');
    it('errors on promptType=define without text');
    it('warns on maxIterations > 50');
    it('passes valid AI Agent configuration');
  });

  describe('validateChatTrigger', () => {
    it('errors on streaming mode with non-Agent target');
    it('errors on streaming Agent with main outputs');
    it('info on lastNode mode with Agent (suggest streaming)');
    it('passes valid streaming configuration');
  });
});
```

### Integration Tests

```bash
# Test file validation with AI workflows
n8n workflows validate tests/fixtures/ai-agent-valid.json
n8n workflows validate tests/fixtures/ai-agent-missing-llm.json
n8n workflows validate tests/fixtures/chat-trigger-streaming.json

# Test with profile
n8n workflows validate workflow.json --profile ai-friendly
```

---

## Acceptance Criteria

1. **Detection**: `hasAINodes()` correctly identifies workflows containing AI Agent, Chat Trigger, Basic LLM Chain, or any of 13 AI tool types

2. **AI Agent Validation**:
   - ❌ Error if no `ai_languageModel` connection
   - ❌ Error if `hasOutputParser=true` without parser connection
   - ❌ Error if streaming mode with main output connections
   - ⚠️ Warning if 2 LLMs without `needsFallback`
   - ℹ️ Info if no `systemMessage` defined

3. **Chat Trigger Validation**:
   - ❌ Error if `responseMode="streaming"` with non-Agent target
   - ❌ Error if streaming Agent has main output connections
   - ℹ️ Info suggesting streaming when using lastNode with Agent

4. **CLI Commands**:
   ```bash
   # Works with file validation
   n8n workflows validate ai-workflow.json
   
   # Works with API validation
   n8n workflows validate abc123
   
   # Works with AI profile
   n8n workflows validate ai-workflow.json --profile ai-friendly
   ```

5. **Output Format**:
   ```
   ╔═══════════════════════════════════════════════════════════╗
   ║ ❌ AI Validation Error                                    ║
   ╠═══════════════════════════════════════════════════════════╣
   ║ Node: "AI Agent"                                          ║
   ║ Code: MISSING_LANGUAGE_MODEL                              ║
   ║ Error: AI Agent requires an ai_languageModel connection   ║
   ║                                                           ║
   ║ Connect one of these nodes:                               ║
   ║   • nodes-langchain.lmChatOpenAi                          ║
   ║   • nodes-langchain.lmChatAnthropic                       ║
   ║   • nodes-langchain.lmChatGoogleGemini                    ║
   ╚═══════════════════════════════════════════════════════════╝
   ```

6. **Exit Codes**:
   - `0` if valid (no errors)
   - `1` if invalid (has errors)

---

## Estimated Effort

| Item | Estimate |
|------|----------|
| **Complexity** | Medium |
| **New Files** | 3 (`ai-nodes.ts`, `ai-tool-validators.ts`, `index.ts`) |
| **Modified Files** | 3 (`validator.ts`, `types.ts`, `workflows/validate.ts`) |
| **Lines of Code** | ~750-850 (port + adaptation) |
| **Time** | 2-3 days |

### Breakdown

1. Port `buildReverseConnectionMap` + `hasAINodes` — 2 hours
2. Port `validateAIAgent` (15 rules) — 4 hours
3. Port `validateChatTrigger` — 2 hours
4. Port `validateBasicLLMChain` — 1 hour
5. Port 13 AI tool validators — 4 hours
6. Integrate into `validator.ts` — 2 hours
7. Add types to `types.ts` — 1 hour
8. Unit tests — 4 hours
9. Integration tests — 2 hours
10. Documentation — 2 hours

---

## Implementation Notes

### MCP Pattern Differences

The MCP uses `Logger` and has async database access. The CLI port should:
1. Remove logging (use CLI's existing error patterns)
2. Make all functions synchronous (no DB lookups needed for validation)
3. Use existing `NodeTypeNormalizer` from `src/utils/`

### Node Type Normalization

Both MCP and CLI use identical `NodeTypeNormalizer`. Use `normalizeToFullForm()` (which actually normalizes to short form for DB) when checking node types:

```typescript
const normalizedType = NodeTypeNormalizer.normalizeToFullForm(node.type);
if (normalizedType === 'nodes-langchain.agent') {
  // This is an AI Agent
}
```

### Error Message Quality

MCP error messages include actionable suggestions. Preserve this pattern:
```typescript
message: `AI Agent "${node.name}" requires an ai_languageModel connection. ` +
         `Connect a language model node (e.g., OpenAI Chat Model, Anthropic Chat Model).`
```
