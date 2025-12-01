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
  - [validate (legacy)](#validate-legacy)
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
5. **Deploy** with `n8n workflows import workflow.json --json`

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

# Deploy template from n8n.io in one command
n8n workflows deploy-template 3121 --name "My Chatbot"
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_HOST` | Yes* | n8n instance URL (e.g., `https://n8n.example.com`) |
| `N8N_URL` | Yes* | Alternative to `N8N_HOST` (same behavior) |
| `N8N_API_KEY` | Yes* | API key from n8n Settings → API |
| `N8N_PROFILE` | No | Default configuration profile name |
| `N8N_TIMEOUT` | No | API request timeout in milliseconds |
| `N8N_DB_PATH` | No | Custom path to bundled nodes database |
| `N8N_DEBUG` | No | Set to `true` for debug logging |
| `DEBUG` | No | Set to `n8n-cli` for debug logging (alternative) |
| `N8N_STRICT_PERMISSIONS` | No | Set to `true` to refuse loading config files with insecure permissions |
| `NO_COLOR` | No | Disable colored output |

*Required for API commands (workflows list/create, credentials, etc.). Not required for offline commands (nodes, validate).

### Configuration File

The CLI searches for configuration in these locations (in priority order):

1. `.n8nrc` - Current directory
2. `.n8nrc.json` - Current directory (JSON format)
3. `~/.n8nrc` - Home directory
4. `~/.n8nrc.json` - Home directory (JSON format)
5. `~/.config/n8n/config.json` - XDG config directory

**Simple format** (`.n8nrc`):

```ini
N8N_HOST=https://n8n.example.com
N8N_API_KEY=your-api-key
```

**JSON format** (`.n8nrc.json`):

```json
{
  "host": "https://n8n.example.com",
  "apiKey": "your-api-key"
}
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

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mode <mode>` | Output mode: `full`, `details`, `structure`, `minimal` | `full` |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

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
| `--check-upgrades` | Check for node version upgrades and breaking changes | - |
| `--upgrade-severity <level>` | Minimum severity for upgrade warnings: `LOW`, `MEDIUM`, `HIGH` | - |
| `--validate-expressions` | Enable expression format validation | `true` |
| `--no-validate-expressions` | Skip expression format validation | - |
| `-s, --save <path>` | Save fixed workflow | - |
| `--json` | Output as JSON | - |

**Version Upgrade Checking:**

Use `--check-upgrades` to analyze nodes in the workflow for available version upgrades:

```bash
# Check for upgrade recommendations
n8n workflows validate workflow.json --check-upgrades

# Get JSON output with upgrade analysis
n8n workflows validate workflow.json --check-upgrades --json

# Only show high severity breaking changes
n8n workflows validate workflow.json --check-upgrades --upgrade-severity HIGH
```

**Expression Format Validation:**

The CLI validates that n8n expressions have the required `=` prefix. Expressions like `{{ $json.field }}` are detected as errors because they won't be evaluated without the prefix.

```bash
# Validate workflow with expression checking (default)
n8n workflows validate workflow.json

# Skip expression validation (e.g., for templates)
n8n workflows validate workflow.json --no-validate-expressions
```

**Example JSON output for expression errors:**
```json
{
  "valid": false,
  "errors": [{
    "code": "EXPRESSION_MISSING_PREFIX",
    "nodeName": "HTTP Request",
    "path": "nodes[0].parameters.url",
    "context": {
      "value": "{{ $json.endpoint }}",
      "expected": "={{ $json.endpoint }}"
    }
  }]
}
```

**Node Type Suggestions:**

When the CLI detects an unknown or misspelled node type, it provides intelligent suggestions using fuzzy matching. This helps quickly identify and fix typos:

```bash
# Validation with typo in node type
n8n workflows validate workflow.json

# Output includes suggestions:
# ⚠️ INVALID_NODE_TYPE_FORMAT
#    Node "HTTP Request" has invalid type "httprequest"
#    💡 Did you mean: n8n-nodes-base.httpRequest? (95% match)
#    Did you mean:
#      • n8n-nodes-base.httpRequest (95% match) ✓ auto-fixable
```

The JSON output includes structured suggestions:
```json
{
  "valid": false,
  "issues": [{
    "code": "INVALID_NODE_TYPE_FORMAT",
    "message": "Node has invalid type \"httprequest\"",
    "suggestions": [
      { "value": "n8n-nodes-base.httpRequest", "confidence": 0.95, "reason": "Missing package prefix", "autoFixable": true }
    ],
    "hint": "Did you mean: n8n-nodes-base.httpRequest? (95% match)"
  }]
}
```

Use `n8n workflows autofix` with `--fix-types node-type-correction` to automatically fix high-confidence matches (>90%):
```bash
n8n workflows autofix workflow.json --apply --fix-types node-type-correction
```

**Example JSON output for structural errors:**
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

**AI Node Validation:**

The CLI includes specialized validation for AI Agent workflows. These checks catch common misconfigurations that would cause runtime failures:

| AI Node Type | Validations |
|--------------|-------------|
| **AI Agent** | LLM connection required, fallback model config, output parser, streaming mode, memory limits, tool connections, maxIterations, prompt/systemMessage |
| **Chat Trigger** | Streaming mode requires AI Agent target, agent can't have main outputs in streaming |
| **Basic LLM Chain** | Single LLM required, no fallback support, no tools allowed |
| **AI Tools (12 types)** | HTTP Request, Code, Vector Store, Workflow, MCP Client, Calculator, Think, SerpApi, Wikipedia, SearXNG, WolframAlpha |

```bash
# Validate AI workflow with enhanced AI checks
n8n workflows validate ai-workflow.json --profile ai-friendly

# JSON output includes AI-specific error codes
n8n workflows validate ai-workflow.json --json
```

**AI Validation Error Codes:**

| Code | Description |
|------|-------------|
| `MISSING_LANGUAGE_MODEL` | AI Agent/Chain requires ai_languageModel connection |
| `TOO_MANY_LANGUAGE_MODELS` | Maximum 2 LLMs allowed (for fallback) |
| `FALLBACK_MISSING_SECOND_MODEL` | needsFallback=true but only 1 LLM connected |
| `MISSING_OUTPUT_PARSER` | hasOutputParser=true but no parser connected |
| `STREAMING_WITH_MAIN_OUTPUT` | Agent in streaming mode can't have main outputs |
| `STREAMING_WRONG_TARGET` | Streaming mode only works with AI Agent |
| `MULTIPLE_MEMORY_CONNECTIONS` | Only 1 memory connection allowed |
| `MISSING_TOOL_DESCRIPTION` | AI tool requires toolDescription |
| `MISSING_PROMPT_TEXT` | promptType="define" but text is empty |

#### `workflows create`

Create a new workflow.

```bash
n8n workflows create [options]
```

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Path to workflow JSON file |
| `-n, --name <name>` | Workflow name |
| `--dry-run` | Preview without creating |
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
| `-o, --operations <json>` | Diff operations as JSON |
| `-n, --name <name>` | New workflow name |
| `--activate` | Activate the workflow |
| `--deactivate` | Deactivate the workflow |
| `--force, --yes` | Skip confirmation prompts |
| `--no-backup` | Skip creating backup before changes |
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

| Option | Description | Default |
|--------|-------------|--------|
| `-d, --data <json>` | Request body (JSON string or @file.json) | `{}` |
| `-m, --method <method>` | HTTP method: GET, POST, PUT, DELETE | `POST` |
| `--json` | Output as JSON | - |

#### `workflows tags`

Get or set workflow tags.

```bash
n8n workflows tags <id> [options]
```

| Option | Description |
|--------|-------------|
| `--set <tagIds>` | Set tags (comma-separated tag IDs) |
| `--force, --yes` | Skip confirmation prompt |
| `--json` | Output as JSON |

#### `workflows autofix`

Advanced autofix engine with confidence-based filtering for workflow validation issues.

```bash
n8n workflows autofix <idOrFile> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--preview` | Preview fixes without applying | (default) |
| `--apply` | Apply fixes (to file or n8n server) | - |
| `--confidence <level>` | Minimum confidence: `high`, `medium`, `low` | `medium` |
| `--fix-types <types>` | Comma-separated fix types to apply | all |
| `--upgrade-versions` | Apply version migration fixes from breaking changes registry | - |
| `--target-version <version>` | Target version for upgrades | Latest |
| `--max-fixes <n>` | Maximum number of fixes | `50` |
| `-s, --save <path>` | Save fixed workflow locally | - |
| `--force, --yes` | Skip confirmation prompts | - |
| `--no-backup` | Skip creating backup before changes | - |
| `--no-guidance` | Suppress post-update guidance display | - |
| `--json` | Output as JSON | - |

**Fix Types and Confidence Levels:**

| Fix Type | Confidence | Description |
|----------|------------|-------------|
| `expression-format` | HIGH | Add missing `=` prefix to `{{ }}` expressions |
| `node-type-correction` | HIGH | Fix typos in node types (when >90% match) |
| `webhook-missing-path` | HIGH | Generate UUID paths for webhook nodes |
| `switch-options` | HIGH | Fix Switch/If node options and conditions |
| `typeversion-correction` | MEDIUM | Fix version exceeding max supported |
| `error-output-config` | MEDIUM | Remove invalid onError settings |
| `typeversion-upgrade` | MEDIUM | Suggest version upgrades |
| `version-migration` | LOW | Breaking change migration hints |

**Post-Update Guidance:**

After applying fixes, the autofix command displays actionable migration guidance for each affected node:

- **Confidence Scores**: Each upgrade is rated HIGH, MEDIUM, or LOW based on remaining manual work
- **Required Actions**: Step-by-step list of manual tasks needed after the fix
- **Behavior Changes**: Documents how node behavior changed between versions
- **Estimated Time**: Expected time to complete manual verification

The guidance is included in JSON output (`--json`) as a `postUpdateGuidance` array. Use `--no-guidance` to suppress the guidance display.

**Example Guidance Output:**
```
╔══════════════════════════════════════════════════════════════════════╗
║ ℹ Post-Update Guidance                                               ║
╠══════════════════════════════════════════════════════════════════════╣
║ Node: My Switch (abc12345...)                                        ║
║ Type: n8n-nodes-base.switch                                          ║
║ Version: v3 → v3                                                     ║
╟──────────────────────────────────────────────────────────────────────╢
║ Status: ◐ Partial                                                    ║
║ Confidence: MEDIUM                                                   ║
║ Est. Time: 2-5 minutes                                               ║
╟──────────────────────────────────────────────────────────────────────╢
║ ℹ Behavior Changes (1):                                              ║
║   • Rule evaluation                                                  ║
║     Review rule conditions and ensure type matching is correct.      ║
╚══════════════════════════════════════════════════════════════════════╝
```

**Examples:**
```bash
# Preview all fixes (default mode)
n8n workflows autofix abc123

# Preview from local file
n8n workflows autofix workflow.json

# Apply only high-confidence fixes
n8n workflows autofix abc123 --apply --confidence high

# Filter to specific fix types
n8n workflows autofix abc123 --fix-types expression-format,webhook-missing-path

# Save fixed workflow locally
n8n workflows autofix workflow.json --save fixed.json

# Apply with JSON output for scripting
n8n workflows autofix abc123 --apply --force --json

# Apply fixes without guidance display
n8n workflows autofix abc123 --apply --no-guidance
```

#### `workflows versions`

Manage workflow version history, rollback, and cleanup. Versions are created automatically when you update or autofix workflows, stored locally in `~/.n8n-cli/data.db`.

```bash
n8n workflows versions [id] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Limit version history results | `10` |
| `--get <version-id>` | Get specific version details | - |
| `--rollback` | Rollback to previous version | - |
| `--to-version <id>` | Specific version ID for rollback | - |
| `--skip-validation` | Skip validation before rollback | - |
| `--compare <v1,v2>` | Compare two versions (comma-separated IDs) | - |
| `--delete <version-id>` | Delete specific version | - |
| `--delete-all` | Delete all versions for workflow | - |
| `--prune` | Prune old versions | - |
| `--keep <n>` | Keep N most recent (with --prune) | `5` |
| `--stats` | Show storage statistics (no ID required) | - |
| `--truncate-all` | Delete ALL versions for ALL workflows | - |
| `--force, --yes` | Skip confirmation prompts | - |
| `-s, --save <path>` | Save version snapshot to JSON file | - |
| `--json` | Output as JSON | - |

**Auto-pruning:** Keeps max 10 versions per workflow automatically.

**Examples:**
```bash
# List version history
n8n workflows versions abc123

# View storage statistics (global)
n8n workflows versions --stats

# Get specific version details
n8n workflows versions abc123 --get 42
n8n workflows versions abc123 --get 42 --save version.json

# Rollback to previous version
n8n workflows versions abc123 --rollback
n8n workflows versions abc123 --rollback --to-version 42

# Compare two versions
n8n workflows versions abc123 --compare 41,42

# Prune old versions
n8n workflows versions abc123 --prune --keep 5

# JSON output for agents
n8n workflows versions abc123 --json
n8n workflows versions --stats --json
```

#### `workflows diff`

Apply incremental diff operations to a workflow. Enables surgical modifications without full replacement.

```bash
n8n workflows diff <id> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --operations <json>` | Diff operations (JSON string or @file.json) | - |
| `-f, --file <path>` | Path to operations JSON file | - |
| `--dry-run` | Validate without applying changes | `false` |
| `--continue-on-error` | Apply valid operations, report failures | `false` |
| `--force, --yes` | Skip confirmation prompts | - |
| `--no-backup` | Skip creating backup before changes | - |
| `-s, --save <path>` | Save result workflow to file | - |
| `--json` | Output as JSON | - |

**Supported Operations (17 types):**
- **Node Operations:** `addNode`, `removeNode`, `updateNode`, `moveNode`, `enableNode`, `disableNode`
- **Connection Operations:** `addConnection`, `removeConnection`, `rewireConnection`, `cleanStaleConnections`, `replaceConnections`
- **Metadata Operations:** `updateSettings`, `updateName`, `addTag`, `removeTag`
- **Activation Operations:** `activateWorkflow`, `deactivateWorkflow`

**Smart Parameters for IF/Switch nodes:**
- `branch: "true"` or `branch: "false"` - Use instead of `sourceIndex` for IF nodes
- `case: <n>` - Use instead of `sourceIndex` for Switch nodes

**Examples:**
```bash
# Apply diff from file
n8n workflows diff abc123 --operations @diff.json

# Validate without applying (dry-run)
n8n workflows diff abc123 --operations @diff.json --dry-run

# Inline JSON operation
n8n workflows diff abc123 --operations '[{"type":"updateNode","nodeName":"Slack","updates":{"parameters.channel":"#alerts"}}]'

# Best-effort mode (apply valid ops, report failures)
n8n workflows diff abc123 --operations @diff.json --continue-on-error

# Force without confirmation
n8n workflows diff abc123 --operations @diff.json --force --json
```

**Operations JSON Format:**
```json
{
  "operations": [
    { "type": "addNode", "node": { "name": "HTTP", "type": "n8n-nodes-base.httpRequest", "position": [400, 300] } },
    { "type": "updateNode", "nodeName": "Slack", "updates": { "parameters.channel": "#alerts" } },
    { "type": "addConnection", "source": "IF", "target": "Success", "branch": "true" },
    { "type": "removeNode", "nodeName": "Unused Node" },
    { "type": "activateWorkflow" }
  ]
}
```

#### `workflows deploy-template`

Deploy a workflow template from n8n.io directly to your n8n instance.

```bash
n8n workflows deploy-template <templateId> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <name>` | Custom workflow name | Template name |
| `--no-autofix` | Skip auto-fix of common issues | `false` (autofix enabled) |
| `--keep-credentials` | Preserve credential references | `false` (strip credentials) |
| `--dry-run` | Preview without creating | - |
| `-s, --save <path>` | Save workflow JSON locally | - |
| `--json` | Output as JSON | - |

**Features:**
- Fetches template from n8n.io public API
- Auto-fixes expression format issues (`{{}}` → `={{}}`)
- Auto-fixes Switch v3+ rule conditions
- Extracts and displays required credentials
- Strips credentials by default (configure in n8n UI after deployment)
- Creates workflow as inactive (activate after configuring credentials)

**Examples:**
```bash
# Deploy template #3121
n8n workflows deploy-template 3121

# Preview first (dry-run)
n8n workflows deploy-template 3121 --dry-run

# Custom name
n8n workflows deploy-template 3121 --name "My Chatbot"

# JSON output for scripting
n8n workflows deploy-template 3121 --json

# Skip auto-fix
n8n workflows deploy-template 3121 --no-autofix

# Save locally and deploy
n8n workflows deploy-template 3121 --save workflow.json
```

**Find templates:**
```bash
n8n templates search "chatbot"              # Keyword search (n8n.io API)
n8n templates search --by-task ai_automation # By task (local)
n8n templates search --by-nodes slack       # By nodes (local)
n8n templates search --complexity simple    # By metadata (local)
n8n templates list-tasks                    # Show available tasks
n8n templates get 3121                      # View template details
```

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

| Option | Description | Default |
|--------|-------------|---------|
| `--schema` | Show full property schema | - |
| `--minimal` | Show operations only | - |
| `--examples` | Show usage examples | - |
| `-m, --mode <mode>` | Output mode: `info`, `docs`, `versions`, `breaking` | `info` |
| `-d, --detail <level>` | Detail level: `minimal`, `standard`, `full` | `standard` |
| `--from <version>` | Source version (for `--mode breaking`) | `1.0` |
| `--to <version>` | Target version (for `--mode breaking`) | Latest |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

#### `nodes get`

Get node schema. This is a lightweight alias for `show` with fewer options.

```bash
n8n nodes get <nodeType> [options]
```

| Option | Description | Default |
|--------|-------------|--------|
| `-m, --mode <mode>` | Output mode: `info`, `docs`, `versions` | `info` |
| `-d, --detail <level>` | Detail level: `minimal`, `standard`, `full` | `standard` |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

> **Note:** For full schema output with `--schema`, `--minimal`, or `--examples`, use `nodes show` instead.

#### `nodes breaking-changes`

Analyze breaking changes between node versions. Uses bundled registry (offline).

```bash
n8n nodes breaking-changes <nodeType> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--from <version>` | Source version | `1.0` |
| `--to <version>` | Target version | Latest known |
| `--severity <level>` | Filter by severity: `LOW`, `MEDIUM`, `HIGH` | - |
| `--auto-only` | Show only auto-migratable changes | - |
| `-s, --save <path>` | Save analysis to JSON file | - |
| `--json` | Output as JSON | - |

**Examples:**
```bash
# Show all breaking changes between webhook v1.0 and v2.0
n8n nodes breaking-changes webhook --from 1.0 --to 2.0

# Get only high severity changes in JSON
n8n nodes breaking-changes executeWorkflow --from 1.0 --severity HIGH --json

# Show only auto-migratable changes for Switch node
n8n nodes breaking-changes switch --from 2.0 --auto-only
```

**Severity Levels:**
- `HIGH` - Breaking changes that will cause errors
- `MEDIUM` - Changes that may affect behavior  
- `LOW` - Minor changes, usually safe

**Exit Code:** Returns `65` (DATAERR) if breaking changes are found.

#### `nodes categories`

List all node categories.

```bash
n8n nodes categories [options]
```

| Option | Description |
|--------|-------------|
| `--detailed` | Show category descriptions |
| `-s, --save <path>` | Save to JSON file |
| `--json` | Output as JSON |

#### `nodes validate`

Validate node configuration.

```bash
n8n nodes validate <nodeType> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <json>` | Node configuration to validate | `{}` |
| `--profile <profile>` | Validation profile: `minimal`, `runtime`, `strict` | `runtime` |
| `--json` | Output as JSON | - |

---

### credentials

Manage n8n credentials.

#### `credentials list`

List all credentials.

```bash
n8n credentials list [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Limit results | `10` |
| `--cursor <cursor>` | Pagination cursor | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

#### `credentials create`

Create a new credential.

```bash
n8n credentials create [options]
```

| Option | Description |
|--------|-------------|
| `-t, --type <type>` | **Required.** Credential type (e.g., `githubApi`) |
| `-n, --name <name>` | **Required.** Credential name |
| `-d, --data <json>` | Credential data (JSON string or @file.json) |
| `--json` | Output as JSON |

**Security tip:** Use `--data @file.json` to avoid secrets in shell history.

#### `credentials delete`

Delete a credential.

```bash
n8n credentials delete <id> [options]
```

| Option | Description |
|--------|-------------|
| `--force, --yes` | Skip confirmation |
| `--json` | Output as JSON |

#### `credentials schema`

Get credential type schema from n8n API.

```bash
n8n credentials schema <typeName> [options]
```

| Option | Description |
|--------|-------------|
| `-s, --save <path>` | Save to JSON file |
| `--json` | Output as JSON |

#### `credentials types`

List all available credential types. **Offline - 200+ types bundled.**

```bash
n8n credentials types [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--by-auth` | Group by authentication method | - |
| `-s, --search <query>` | Search credential types | - |
| `-l, --limit <n>` | Limit results (0 = all) | `0` |
| `--save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

#### `credentials show-type`

Show credential type schema.

```bash
n8n credentials show-type <typeName> [options]
```

| Option | Description |
|--------|-------------|
| `-s, --save <path>` | Save to JSON file |
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
| `-w, --workflow-id <id>` | Filter by workflow ID | - |
| `--status <status>` | Filter by status: `success`, `error`, `waiting` | - |
| `-l, --limit <n>` | Limit results | `10` |
| `--cursor <cursor>` | Pagination cursor | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

#### `executions get`

Get execution details.

```bash
n8n executions get <id> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mode <mode>` | Output mode: `preview`, `summary`, `filtered`, `full` | `summary` |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

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
| `--force, --yes` | Skip confirmation |
| `--json` | Output as JSON |

---

### variables

Manage n8n environment variables. **Requires n8n Enterprise/Pro license.**

#### `variables list`

```bash
n8n variables list [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Limit results | `100` |
| `--cursor <cursor>` | Pagination cursor | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

#### `variables create`

```bash
n8n variables create [options]
```

| Option | Description |
|--------|-------------|
| `-k, --key <key>` | **Required.** Variable key |
| `-v, --value <value>` | **Required.** Variable value |
| `--json` | Output as JSON |

#### `variables update`

```bash
n8n variables update <id> [options]
```

| Option | Description |
|--------|-------------|
| `-k, --key <key>` | **Required.** Variable key |
| `-v, --value <value>` | **Required.** Variable value |
| `--json` | Output as JSON |

#### `variables delete`

```bash
n8n variables delete <id> [options]
```

| Option | Description |
|--------|-------------|
| `--force, --yes` | Skip confirmation |
| `--json` | Output as JSON |

---

### tags

Manage n8n tags.

#### `tags list`

```bash
n8n tags list [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Limit results | `100` |
| `--cursor <cursor>` | Pagination cursor | - |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |

#### `tags get`

```bash
n8n tags get <id> [options]
```

| Option | Description |
|--------|-------------|
| `-s, --save <path>` | Save to JSON file |
| `--json` | Output as JSON |

#### `tags create`

```bash
n8n tags create [options]
```

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | **Required.** Tag name |
| `--json` | Output as JSON |

#### `tags update`

```bash
n8n tags update <id> [options]
```

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | **Required.** New tag name |
| `--json` | Output as JSON |

#### `tags delete`

```bash
n8n tags delete <id> [options]
```

| Option | Description |
|--------|-------------|
| `--force, --yes` | Skip confirmation |
| `--json` | Output as JSON |

---

### templates

Search and download workflow templates from n8n.io or local database.

#### `templates search`

Search templates by keyword, nodes, task, or metadata.

```bash
n8n templates search [query] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Limit results | `10` |
| `-s, --save <path>` | Save to JSON file | - |
| `--json` | Output as JSON | - |
| `--by-nodes <types>` | Search by node types (comma-separated) | - |
| `--by-task <task>` | Search by task type | - |
| `--complexity <level>` | Filter by complexity (simple, medium, complex) | - |
| `--max-setup <minutes>` | Maximum setup time in minutes | - |
| `--min-setup <minutes>` | Minimum setup time in minutes | - |
| `--service <name>` | Filter by required service | - |
| `--audience <type>` | Filter by target audience | - |
| `--local` | Force local database search | - |

**Search Modes:**

- **Keyword** (default): Text search via n8n.io API (requires internet)
- **By Nodes**: Find templates using specific node types (local)
- **By Task**: Curated templates for common automation tasks (local)
- **By Metadata**: Filter by complexity, setup time, services (local)

**Available Tasks:**
`ai_automation`, `data_sync`, `webhook_processing`, `email_automation`, `slack_integration`, `data_transformation`, `file_processing`, `scheduling`, `api_integration`, `database_operations`

**Examples:**
```bash
# Keyword search (n8n.io API)
n8n templates search "openai chatbot"

# Search by nodes (local)
n8n templates search --by-nodes slack,webhook

# Search by task (local)
n8n templates search --by-task ai_automation

# Search by metadata (local)
n8n templates search --complexity simple --max-setup 15

# Combined filters
n8n templates search --complexity medium --service openai --limit 20
```

#### `templates get`

```bash
n8n templates get <id> [options]
```

| Option | Description |
|--------|-------------|
| `-s, --save <path>` | Save template to file |
| `--json` | Output as JSON |

#### `templates list-tasks`

List available task types for `--by-task` search mode.

```bash
n8n templates list-tasks [options]
```

| Option | Description |
|--------|-------------|
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
| `--json` | Output as JSON |

#### `auth status` / `auth whoami`

Show current authentication status.

```bash
n8n auth status [options]
n8n auth whoami [options]
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
| `--json` | Output as JSON |

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

### validate (legacy)

Validate workflow JSON file. This is a backwards-compatible shortcut for `workflows validate`.

```bash
n8n validate [file] [options]
```

| Option | Description |
|--------|-------------|
| `--repair` | Attempt to repair malformed JSON |
| `--fix` | Auto-fix known issues |
| `-s, --save <path>` | Save fixed workflow |
| `--json` | Output as JSON |

> **Note:** For validation profiles (`minimal`, `runtime`, `ai-friendly`, `strict`), use the full command:
> `n8n workflows validate <file> --profile <profile>`

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
