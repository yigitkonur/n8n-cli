# Quick Start

## Install & Build

```bash
cd /Users/yigitkonur/n8n-validator
npm install
npm run build
```

## Validate Your Workflow

```bash
# Detect issues
node dist/cli.js ~/workspace/planning/n8n/04-document-upload-process-trigger.json

# Auto-fix and save
node dist/cli.js ~/workspace/planning/n8n/04-document-upload-process-trigger.json \
  --fix \
  --out ~/workspace/planning/n8n/04-document-upload-process-trigger.json
```

## Common Commands

```bash
# Validate
node dist/cli.js workflow.json

# Fix and save to new file
node dist/cli.js workflow.json --fix --out fixed.json

# JSON output for scripts
node dist/cli.js workflow.json --json

# Batch validate
for file in ~/workspace/planning/n8n/*.json; do
  node dist/cli.js "$file" --json | jq -r '"\(.input | split("/") | last): \(if .valid then "✓" else "✗" end)"'
done
```

## The Issue We Fixed

**Error:** "Could not find property option"

**Cause:** Invalid `"options": {}` at parameters root in IF/Switch nodes

**Fix:** `--fix` flag removes these invalid fields

**Before:**
```json
{
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": { "options": {...} },
    "options": {}  ← INVALID
  }
}
```

**After:**
```json
{
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": { "options": {...} }
  }
}
```

## Exit Codes

- `0` = Valid
- `1` = Invalid

Perfect for CI/CD pipelines!
