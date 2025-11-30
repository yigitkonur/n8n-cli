# Command: n8n nodes validate

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/validation.ts` or `src/validation/` - they don't exist or are thin wrappers.

**Core Logic (COPY):**
- `n8n-mcp/src/services/enhanced-config-validator.ts` (46KB) → Main node config validation
- `n8n-mcp/src/services/node-specific-validators.ts` (61KB) → Node-type-specific rules
- `n8n-mcp/src/services/type-structure-service.ts` (12KB) → Complex types (FilterValue, ResourceMapperValue, AssignmentCollectionValue)
- `n8n-mcp/src/services/property-dependencies.ts` (8.3KB) → Conditional required fields

**Schema lookup:**
- `n8n-mcp/src/database/node-repository.ts` → `NodeRepository.getNode()` for schema

**Validation profiles:**
- `minimal` - Required fields only
- `runtime` - Match n8n editor behavior
- `ai-friendly` - Balanced for AI agents (default)
- `strict` - All checks, production-ready

**MCP Tool Doc:** `n8n-mcp/mcp-tools/004-validate_node.md`

## CLI Command

```bash
n8n nodes validate <nodeType> [options]
```

## Parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `<nodeType>` | positional | required | Full node type (e.g., n8n-nodes-base.slack) |
| `--from-file, -f` | string | - | Config JSON file |
| `--config` | string | - | Inline config JSON |
| `--mode` | string | full | Mode: full, minimal |
| `--profile` | string | ai-friendly | Profile: minimal, runtime, ai-friendly, strict |
| `--save, -s` | string | - | Save validation report to JSON |

## Validation Modes

| Mode | Description | Token Cost |
|------|-------------|------------|
| `minimal` | Quick required fields check only | ~200 |
| `full` | Comprehensive validation with errors/warnings/suggestions | ~800-1500 |

## Validation Profiles

| Profile | Strictness | Use Case |
|---------|------------|----------|
| `minimal` | Low | Quick sanity check |
| `runtime` | Medium | Match n8n editor behavior |
| `ai-friendly` | Medium-High | AI/LLM generated configs (DEFAULT) |
| `strict` | High | Production deployment |

## Implementation

### 1. Read Validation Logic

From `n8n-mcp/src/mcp/tools/validation.ts`:
- Node type lookup
- Configuration schema validation
- Profile-based rule application

From `n8n-mcp/src/validation/`:
- `NodeValidator` class
- Property type checking
- Required field validation

### 2. Output Format

**Terminal (valid config):**
```
🔍 Validating node configuration

Node: n8n-nodes-base.slack
Profile: ai-friendly

╭─ Validation Results
╰─

✅ VALID - Configuration is correct

Config:
  resource: "message"
  operation: "create"
  channel: { ... }
  text: "Hello!"

📊 Summary:
    Valid: YES
    Errors: 0
    Warnings: 0
    Suggestions: 1

💡 Suggestions:
    • Consider using select=channel for channel parameter

💡 Next steps:
   n8n nodes get n8n-nodes-base.slack --mode docs
   n8n workflows validate --from-file workflow.json
```

**Terminal (invalid config):**
```
🔍 Validating node configuration

Node: n8n-nodes-base.slack
Profile: ai-friendly

╭─ Validation Results
╰─

❌ INVALID - 2 errors found

Config provided:
  resource: "message"
  operation: "create"

Errors (2):
    ❌ Missing required field: channel
        When operation=create, channel is required
        
    ❌ Missing required field: text
        When operation=create, text is required

Warnings (1):
    ⚠️  No credentials specified
        Slack API requires OAuth credentials

📊 Summary:
    Valid: NO
    Errors: 2
    Warnings: 1

💡 Required config for message.create:
   {
     "resource": "message",
     "operation": "create",
     "channel": {"mode": "id", "value": "C01234567"},
     "text": "Your message here"
   }

💡 Next steps:
   n8n nodes get n8n-nodes-base.slack --mode search_properties --property-query "channel"
```

## Config Input Formats

### Inline JSON
```bash
n8n nodes validate n8n-nodes-base.slack --config '{"resource":"message","operation":"create"}'
```

### From File
```bash
n8n nodes validate n8n-nodes-base.slack --from-file slack-config.json
```

### Empty Config (validate node type exists)
```bash
n8n nodes validate n8n-nodes-base.slack
```

## Files to Create

1. `src/commands/nodes/ValidateCommand.ts` - Clipanion command
2. `src/core/validators/node.ts` - Node validation (steal from MCP)

## Code Outline

```typescript
// src/commands/nodes/ValidateCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';
import { validateNodeConfig } from '../../core/validators/node.js';
import { readFile } from '../../core/utils/file.js';

export class NodesValidateCommand extends BaseCommand {
  static paths = [['nodes', 'validate']];
  
  static usage = {
    description: 'Validate n8n node configuration',
    details: `
      Check if node configuration is valid before using in workflow.
      
      Profiles:
        minimal - Quick required fields check
        runtime - Match n8n editor validation
        ai-friendly - For AI-generated configs (DEFAULT)
        strict - Production-level validation
      
      Examples:
        $ n8n nodes validate n8n-nodes-base.slack
        $ n8n nodes validate n8n-nodes-base.slack --config '{"resource":"message"}'
        $ n8n nodes validate n8n-nodes-base.httpRequest --from-file config.json
        $ n8n nodes validate n8n-nodes-base.slack --profile strict
    `,
    category: 'Validation',
  };

  nodeType = Option.String({ required: true });
  fromFile = Option.String('-f,--from-file');
  config = Option.String('--config');
  mode = Option.String('--mode', { default: 'full' });
  profile = Option.String('--profile', { default: 'ai-friendly' });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Parse config from file or inline
    let nodeConfig = {};
    if (this.fromFile) {
      const content = await readFile(this.fromFile);
      nodeConfig = JSON.parse(content);
    } else if (this.config) {
      nodeConfig = JSON.parse(this.config);
    }

    // Validate using logic from n8n-mcp/src/validation/
    const result = await validateNodeConfig({
      nodeType: this.nodeType,
      config: nodeConfig,
      mode: this.mode,
      profile: this.profile,
    });

    // Return 0 if valid, 1 if invalid
    return result.isValid ? 0 : 1;
  }
}
```

## Use Cases

### Before Creating Workflow
```bash
# Validate each node config before building workflow
n8n nodes validate n8n-nodes-base.webhook --config '{"httpMethod":"POST"}'
n8n nodes validate n8n-nodes-base.slack --config '{"resource":"message","operation":"create","channel":{"mode":"id","value":"C123"}}'
```

### Debugging Validation Errors
```bash
# See all possible properties
n8n nodes get n8n-nodes-base.slack --mode search_properties --property-query ""

# Check specific property requirements
n8n nodes get n8n-nodes-base.slack --mode search_properties --property-query "channel"
```

### CI/CD Pipeline
```bash
# Strict validation for production
n8n nodes validate n8n-nodes-base.httpRequest --from-file config.json --profile strict --save report.json
```

## Validation Logic (Steal from MCP)

Read `n8n-mcp/src/validation/` for:
- `NodeValidator` class
- Schema loading from nodes.db
- Property type validation
- Conditional requirements (e.g., "when operation=X, field Y required")
- Profile-specific rules
