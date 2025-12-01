# Help Text Enhancements (Assumptions vs Reality)

These are discrepancies between expected behavior and actual behavior that should be clarified in help text or fixed.

---

## 1. Legacy `validate` vs `workflows validate`

### Assumption
`n8n validate --profile strict file.json` should work with profiles.

### Reality
```bash
$ n8n validate ../workflow.json --profile strict
error: unknown option '--profile'
```

Legacy `validate` only supports: `--repair`, `--fix`, `--json`, `--save`

### Fix: Help Text Enhancement
```
Usage: n8n validate [options] [file]

Validate workflow JSON file (legacy command)

⚠️  Note: For validation profiles (minimal, runtime, ai-friendly, strict),
   use: n8n workflows validate <file> --profile <profile>
```

---

## 2. `workflows create` with Exported Files

### Assumption
Exported workflow JSON files can be directly used with `n8n workflows create`.

### Reality
```bash
$ n8n workflows create --file exported-from-n8n.json
❌ Invalid request: request/body must NOT have additional properties
❌ Invalid request: request/body/tags is read-only
```

Exported workflows contain read-only properties: `id`, `versionId`, `meta`, `createdAt`, `updatedAt`, `staticData`, `pinData`, `tags`, `shared`, `homeProject`, `sharedWithProjects`

### Fix: Help Text Enhancement
```
Usage: n8n workflows create [options]

⚠️  Note: If using exported workflow files, strip read-only properties first:
   cat workflow.json | jq 'del(.id, .versionId, .tags, .pinData, .meta, .createdAt, .updatedAt, .staticData, .shared, .homeProject, .sharedWithProjects)' > clean.json
   n8n workflows create --file clean.json

💡 Tip: Use --fix with validate to auto-clean:
   n8n workflows validate workflow.json --fix --save clean.json
   n8n workflows create --file clean.json
```

---

## 3. `--dry-run` Flag Behavior

### Assumption
`--dry-run` previews the action without making changes.

### Reality
```bash
$ n8n workflows create --file workflow.json --dry-run
# Actually creates the workflow! Bug.
```

### Fix: Either fix the bug OR update help text
```
Options:
  --dry-run          Preview without creating (⚠️ CURRENTLY BROKEN - creates anyway)
```

---

## 4. Validation Profiles Differentiation

### Assumption
`--profile minimal` checks fewer things than `--profile strict`.

### Reality
All profiles return nearly identical results:
```bash
$ n8n workflows validate 6x5GoTshrGUEBvEQ --profile minimal
# 3 warnings

$ n8n workflows validate 6x5GoTshrGUEBvEQ --profile strict
# 3 warnings (same)
```

### Fix: Help Text Enhancement
```
Validation profiles:
  minimal   - Basic structure checks (fast)
  runtime   - Default: structure + node type validation
  ai-friendly - Optimized output for LLM processing
  strict    - All checks + best practices warnings

⚠️  Note: Current profiles have similar behavior. 
   Strict adds additional best-practice warnings.
```

---

## 5. `credentials list` API Limitation

### Assumption
`n8n credentials list` lists all credentials.

### Reality
```bash
$ n8n credentials list
❌ GET method not allowed [API_ERROR] (HTTP 405)
```

### Fix: Help Text Enhancement
```
⚠️  Note: credentials list requires n8n API v1.1+
   Some self-hosted instances may not support this endpoint.
   Use n8n credentials schema <type> to check credential requirements.
```

---

## 6. `variables` License Requirement

### Assumption
`n8n variables` commands work on all n8n instances.

### Reality
```bash
$ n8n variables list
❌ Your license does not allow for feat:variables (HTTP 403)
```

### Fix: Help Text Enhancement
```
Usage: n8n variables [command]

Manage n8n environment variables

⚠️  Requires: n8n Enterprise or Pro license with feat:variables
```

---

## 7. `workflows update` Requires `--force` in Non-Interactive

### Assumption
`--json` output mode works without additional flags.

### Reality
```bash
$ n8n workflows update <id> --activate --json
❌ Cannot prompt for confirmation in non-interactive mode.
Use --force or --yes to proceed without confirmation.
```

### Fix: Help Text Enhancement
```
Options:
  --force, --yes     Skip confirmation prompts (required for scripting/CI)
  --json             Output as JSON (implies non-interactive, use with --force)
```

---

## 8. Node Type Full Path Required

### Assumption
`n8n nodes get slack` finds the Slack node.

### Reality
```bash
$ n8n nodes get slack
❌ Node not found: slack

Tips:
• Use full node type: nodes-base.slack
• Search for it: n8n nodes search "slack"
```

### Fix: Already has good help text! ✅

---

## Summary: Recommended Help Text Additions

| Command | Add to Help |
|---------|-------------|
| `validate` | Note about `workflows validate` for profiles |
| `workflows create` | How to clean exported files |
| `workflows update` | Note about --force for scripting |
| `credentials list` | API version requirements |
| `variables *` | License requirement |
| `workflows validate --profile` | Profile differences explanation |
