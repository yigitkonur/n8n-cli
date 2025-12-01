<h1 align="center">n8n-cli</h1>
<h3 align="center">The Agent-First CLI for n8n Workflow Automation</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/n8n-cli"><img alt="npm" src="https://img.shields.io/npm/v/n8n-cli.svg?style=flat-square"></a>
  <a href="#"><img alt="node" src="https://img.shields.io/badge/node-≥18-blue.svg?style=flat-square"></a>
  <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.3-blue.svg?style=flat-square"></a>
  <a href="https://opensource.org/licenses/MIT"><img alt="license" src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square"></a>
</p>

<p align="center">
  Built for AI agents that create, validate, and deploy n8n workflows.<br/>
  <strong>JSON output everywhere</strong> • <strong>Schema-aware validation</strong> • <strong>800+ nodes bundled offline</strong>
</p>

---

## Table of Contents

- [Why Agent-First?](#why-agent-first)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Commands](#commands)
  - [Global Options](#global-options)
  - [workflows](#workflows)
  - [nodes](#nodes)
  - [credentials](#credentials)
  - [executions](#executions)
  - [variables](#variables)
  - [tags](#tags)
  - [templates](#templates)
  - [audit](#audit)
  - [auth](#auth)
  - [health](#health)
  - [config](#config)
  - [completion](#completion)
- [Exit Codes](#exit-codes)
- [Agent Integration](#agent-integration)
- [Development](#development)
- [License](#license)

---

## Why Agent-First?

This CLI is designed for **AI agents** that generate n8n workflows programmatically. Instead of streaming large JSON through MCP tool calls (which causes hallucinations), agents can:

1. **Write** workflow JSON to a local file
2. **Validate** with `n8n workflows validate workflow.json --json`
3. **Get structured errors** with schema hints showing exactly what's wrong
4. **Iterate locally** until valid (no network latency)
5. **Deploy** with `n8n workflows import workflow.json`

**Key design principles:**
- Every command supports `--json` for machine-readable output
- Validation errors include `correctUsage` showing the exact schema to use
- 800+ nodes bundled for offline node lookup and validation
- POSIX-standard exit codes for scripting
- Predictable command structure: `n8n <resource> <action> [options]`

---

## Installation

```bash
# Run directly with npx (no install)
npx n8n-cli --help

# Or install globally
npm install -g n8n-cli
n8n --help
```

**Requirements:** Node.js 18+

---

## Quick Start

### For AI Agents

```bash
# Validate a workflow file (returns structured JSON with errors/hints)
n8n workflows validate workflow.json --json

# Search for nodes (800+ bundled offline)
n8n nodes search "slack" --json

# Get node schema with all properties
n8n nodes show n8n-nodes-base.slack --schema --json

# Deploy workflow to n8n instance
export N8N_HOST="https://your-n8n.com"
export N8N_API_KEY="your-api-key"
n8n workflows import workflow.json --json
```

### For Humans

```bash
# Check connection to n8n instance
n8n health

# List workflows
n8n workflows list

# Export a workflow
n8n workflows export abc123 -o backup.json

# Validate and auto-fix
n8n workflows validate workflow.json --fix --save fixed.json
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_HOST` | Yes* | n8n instance URL (e.g., `https://n8n.example.com`) |
| `N8N_API_KEY` | Yes* | API key from n8n Settings → API |
| `N8N_PROFILE` | No | Default configuration profile name |
| `N8N_DEBUG` | No | Set to `true` for debug logging |
| `NO_COLOR` | No | Disable colored output |

*Required for API commands (workflows list/create, credentials, etc.). Not required for offline commands (nodes, validate).

### Configuration File

Create `~/.n8nrc` or `.n8nrc` in your project:

```ini
# Simple format
N8N_HOST=https://n8n.example.com
N8N_API_KEY=your-api-key
```

### Configuration Profiles

For multiple environments, use profiles:

```json
{
  "default": "prod",
  "profiles": {
    "prod": {
      "host": "https://n8n.example.com",
      "apiKey": "prod-api-key"
    },
    "dev": {
      "host": "http://localhost:5678",
      "apiKey": "dev-api-key"
    }
  }
}
```

Use with `--profile dev` or `N8N_PROFILE=dev`.

---

## Commands

### Global Options

These options work with all commands:

| Option | Description |
|--------|-------------|
| `-V, --version` | Output version number |
| `-v, --verbose` | Enable verbose/debug output |
| `-q, --quiet` | Suppress non-essential output |
| `--no-color` | Disable colored output |
| `--profile <name>` | Use specific configuration profile |
| `-h, --help` | Display help |

---

### workflows

Manage n8n workflows.

#### `workflows list`

List all workflows from your n8n instance.

```bash
n8n workflows list [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-a, --active` | Filter active workflows only | - |
| `-t, --tags <tags>` | Filter by tags (comma-separated) | - |
| `-l, --limit <n>` | Limit results (0 = all) | `10` |
| `--cursor <cursor>` | Pagination cursor | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

#### `workflows get`

Get a workflow by ID.

```bash
n8n workflows get <id> [options]
```

| Option | Description |
|--------|-------------|
| `-s, --save <path>` | Save to JSON file |
| `--json` | Output as JSON |

#### `workflows validate`

Validate a workflow JSON file or by ID.

```bash
n8n workflows validate [idOrFile] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | Path to workflow JSON file | - |
| `--profile <profile>` | Validation profile: `minimal`, `runtime`, `ai-friendly`, `strict` | `runtime` |
| `--repair` | Attempt to repair malformed JSON | - |
| `--fix` | Auto-fix known issues | - |
| `-s, --save <path>` | Save fixed workflow | - |
| `--json` | Output as JSON | - |

**Example JSON output:**
```json
{
  "valid": false,
  "errors": [{
    "code": "N8N_PARAMETER_VALIDATION_ERROR",
    "nodeName": "Switch",
    "schemaDelta": { "missing": ["options"], "extra": ["fallbackOutput"] },
    "correctUsage": { "conditions": { "options": { "caseSensitive": true } } }
  }]
}
```

#### `workflows create`

Create a new workflow.

```bash
n8n workflows create [options]
```

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Path to workflow JSON file |
| `-n, --name <name>` | Workflow name |
| `--activate` | Activate after creation |
| `--json` | Output as JSON |

#### `workflows import`

Import workflow from JSON file.

```bash
n8n workflows import <file> [options]
```

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Override workflow name |
| `--dry-run` | Preview without creating |
| `--activate` | Activate after import |
| `--json` | Output as JSON |

#### `workflows export`

Export workflow to JSON file.

```bash
n8n workflows export <id> [options]
```

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Output file path (stdout if not specified) |
| `--full` | Include all fields (don't strip server-generated) |
| `--json` | Output as JSON |

#### `workflows update`

Update an existing workflow.

```bash
n8n workflows update <id> [options]
```

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Path to workflow JSON file |
| `-n, --name <name>` | New workflow name |
| `--activate` | Activate the workflow |
| `--deactivate` | Deactivate the workflow |
| `--json` | Output as JSON |

#### `workflows activate` / `deactivate` / `delete`

Bulk workflow operations.

```bash
n8n workflows activate [options]
n8n workflows deactivate [options]
n8n workflows delete [options]
```

| Option | Description |
|--------|-------------|
| `--ids <ids>` | Comma-separated workflow IDs |
| `--all` | Apply to all workflows (DANGEROUS for delete) |
| `--force, --yes` | Skip confirmation prompt |
| `--no-backup` | Skip backup before delete |
| `--json` | Output as JSON |

**Safety features:**
- `--json` alone does NOT bypass confirmation (prevents CI accidents)
- Deleting >10 workflows or using `--all` requires typing `DELETE {count}` to confirm
- Automatic backup to `~/.n8n-cli/backups/` before delete (use `--no-backup` to skip)

#### `workflows trigger`

Trigger a workflow via webhook.

```bash
n8n workflows trigger <webhookUrl> [options]
```

| Option | Description |
|--------|-------------|
| `-d, --data <json>` | Request body (JSON string or @file.json) |
| `-m, --method <method>` | HTTP method | `POST` |
| `--no-wait` | Don't wait for response |
| `--json` | Output as JSON |

#### `workflows tags`

Get or set workflow tags.

```bash
n8n workflows tags <id> [options]
```

| Option | Description |
|--------|-------------|
| `--set <tagIds>` | Set tags (comma-separated tag IDs) |
| `--json` | Output as JSON |

#### `workflows autofix`

Auto-fix workflow validation issues.

```bash
n8n workflows autofix <id> [options]
```

| Option | Description |
|--------|-------------|
| `--save` | Save fixes back to n8n |
| `--json` | Output as JSON |

---

### nodes

Search, list, and inspect n8n nodes. **Offline - 800+ nodes bundled.**

#### `nodes list`

List all available nodes.

```bash
n8n nodes list [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--by-category` | Group nodes by category | - |
| `-c, --category <name>` | Filter by category | - |
| `-s, --search <query>` | Search with fuzzy matching | - |
| `-l, --limit <n>` | Limit results (0 = all) | `0` |
| `--compact` | Compact table format | - |
| `--save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

#### `nodes search`

Search for nodes by keyword.

```bash
n8n nodes search <query> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mode <mode>` | Search mode: `OR`, `AND`, `FUZZY` | `OR` |
| `-l, --limit <n>` | Limit results | `10` |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

**Search modes:**
- `OR` (default): Match any term
- `AND`: Match all terms
- `FUZZY`: Typo-tolerant (e.g., "gogle" finds "google")

#### `nodes show`

Show node details with schema.

```bash
n8n nodes show <nodeType> [options]
```

| Option | Description |
|--------|-------------|
| `--schema` | Show full property schema |
| `--minimal` | Show only operations |
| `--examples` | Show usage examples |
| `--json` | Output as JSON |

#### `nodes categories`

List all node categories.

```bash
n8n nodes categories [options]
```

| Option | Description |
|--------|-------------|
| `--detailed` | Show category descriptions |
| `--json` | Output as JSON |

#### `nodes validate`

Validate node configuration.

```bash
n8n nodes validate <nodeType> [options]
```

| Option | Description |
|--------|-------------|
| `--config <json>` | Node configuration to validate |
| `--json` | Output as JSON |

---

### credentials

Manage n8n credentials.

#### `credentials list`

List all credentials.

```bash
n8n credentials list [options]
```

| Option | Description |
|--------|-------------|
| `--type <type>` | Filter by credential type |
| `--json` | Output as JSON |

#### `credentials create`

Create a new credential.

```bash
n8n credentials create [options]
```

| Option | Description |
|--------|-------------|
| `--type <type>` | **Required.** Credential type (e.g., `githubApi`) |
| `--name <name>` | **Required.** Credential name |
| `--data <json>` | Credential data (JSON string or @file.json) |
| `--json` | Output as JSON |

**Security tip:** Use `--data @file.json` to avoid secrets in shell history.

#### `credentials delete`

Delete a credential.

```bash
n8n credentials delete <id> [options]
```

| Option | Description |
|--------|-------------|
| `--force` | Skip confirmation |
| `--json` | Output as JSON |

#### `credentials schema`

Get credential type schema from n8n API.

```bash
n8n credentials schema <typeName> [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

#### `credentials types`

List all available credential types. **Offline - 200+ types bundled.**

```bash
n8n credentials types [options]
```

| Option | Description |
|--------|-------------|
| `--by-auth` | Group by authentication method |
| `--search <query>` | Search credential types |
| `--json` | Output as JSON |

#### `credentials show-type`

Show credential type schema.

```bash
n8n credentials show-type <typeName> [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

---

### executions

View and manage workflow executions.

#### `executions list`

List recent executions.

```bash
n8n executions list [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-w, --workflow <id>` | Filter by workflow ID | - |
| `--status <status>` | Filter by status: `success`, `error`, `waiting` | - |
| `-l, --limit <n>` | Limit results | `10` |
| `--json` | Output as JSON | - |

#### `executions get`

Get execution details.

```bash
n8n executions get <id> [options]
```

| Option | Description |
|--------|-------------|
| `--include-data` | Include execution data |
| `--json` | Output as JSON |

#### `executions retry`

Retry a failed execution.

```bash
n8n executions retry <id> [options]
```

| Option | Description |
|--------|-------------|
| `--load-latest` | Use latest workflow version (not execution snapshot) |
| `--json` | Output as JSON |

#### `executions delete`

Delete an execution.

```bash
n8n executions delete <id> [options]
```

| Option | Description |
|--------|-------------|
| `--force` | Skip confirmation |
| `--json` | Output as JSON |

---

### variables

Manage n8n environment variables. **Requires n8n Enterprise/Pro license.**

#### `variables list`

```bash
n8n variables list [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

#### `variables create`

```bash
n8n variables create [options]
```

| Option | Description |
|--------|-------------|
| `--key <key>` | **Required.** Variable key |
| `--value <value>` | **Required.** Variable value |
| `--json` | Output as JSON |

#### `variables update`

```bash
n8n variables update <id> [options]
```

| Option | Description |
|--------|-------------|
| `--key <key>` | New key |
| `--value <value>` | New value |
| `--json` | Output as JSON |

#### `variables delete`

```bash
n8n variables delete <id> [options]
```

| Option | Description |
|--------|-------------|
| `--force` | Skip confirmation |
| `--json` | Output as JSON |

---

### tags

Manage n8n tags.

#### `tags list`

```bash
n8n tags list [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

#### `tags get`

```bash
n8n tags get <id> [options]
```

#### `tags create`

```bash
n8n tags create [options]
```

| Option | Description |
|--------|-------------|
| `--name <name>` | **Required.** Tag name |
| `--json` | Output as JSON |

#### `tags update`

```bash
n8n tags update <id> [options]
```

| Option | Description |
|--------|-------------|
| `--name <name>` | New tag name |
| `--json` | Output as JSON |

#### `tags delete`

```bash
n8n tags delete <id> [options]
```

| Option | Description |
|--------|-------------|
| `--force` | Skip confirmation |
| `--json` | Output as JSON |

---

### templates

Search and download workflow templates from n8n.io.

#### `templates search`

```bash
n8n templates search <query> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Limit results | `10` |
| `--json` | Output as JSON | - |

#### `templates get`

```bash
n8n templates get <id> [options]
```

| Option | Description |
|--------|-------------|
| `-s, --save <path>` | Save template to file |
| `--json` | Output as JSON |

---

### audit

Generate security audit for n8n instance.

```bash
n8n audit [options]
```

| Option | Description |
|--------|-------------|
| `-c, --categories <list>` | Categories: `credentials`, `database`, `nodes`, `filesystem`, `instance` |
| `--days-abandoned <n>` | Days for workflow to be considered abandoned |
| `-s, --save <path>` | Save report to JSON file |
| `--json` | Output as JSON |

---

### auth

Manage CLI authentication.

#### `auth login`

Configure n8n credentials.

```bash
n8n auth login [options]
```

| Option | Description |
|--------|-------------|
| `-H, --host <url>` | n8n instance URL |
| `-k, --api-key <key>` | API key |
| `-i, --interactive` | Interactive setup with prompts |

#### `auth status`

Show current authentication status.

```bash
n8n auth status [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

#### `auth logout`

Clear stored credentials.

```bash
n8n auth logout [options]
```

| Option | Description |
|--------|-------------|
| `--force` | Skip confirmation |

---

### health

Check n8n instance connectivity.

```bash
n8n health [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

**Checks performed:**
- DNS resolution and network connectivity
- HTTPS/TLS certificate validity
- API endpoint responds
- API key authentication works
- Response time (latency)

---

### config

View CLI configuration.

#### `config show`

Display current configuration.

```bash
n8n config show [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

---

### completion

Generate shell completion scripts.

```bash
n8n completion <shell>
```

**Supported shells:** `bash`, `zsh`, `fish`

```bash
# Bash - add to ~/.bashrc
source <(n8n completion bash)

# Zsh - add to ~/.zshrc
source <(n8n completion zsh)

# Fish
n8n completion fish > ~/.config/fish/completions/n8n.fish
```

---

## Exit Codes

The CLI uses POSIX-standard exit codes for scripting:

| Code | Name | Description |
|------|------|-------------|
| `0` | SUCCESS | Command completed successfully |
| `1` | GENERAL | General/unknown error |
| `64` | USAGE | Invalid arguments or unknown command |
| `65` | DATAERR | Invalid input data or resource not found |
| `66` | NOINPUT | Cannot open input file |
| `70` | IOERR | I/O error (network/connection failure) |
| `71` | TEMPFAIL | Temporary failure (rate limit - retry later) |
| `72` | PROTOCOL | Protocol error (API/server error) |
| `73` | NOPERM | Permission denied (authentication error) |
| `78` | CONFIG | Configuration error |

**Usage in scripts:**
```bash
n8n workflows validate workflow.json --json
case $? in
  0) echo "Valid" ;;
  65) echo "Validation errors" ;;
  70) echo "Network error - retry" ;;
  73) echo "Auth failed - check API key" ;;
esac
```

---

## Agent Integration

### Recommended Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT WORKFLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Agent generates workflow JSON                           │
│     └─> Writes to local file: workflow.json                │
│                                                             │
│  2. Agent validates locally                                 │
│     └─> n8n workflows validate workflow.json --json        │
│                                                             │
│  3. CLI returns structured feedback                         │
│     └─> { "valid": false, "errors": [...] }                │
│                                                             │
│  4. Agent fixes issues based on schema hints                │
│     └─> errors[].correctUsage shows exact structure        │
│                                                             │
│  5. Agent re-validates (repeat until valid)                 │
│     └─> Tight local loop, no network latency               │
│                                                             │
│  6. Agent deploys to n8n                                    │
│     └─> n8n workflows import workflow.json --json          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why Local Files Beat MCP Streaming

| MCP Streaming | CLI + Local Files |
|---------------|-------------------|
| Large JSON causes LLM hallucinations | Agent controls file completely |
| Token limits force chunking | Full workflow in one file |
| Complex protocol errors | Simple exit codes |
| Network latency per iteration | Local validation is instant |

### JSON Output Guarantees

All commands with `--json` return structured output:

```bash
# Success response
{ "success": true, "data": {...} }

# Error response
{ "success": false, "error": { "code": "...", "message": "..." } }

# Validation response
{ "valid": false, "errors": [...], "warnings": [...] }
```

---

## Development

```bash
# Clone
git clone https://github.com/yigitkonur/n8n-cli.git
cd n8n-cli

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/cli.js --help

# Type check
npm run typecheck

# Run tests
npm test
```

---

## License

MIT © [Yigit Konur](https://github.com/yigitkonur)
