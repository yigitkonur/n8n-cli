# n8n CLI Commands Reference

This document contains all available commands, subcommands, and flags for the n8n CLI tool.

## Global Options

These options are available on all commands:

| Flag | Description |
|------|-------------|
| `-v, --verbose` | Enable verbose/debug output |
| `-q, --quiet` | Suppress non-essential output |
| `--no-color` | Disable colored output |
| `--profile <name>` | Use specific configuration profile |
| `-V, --version` | Output version number |
| `-h, --help` | Display help |

---

## auth

Manage n8n CLI authentication

### auth login

Configure n8n credentials

| Flag | Description |
|------|-------------|
| `-H, --host <url>` | n8n instance URL (e.g., https://your-n8n.com) |
| `-k, --api-key <key>` | n8n API key |
| `-i, --interactive` | Use interactive mode with prompts |
| `--json` | Output as JSON |

### auth status

Show current authentication status

| Alias | `whoami` |
|-------|----------|

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### auth logout

Clear stored credentials

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

---

## health

Check n8n instance connectivity and API status

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

---

## nodes

Search, list, and inspect n8n nodes

### nodes list

List all available nodes

| Flag | Description | Default |
|------|-------------|---------|
| `--by-category` | Group nodes by category | |
| `-c, --category <name>` | Filter by category | |
| `-s, --search <query>` | Search with fuzzy matching | |
| `-l, --limit <n>` | Limit results (0 = all) | `0` |
| `--compact` | Compact table format | |
| `--save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### nodes show <nodeType>

Show node details with configurable detail level and specialized modes

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --detail <level>` | Detail level: minimal (~200 tokens), standard (~1-2K), full (~3-8K) | `standard` |
| `-m, --mode <mode>` | Operation mode: info, docs, search-properties, versions, compare, breaking, migrations | `info` |
| `--query <term>` | Property search term (for search-properties mode) | |
| `--from <version>` | Source version (for compare, breaking, migrations) | |
| `--to <version>` | Target version (for compare, migrations) | |
| `--max-results <n>` | Max property search results | `20` |
| `--include-type-info` | Include type structure metadata | |
| `--include-examples` | Include real-world configuration examples | |
| `--schema` | Legacy: equivalent to --detail full | |
| `--minimal` | Legacy: equivalent to --detail minimal | |
| `--examples` | Legacy: equivalent to --include-examples | |
| `-s, --save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### nodes categories

List all node categories with counts

| Flag | Description |
|------|-------------|
| `--detailed` | Show descriptions and examples |
| `-s, --save <path>` | Save to JSON file |
| `--json` | Output as JSON |

### nodes search <query>

Search for nodes by keyword

| Flag | Description | Default |
|------|-------------|---------|
| `-m, --mode <mode>` | Search mode: OR, AND, FUZZY | `OR` |
| `-l, --limit <n>` | Limit results | `10` |
| `-s, --save <path>` | Save full results to JSON file | |
| `--json` | Output as JSON | |

### nodes get <nodeType>

Get node schema (alias for "show")

| Flag | Description | Default |
|------|-------------|---------|
| `-m, --mode <mode>` | Output mode: info, docs, versions | `info` |
| `-d, --detail <level>` | Detail level: minimal, standard, full | `standard` |
| `--json` | Output as JSON | |
| `-s, --save <path>` | Save to JSON file | |

### nodes validate <nodeType>

Validate node configuration

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --config <json>` | Node config as JSON string | `{}` |
| `-P, --validation-profile <profile>` | Validation profile: minimal, runtime, ai-friendly, strict | `runtime` |
| `-M, --validation-mode <mode>` | Validation mode: minimal, operation, full | `operation` |
| `--json` | Output as JSON | |

### nodes breaking-changes <nodeType>

Analyze breaking changes between node versions

| Flag | Description | Default |
|------|-------------|---------|
| `--from <version>` | Source version (default: 1.0) | |
| `--to <version>` | Target version (default: latest known) | |
| `--severity <level>` | Filter by severity: LOW, MEDIUM, HIGH | |
| `--auto-only` | Show only auto-migratable changes | |
| `-s, --save <path>` | Save analysis to JSON file | |
| `--json` | Output as JSON | |

---

## workflows

Manage n8n workflows

### workflows list

List all workflows

| Flag | Description | Default |
|------|-------------|---------|
| `-a, --active` | Filter active workflows only | |
| `-t, --tags <tags>` | Filter by tags (comma-separated) | |
| `-l, --limit <n>` | Limit results | `10` |
| `--cursor <cursor>` | Pagination cursor | |
| `-s, --save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### workflows get <id>

Get workflow by ID

| Flag | Description | Default |
|------|-------------|---------|
| `-m, --mode <mode>` | Output mode: full, details, structure, minimal | `full` |
| `-s, --save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### workflows validate [idOrFile]

Validate a workflow (by ID or local file)

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --file <path>` | Path to workflow JSON file | |
| `-P, --validation-profile <profile>` | Validation profile: minimal, runtime, ai-friendly, strict | `runtime` |
| `-M, --validation-mode <mode>` | Validation mode: minimal, operation, full | `operation` |
| `--repair` | Attempt to repair malformed JSON | |
| `--fix` | Auto-fix known issues | |
| `--check-upgrades` | Check for node version upgrades and breaking changes | |
| `--upgrade-severity <level>` | Minimum severity for upgrade warnings: LOW, MEDIUM, HIGH | |
| `--check-versions` | Check for outdated node typeVersions | |
| `--version-severity <level>` | Version issue severity: info, warning, error | `warning` |
| `--skip-community-nodes` | Skip version checks for community nodes | |
| `--validate-expressions` | Enable expression format validation (default: true) | |
| `--no-validate-expressions` | Skip expression format validation | |
| `-s, --save <path>` | Save fixed workflow to file | |
| `--json` | Output as JSON | |

### workflows create

Create a new workflow

| Flag | Description |
|------|-------------|
| `-f, --file <path>` | Path to workflow JSON file (required) |
| `-n, --name <name>` | Workflow name (overrides file) |
| `--dry-run` | Preview without creating |
| `--skip-validation` | Skip pre-API validation (not recommended) |
| `--json` | Output as JSON |

### workflows update <id>

Update workflow with partial changes

| Flag | Description |
|------|-------------|
| `-o, --operations <json>` | Diff operations as JSON |
| `-f, --file <path>` | Path to workflow JSON file |
| `-n, --name <name>` | New workflow name |
| `--activate` | Activate the workflow |
| `--deactivate` | Deactivate the workflow |
| `--skip-validation` | Skip pre-API validation (not recommended) |
| `--force, --yes` | Skip confirmation prompts |
| `--no-backup` | Skip creating backup before changes |
| `--json` | Output as JSON |

### workflows autofix <idOrFile>

Auto-fix workflow validation issues with confidence-based filtering

| Flag | Description | Default |
|------|-------------|---------|
| `--preview` | Preview fixes without applying (default) | |
| `--apply` | Apply fixes (to file or n8n server) | |
| `--confidence <level>` | Minimum confidence: high, medium, low | `medium` |
| `--fix-types <types>` | Comma-separated fix types to apply (default: all) | |
| `--upgrade-versions` | Apply version migration fixes for node upgrades | |
| `--target-version <version>` | Target version for upgrades (default: latest) | |
| `--max-fixes <n>` | Maximum number of fixes to apply | `50` |
| `-s, --save <path>` | Save fixed workflow locally | |
| `--force, --yes` | Skip confirmation prompts | |
| `--no-backup` | Skip creating backup before changes | |
| `--no-guidance` | Suppress post-update guidance display | |
| `--json` | Output as JSON | |

### workflows diff <id>

Apply incremental diff operations to a workflow

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --operations <json>` | Diff operations (JSON string or @file.json) | |
| `-f, --file <path>` | Path to operations JSON file | |
| `--dry-run` | Validate without applying changes | `false` |
| `--continue-on-error` | Apply valid operations, report failures | `false` |
| `--skip-validation` | Skip pre-API validation (not recommended) | |
| `--force, --yes` | Skip confirmation prompts | |
| `--no-backup` | Skip creating backup before changes | |
| `-s, --save <path>` | Save result workflow to file | |
| `--json` | Output as JSON | |

### workflows trigger <webhookUrl>

Trigger workflow via webhook

| Flag | Description | Default |
|------|-------------|---------|
| `-d, --data <json>` | Request body as JSON | `{}` |
| `-m, --method <method>` | HTTP method: GET, POST, PUT, DELETE | `POST` |
| `--json` | Output as JSON | |

### workflows tags <id>

Get or set workflow tags

| Flag | Description |
|------|-------------|
| `--set <tagIds>` | Comma-separated tag IDs to assign |
| `--force, --yes` | Skip confirmation prompt |
| `--json` | Output as JSON |

### workflows export <id>

Export workflow to JSON file

| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Output file path (prints to stdout if not specified) |
| `--full` | Include all fields (don't strip server-generated fields) |
| `--json` | Output as JSON |

### workflows import <file>

Import workflow from JSON file

| Flag | Description |
|------|-------------|
| `-n, --name <name>` | Workflow name (overrides file) |
| `--dry-run` | Preview without creating |
| `--activate` | Activate workflow after import |
| `--skip-validation` | Skip pre-API validation (not recommended) |
| `--json` | Output as JSON |

### workflows activate

Activate workflow(s)

| Flag | Description |
|------|-------------|
| `--ids <ids>` | Comma-separated workflow IDs |
| `--all` | Activate all workflows |
| `--force, --yes` | Skip confirmation prompt |
| `--json` | Output as JSON |

### workflows deactivate

Deactivate workflow(s)

| Flag | Description |
|------|-------------|
| `--ids <ids>` | Comma-separated workflow IDs |
| `--all` | Deactivate all workflows |
| `--force, --yes` | Skip confirmation prompt |
| `--json` | Output as JSON |

### workflows delete

Delete workflow(s)

| Flag | Description |
|------|-------------|
| `--ids <ids>` | Comma-separated workflow IDs |
| `--all` | Delete all workflows (DANGEROUS) |
| `--force, --yes` | Skip confirmation prompt |
| `--no-backup` | Skip creating backup before delete |
| `--json` | Output as JSON |

### workflows deploy-template <templateId>

Deploy workflow template from n8n.io directly to your instance

| Flag | Description |
|------|-------------|
| `-n, --name <name>` | Custom workflow name (overrides template name) |
| `--no-autofix` | Skip auto-fix of common issues (expression format, Switch v3+) |
| `--keep-credentials` | Preserve credential references (default: strip) |
| `--dry-run` | Preview deployment without creating workflow |
| `--skip-validation` | Skip pre-API validation (not recommended) |
| `-s, --save <path>` | Save workflow JSON locally |
| `--json` | Output as JSON |

### workflows versions [id]

Manage workflow version history, rollback, and cleanup

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --limit <n>` | Limit version history results | `10` |
| `--get <version-id>` | Get specific version details | |
| `--rollback` | Rollback to previous version | |
| `--to-version <id>` | Specific version ID for rollback | |
| `--skip-validation` | Skip validation before rollback | |
| `--compare <v1,v2>` | Compare two versions (comma-separated IDs) | |
| `--delete <version-id>` | Delete specific version | |
| `--delete-all` | Delete all versions for workflow | |
| `--prune` | Prune old versions | |
| `--keep <n>` | Keep N most recent versions (with --prune) | `5` |
| `--stats` | Show storage statistics (no workflow ID required) | |
| `--truncate-all` | Delete ALL versions for ALL workflows | |
| `--force, --yes` | Skip confirmation prompts | |
| `--no-backup` | Skip creating backup before rollback | |
| `-s, --save <path>` | Save version snapshot to JSON file | |
| `--json` | Output as JSON | |

---

## executions

View and manage workflow executions

### executions list

List executions

| Flag | Description | Default |
|------|-------------|---------|
| `-w, --workflow-id <id>` | Filter by workflow ID | |
| `--status <status>` | Filter by status: success, error, waiting | |
| `-l, --limit <n>` | Limit results | `10` |
| `--cursor <cursor>` | Pagination cursor | |
| `-s, --save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### executions get <id>

Get execution details

| Flag | Description | Default |
|------|-------------|---------|
| `-m, --mode <mode>` | Output mode: preview, summary, filtered, full | `summary` |
| `-s, --save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### executions retry <id>

Retry a failed execution

| Flag | Description |
|------|-------------|
| `--load-latest` | Use latest workflow version instead of snapshot |
| `--json` | Output as JSON |

### executions delete <id>

Delete an execution

| Flag | Description |
|------|-------------|
| `--force, --yes` | Skip confirmation prompt |
| `--json` | Output as JSON |

---

## credentials

Manage n8n credentials

### credentials list

List all credentials

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --limit <n>` | Limit results | `10` |
| `--cursor <cursor>` | Pagination cursor | |
| `-s, --save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### credentials schema <typeName>

Get credential type schema

| Flag | Description |
|------|-------------|
| `-s, --save <path>` | Save to JSON file |
| `--json` | Output as JSON |

### credentials create

Create a new credential

| Flag | Description |
|------|-------------|
| `-d, --data <json>` | Credential data as JSON or @file.json |
| `--json` | Output as JSON |

### credentials delete <id>

Delete a credential

| Flag | Description |
|------|-------------|
| `--force, --yes` | Skip confirmation prompt |
| `--json` | Output as JSON |

### credentials types

List all available credential types

| Flag | Description | Default |
|------|-------------|---------|
| `--by-auth` | Group by authentication method | |
| `-s, --search <query>` | Search credential types | |
| `-l, --limit <n>` | Limit results | `0` |
| `--save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### credentials show-type <typeName>

Show credential type schema

| Flag | Description |
|------|-------------|
| `-s, --save <path>` | Save to JSON file |
| `--json` | Output as JSON |

---

## variables

Manage n8n environment variables

### variables list

List all variables

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --limit <n>` | Limit results | `100` |
| `--cursor <cursor>` | Pagination cursor | |
| `-s, --save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### variables create

Create a new variable

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### variables update <id>

Update a variable

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### variables delete <id>

Delete a variable

| Flag | Description |
|------|-------------|
| `--force, --yes` | Skip confirmation prompt |
| `--json` | Output as JSON |

---

## tags

Manage n8n tags

### tags list

List all tags

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --limit <n>` | Limit results | `100` |
| `--cursor <cursor>` | Pagination cursor | |
| `-s, --save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |

### tags get <id>

Get tag by ID

| Flag | Description |
|------|-------------|
| `-s, --save <path>` | Save to JSON file |
| `--json` | Output as JSON |

### tags create

Create a new tag

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### tags update <id>

Update a tag

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### tags delete <id>

Delete a tag

| Flag | Description |
|------|-------------|
| `--force, --yes` | Skip confirmation prompt |
| `--json` | Output as JSON |

---

## audit

Generate security audit for n8n instance

| Flag | Description |
|------|-------------|
| `-c, --categories <list>` | Comma-separated categories: credentials,database,nodes,filesystem,instance |
| `--days-abandoned <n>` | Days for workflow to be considered abandoned |
| `-s, --save <path>` | Save report to JSON file |
| `--json` | Output as JSON |

---

## templates

Search and get workflow templates

### templates search [query]

Search templates by keyword, nodes, task, or metadata

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --limit <n>` | Limit results | `10` |
| `-s, --save <path>` | Save to JSON file | |
| `--json` | Output as JSON | |
| `--by-nodes <types>` | Search by node types (comma-separated) | |
| `--by-task <task>` | Search by task type | |
| `--complexity <level>` | Filter by complexity (simple, medium, complex) | |
| `--max-setup <minutes>` | Maximum setup time in minutes | |
| `--min-setup <minutes>` | Minimum setup time in minutes | |
| `--service <name>` | Filter by required service | |
| `--audience <type>` | Filter by target audience | |
| `--local` | Force local database search | |

### templates get <id>

Get template by ID

| Flag | Description |
|------|-------------|
| `-s, --save <path>` | Save workflow to JSON file |
| `--json` | Output as JSON |

### templates list-tasks

List available task types for --by-task search

---

## validate

Validate workflow JSON file (legacy command)

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

---

## config

View and manage CLI configuration

### config show

Display current configuration

---

## completion

Generate shell completion scripts

### completion <shell>

---

*Generated programmatically from n8n CLI source code*
