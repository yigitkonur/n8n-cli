# JSON Output Schemas

This directory documents the JSON output structure for all n8n CLI commands that support `--json` output.

## Overview

All commands with `--json` output produce structured data suitable for:
- Piping to `jq` for extraction and transformation
- Parsing in scripts (bash, Python, Node.js)
- CI/CD automation pipelines
- Integration with other tools

## Schema Documents

| File | Commands Covered |
|------|-----------------|
| [workflows.md](./workflows.md) | `workflows list`, `workflows get`, `workflows validate`, `workflows export`, `workflows import`, `workflows autofix` |
| [nodes.md](./nodes.md) | `nodes list`, `nodes search`, `nodes show`, `nodes categories` |
| [executions.md](./executions.md) | `executions list`, `executions get`, `executions delete` |
| [audit.md](./audit.md) | `audit` security report |
| [templates.md](./templates.md) | `templates search`, `templates get`, `templates deploy-template` |

## Quick Start

```bash
# List workflows and extract names
n8n workflows list --json | jq '.workflows[].name'

# Validate and check if valid
n8n workflows validate workflow.json --json | jq '.valid'

# Search nodes and get types
n8n nodes search "http" --json | jq '.nodes[].type'

# Get audit findings
n8n audit --json | jq 'keys'
```

## Common Patterns

### Check Command Success
```bash
if n8n workflows validate file.json --json | jq -e '.valid' > /dev/null; then
  echo "Valid!"
fi
```

### Extract Error Messages
```bash
n8n workflows validate file.json --json | jq -r '.errors[]'
```

### Count Results
```bash
n8n nodes list --json | jq '.total'
```

## Version Compatibility

JSON output schemas are stable within minor versions (e.g., 1.8.x → 1.8.y).
Major version upgrades may introduce breaking changes to schema structure.
