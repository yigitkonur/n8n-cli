# BUG-002: --profile flag has no visible effect in nodes validate

## Command
```bash
n8n nodes validate webhook --profile minimal
n8n nodes validate webhook --profile runtime
n8n nodes validate webhook --profile strict
```

## Expected
Different validation profiles should apply different levels of strictness:
- `minimal`: Basic structure only
- `runtime`: Default validation
- `strict`: Most thorough validation

## Actual
All three profiles produce identical output. The --profile flag appears to have no effect.

## Impact
- Users cannot choose validation strictness
- Documentation promises functionality that doesn't exist

## Severity
Low - Feature exists but may not be implemented

## Tested
- Date: 2025-11-30
- CLI Version: 1.5.1
