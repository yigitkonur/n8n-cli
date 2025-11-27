# n8n Workflow Validator

[![npm version](https://img.shields.io/npm/v/n8n-workflow-validator.svg)](https://www.npmjs.com/package/n8n-workflow-validator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Standalone CLI tool that validates n8n workflow JSON files using **n8n's native validation engine**. Provides rich error diagnostics with schema-based hints—ideal for LLM-powered agents that generate n8n workflows.

## Features

- **Native n8n validation**: Uses `NodeHelpers.getNodeParameters` from `n8n-workflow`
- **Schema-aware hints**: Shows correct parameter structure derived from node schemas  
- **Delta detection**: Identifies missing/extra keys vs expected schema
- **Source locations**: Line/column numbers with code snippets
- **Auto-fixers**: Repairs common schema issues (Switch v3 conditions, etc.)

## Quick Start

```bash
npx n8n-workflow-validator workflow.json
npx n8n-workflow-validator workflow.json --fix --out fixed.json
npx n8n-workflow-validator workflow.json --json  # For LLM consumption
```

## Rich Error Output

```
❌ INVALID: workflow.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛑 ERRORS (1)

────────────────────────────────────────────────────────────────────────────────
[1] N8N_PARAMETER_VALIDATION_ERROR
    Path: nodes[12]
    Location: Line 305, Column 5
    Node: "route-by-format" (n8n-nodes-base.switch)

    Message: Could not find property option

    Source:
    ┌──────┬────────────────────────────────────────────────────────────
    │ 302 │          "typeVersion": 2,
    │ 303 │          "onError": "continueErrorOutput"
    │ 304 │        },
    │ 305 │>>>     {
    │ 306 │          "parameters": {
    └──────┴────────────────────────────────────────────────────────────

    Root Cause Analysis:
      • n8n Runtime Error: "Could not find property option"

    Schema Delta:
      • Missing keys: options
      • Extra keys: fallbackOutput

    Correct Usage:
    ```json
    {
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict"
        },
        "conditions": [...],
        "combinator": "and"
      }
    }
    ```
```

## JSON Output for LLMs & Automation

```bash
npx n8n-workflow-validator workflow.json --json
```

Returns structured data with schema hints for programmatic consumption:

```json
{
  "valid": false,
  "issues": [{
    "code": "N8N_PARAMETER_VALIDATION_ERROR",
    "severity": "error",
    "message": "Could not find property option",
    "location": {
      "nodeName": "route-by-format",
      "nodeType": "n8n-nodes-base.switch",
      "path": "nodes[12]"
    },
    "sourceLocation": { "line": 305, "column": 5 },
    "context": {
      "n8nError": "Could not find property option",
      "fullObject": { "mode": "rules", "rules": {...} },
      "expectedSchema": { "mode": "rules", "rules": {...}, "options": {...} },
      "schemaPath": "parameters"
    }
  }]
}
```

## Installation

```bash
# Use directly with npx (no install)
npx n8n-workflow-validator workflow.json

# Or install globally
npm install -g n8n-workflow-validator
n8n-validate workflow.json
```

## Options

| Option | Description |
|--------|-------------|
| `--fix` | Auto-fix known issues |
| `--json` | JSON output for programmatic use |
| `--out FILE` | Write fixed workflow to FILE |
| `--repair` | Repair malformed JSON |
| `--no-sanitize` | Skip sanitization |
| `-h, --help` | Show help |

## What It Validates

- **Native n8n schema**: Uses actual node definitions from `n8n-nodes-base`
- **Parameter validation**: `NodeHelpers.getNodeParameters` + `getNodeParametersIssues`
- **Structure**: `nodes` array, `connections` object, required fields
- **Auto-fixes**: Switch v3 filter options, fallbackOutput location

## Exit Codes

- `0` = Valid
- `1` = Invalid

## API Usage

```typescript
import { 
  validateWorkflowStructure, 
  validateNodeWithN8n,
  nodeRegistry,
  jsonParse 
} from 'n8n-workflow-validator';

const raw = fs.readFileSync('workflow.json', 'utf8');
const workflow = jsonParse(raw);
const result = validateWorkflowStructure(workflow, { rawSource: raw });

for (const issue of result.issues) {
  console.log(`[${issue.code}] ${issue.message}`);
  if (issue.context?.expectedSchema) {
    console.log('Expected:', JSON.stringify(issue.context.expectedSchema, null, 2));
  }
}
```

## License

MIT
