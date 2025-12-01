# BUG-003: workflows validate --save fails when validating local file

## Command
```bash
n8n workflows validate /tmp/missing-fields.json --fix --save /tmp/fixed-workflow.json
```

## Expected
Should validate the local file, apply fixes, and save to the output path.

## Actual
```
❌ Invalid workflow ID "/tmp/missing-fields.json": must contain only alphanumeric characters, dashes, and underscores
```

The command incorrectly treats the file path as a workflow ID when --save is used.

## Root Cause
The `--save` flag seems to trigger a code path that attempts API validation instead of local file validation.

## Impact
- Cannot use --fix --save workflow for local files
- Breaks offline workflow fixing use case

## Severity
Medium - Core workflow for fixing workflows doesn't work

## Tested
- Date: 2025-11-30
- CLI Version: 1.5.1
