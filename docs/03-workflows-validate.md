# Command: n8n workflows validate

## Source Reference

### ✅ YOUR EXISTING LIBRARY (USE THESE)

You already have validation logic - **DO NOT copy MCP validation services:**

| Your File | Purpose |
|-----------|---------|
| `src/core/validator.ts` | Main workflow validator |
| `src/core/n8n-native-validator.ts` | Native n8n validation |
| `src/core/types.ts` | Validation types |

### Additional from MCP (if needed)

**Only copy these if your library doesn't have equivalents:**
- `n8n-mcp/src/utils/node-type-normalizer.ts` → Type normalization
- `n8n-mcp/src/database/node-repository.ts` → Node schema lookup

**MCP Tool Doc (for CLI behavior reference):** `n8n-mcp/mcp-tools/015-n8n_validate_workflow.md`

## CLI Command

```bash
n8n workflows validate [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--id` | string | - | Workflow ID from n8n instance |
| `--from-file, -f` | string | - | Path to workflow JSON file |
| `--use-native-validation` | boolean | true | Use n8n native validation |
| `--profile` | string | runtime | Profile: minimal, runtime, ai-friendly, strict |
| `--validate-nodes` | boolean | true | Validate node configs |
| `--validate-connections` | boolean | true | Validate connections |
| `--validate-expressions` | boolean | true | Validate expressions |
| `--save, -s` | string | - | Save validation report to JSON |

## Implementation

### 1. Read Validation Logic

From `n8n-mcp/src/mcp/tools/validation.ts`:
- Native n8n validation integration
- Node configuration validation
- Connection integrity checks
- Expression syntax validation

From `n8n-mcp/src/validation/`:
- `validateWorkflowStructure()` - Structure checks
- `validateNodeConfiguration()` - Per-node validation
- `validateConnections()` - Connection graph validation
- `validateExpressions()` - Expression parser

### 2. Output Format

**Terminal (valid workflow):**
```
🔍 Validating workflow: abc123

Workflow: "Webhook to Slack"
Validator: Native n8n validation (matches editor)
Validation time: 234ms

╭─ Validation Results
╰─

✅ VALID - All checks passed

Structure:
    ✓ 5 nodes present
    ✓ 4 connections configured
    ✓ Trigger node present (Webhook)

📊 Summary:
    Valid: YES
    Errors: 0
    Warnings: 0
    Profile: runtime

💡 Next steps:
   n8n workflows get abc123 --save workflow.json
   n8n workflows create --from-file workflow.json --dry-run
```

**Terminal (invalid workflow):**
```
🔍 Validating workflow: abc123

╭─ Validation Results
╰─

❌ INVALID - 2 errors, 3 warnings found

Errors (2):
    ❌ HTTP Request node: Missing required field
        Node: HTTP Request
        Field: url
        Message: URL parameter is required
        
    ❌ Slack node: Invalid credentials
        Node: Slack
        Field: credentials
        Message: Credential ID 'slack-123' not found

Warnings (3):
    ⚠️  Webhook: Using default path
    ...

📊 Summary:
    Valid: NO
    Errors: 2
    Warnings: 3

💡 Next steps:
   n8n workflows autofix abc123
   n8n workflows autofix abc123 --apply --confidence-threshold high
```

## Files to Create

1. `src/commands/workflows/ValidateCommand.ts` - Clipanion command
2. `src/core/validators/workflow.ts` - Validation logic (steal from MCP)
3. `src/core/validators/node.ts` - Node validation (steal from MCP)
4. `src/core/validators/expressions.ts` - Expression validation

## Code Outline

```typescript
// src/commands/workflows/ValidateCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class WorkflowsValidateCommand extends BaseCommand {
  static paths = [['workflows', 'validate']];
  
  static usage = {
    description: 'Validate workflow structure and configuration',
    details: `
      Quality gate before workflow creation or updates.
      
      Validates:
        • Node configurations
        • Connection integrity
        • Expression syntax
        • Required fields
      
      Examples:
        $ n8n workflows validate --id abc123
        $ n8n workflows validate --from-file workflow.json
        $ n8n workflows validate --id abc123 --profile strict
    `,
    category: 'Validation',
  };

  id = Option.String('--id');
  fromFile = Option.String('-f,--from-file');
  useNativeValidation = Option.Boolean('--use-native-validation', { default: true });
  profile = Option.String('--profile', { default: 'runtime' });
  validateNodes = Option.Boolean('--validate-nodes', { default: true });
  validateConnections = Option.Boolean('--validate-connections', { default: true });
  validateExpressions = Option.Boolean('--validate-expressions', { default: true });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Must have either --id or --from-file
    if (!this.id && !this.fromFile) {
      this.context.stderr.write('Error: Must provide --id or --from-file\n');
      return 1;
    }

    // Read validation logic from n8n-mcp/src/validation/
    return 0;
  }
}
```

## Validation Logic (From MCP Services)

**Read `n8n-mcp/src/services/workflow-validator.ts` lines 80-130:**
```typescript
export class WorkflowValidator {
  constructor(
    private nodeRepository: NodeRepository,
    private nodeValidator: typeof EnhancedConfigValidator
  ) {
    this.similarityService = new NodeSimilarityService(nodeRepository);
  }
  
  async validateWorkflow(
    workflow: WorkflowJson,
    options: {
      validateNodes?: boolean;       // Default: true
      validateConnections?: boolean; // Default: true
      validateExpressions?: boolean; // Default: true
      profile?: 'minimal' | 'runtime' | 'ai-friendly' | 'strict';
    }
  ): Promise<WorkflowValidationResult>
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  statistics: {
    totalNodes: number;
    enabledNodes: number;
    triggerNodes: number;
    validConnections: number;
    invalidConnections: number;
    expressionsValidated: number;
  };
  suggestions: string[];
}
```

**Validation profiles:** Defined within `WorkflowValidator` - controls strictness level
