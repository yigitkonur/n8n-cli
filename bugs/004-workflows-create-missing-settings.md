# BUG-004: workflows create fails - missing required 'settings' property

## Command
```bash
n8n workflows create --file /tmp/test-create-workflow.json
```

## Workflow File
```json
{
  "name": "CLI Test Workflow",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.manualTrigger", 
      "typeVersion": 1,
      "position": [0, 0],
      "parameters": {}
    }
  ],
  "connections": {}
}
```

## Expected
Should create the workflow (or preview in dry-run mode), adding default settings if missing.

## Actual
```
❌ Invalid request: request/body must have required property 'settings'
```

## Root Cause
The CLI doesn't add default `settings` object when it's missing from the workflow file, but the n8n API requires it.

## Suggested Fix
Add default settings in the create command:
```javascript
if (!workflow.settings) {
  workflow.settings = { executionOrder: 'v1' };
}
```

## Impact
- Cannot create workflows from simple JSON files
- Users must manually add settings to every workflow file

## Severity
High - Core functionality broken

## Tested
- Date: 2025-11-30
- CLI Version: 1.5.1
