# Command: n8n workflows autofix

## Source Reference

### ✅ YOUR EXISTING LIBRARY (USE THESE)

You already have autofix logic - **DO NOT copy MCP autofix services:**

| Your File | Purpose |
|-----------|---------|
| `src/core/fixer.ts` | Autofix logic |
| `src/core/sanitizer.ts` | Node sanitization |
| `src/core/validator.ts` | Validation (used before fixing) |

### Additional from MCP (if needed)

**Only copy these if your library doesn't have equivalents:**
- `n8n-mcp/src/services/confidence-scorer.ts` (211 lines) → Fix confidence scoring
- `n8n-mcp/src/types/workflow-diff.ts` (216 lines) → Fix operation types

**MCP Tool Doc (for CLI behavior reference):** `n8n-mcp/mcp-tools/016-n8n_autofix_workflow.md`

## CLI Command

```bash
n8n workflows autofix [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--id` | string | - | Workflow ID from n8n instance |
| `--from-file, -f` | string | - | Path to workflow JSON file |
| `--output-path, -o` | string | - | Path to write fixed workflow (file mode) |
| `--apply` | boolean | false | Apply fixes (default: preview only) |
| `--fix-types` | string[] | all | Types: expression-format, typeversion-correction, etc. |
| `--confidence-threshold` | string | medium | Threshold: high, medium, low |
| `--max-fixes` | number | 50 | Maximum fixes to apply |
| `--save, -s` | string | - | Save fix report to JSON |

## Implementation

### 1. Read Autofix Logic

From `n8n-mcp/src/mcp/tools/autofix.ts`:
- Fix type detection
- Confidence scoring
- Fix application logic

From `n8n-mcp/src/autofix/`:
- `ExpressionFixer` - Fix expression format
- `TypeVersionFixer` - Fix typeVersion mismatches
- `ErrorOutputFixer` - Fix error output conflicts
- `WebhookPathFixer` - Generate missing webhook paths
- `NodeTypeFixer` - Fix unknown node types
- `VersionUpgradeFixer` - Smart version upgrades

### 2. Output Format

**Terminal (preview mode - default):**
```
🔧 Auto-fix Preview: Workflow abc123

Mode: PREVIEW (no changes will be made)
Confidence threshold: medium (≥70%)

╭─ Proposed Fixes
╰─

Found 5 fixable issues:

1. ✅ HIGH CONFIDENCE (95%) - Expression format
   Node: Set
   Field: parameters.assignments[0].value
   Current: "{{$json.status}}"
   Fixed: "={{$json.status}}"

2. ✅ MEDIUM CONFIDENCE (75%) - Webhook path
   Node: Webhook
   Current: (not set)
   Fixed: "/webhook-abc123-5f2d8a"

📊 Fix Summary:
    Total: 5
    High confidence: 3
    Medium confidence: 2

⚠️  Preview only - no changes made

💡 To apply fixes:
   n8n workflows autofix --id abc123 --apply
   n8n workflows autofix --id abc123 --apply --confidence-threshold high

⚠️  ALWAYS re-validate after applying:
   n8n workflows validate --id abc123
```

**Terminal (after --apply):**
```
🔧 Auto-fix Applied: Workflow abc123

Applied 5 fixes to workflow.

╭─ Applied Fixes
╰─

1. ✅ Expression format - Set node
2. ✅ Webhook path - Webhook node
...

📊 Summary:
    Applied: 5
    Skipped: 0
    Failed: 0

⚠️  IMPORTANT: Re-validate the workflow:
   n8n workflows validate --id abc123
```

## Files to Create

1. `src/commands/workflows/AutofixCommand.ts` - Clipanion command
2. `src/core/validators/autofix.ts` - Autofix logic (steal from MCP)
3. `src/core/validators/fixers/` - Individual fixer classes

## Fix Types (from MCP)

| Type | Description | Confidence |
|------|-------------|------------|
| `expression-format` | Missing '=' prefix | High |
| `typeversion-correction` | Downgrade unsupported versions | High |
| `error-output-config` | Remove conflicting onError | Medium |
| `node-type-correction` | Fix unknown node types | Medium |
| `webhook-missing-path` | Generate webhook paths | Medium |
| `typeversion-upgrade` | Smart version upgrades | Medium |
| `version-migration` | Complex migration | Low |

## Code Outline

```typescript
// src/commands/workflows/AutofixCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class WorkflowsAutofixCommand extends BaseCommand {
  static paths = [['workflows', 'autofix']];
  
  static usage = {
    description: 'Automatically fix common workflow validation errors',
    details: `
      Intelligent error repair with confidence-based filtering.
      Default: PREVIEW mode (no changes).
      
      Fix types:
        expression-format - Missing '=' prefix
        typeversion-correction - Fix version mismatches
        error-output-config - Remove conflicts
        webhook-missing-path - Generate paths
        typeversion-upgrade - Smart upgrades
      
      Examples:
        $ n8n workflows autofix --id abc123
        $ n8n workflows autofix --id abc123 --apply
        $ n8n workflows autofix --id abc123 --apply --confidence-threshold high
        $ n8n workflows autofix --from-file workflow.json --output-path fixed.json
    `,
    category: 'Validation',
  };

  id = Option.String('--id');
  fromFile = Option.String('-f,--from-file');
  outputPath = Option.String('-o,--output-path');
  apply = Option.Boolean('--apply', { default: false });
  fixTypes = Option.Array('--fix-types');
  confidenceThreshold = Option.String('--confidence-threshold', { default: 'medium' });
  maxFixes = Option.Number('--max-fixes', { default: 50 });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Default is preview mode
    // Read autofix logic from n8n-mcp/src/autofix/
    return 0;
  }
}
```

## Autofix Logic (From MCP Services)

**Read `n8n-mcp/src/services/workflow-auto-fixer.ts` lines 94-180:**
```typescript
export type FixType = 
  | 'expression-format'    // HIGH: Missing '=' prefix
  | 'typeversion-correction' // HIGH: Downgrade unsupported versions
  | 'error-output-config'  // MEDIUM: Remove conflicting onError
  | 'node-type-correction' // MEDIUM: Fix unknown node types
  | 'webhook-missing-path' // MEDIUM: Generate webhook paths
  | 'typeversion-upgrade'  // MEDIUM: Smart version upgrades
  | 'version-migration';   // LOW: Complex migration

export class WorkflowAutoFixer {
  constructor(repository?: NodeRepository) {
    // Initializes: similarityService, versionService, 
    // breakingChangeDetector, migrationService, postUpdateValidator
  }
  
  async generateFixes(
    workflow: Workflow,
    validationResult: WorkflowValidationResult,
    formatIssues: ExpressionFormatIssue[],
    config: Partial<AutoFixConfig>
  ): Promise<AutoFixResult> {
    // Processes: expression format, typeVersion, error output, 
    // node type, webhook path, version upgrade, migrations
  }
}
```

**Confidence calculation:** See `n8n-mcp/src/services/confidence-scorer.ts` for scoring logic
