# n8n Workflow Validator

Standalone CLI tool that validates n8n workflow JSON files using the exact same validation logic as the official n8n editor.

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Validate a workflow file
node dist/cli.js workflow.json

# Auto-fix issues
node dist/cli.js workflow.json --fix --out fixed.json

# From URL
node dist/cli.js "https://example.com/workflow.json"

# JSON output (for CI/CD)
node dist/cli.js workflow.json --json

# With repair for malformed JSON
node dist/cli.js broken.json --repair --fix
```

## What It Validates

Mirrors n8n's 4-stage import validation pipeline:

1. **JSON Parsing** - 3-tier fallback (standard → JS object → repair)
2. **Structure** - nodes array + connections object
3. **Node Fields** - type, typeVersion, position, parameters
4. **Known Issues** - Invalid `options` fields in IF/Switch nodes

## What It Fixes

- ✅ Invalid empty `options` field in IF/Switch nodes (causes "Could not find property option" error)
- ✅ Missing node names (auto-generated)
- ✅ Duplicate webhookIds (regenerated)
- ✅ Missing/duplicate node IDs (regenerated)

## Options

```
--repair             Repair malformed JSON using jsonrepair
--accept-js-object   Accept JavaScript object literals
--fix                Auto-fix known issues
--no-sanitize        Skip name/ID generation
--no-regenerate-ids  Keep existing IDs
--json               JSON output
--out FILE           Write fixed workflow to FILE
-h, --help           Show help
```

## Exit Codes

- `0` - Valid
- `1` - Invalid or errors

## Architecture

```
src/
├── core/
│   ├── json-parser.ts   # 3-tier JSON parsing (from n8n-workflow)
│   ├── types.ts         # TypeScript interfaces
│   ├── validator.ts     # Structure validation (from workflows.controller.ts)
│   ├── fixer.ts         # Auto-fix invalid options fields
│   └── sanitizer.ts     # Name/ID generation (from useCanvasOperations.ts)
├── utils/
│   ├── input-reader.ts  # File/URL/stdin handling
│   └── output.ts        # Formatted output
├── index.ts             # Public API
└── cli.ts               # CLI entry point
```

## Dependencies

- `esprima-next` - Parse JavaScript object literals
- `jsonrepair` - Repair malformed JSON

No n8n dependencies - fully standalone.

## Example

```bash
$ node dist/cli.js workflow.json --fix

✅ VALID: workflow.json
  🔧 Fixed 4 issue(s)
  Warnings:
    - Fixed node "check-document-exists": Removed invalid empty 'options' field
    - Fixed node "check-status-pending": Removed invalid empty 'options' field
    - Fixed node "route-by-format": Removed invalid empty 'options' field
    - Fixed node "check-processing-success": Removed invalid empty 'options' field
```

## License

MIT
