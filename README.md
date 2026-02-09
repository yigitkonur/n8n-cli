<h1 align="center">cli-n8n</h1>
<h3 align="center">The Agent-First CLI for n8n Workflow Automation</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/cli-n8n"><img alt="npm version" src="https://img.shields.io/npm/v/cli-n8n.svg?style=flat-square"></a>
  <a href="#"><img alt="Node.js" src="https://img.shields.io/badge/node-≥18-blue.svg?style=flat-square"></a>
  <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.3-blue.svg?style=flat-square"></a>
  <a href="https://opensource.org/licenses/MIT"><img alt="License" src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square"></a>
  <a href="#"><img alt="Build Status" src="https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square"></a>
</p>

<p align="center">
  <strong>Built for AI agents that create, validate, and deploy n8n workflows programmatically.</strong>
</p>

<p align="center">
  <code>JSON output everywhere</code> · <code>Schema-aware validation</code> · <code>800+ nodes bundled offline</code>
</p>

<p align="center">
  <strong>15 command groups</strong> · <strong>70+ subcommands</strong> · <strong>300+ flags</strong>
</p>

---

<p align="center">
  <strong>🤖 AI-Native</strong> — Every command returns structured JSON for machine consumption<br/>
  <strong>⚡ Offline-First</strong> — 800+ nodes bundled locally, no API needed for validation<br/>
  <strong>🔒 Production-Ready</strong> — POSIX exit codes, backups, confirmations, and safety rails<br/>
  <strong>📦 Zero Config</strong> — Works immediately with <code>npx cli-n8n</code>
</p>

---

## Table of Contents

### Part 1: Getting Started
- [Why Agent-First?](#why-agent-first)
  - [Key Design Principles](#key-design-principles)
  - [Feature Overview](#feature-overview)
  - [Target Audience](#target-audience)
  - [What Sets This CLI Apart](#what-sets-this-cli-apart)
- [Installation](#installation)
  - [Requirements](#requirements)
  - [Installation Methods](#installation-methods)
  - [Verify Installation](#verify-installation)
- [Quick Start](#quick-start)
  - [For AI Agents](#for-ai-agents)
  - [For Humans](#for-humans)
  - [First 5 Minutes Guide](#first-5-minutes-guide)
- [Quick Reference](#quick-reference) ⚡
  - [Workflow Operations](#workflow-operations)
  - [Node Operations](#node-operations-offline)
  - [Command Patterns](#command-patterns)
  - [Console Output Examples](#console-output-examples)

### Part 2: Configuration
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Configuration Files](#configuration-files)
  - [Configuration Profiles](#configuration-profiles)
  - [Security Best Practices](#security-best-practices)

### Part 3: Command Reference
- [Quick Command Reference](#quick-command-reference)
  - [Command Groups Overview](#command-groups-overview)
  - [Offline vs API Commands](#offline-vs-api-commands)
  - [Global Options](#global-options)
- [Commands](#commands)
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

### Part 4: Advanced Usage
- [AI Agent Integration](#ai-agent-integration)
- [Scripting & Automation](#scripting--automation)
- [CI/CD Integration](#cicd-integration)
- [Cheat Sheet](#cheat-sheet)

### Part 5: Reference & Support
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Exit Codes](#exit-codes)
- [Development](#development)
- [See Also](#see-also)
- [License](#license)

---

## Why Agent-First?

This CLI is designed from the ground up for **AI agents** that generate n8n workflows programmatically. Instead of streaming large JSON through tool calls (which causes token limits and hallucinations), agents can leverage a local-first architecture:

### The Agent Development Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENT DEVELOPMENT LOOP                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────────┐    ┌──────────────────────────┐   │
│   │ 1. GENERATE │───▶│ 2. WRITE FILE   │───▶│ 3. VALIDATE LOCALLY      │   │
│   │   Workflow  │    │   workflow.json │    │   n8n workflows validate │   │
│   └─────────────┘    └─────────────────┘    └───────────┬──────────────┘   │
│                                                         │                   │
│                                                         ▼                   │
│   ┌─────────────┐    ┌─────────────────┐    ┌──────────────────────────┐   │
│   │ 6. DEPLOY   │◀───│ 5. ITERATE      │◀───│ 4. GET STRUCTURED ERRORS │   │
│   │   to n8n    │    │   Fix Issues    │    │   with schema hints      │   │
│   └─────────────┘    └─────────────────┘    └──────────────────────────┘   │
│                                                                             │
│   Tight local loop • No network latency • Instant validation feedback       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Generate** — Agent creates workflow JSON based on user requirements
2. **Write** — Save workflow to local file: `workflow.json`
3. **Validate** — Run `n8n workflows validate workflow.json --json`
4. **Get Errors** — Receive structured errors with `correctUsage` showing exact schema
5. **Iterate** — Fix issues locally (no network latency, no API rate limits)
6. **Deploy** — Once valid: `n8n workflows import workflow.json --json`

### Key Design Principles

| Principle | Implementation | Benefit |
|-----------|----------------|---------|
| **JSON Everywhere** | Every command supports `--json` flag | Machine-readable output for automation |
| **Schema Hints** | Validation errors include `correctUsage` | Agents know exactly what structure to use |
| **Offline First** | 800+ nodes bundled in SQLite database | No API needed for node lookup/validation |
| **POSIX Exit Codes** | Standard exit codes (0, 64, 65, 70, etc.) | Reliable scripting and error handling |
| **Predictable Structure** | `n8n <resource> <action> [options]` | Consistent command patterns |

### Feature Overview

| Feature | Description | Use Case |
|---------|-------------|----------|
| **Workflow Validation** | Schema-aware validation with 4 profiles | Catch errors before deployment |
| **Expression Validation** | Detects missing `=` prefix in `{{ }}` | Fix common AI mistakes |
| **AI Node Validation** | 15+ checks for AI Agent workflows | Validate LLM/tool connections |
| **Node Type Suggestions** | Fuzzy matching for typos | Auto-fix `httprequest` → `n8n-nodes-base.httpRequest` |
| **Autofix Engine** | 8 fix types with confidence levels | Automated issue resolution |
| **Version Management** | Local version history with rollback | Safe iteration on workflows |
| **Diff Operations** | 17 surgical modification types | Update without full replacement |
| **Template Deployment** | One-command template deploy | `n8n workflows deploy-template 3121` |
| **Breaking Changes** | Version migration analysis | Understand upgrade impacts |
| **Offline Node Search** | FTS5 full-text search | Find nodes without API |

### Target Audience

| Audience | Primary Use Case | Key Features |
|----------|------------------|--------------|
| **🤖 AI Agents** (Primary) | Workflow generation & deployment | JSON output, schema hints, offline validation |
| **👨‍💻 DevOps Engineers** | CI/CD pipeline integration | Exit codes, scripting support, bulk operations |
| **⚡ n8n Power Users** | Advanced workflow management | Version control, diff operations, autofix |
| **🔧 Automation Builders** | Template-based development | Template search, deploy, customize |

### What Sets This CLI Apart

| Approach | n8n Web UI | Raw API Calls | **n8n-cli** |
|----------|------------|---------------|-------------|
| **Validation** | Runtime only | None | Pre-deployment with hints |
| **Node Lookup** | Requires login | Requires API | 800+ nodes offline |
| **Error Feedback** | Visual in UI | Raw HTTP errors | Structured JSON with fixes |
| **Batch Operations** | Manual one-by-one | Custom scripting | Built-in bulk commands |
| **Version Control** | None | Manual | Automatic versioning |
| **AI Integration** | Not designed for | Token-heavy | Native JSON support |

> **💡 Tip:** For AI agents, start with `n8n nodes search` to discover available nodes, then `n8n nodes show <type> --detail minimal --json` to get token-efficient schemas.

---

## Installation

### Requirements

| Requirement | Minimum Version | Notes |
|-------------|-----------------|-------|
| **Node.js** | 18.0.0 | LTS versions recommended |
| **npm/yarn/pnpm** | Any recent version | Package manager of choice |
| **Operating System** | macOS, Linux, Windows | All platforms supported |

### Installation Methods

#### Option 1: Run Directly with npx (No Installation)

```bash
# Run any command without installing
npx cli-n8n --help
npx cli-n8n nodes search "slack"
npx cli-n8n workflows validate workflow.json --json
```

> **💡 Best for:** Quick testing, CI/CD pipelines, one-off commands

#### Option 2: Global Installation (npm)

```bash
# Install globally
npm install -g cli-n8n

# Verify installation
n8n --version
n8n --help
```

#### Option 3: Global Installation (yarn)

```bash
# Install globally with yarn
yarn global add n8n-cli

# Verify installation
n8n --version
```

#### Option 4: Global Installation (pnpm)

```bash
# Install globally with pnpm
pnpm add -g n8n-cli

# Verify installation
n8n --version
```

#### Option 5: Project-Local Installation

```bash
# Add to project dependencies
npm install --save-dev n8n-cli

# Run via npx in project
npx n8n --help

# Or add to package.json scripts
# "scripts": { "n8n": "n8n-cli" }
```

### Verify Installation

```bash
# Check version
n8n --version
# Output: n8n-cli/x.x.x

# Check available commands
n8n --help

# Test offline functionality (no API needed)
n8n nodes search "http"

# Test connection (requires configuration)
n8n health
```

---

## Quick Start

### For AI Agents

The recommended workflow for AI agents generating n8n workflows:

```bash
# 1. Search for available nodes (offline, no API needed)
n8n nodes search "slack" --json

# 2. Get node schema with minimal tokens (~200 tokens)
n8n nodes show n8n-nodes-base.slack --detail minimal --json

# 3. Get full schema when needed (~3-8K tokens)
n8n nodes show n8n-nodes-base.slack --detail full --json

# 4. Validate generated workflow (returns structured errors)
n8n workflows validate workflow.json --json

# 5. Auto-fix common issues
n8n workflows autofix workflow.json --apply --save fixed.json

# 6. Deploy to n8n instance (requires API configuration)
export N8N_HOST="https://your-n8n.com"
export N8N_API_KEY="your-api-key"
n8n workflows import workflow.json --json
```

**Example JSON Response (Validation Error):**

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
    },
    "hint": "Add '=' prefix to expression",
    "autoFixable": true
  }],
  "warnings": [],
  "stats": { "nodeCount": 5, "connectionCount": 4 }
}
```

### For Humans

Common operations for human users:

```bash
# Check connection to n8n instance
n8n health

# List all workflows
n8n workflows list

# List active workflows only
n8n workflows list --active

# Export a workflow to file
n8n workflows export abc123 -o backup.json

# Validate a workflow file
n8n workflows validate workflow.json

# Validate and auto-fix issues
n8n workflows validate workflow.json --fix --save fixed.json

# Deploy a template from n8n.io in one command
n8n workflows deploy-template 3121 --name "My Chatbot"

# Search for nodes
n8n nodes search "google sheets"

# Get node documentation
n8n nodes show googleSheets --mode docs
```

> **💡 Quick Tip: Offline vs Online Commands**
>
> These commands work **offline** (no n8n instance needed):
> | Command | Description |
> |---------|-------------|
> | `nodes search/show/list` | Search 800+ bundled nodes |
> | `workflows validate` | Validate workflow JSON locally |
> | `workflows autofix` | Fix common issues automatically |
> | `templates search --by-nodes/--by-task` | Search bundled templates |
>
> Everything else requires `N8N_HOST` and `N8N_API_KEY` configuration.

### First 5 Minutes Guide

**Step 1: Install the CLI**

```bash
npm install -g cli-n8n
```

**Step 2: Configure Connection (for API commands)**

```bash
# Option A: Interactive setup
n8n auth login --interactive

# Option B: Environment variables
export N8N_HOST="https://your-n8n-instance.com"
export N8N_API_KEY="your-api-key-from-n8n-settings"

# Option C: Configuration file
echo 'N8N_HOST=https://your-n8n.com
N8N_API_KEY=your-api-key' > ~/.n8nrc
```

**Step 3: Test the Connection**

```bash
n8n health
# ✓ Connected to https://your-n8n.com
# ✓ API version: 1.0
# ✓ Latency: 45ms
```

**Step 4: Explore Available Nodes (Offline)**

```bash
# Search nodes by keyword
n8n nodes search "slack"

# List by category
n8n nodes list --by-category

# Get node schema
n8n nodes show slack --schema
```

**Step 5: Validate and Deploy a Workflow**

```bash
# Validate locally first
n8n workflows validate my-workflow.json

# Deploy if valid
n8n workflows import my-workflow.json --activate
```

> **⚠️ Warning:** API commands (workflows list, credentials, executions, etc.) require `N8N_HOST` and `N8N_API_KEY` to be configured. Offline commands (nodes, validate, autofix) work without any configuration.

---

## Quick Reference

Organized command reference for experienced users. For detailed documentation, see [Commands](#commands).

### Workflow Operations

```bash
# List & Get
n8n workflows list                          # List all (limit 20)
n8n workflows list -a -l 50                 # Active only, limit 50
n8n workflows list -t production,api        # Filter by tags
n8n workflows get abc123                    # Get by ID
n8n workflows get abc123 --json             # JSON output for scripting

# Export & Import
n8n workflows export abc123 -o backup.json  # Export to file
n8n workflows import workflow.json          # Import (inactive)
n8n workflows import workflow.json --activate  # Import and activate

# Validate & Fix
n8n workflows validate workflow.json        # Basic validation
n8n workflows validate abc123               # Validate by ID (API)
n8n workflows validate wf.json -P strict    # Strict profile
n8n workflows validate wf.json -P ai-friendly -M full  # AI workflow validation
n8n workflows validate wf.json --fix --save fixed.json  # Auto-fix issues
n8n workflows autofix wf.json --apply       # Full autofix with version upgrades

# Deploy Templates
n8n workflows deploy-template 3121          # Deploy template by ID
n8n workflows deploy-template 3121 -n "My Bot"  # Custom name
n8n workflows deploy-template 3121 --dry-run    # Preview without creating
```

### Node Operations (Offline)

```bash
# Search & Discover
n8n nodes search "slack"                    # Basic search
n8n nodes search "http request" --mode AND  # All terms must match
n8n nodes search "slak" --mode FUZZY        # Typo-tolerant search
n8n nodes list --by-category                # Browse by category

# Get Node Info
n8n nodes show slack                        # Standard info (~1-2K tokens)
n8n nodes show slack --detail minimal       # Quick lookup (~200 tokens)
n8n nodes show slack --detail full          # Full schema (~3-8K tokens)
n8n nodes show slack --mode docs            # Human-readable documentation
n8n nodes show httpRequest --mode versions  # Version history

# Validate Nodes in Workflow
n8n nodes validate workflow.json            # Check node configurations
n8n nodes breaking-changes workflow.json    # Find outdated nodes
```

### Credentials

```bash
n8n credentials list                        # List all credentials
n8n credentials types                       # Available credential types
n8n credentials schema githubApi            # Get type schema
n8n credentials create -t githubApi -n "GitHub" -d @creds.json  # Create from file
n8n credentials delete abc123 --force       # Delete without confirmation
```

### Executions

```bash
n8n executions list                         # Recent executions
n8n executions list -w abc123               # Filter by workflow
n8n executions list --status error          # Failed only
n8n executions get exec123                  # Quick preview
n8n executions get exec123 --mode full      # Complete data (may be large)
n8n executions retry exec123                # Retry with same workflow version
n8n executions retry exec123 --load-latest  # Retry with current workflow
```

### Templates (Offline Search)

```bash
n8n templates search "chatbot"              # Keyword search (API)
n8n templates search --by-nodes openAi,slack    # Local: by nodes used
n8n templates search --by-task ai_automation   # Local: by purpose
n8n templates get 3121                      # Template details
n8n templates list-tasks                    # All task categories
```

### Admin & Config

```bash
n8n auth login --interactive                # Interactive setup
n8n auth status                             # Check current auth
n8n health                                  # Test connection
n8n audit --categories credentials,nodes    # Security audit
n8n config show                             # Current configuration
```

### Command Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| List | `n8n <resource> list [--filter] [--limit n]` | List resources with optional filters |
| Get | `n8n <resource> get <id> [--json]` | Get single resource by ID |
| Create | `n8n <resource> create [--data @file.json]` | Create from data |
| Delete | `n8n <resource> delete <id> [--force]` | Delete with optional confirmation skip |
| Validate | `n8n workflows validate <file> [--profile]` | Validate with optional profile |

### Console Output Examples

**Validation Error (Terminal):**

```
$ n8n workflows validate workflow.json
✗ Validation failed (2 errors)

❌ HTTP Request (nodes[0])
   EXPRESSION_MISSING_PREFIX
   Value: {{ $json.endpoint }}
   → Add '=' prefix: ={{ $json.endpoint }}
   💡 Auto-fixable with --fix

❌ Switch (nodes[2])
   OUTDATED_NODE_VERSION
   Current: v2, Latest: v3
   → Run: n8n workflows autofix workflow.json --upgrade-versions
```

**Same Errors (JSON):**

```json
{
  "valid": false,
  "errors": [
    {"code": "EXPRESSION_MISSING_PREFIX", "nodeName": "HTTP Request", "autoFixable": true},
    {"code": "OUTDATED_NODE_VERSION", "nodeName": "Switch", "autoFixable": true}
  ]
}
```

---

## Configuration

The CLI supports multiple configuration methods with the following priority order (highest to lowest):

1. **Command-line arguments** — `--host`, `--api-key`, `--profile`
2. **Environment variables** — `N8N_HOST`, `N8N_API_KEY`
3. **Configuration files** — `.n8nrc`, `.n8nrc.json`, etc.

### Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `N8N_HOST` | Yes* | — | n8n instance URL (e.g., `https://n8n.example.com`) |
| `N8N_URL` | Yes* | — | Alternative to `N8N_HOST` (same behavior) |
| `N8N_API_KEY` | Yes* | — | API key from n8n Settings → API |
| `N8N_PROFILE` | No | `default` | Configuration profile to use |
| `N8N_TIMEOUT` | No | `30000` | API request timeout in milliseconds |
| `N8N_DB_PATH` | No | (bundled) | Custom path to nodes SQLite database |
| `N8N_DEBUG` | No | `false` | Enable debug logging (`true`/`false`) |
| `DEBUG` | No | — | Set to `n8n-cli` for debug output |
| `N8N_STRICT_PERMISSIONS` | No | `false` | Refuse config files with insecure permissions |
| `NO_COLOR` | No | — | Disable colored output (any value) |

> **\*** Required for API commands only. Not required for offline commands (nodes, validate, autofix).

**Example Usage:**

```bash
# Inline environment variables
N8N_HOST="https://n8n.example.com" N8N_API_KEY="xxx" n8n workflows list

# Export for session
export N8N_HOST="https://n8n.example.com"
export N8N_API_KEY="your-api-key"
n8n workflows list

# Debug mode
N8N_DEBUG=true n8n workflows validate workflow.json

# Custom timeout (60 seconds)
N8N_TIMEOUT=60000 n8n workflows import large-workflow.json
```

### Configuration Files

The CLI searches for configuration files in these locations (in priority order):

| Priority | Location | Format | Description |
|:--------:|----------|--------|-------------|
| 1 | `.n8nrc` | INI-style | Current directory |
| 2 | `.n8nrc.json` | JSON | Current directory |
| 3 | `~/.n8nrc` | INI-style | Home directory |
| 4 | `~/.n8nrc.json` | JSON | Home directory |
| 5 | `~/.config/n8n/config.json` | JSON | XDG config directory |

**INI-Style Format** (`.n8nrc`):

```ini
# Simple key=value format
N8N_HOST=https://n8n.example.com
N8N_API_KEY=your-api-key
N8N_TIMEOUT=30000
```

**JSON Format** (`.n8nrc.json`):

```json
{
  "host": "https://n8n.example.com",
  "apiKey": "your-api-key",
  "timeout": 30000
}
```

### Configuration Profiles

For multiple environments (production, staging, development), use profiles:

```json
{
  "default": "prod",
  "profiles": {
    "prod": {
      "host": "https://n8n.example.com",
      "apiKey": "prod-api-key-xxx"
    },
    "staging": {
      "host": "https://staging.n8n.example.com",
      "apiKey": "staging-api-key-xxx"
    },
    "dev": {
      "host": "http://localhost:5678",
      "apiKey": "dev-api-key-xxx"
    }
  }
}
```

**Using Profiles:**

```bash
# Command-line flag
n8n workflows list --profile dev

# Environment variable
N8N_PROFILE=staging n8n workflows list

# Default profile is used when not specified
n8n workflows list  # Uses "prod" profile (set as default)
```

### Security Best Practices

| Practice | Recommendation | Example |
|----------|----------------|---------|
| **File Permissions** | Set `600` on config files | `chmod 600 ~/.n8nrc` |
| **API Key Storage** | Use environment variables in CI/CD | `${{ secrets.N8N_API_KEY }}` |
| **No Hardcoding** | Never commit API keys to git | Add `.n8nrc` to `.gitignore` |
| **Credential Files** | Use `@file.json` syntax | `--data @secrets.json` |
| **Strict Mode** | Enable permission checking | `N8N_STRICT_PERMISSIONS=true` |

```bash
# Secure configuration file setup
echo 'N8N_HOST=https://n8n.example.com
N8N_API_KEY=your-api-key' > ~/.n8nrc
chmod 600 ~/.n8nrc
export N8N_STRICT_PERMISSIONS=true
n8n workflows list
```

> **💡 Tip:** For first-time setup, use `n8n auth login --interactive` for guided configuration with connection testing.

---

## Quick Command Reference

### Command Groups Overview

| Command Group | Subcommands | Description | API Required |
|---------------|-------------|-------------|:------------:|
| `auth` | `login`, `status`, `logout` | Manage CLI authentication | ✗ (config only) |
| `health` | — | Check n8n instance connectivity | ✓ |
| `nodes` | `list`, `show`, `get`, `search`, `categories`, `validate`, `breaking-changes` | Search and inspect 800+ bundled nodes | ✗ (offline) |
| `workflows` | `list`, `get`, `validate`, `create`, `import`, `export`, `update`, `autofix`, `diff`, `versions`, `deploy-template`, `activate`, `deactivate`, `delete`, `trigger`, `tags` | Full workflow lifecycle management | Mixed |
| `executions` | `list`, `get`, `retry`, `delete` | View and manage workflow executions | ✓ |
| `credentials` | `list`, `create`, `delete`, `schema`, `types`, `show-type` | Manage n8n credentials | Mixed |
| `variables` | `list`, `create`, `update`, `delete` | Manage environment variables (Enterprise) | ✓ |
| `tags` | `list`, `get`, `create`, `update`, `delete` | Organize workflows with tags | ✓ |
| `templates` | `search`, `get`, `list-tasks` | Search and deploy n8n.io templates | Mixed |
| `audit` | — | Generate security audit reports | ✓ |
| `config` | `show` | View CLI configuration | ✗ |
| `completion` | `<shell>` | Generate shell completions | ✗ |
| `validate` | — | Legacy workflow validation | ✗ (offline) |

### Offline vs API Commands

| Offline (No API Needed) | Requires n8n API |
|-------------------------|------------------|
| `nodes *` (all subcommands) | `workflows list/get/create/import/update/delete/activate/deactivate/trigger/tags` |
| `workflows validate` | `executions *` (all subcommands) |
| `workflows autofix` | `credentials list/create/delete/schema` |
| `workflows versions` | `variables *` (all subcommands) |
| `credentials types` | `tags *` (all subcommands) |
| `templates search --local` | — |
| `templates search --by-nodes` | `health` |
| `templates search --by-task` | `health` |
| `templates list-tasks` | — |
| `validate` (legacy) | — |
| `config show` | — |
| `completion` | — |

### Global Options

These options are available on **all commands**:

| Option | Short | Description |
|--------|-------|-------------|
| `--version` | `-V` | Output version number and exit |
| `--verbose` | `-v` | Enable verbose/debug output |
| `--quiet` | `-q` | Suppress non-essential output |
| `--no-color` | — | Disable colored output |
| `--profile <name>` | — | Use specific configuration profile |
| `--help` | `-h` | Display help for command |

**Common Command Options:**

| Option | Description | Available On |
|--------|-------------|--------------|
| `--json` | Output as JSON (machine-readable) | Most commands |
| `--save <path>` | Save output to file | Most commands |
| `--force`, `--yes` | Skip confirmation prompts | Destructive commands |
| `--no-backup` | Skip automatic backup | Update/delete commands |
| `--limit <n>` | Limit number of results | List commands |
| `--cursor <cursor>` | Pagination cursor for next page | List commands |

---

## Commands

---

### `workflows`

Manage n8n workflows — the complete lifecycle from creation to deployment, validation, versioning, and more.

The `workflows` command group provides **16 subcommands** covering:
- **CRUD Operations:** create, import, get, export, update, delete
- **Validation & Fixing:** validate, autofix
- **Version Management:** versions (history, rollback, compare)
- **Advanced Operations:** diff (surgical updates), deploy-template
- **State Management:** activate, deactivate, trigger
- **Organization:** tags

#### Command Overview

| Command | Description | API Required |
|---------|-------------|:------------:|
| `list` | List all workflows | ✓ |
| `get` | Get workflow by ID | ✓ |
| `validate` | Validate workflow structure | ✗ |
| `create` | Create new workflow | ✓ |
| `import` | Import from JSON file | ✓ |
| `export` | Export to JSON file | ✓ |
| `update` | Update existing workflow | ✓ |
| `autofix` | Auto-fix validation issues | ✗ |
| `diff` | Apply incremental changes | ✓ |
| `versions` | Manage version history | ✗ |
| `deploy-template` | Deploy n8n.io template | ✓ |
| `activate` | Activate workflow(s) | ✓ |
| `deactivate` | Deactivate workflow(s) | ✓ |
| `delete` | Delete workflow(s) | ✓ |
| `trigger` | Trigger via webhook | ✓ |
| `tags` | Manage workflow tags | ✓ |

---

#### `workflows list`

List all workflows from your n8n instance with filtering and pagination support.

**Usage:**

```bash
n8n workflows list [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--active` | `-a` | Filter active workflows only | — |
| `--tags <tags>` | `-t` | Filter by tags (comma-separated) | — |
| `--limit <n>` | `-l` | Limit results (0 = all) | `10` |
| `--cursor <cursor>` | — | Pagination cursor for next page | — |
| `--save <path>` | `-s` | Save output to JSON file | — |
| `--json` | — | Output as JSON | — |

**Examples:**

```bash
# List all workflows (default limit: 10)
n8n workflows list

# List all active workflows
n8n workflows list --active

# List workflows with specific tags
n8n workflows list --tags production,api

# List all workflows (no limit)
n8n workflows list --limit 0

# Get JSON output for scripting
n8n workflows list --json

# Save to file
n8n workflows list --save workflows.json

# Paginate through results
n8n workflows list --cursor "eyJsaW1pdCI6MTAsIm9mZnNldCI6MTB9"
```

**jq Recipes:**

```bash
# Extract workflow IDs and names
n8n workflows list --json | jq '.data[] | {id, name}'

# Count active workflows
n8n workflows list --active --limit 0 --json | jq '.data | length'

# Get workflows updated in last 7 days
n8n workflows list --json | jq '.data[] | select(.updatedAt > (now - 604800 | todate))'
```

---

#### `workflows get`

Get a single workflow by ID with configurable output detail.

**Usage:**

```bash
n8n workflows get <id> [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--mode <mode>` | `-m` | Output mode: `full`, `details`, `structure`, `minimal` | `full` |
| `--save <path>` | `-s` | Save output to JSON file | — |
| `--json` | — | Output as JSON | — |

**Output Modes:**

| Mode | Contents | Use Case |
|------|----------|----------|
| `full` | Complete workflow with all fields | Export, backup |
| `details` | Metadata + node list (no parameters) | Quick overview |
| `structure` | Nodes and connections only | Structure analysis |
| `minimal` | ID, name, active status only | Status checks |

**Examples:**

```bash
# Get full workflow
n8n workflows get abc123

# Get minimal info
n8n workflows get abc123 --mode minimal

# Export to file
n8n workflows get abc123 --save workflow-backup.json

# JSON for scripting
n8n workflows get abc123 --json | jq '.nodes | length'
```

---

#### `workflows export`

Export a workflow to JSON file.

**Usage:**

```bash
n8n workflows export <id> [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <path>` | `-o` | Output file path (stdout if not specified) | — |
| `--full` | — | Include all fields (don't strip server-generated) | — |
| `--json` | — | Output as JSON | — |

**Examples:**

```bash
# Export to stdout
n8n workflows export abc123

# Export to file
n8n workflows export abc123 -o backup.json

# Export with all server fields
n8n workflows export abc123 --full -o complete-backup.json

# Pipe to another command
n8n workflows export abc123 | jq '.nodes | length'
```

---

#### `workflows validate`

Validate a workflow JSON file or workflow by ID with comprehensive schema-aware validation. This is the **primary validation command** with extensive options for different use cases.

**Usage:**

```bash
n8n workflows validate [idOrFile] [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file <path>` | `-f` | Path to workflow JSON file | — |
| `--validation-profile <profile>` | `-P` | Profile: `minimal`, `runtime`, `ai-friendly`, `strict` | `runtime` |
| `--validation-mode <mode>` | `-M` | Mode: `minimal`, `operation`, `full` | `operation` |
| `--repair` | — | Attempt to repair malformed JSON | — |
| `--fix` | — | Auto-fix known issues | — |
| `--check-upgrades` | — | Check for node version upgrades | — |
| `--upgrade-severity <level>` | — | Minimum severity: `LOW`, `MEDIUM`, `HIGH` | — |
| `--check-versions` | — | Check for outdated typeVersions | — |
| `--version-severity <level>` | — | Version severity: `info`, `warning`, `error` | `warning` |
| `--skip-community-nodes` | — | Skip version checks for community nodes | — |
| `--validate-expressions` | — | Enable expression format validation | `true` |
| `--no-validate-expressions` | — | Skip expression format validation | — |
| `--save <path>` | `-s` | Save fixed workflow to file | — |
| `--json` | — | Output as JSON | — |

##### Validation Profiles

| Profile | Errors Kept | Warnings Kept | Use Case |
|---------|-------------|---------------|----------|
| `minimal` | Missing required only | Security, deprecated | Fast structure check |
| `runtime` | Critical runtime errors | Security, deprecated | **Default for CLI** |
| `ai-friendly` | All errors | + Best practice, missing common | AI agent workflows |
| `strict` | All errors | All + enforced error handling | Production validation |

##### Validation Modes

| Mode | Scope | Description |
|------|-------|-------------|
| `minimal` | Required + visible | Only required properties currently visible |
| `operation` | Operation-specific | Properties relevant to current resource/operation |
| `full` | All properties | All properties regardless of visibility |

##### Version Upgrade Checking

Use `--check-upgrades` to analyze nodes in the workflow for available version upgrades:

```bash
# Check for upgrade recommendations
n8n workflows validate workflow.json --check-upgrades

# Get JSON output with upgrade analysis
n8n workflows validate workflow.json --check-upgrades --json

# Only show high severity breaking changes
n8n workflows validate workflow.json --check-upgrades --upgrade-severity HIGH
```

##### Node Version Checking

Use `--check-versions` to check for outdated node typeVersion values:

```bash
# Check for outdated node versions
n8n workflows validate workflow.json --check-versions

# Set severity level for version issues
n8n workflows validate workflow.json --check-versions --version-severity error

# Skip community nodes (only check n8n-nodes-base)
n8n workflows validate workflow.json --check-versions --skip-community-nodes
```

##### JSON Output Examples

**Example: Expression Error**

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
    },
    "hint": "Add '=' prefix: ={{ $json.endpoint }}",
    "autoFixable": true
  }]
}
```

**Example: Structural Error**

```json
{
  "valid": false,
  "errors": [{
    "code": "N8N_PARAMETER_VALIDATION_ERROR",
    "nodeName": "Switch",
    "path": "nodes[2].parameters",
    "schemaDelta": {
      "missing": ["options"],
      "extra": ["fallbackOutput"]
    },
    "correctUsage": {
      "conditions": {
        "options": {
          "caseSensitive": true
        }
      }
    },
    "hint": "Remove 'fallbackOutput' and add 'options' property"
  }]
}
```

**Example: Node Type Suggestion**

```json
{
  "valid": false,
  "issues": [{
    "code": "INVALID_NODE_TYPE_FORMAT",
    "message": "Node has invalid type \"httprequest\"",
    "nodeName": "HTTP Request",
    "path": "nodes[0].type",
    "suggestions": [
      {
        "value": "n8n-nodes-base.httpRequest",
        "confidence": 0.95,
        "reason": "Missing package prefix",
        "autoFixable": true
      }
    ],
    "hint": "Did you mean: n8n-nodes-base.httpRequest? (95% match)"
  }]
}
```

Use `n8n workflows autofix` with `--fix-types node-type-correction` to automatically fix high-confidence matches (>90%):

```bash
n8n workflows autofix workflow.json --apply --fix-types node-type-correction
```

##### Expression Format Validation

The CLI validates that n8n expressions have the required `=` prefix. Expressions like `{{ $json.field }}` are detected as errors because they won't be evaluated without the prefix.

```bash
# Validate with expression checking (default)
n8n workflows validate workflow.json

# Skip expression validation (for templates with intentional placeholders)
n8n workflows validate workflow.json --no-validate-expressions
```

**Example Error Output (Expression):**

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
    },
    "hint": "Add '=' prefix to expression",
    "autoFixable": true
  }]
}
```

##### Node Type Suggestions

When the CLI detects an unknown or misspelled node type, it provides intelligent suggestions using fuzzy matching:

```json
{
  "valid": false,
  "issues": [{
    "code": "INVALID_NODE_TYPE_FORMAT",
    "message": "Node has invalid type \"httprequest\"",
    "nodeName": "HTTP Request",
    "path": "nodes[0].type",
    "suggestions": [
      {
        "value": "n8n-nodes-base.httpRequest",
        "confidence": 0.95,
        "reason": "Missing package prefix",
        "autoFixable": true
      }
    ],
    "hint": "Did you mean: n8n-nodes-base.httpRequest? (95% match)"
  }]
}
```

##### AI Node Validation

The CLI includes specialized validation for AI Agent workflows, catching common misconfigurations:

| AI Node Type | Validations |
|--------------|-------------|
| **AI Agent** | LLM connection required, fallback model config, output parser, streaming mode, memory limits, tool connections, maxIterations, prompt/systemMessage |
| **Chat Trigger** | Streaming mode requires AI Agent target, agent can't have main outputs in streaming |
| **Basic LLM Chain** | Single LLM required, no fallback support, no tools allowed |
| **AI Tools (12 types)** | HTTP Request, Code, Vector Store, Workflow, MCP Client, Calculator, Think, SerpApi, Wikipedia, SearXNG, WolframAlpha |

**AI Validation Error Codes:**

| Code | Description |
|------|-------------|
| `MISSING_LANGUAGE_MODEL` | AI Agent/Chain requires `ai_languageModel` connection |
| `TOO_MANY_LANGUAGE_MODELS` | Maximum 2 LLMs allowed (for fallback) |
| `FALLBACK_MISSING_SECOND_MODEL` | `needsFallback=true` but only 1 LLM connected |
| `MISSING_OUTPUT_PARSER` | `hasOutputParser=true` but no parser connected |
| `STREAMING_WITH_MAIN_OUTPUT` | Agent in streaming mode can't have main outputs |
| `STREAMING_WRONG_TARGET` | Streaming mode only works with AI Agent |
| `MULTIPLE_MEMORY_CONNECTIONS` | Only 1 memory connection allowed |
| `MISSING_TOOL_DESCRIPTION` | AI tool requires `toolDescription` |
| `MISSING_PROMPT_TEXT` | `promptType="define"` but text is empty |

---

#### `workflows create`

Create a new workflow from a JSON file.

**Usage:**

```bash
n8n workflows create [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--file <path>` | `-f` | Path to workflow JSON file | — |
| `--name <name>` | `-n` | Override workflow name | — |
| `--dry-run` | — | Preview without creating | — |
| `--skip-validation` | — | Skip pre-API validation (not recommended) | — |
| `--json` | — | Output as JSON | — |

**Examples:**

```bash
# Create workflow from file
n8n workflows create -f workflow.json

# Create with custom name
n8n workflows create -f workflow.json --name "My Custom Workflow"

# Preview without creating
n8n workflows create -f workflow.json --dry-run

# JSON output for scripting
n8n workflows create -f workflow.json --json
```

---

#### `workflows import`

Import workflow from JSON file. This is an alias for `create` with slightly different syntax.

**Usage:**

```bash
n8n workflows import <file> [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--name <name>` | `-n` | Override workflow name | — |
| `--dry-run` | — | Preview without creating | — |
| `--activate` | — | Activate immediately after import | — |
| `--skip-validation` | — | Skip pre-API validation (not recommended) | — |
| `--json` | — | Output as JSON | — |

**Examples:**

```bash
# Import workflow
n8n workflows import workflow.json

# Import with custom name
n8n workflows import workflow.json --name "Production Workflow"

# Import and activate immediately
n8n workflows import workflow.json --activate

# Preview import
n8n workflows import workflow.json --dry-run
```

---

#### `workflows update`

Update an existing workflow with a new version.

**Usage:**

```bash
n8n workflows update <id> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--file <path>` | Path to workflow JSON file | — |
| `--operations <json>` | Comma-separated operation IDs | — |
| `--name <name>` | Update workflow name | — |
| `--activate` | Activate the workflow | — |
| `--deactivate` | Deactivate the workflow | — |
| `--skip-validation` | Skip pre-API validation | — |
| `--force`, `--yes` | Skip confirmation prompts | — |
| `--no-backup` | Skip creating backup | — |
| `--json` | Output as JSON | — |

**Examples:**

```bash
# Update workflow from file
n8n workflows update abc123 -f updated-workflow.json

# Update workflow name only
n8n workflows update abc123 --name "Renamed Workflow"

# Activate/deactivate workflow
n8n workflows update abc123 --activate
n8n workflows update abc123 --deactivate

# Update with force (no confirmation)
n8n workflows update abc123 -f workflow.json --force
```

---

#### `workflows activate` / `deactivate`

Bulk activate or deactivate workflows.

**Usage:**

```bash
n8n workflows activate [options]
n8n workflows deactivate [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--ids <ids>` | Comma-separated workflow IDs | — |
| `--all` | Apply to all workflows | — |
| `--force`, `--yes` | Skip confirmation prompt | — |
| `--json` | Output as JSON | — |

**Examples:**

```bash
# Activate specific workflows
n8n workflows activate --ids abc123,def456,ghi789

# Deactivate all workflows (with confirmation)
n8n workflows deactivate --all

# Force deactivate without confirmation (still creates backup)
n8n workflows deactivate --all --force
```

> **⚠️ Warning:** `--all` combined with `--force` will delete all workflows. Use with extreme caution. Backups are saved to `~/.n8n-cli/backups/` unless `--no-backup` is specified.

---

#### `workflows trigger`

Trigger a workflow via its webhook URL.

**Usage:**

```bash
n8n workflows trigger <webhookUrl> [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--data <json>` | `-d` | Request body (JSON string or `@file.json`) | `{}` |
| `--method <method>` | `-m` | HTTP method: `GET`, `POST`, `PUT`, `DELETE` | `POST` |
| `--json` | — | Output as JSON | — |

**Examples:**

```bash
# Trigger with POST (default)
n8n workflows trigger https://n8n.example.com/webhook/abc123

# Trigger with data
n8n workflows trigger https://n8n.example.com/webhook/abc123 \
  --data '{"name": "John", "email": "john@example.com"}'

# Trigger with data from file
n8n workflows trigger https://n8n.example.com/webhook/abc123 \
  --data @payload.json

# Trigger with GET method
n8n workflows trigger https://n8n.example.com/webhook/abc123 --method GET
```

---

#### `workflows tags`

Get or set tags for a workflow.

**Usage:**

```bash
n8n workflows tags <id> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--set <tagIds>` | Set tags (comma-separated tag IDs) | — |
| `--force`, `--yes` | Skip confirmation prompt | — |
| `--json` | Output as JSON | — |

**Examples:**

```bash
# Get current tags
n8n workflows tags abc123

# Set tags (replaces existing)
n8n workflows tags abc123 --set tag1,tag2,tag3

# Force set without confirmation
n8n workflows tags abc123 --set tag1,tag2 --force
```

---

#### `workflows autofix`

Advanced autofix engine with confidence-based filtering for workflow validation issues.

**Usage:**

```bash
n8n workflows autofix <idOrFile> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--preview` | Preview fixes without applying | **(default)** |
| `--apply` | Apply fixes (to file or n8n server) | — |
| `--confidence <level>` | Minimum confidence: `high`, `medium`, `low` | `medium` |
| `--fix-types <types>` | Comma-separated fix types to apply | all |
| `--upgrade-versions` | Apply version migration fixes | — |
| `--target-version <version>` | Target version for upgrades | Latest |
| `--max-fixes <n>` | Maximum number of fixes | `50` |
| `--save <path>` | Save fixed workflow locally | — |
| `--force`, `--yes` | Skip confirmation prompts | — |
| `--no-backup` | Skip backup before changes | — |
| `--no-guidance` | Suppress post-update guidance | — |
| `--json` | Output as JSON | — |

##### Fix Types and Confidence Levels

| Fix Type | Confidence | Description |
|----------|------------|-------------|
| `expression-format` | **HIGH** | Add missing `=` prefix to `{{ }}` expressions |
| `node-type-correction` | **HIGH** | Fix typos in node types (when >90% match) |
| `webhook-missing-path` | **HIGH** | Generate UUID paths for webhook nodes |
| `switch-options` | **HIGH** | Fix Switch/If node options and conditions |
| `typeversion-correction` | MEDIUM | Fix version exceeding max supported |
| `error-output-config` | MEDIUM | Remove invalid `onError` settings |
| `typeversion-upgrade` | MEDIUM | Suggest version upgrades |
| `version-migration` | LOW | Breaking change migration hints |

##### Post-Update Guidance

After applying fixes, the autofix command displays actionable migration guidance for each affected node:

- **Confidence Scores** — Each upgrade is rated HIGH, MEDIUM, or LOW based on remaining manual work required
- **Required Actions** — Step-by-step list of manual tasks needed after the automated fix
- **Behavior Changes** — Documents how node behavior changed between versions
- **Estimated Time** — Expected time to complete manual verification

The guidance is included in JSON output (`--json`) as a `postUpdateGuidance` array containing structured migration instructions for each node. Use `--no-guidance` to suppress the guidance display in the terminal output.

**Example Guidance Output:**

```
╔════════════════════════════════════════════════════════╗
║ ℹ Post-Update Guidance                                               ║
╚══════════════════════════════════════════════════════════╝
║ Node: My Switch (abc12345...)                                        ║
║ Type: n8n-nodes-base.switch                                          ║
║ Version: v2 → v3                                                     ║
╟──────────────────────────────────────────────────────────────────────╢
║ Status: ◐ Partial (Manual review required)                          ║
║ Confidence: MEDIUM                                                   ║
║ Est. Time: 2-5 minutes                                               ║
╟──────────────────────────────────────────────────────────────────────╢
║ ✓ Automated Changes (2):                                             ║
║   • Migrated 'rules' to 'conditions.options'                         ║
║   • Updated rule structure to v3 format                              ║
╟──────────────────────────────────────────────────────────────────────╢
║ ⚠ Manual Actions Required (1):                                       ║
║   • Review rule conditions and ensure type matching is correct       ║
╟──────────────────────────────────────────────────────────────────────╢
║ ℹ Behavior Changes (1):                                              ║
║   • Rule evaluation now strictly enforces data types                 ║
║     → String "123" will no longer match number 123                   ║
╚══════════════════════════════════════════════════════════════════════╝
```

**JSON Output Structure:**

```json
{
  "success": true,
  "fixesApplied": 12,
  "postUpdateGuidance": [
    {
      "nodeId": "abc12345...",
      "nodeName": "My Switch",
      "nodeType": "n8n-nodes-base.switch",
      "fromVersion": 2,
      "toVersion": 3,
      "status": "partial",
      "confidence": "MEDIUM",
      "estimatedTime": "2-5 minutes",
      "automatedChanges": [
        "Migrated 'rules' to 'conditions.options'",
        "Updated rule structure to v3 format"
      ],
      "manualActions": [
        "Review rule conditions and ensure type matching is correct"
      ],
      "behaviorChanges": [
        {
          "change": "Rule evaluation now strictly enforces data types",
          "example": "String \"123\" will no longer match number 123"
        }
      ]
    }
  ]
}
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
n8n workflows autofix abc123 --fix-types expression-format,node-type-correction

# Apply version migration fixes
n8n workflows autofix workflow.json --upgrade-versions --apply

# Save fixed workflow locally
n8n workflows autofix workflow.json --apply --save fixed.json

# Apply with JSON output for scripting
n8n workflows autofix abc123 --apply --force --json

# Apply fixes without guidance display
n8n workflows autofix abc123 --apply --no-guidance
```

---

#### `workflows versions`

Manage workflow version history, rollback, and cleanup. Versions are created automatically when you update or autofix workflows, stored locally in `~/.n8n-cli/data.db`.

**Usage:**

```bash
n8n workflows versions [id] [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Limit version history results | `10` |
| `--get <version-id>` | Get specific version details | — |
| `--rollback` | Rollback to previous version | — |
| `--to-version <id>` | Specific version ID for rollback | — |
| `--skip-validation` | Skip validation before rollback | — |
| `--compare <v1,v2>` | Compare two versions (comma-separated) | — |
| `--delete <version-id>` | Delete specific version | — |
| `--delete-all` | Delete all versions for workflow | — |
| `--prune` | Prune old versions | — |
| `--keep <n>` | Keep N most recent (with `--prune`) | `5` |
| `--stats` | Show storage statistics (no ID required) | — |
| `--truncate-all` | Delete ALL versions for ALL workflows | — |
| `--force`, `--yes` | Skip confirmation prompts | — |
| `--no-backup` | Skip backup before rollback | — |
| `--save <path>` | Save version snapshot to JSON file | — |
| `--json` | Output as JSON | — |

**Note:** Auto-pruning keeps max 10 versions per workflow automatically.

**Examples:**

```bash
# List version history
n8n workflows versions abc123

# View storage statistics (global)
n8n workflows versions --stats

# Get specific version details
n8n workflows versions abc123 --get 42

# Save version to file
n8n workflows versions abc123 --get 42 --save version.json

# Rollback to previous version
n8n workflows versions abc123 --rollback

# Rollback to specific version
n8n workflows versions abc123 --rollback --to-version 42

# Compare two versions
n8n workflows versions abc123 --compare 41,42

# Prune old versions (keep 5 most recent)
n8n workflows versions abc123 --prune --keep 5

# Delete specific version
n8n workflows versions abc123 --delete 42

# Delete all versions for workflow
n8n workflows versions abc123 --delete-all --force
```

---

#### `workflows diff`

Apply incremental diff operations to a workflow. Enables surgical modifications without full replacement.

**Usage:**

```bash
n8n workflows diff <id> [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--operations <json>` | `-o` | Diff operations (JSON string or `@file.json`) | — |
| `--file <path>` | `-f` | Path to operations JSON file | — |
| `--dry-run` | — | Validate without applying changes | `false` |
| `--continue-on-error` | — | Apply valid operations, report failures | `false` |
| `--skip-validation` | — | Skip pre-API validation | — |
| `--force`, `--yes` | — | Skip confirmation prompts | — |
| `--no-backup` | — | Skip backup before changes | — |
| `--save <path>` | `-s` | Save result workflow to file | — |
| `--json` | — | Output as JSON | — |

##### Supported Operations (17 types)

**Node Operations:**
- `addNode` — Add a new node
- `removeNode` — Remove node and its connections
- `updateNode` — Update node parameters
- `moveNode` — Change node position
- `enableNode` — Enable a disabled node
- `disableNode` — Disable node (keeps in workflow)

**Connection Operations:**
- `addConnection` — Add connection between nodes
- `removeConnection` — Remove a connection
- `rewireConnection` — Change connection target
- `cleanStaleConnections` — Remove orphaned connections
- `replaceConnections` — Replace all connections

**Metadata Operations:**
- `updateSettings` — Update workflow settings
- `updateName` — Rename workflow
- `addTag` — Add tag to workflow
- `removeTag` — Remove tag from workflow

**Activation Operations:**
- `activateWorkflow` — Activate workflow
- `deactivateWorkflow` — Deactivate workflow

##### Smart Parameters for Conditional Nodes

For IF and Switch nodes, you can use semantic parameters instead of numeric indexes:

| Node Type | Smart Parameter | Alternative | Description |
|-----------|----------------|-------------|-------------|
| **IF Node** | `branch: "true"` | `sourceIndex: 0` | Connection from "true" output |
| **IF Node** | `branch: "false"` | `sourceIndex: 1` | Connection from "false" output |
| **Switch Node** | `case: 0` | `sourceIndex: 0` | First case output |
| **Switch Node** | `case: 1` | `sourceIndex: 1` | Second case output |
| **Switch Node** | `case: 2` | `sourceIndex: 2` | Third case output |

**Example using smart parameters:**

```json
{
  "type": "addConnection",
  "source": "IF",
  "target": "Success Handler",
  "branch": "true"
}
```

**Equivalent using sourceIndex:**

```json
{
  "type": "addConnection",
  "source": "IF",
  "target": "Success Handler",
  "sourceIndex": 0
}
```

##### Detailed Operation Examples

| Operation | JSON Syntax | Description |
|-----------|-------------|-------------|
| `addNode` | `{"type":"addNode","node":{"name":"HTTP","type":"n8n-nodes-base.httpRequest","position":[400,300],"parameters":{"url":"https://api.example.com"}}}` | Add new node with position and parameters |
| `removeNode` | `{"type":"removeNode","nodeName":"Unused Node"}` | Remove node and all its connections |
| `updateNode` | `{"type":"updateNode","nodeName":"Slack","updates":{"parameters.channel":"#alerts","parameters.text":"New message"}}` | Update node parameters using dot notation |
| `moveNode` | `{"type":"moveNode","nodeName":"HTTP","position":[500,400]}` | Change node canvas position |
| `enableNode` | `{"type":"enableNode","nodeName":"Debug"}` | Enable a disabled node |
| `disableNode` | `{"type":"disableNode","nodeName":"Debug"}` | Disable node (keeps in workflow) |
| `addConnection` | `{"type":"addConnection","source":"IF","target":"Success","branch":"true"}` | Add connection between nodes |
| `removeConnection` | `{"type":"removeConnection","source":"IF","target":"Success","sourceIndex":0}` | Remove specific connection |
| `rewireConnection` | `{"type":"rewireConnection","source":"IF","oldTarget":"OldNode","newTarget":"NewNode","sourceIndex":0}` | Change connection target |
| `cleanStaleConnections` | `{"type":"cleanStaleConnections"}` | Remove all orphaned connections |
| `replaceConnections` | `{"type":"replaceConnections","nodeName":"HTTP","connections":{"main":[[{"node":"Slack","type":"main","index":0}]]}}` | Replace all connections for a node |
| `updateSettings` | `{"type":"updateSettings","settings":{"executionOrder":"v1"}}` | Update workflow settings |
| `updateName` | `{"type":"updateName","name":"New Workflow Name"}` | Rename workflow |
| `addTag` | `{"type":"addTag","tagId":"BCM4YL05avZ5KuP2"}` | Add tag to workflow |
| `removeTag` | `{"type":"removeTag","tagId":"BCM4YL05avZ5KuP2"}` | Remove tag from workflow |
| `activateWorkflow` | `{"type":"activateWorkflow"}` | Activate workflow |
| `deactivateWorkflow` | `{"type":"deactivateWorkflow"}` | Deactivate workflow |

**Example Operations JSON:**

```json
{
  "operations": [
    {
      "type": "addNode",
      "node": {
        "name": "HTTP Request",
        "type": "n8n-nodes-base.httpRequest",
        "position": [400, 300],
        "parameters": { "url": "https://api.example.com" }
      }
    },
    {
      "type": "updateNode",
      "nodeName": "Slack",
      "updates": { "parameters.channel": "#alerts", "parameters.text": "New message" }
    },
    {
      "type": "addConnection",
      "source": "IF",
      "target": "Success Handler",
      "branch": "true"
    },
    {
      "type": "removeNode",
      "nodeName": "Unused Node"
    }
  ]
}
```

**Examples:**

```bash
# Apply diff operations from JSON string
n8n workflows diff abc123 -o '{"operations":[{"type":"updateNode","nodeName":"Slack","updates":{"parameters.channel":"#alerts","parameters.text":"New message"}}]}'

# Apply diff operations from file
n8n workflows diff abc123 -f operations.json

# Dry-run to validate operations
n8n workflows diff abc123 -f operations.json --dry-run

# Apply with continue-on-error
n8n workflows diff abc123 -f operations.json --continue-on-error

# Save result without pushing to server
n8n workflows diff abc123 -f operations.json --save result.json
```

---

#### `workflows deploy-template`

Deploy a workflow template from n8n.io directly to your n8n instance.

**Usage:**

```bash
n8n workflows deploy-template <templateId> [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--name <name>` | `-n` | Custom workflow name | Template name |
| `--no-autofix` | — | Skip auto-fix (expression format, etc.) | — |
| `--keep-credentials` | — | Preserve credential references | — |
| `--dry-run` | — | Preview without creating | — |
| `--save <path>` | `-s` | Save locally instead of deploying | — |
| `--json` | — | Output as JSON | — |

**Features:**
- Fetches templates from n8n.io public API
- Auto-fixes expression format issues (`{{}}` → `={{}}`)
- Auto-fixes Switch v3+ rule conditions
- Extracts and displays required credentials before stripping
- Creates workflows as inactive (safe default)
- Supports dry-run, save, JSON output modes

**Examples:**

```bash
# Deploy template (shows required credentials)
n8n workflows deploy-template 3121

# Deploy with custom name
n8n workflows deploy-template 3121 --name "My Custom Chatbot"

# Preview without deploying
n8n workflows deploy-template 3121 --dry-run

# Save locally instead of deploying
n8n workflows deploy-template 3121 --save chatbot-template.json

# Deploy without autofix
n8n workflows deploy-template 3121 --no-autofix

# Keep credential references (useful for debugging)
n8n workflows deploy-template 3121 --keep-credentials
```

**Finding Templates:**

Use `templates search` to discover templates before deploying:

```bash
# Search by keyword
n8n templates search "keyword"

# Search by nodes used
n8n templates search --by-nodes node1,node2

# Search by task category
n8n templates search --by-task ai_automation

# Get template details
n8n templates get 3121
```

---

### `nodes`

Search, browse, and inspect n8n's **800+ bundled nodes** entirely offline. All node metadata is stored in a local SQLite database — no API connection required.

#### Command Overview

| Command | Description | API Required |
|---------|-------------|:------------:|
| `list` | List all available nodes | ✗ |
| `search` | Search nodes by keyword | ✗ |
| `show` | Get detailed node information | ✗ |
| `get` | Alias for `show` | ✗ |
| `categories` | List node categories | ✗ |
| `validate` | Validate node configuration | ✗ |
| `breaking-changes` | Analyze version breaking changes | ✗ |

---

#### `nodes list`

List all available nodes with filtering and grouping options.

**Usage:**

```bash
n8n nodes list [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--by-category` | — | Group nodes by category | — |
| `--category <name>` | `-c` | Filter by specific category | — |
| `--compact` | — | Compact output (name only) | — |
| `--limit <n>` | `-l` | Limit results | — |
| `--save <path>` | `-s` | Save output to JSON file | — |
| `--json` | — | Output as JSON | — |

**Examples:**

```bash
# List all nodes
n8n nodes list

# List all nodes in a category
n8n nodes list --category "Marketing & Content"

# Compact list (names only)
n8n nodes list --compact

# JSON output for scripting
n8n nodes list --json | jq '.nodes | length'
```

---

#### `nodes search`

Search nodes by keyword with multiple search modes and FTS5 full-text search support.

**Usage:**

```bash
n8n nodes search <query> [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--mode <mode>` | `-m` | Search mode: `OR`, `AND`, `FUZZY` | `OR` |
| `--category <name>` | `-c` | Filter by category | — |
| `--limit <n>` | `-l` | Limit results | `20` |
| `--save <path>` | `-s` | Save output to file | — |
| `--json` | — | Output as JSON | — |

**Search Modes:**

| Mode | Description | Use Case |
|------|-------------|----------|
| `OR` | Match any keyword | Broad search, discovering options |
| `AND` | Match all keywords | Precise multi-term search |
| `FUZZY` | Levenshtein distance matching | Typo-tolerant search |

##### FTS5 Full-Text Search

When an FTS5 index (`nodes_fts` table) exists in the bundled database, the CLI automatically uses BM25-ranked full-text search for faster, more relevant results:

| Feature | Description |
|---------|-------------|
| **Auto-detection** | FTS5 tables detected lazily on first search |
| **BM25 ranking** | Results sorted by relevance score (term frequency × inverse document frequency) |
| **Phrase matching** | Use quotes for exact phrases: `"http request"` |
| **Boolean operators** | Support for AND, OR, NOT in queries |
| **Graceful fallback** | Falls back to LIKE search on FTS5 syntax errors |
| **FUZZY mode exception** | FUZZY mode always uses Levenshtein distance (no FTS5) |

**FTS5 Examples:**

```bash
# OR search with BM25 ranking (default)
n8n nodes search "slack message"

# AND search (all must match)
n8n nodes search "http request" --mode AND

# Phrase search (exact match)
n8n nodes search '"send email"'

# Fuzzy search (typo tolerance)
n8n nodes search "slak" --mode FUZZY
```

**How FTS5 Improves Results:**

| Without FTS5 (LIKE search) | With FTS5 (full-text search) |
|---------------------------|------------------------------|
| Sequential scan through all nodes | Indexed search (faster) |
| No relevance ranking | Results ranked by relevance |
| Results in alphabetical order | Best matches first |
| Basic substring matching | Better handling of partial words |

**Examples:**

```bash
# Basic search (OR mode)
n8n nodes search "slack"

# Multi-word search (all must match)
n8n nodes search "http request" --mode AND

# Fuzzy search (typo tolerance)
n8n nodes search "slak" --mode FUZZY

# Search within category
n8n nodes search "google" --category "Marketing & Content"

# JSON output
n8n nodes search "email" --json
```

---

#### `nodes show`

Get detailed information about a specific node type with multiple output modes and version comparison capabilities.

**Usage:**

```bash
n8n nodes show <nodeType> [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--detail <level>` | `-d` | Detail level: `minimal` (~200 tokens), `standard` (~1-2K), `full` (~3-8K) | `standard` |
| `--mode <mode>` | `-m` | Operation mode (see table below) | `info` |
| `--query <term>` | — | Property search term (for `search-properties` mode) | — |
| `--from <version>` | — | Source version (for `compare`, `breaking`, `migrations`) | — |
| `--to <version>` | — | Target version (for `compare`, `migrations`) | Latest |
| `--max-results <n>` | — | Max property search results | `20` |
| `--include-type-info` | — | Include type structure metadata | — |
| `--include-examples` | — | Include real-world configuration examples | — |
| `--resource <name>` | `-r` | Filter by resource | — |
| `--operation <name>` | `-o` | Filter by operation | — |
| `--version <n>` | `-v` | Specific typeVersion | Latest |
| `--schema` | — | Legacy: equivalent to `--detail full` | — |
| `--minimal` | — | Legacy: equivalent to `--detail minimal` | — |
| `--examples` | — | Legacy: equivalent to `--include-examples` | — |
| `--save <path>` | `-s` | Save output to file | — |
| `--json` | — | Output as JSON | — |

**Detail Levels:**

| Level | Token Count | Contents | Use Case |
|-------|-------------|----------|----------|
| `minimal` | ~200 tokens | Basic info + essential properties | Quick lookups, AI context optimization |
| `standard` | ~1-2K tokens | Essential properties + operations | Default for most use cases |
| `full` | ~3-8K tokens | Complete schema with all properties | Workflow generation, comprehensive reference |

**Operation Modes:**

| Mode | Description | Required Options |
|------|-------------|------------------|
| `info` | Node configuration schema (default) | — |
| `docs` | Markdown documentation | — |
| `search-properties` | Find properties by keyword | `--query <term>` |
| `versions` | Version history with breaking changes | — |
| `compare` | Property diff between versions | `--from <version>` |
| `breaking` | Breaking changes between versions | `--from <version>` (optional) |
| `migrations` | Auto-migratable changes | `--from <version>`, `--to <version>` (optional) |

**Examples:**

```bash
# Quick lookup (~200 tokens) - ideal for AI agents
n8n nodes show httpRequest --detail minimal --json

# Standard info with examples
n8n nodes show slack --include-examples

# Full schema for workflow generation
n8n nodes show googleSheets --detail full --json

# Search for authentication-related properties
n8n nodes show httpRequest --mode search-properties --query "auth"

# Search for OAuth properties
n8n nodes show googleSheets --mode search-properties --query "oauth" --max-results 5

# View version history
n8n nodes show httpRequest --mode versions

# Compare versions (property diff)
n8n nodes show httpRequest --mode compare --from 1 --to 4.2

# Show breaking changes between versions
n8n nodes show webhook --mode breaking --from 1 --to 2

# Get migration instructions
n8n nodes show switch --mode migrations --from 2 --to 3

# Get specific operation schema
n8n nodes show googleSheets --resource sheet --operation append

# Human-readable documentation
n8n nodes show slack --mode docs

# Get credential requirements
n8n nodes show github --credentials
```

**Token Optimization for AI Agents:**

For AI agents working with token limits, use `--detail minimal` to get essential node information in ~200 tokens:

```bash
# Minimal output (200 tokens)
n8n nodes show slack --detail minimal --json

# Only fetch full schema when generating workflows
n8n nodes show slack --detail full --json
```

---

#### `nodes get`

Alias for `nodes show` for backward compatibility.

**Usage:**

```bash
n8n nodes get <nodeType> [options]
```

**Examples:**

```bash
# Get node info
n8n nodes get slack

# Get with JSON output
n8n nodes get httpRequest --json
```

> **💡 Tip:** Use `nodes show` for full feature access including all output modes and filters.

---

#### `nodes categories`

List all node categories.

**Usage:**

```bash
n8n nodes categories [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--with-counts` | Include node count per category | — |
| `--json` | Output as JSON | — |

**Examples:**

```bash
# List categories
n8n nodes categories

# With node counts
n8n nodes categories --with-counts

# JSON output
n8n nodes categories --json
```

---

#### `nodes validate`

Validate node-specific configurations in a workflow.

**Usage:**

```bash
n8n nodes validate <file> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--node-name <name>` | Validate specific node only | — |
| `--node-type <type>` | Filter by node type | — |
| `--json` | Output as JSON | — |

##### Node-Specific Validation

The enhanced validator includes operation-aware validation for common node types:

| Node Type | Validations Performed |
|-----------|----------------------|
| **Slack** | Channel format (`#channel` or channel ID), message content required, 40K character limit, thread reply timestamp format, @mention syntax validation, block kit validation |
| **HTTP Request** | URL format (must start with http/https), method validation (GET/POST/PUT/DELETE/PATCH), authentication method warnings, SSL/TLS options, timeout ranges, proxy configuration |
| **Webhook** | Path format validation (no special chars), UUID generation for empty paths, response mode validation, error handling recommendations |
| **Code** | JavaScript/Python syntax checks, return statement validation, async function handling, sandboxed API usage, console.log warnings |
| **Database Nodes** (Postgres, MySQL, MongoDB) | SQL injection pattern detection, parameterized query suggestions, connection string validation, query syntax checks |
| **OpenAI** | Model selection validation, token limit warnings (per model), temperature bounds (0-2), max_tokens validation, response format checks |
| **Google Sheets** | Range format (A1:B10 notation), spreadsheet ID validation (must be 44 chars), operation-specific parameter checks, sharing permission warnings |
| **Email** (Send Email, Gmail, Outlook) | Email address format validation, attachment size limits, HTML content sanitization, recipient list validation |
| **IF/Switch** | Condition logic validation, data type compatibility checks, comparison operator validation, fallback configuration |

##### Validation Examples

**Slack Node Validation:**

```bash
n8n nodes validate workflow.json --node-type n8n-nodes-base.slack --json
```

**HTTP Request Node Validation:**

```bash
n8n nodes validate workflow.json --node-type n8n-nodes-base.httpRequest --json
```

**Code Node Validation:**

```bash
n8n nodes validate workflow.json --node-type n8n-nodes-base.code --json
```

**Examples:**

```bash
# Validate all nodes in workflow
n8n nodes validate workflow.json

# Validate specific node by name
n8n nodes validate workflow.json --node-name "Slack"

# Filter by node type
n8n nodes validate workflow.json --node-type n8n-nodes-base.slack
```

---

#### `nodes breaking-changes`

Analyze breaking changes between node versions.

**Usage:**

```bash
n8n nodes breaking-changes <nodeType> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--from <version>` | Starting version | — |
| `--to <version>` | Target version | Latest |
| `--severity <level>` | Min severity: `LOW`, `MEDIUM`, `HIGH` | — |
| `--json` | Output as JSON | — |

**Examples:**

```bash
# Check all breaking changes
n8n nodes breaking-changes n8n-nodes-base.switch

# Check specific version range
n8n nodes breaking-changes n8n-nodes-base.switch --from 2 --to 3

# Filter by severity
n8n nodes breaking-changes n8n-nodes-base.if --severity HIGH
```

---

### `credentials`

Manage n8n credentials for workflow authentication.

#### Command Overview

| Command | Description | API Required |
|---------|-------------|:------------:|
| `list` | List all credentials | ✓ |
| `create` | Create new credential | ✓ |
| `delete` | Delete credential | ✓ |
| `schema` | Get credential schema | ✓ |
| `types` | List credential types | ✗ |

---

#### `credentials list`

List all credentials in your n8n instance.

**Usage:**

```bash
n8n credentials list [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Limit results | `20` |
| `--save <path>` | Save output to file | — |
| `--json` | Output as JSON | — |

**Examples:**

```bash
n8n credentials list
n8n credentials list --json
```

---

#### `credentials create`

Create a new credential.

**Usage:**

```bash
n8n credentials create [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--type <type>` | `-t` | Credential type (required) | — |
| `--name <name>` | `-n` | Credential name (required) | — |
| `--data <json>` | `-d` | Credential data (JSON or `@file.json`) | — |
| `--json` | — | Output as JSON | — |

> **💡 Security Tip:** Use `@file.json` syntax to avoid exposing secrets in shell history. Set `chmod 600` on credential files.

##### Security Best Practices for Credential Creation

**Secure Workflow:**

```bash
# Step 1: Get credential type schema to know required fields
n8n credentials schema githubApi

# Step 2: Create credential data file with restricted permissions
cat > github-creds.json << 'EOF'
{
  "accessToken": "ghp_your_token_here",
  "user": "your-username",
  "server": "https://api.github.com"
}
EOF

# Step 3: Set restrictive permissions (owner read/write only)
chmod 600 github-creds.json

# Step 4: Create credential using file reference (no secrets in shell history)
n8n credentials create \
  --type githubApi \
  --name "GitHub Production" \
  --data @github-creds.json

# Step 5: Securely delete the temporary file
shred -u github-creds.json  # Linux
# or
rm -P github-creds.json     # macOS
```

**Why This Matters:**

| ⚠️ Insecure Method | ✅ Secure Method |
|-------------------|-----------------|
| `--data '{"token":"xxx"}'` | `--data @file.json` |
| Secrets in shell history | No shell history exposure |
| Visible in `ps` output | Not visible in process list |
| No permission control | File permissions: 600 |
| Permanent in bash history | File deleted after use |

**Additional Security Tips:**
- Use `N8N_STRICT_PERMISSIONS=true` to enforce file permission checks
- Store credential files outside the project directory
- Add `*-creds.json` to `.gitignore`
- Use environment variables in CI/CD instead of files
- Rotate credentials regularly
- Use different credentials for dev/staging/prod (profiles)

**Examples:**

```bash
# Create from inline JSON (not recommended)
n8n credentials create -t githubApi -n "GitHub" -d '{"accessToken":"xxx"}'

# Create from file (recommended)
n8n credentials create -t slackApi -n "Slack Bot" -d @slack-creds.json
```

---

#### `credentials delete`

Delete a credential.

**Usage:**

```bash
n8n credentials delete <id> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--force`, `--yes` | Skip confirmation | — |
| `--json` | Output as JSON | — |

---

#### `credentials schema`

Get the JSON schema for a credential type. Alias: `show-type`.

**Usage:**

```bash
n8n credentials schema <type> [options]
```

**Examples:**

```bash
n8n credentials schema githubApi
n8n credentials schema slackApi --json
```

---

#### `credentials types`

List available credential types (offline).

**Usage:**

```bash
n8n credentials types [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--by-auth` | Group by auth type | — |
| `--search <query>` | Search by name | — |
| `--limit <n>` | Limit results | — |
| `--json` | Output as JSON | — |

**Examples:**

```bash
n8n credentials types
n8n credentials types --by-auth
n8n credentials types --search oauth
```

---

### `executions`

View and manage workflow execution history.

#### Command Overview

| Command | Description | API Required |
|---------|-------------|:------------:|
| `list` | List executions | ✓ |
| `get` | Get execution details | ✓ |
| `retry` | Retry failed execution | ✓ |
| `delete` | Delete execution | ✓ |

---

#### `executions list`

List workflow executions with filtering and pagination support.

**Usage:**

```bash
n8n executions list [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--workflow <id>` | `-w` | Filter by workflow ID | — |
| `--status <status>` | — | Filter: `success`, `error`, `waiting`, `running` | — |
| `--limit <n>` | `-l` | Limit results | `20` |
| `--cursor <cursor>` | — | Pagination cursor for next page | — |
| `--save <path>` | `-s` | Save output to file | — |
| `--json` | — | Output as JSON | — |

##### Execution Status Values

| Status | Description | Retryable | Common Causes |
|--------|-------------|:---------:|---------------|
| `success` | Completed successfully | ✗ | — |
| `error` | Failed with error | ✓ | Node errors, API failures, invalid data |
| `waiting` | Paused, waiting for input | ✗ | Manual trigger nodes, waiting for webhook |
| `running` | Currently executing | ✗ | Long-running workflows (rare in list) |
| `canceled` | Manually stopped | ✗ | User cancellation |
| `crashed` | n8n process crash | ✓ | Out of memory, system errors |
| `unknown` | Status cannot be determined | ✗ | Database inconsistency |

##### jq Recipe Examples

```bash
# Count executions by status
n8n executions list --limit 0 --json | \
  jq '.data | group_by(.status) | map({status: .[0].status, count: length})'

# Get IDs of all failed executions
n8n executions list --status error --limit 0 --json | \
  jq -r '.data[].id'

# Find executions that took longer than 30 seconds
n8n executions list --limit 0 --json | \
  jq '.data[] | select(.duration > 30000) | {id, workflowName, duration}'

# Extract error messages from failed executions
n8n executions list --status error --limit 0 --json | \
  jq '.data[] | {id, error: .error.message}'

# Get execution history for specific workflow
WORKFLOW_ID="abc123"
n8n executions list --workflow $WORKFLOW_ID --limit 0 --json | \
  jq '.data[] | {id, status, startedAt, duration}'
```

**Examples:**

```bash
n8n executions list
n8n executions list --workflow abc123
n8n executions list --status error --limit 50
n8n executions list --json | jq '.data[] | select(.status == "error")'
```

---

#### `executions get`

Get detailed execution information.

**Usage:**

```bash
n8n executions get <id> [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--mode <mode>` | `-m` | Output: `preview`, `summary`, `filtered`, `full` | `preview` |
| `--save <path>` | `-s` | Save output to file | — |
| `--json` | — | Output as JSON | — |

**Output Modes:**

| Mode | Contents | Data Size | Use Case |
|------|----------|-----------|----------|
| `preview` | Status + timing + first/last node results | ~5-20 KB | Quick status check, error overview |
| `summary` | All node statuses + execution flow | ~20-100 KB | Execution debugging, flow verification |
| `filtered` | Specific nodes only, truncated data | ~50-200 KB | Focus on specific nodes, reduced payload |
| `full` | Complete execution data including all inputs/outputs | **500 KB - 50+ MB** | Deep debugging, data inspection |

> **⚠️ Warning:** `full` mode can return megabytes of data for workflows with large datasets. Use `--save <file>` to avoid terminal overflow:
>
> ```bash
> n8n executions get 9361 --mode full --save execution-dump.json
> ```

**jq Examples for Execution Analysis:**

```bash
# Get error details from failed execution
n8n executions get 9361 --json | jq '.data.error'

# Extract specific node's output
n8n executions get 9361 --mode full --json | \
  jq '.data.data.resultData.runData["Node Name"][0].data.main[0]'

# Find which node failed
n8n executions get 9361 --json | \
  jq '.data.data.resultData.runData | to_entries[] | select(.value[0].error) | .key'

# Get execution timeline (duration per node)
n8n executions get 9361 --mode summary --json | \
  jq '.data.data.resultData.runData | to_entries[] | {node: .key, duration: .value[0].executionTime}'
```

**Examples:**

```bash
n8n executions get exec123
n8n executions get exec123 --mode full --save execution.json
```

---

#### `executions retry`

Retry a failed execution.

**Usage:**

```bash
n8n executions retry <id> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--load-latest` | Use latest workflow version | — |
| `--json` | Output as JSON | — |

##### Retry Behavior

| Aspect | Default Behavior | With `--load-latest` |
|--------|------------------|---------------------|
| **Workflow Version** | Uses snapshot from original execution | Uses current workflow version |
| **Input Data** | Original execution input data | Same (original input data) |
| **Credentials** | Current credentials | Current credentials |
| **Variables** | Current environment variables | Current environment variables |
| **Node Configurations** | From execution snapshot | From current workflow |

##### When to Use `--load-latest`

**Use `--load-latest` when:**
- ✅ You fixed a bug in the workflow after the failure
- ✅ You updated node parameters or logic
- ✅ You want to test new workflow version against old data
- ✅ Credentials or external services were updated

**Use default (snapshot) when:**
- ✅ Execution failed due to temporary service outage
- ✅ You want to retry with exact same workflow logic
- ✅ Investigating what caused the failure
- ✅ Workflow hasn't been modified since failure

> **💡 Note:** Only executions with status `error` or `crashed` can be retried. The retry creates a **new execution** with a new ID.

**Examples:**

```bash
# Retry with exact same workflow version (safe)
n8n executions retry 9361

# Retry with updated workflow (after fixing bug)
n8n executions retry 9361 --load-latest

# Retry and get JSON output
n8n executions retry 9361 --json | jq '.newExecutionId'
```

---

#### `executions delete`

Delete an execution.

**Usage:**

```bash
n8n executions delete <id> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--force`, `--yes` | Skip confirmation | — |
| `--json` | Output as JSON | — |

---

### `variables`

Manage n8n environment variables (Enterprise/Pro feature).

Variables are accessed in workflows using `{{ $vars.VARIABLE_KEY }}` syntax.

They provide instance-wide environment configuration shared across all workflows, making them ideal for:
- API endpoints that change between environments
- API keys and tokens (encrypted at rest)
- Feature flags and configuration toggles
- Database connection strings
- Email addresses and notification targets

**Key Format Requirements:**

| Requirement | Valid Examples | Invalid Examples |
|-------------|----------------|------------------|
| Must start with letter or underscore | `API_KEY`, `_config`, `DbUrl` | `123_KEY`, `-value` |
| Only letters, numbers, underscores | `API_KEY_2`, `db_host_1` | `api-key`, `db.host`, `api key` |
| Case-sensitive | `API_KEY` ≠ `api_key` ≠ `Api_Key` | — |
| No spaces or special characters | `DATABASE_URL`, `MAX_RETRIES` | `DATABASE URL`, `MAX-RETRIES` |

**Example Usage in Workflow:**

```json
{
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $vars.API_BASE_URL }}/users",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "={{ 'Bearer ' + $vars.API_TOKEN }}"
        }
      }
    }
  ]
}
```

> **⚠️ Warning:** Deleting a variable that is used in active workflows will cause those workflows to fail with "Variable not found" errors. Check variable usage before deletion:
>
> ```bash
> # Search workflows for variable usage
> n8n workflows list --json | jq '.data[] | select(.nodes | tostring | contains("$vars.API_KEY"))'
> ```

---

#### `variables list`

List all variables in your n8n instance.

**Usage:**

```bash
n8n variables list [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Limit results | `20` |
| `--save <path>` | Save output to file | — |
| `--json` | Output as JSON | — |

**Examples:**

```bash
n8n variables list
n8n variables list --json
```

---

#### `variables create`

Create a new variable.

**Usage:**

```bash
n8n variables create [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--key <key>` | `-k` | Variable key (required) | — |
| `--value <value>` | `-v` | Variable value (required) | — |
| `--scope <scope>` | `-s` | Scope: `global`, `workflow` | `global` |
| `--json` | — | Output as JSON | — |

**Examples:**

```bash
# Create global variable
n8n variables create --key API_URL --value "https://api.example.com"

# Create workflow-scoped variable
n8n variables create --key DB_PASSWORD --value "secure-pass" --scope workflow
```

---

#### `variables update`

Update an existing variable.

**Usage:**

```bash
n8n variables update [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--key <key>` | `-k` | Variable key (required) | — |
| `--value <value>` | `-v` | Variable value (required) | — |
| `--scope <scope>` | `-s` | Scope: `global`, `workflow` | — |
| `--force`, `--yes` | Skip confirmation | — |
| `--json` | — | Output as JSON | — |

**Examples:**

```bash
# Update global variable
n8n variables update --key API_URL --value "https://new-api.example.com"

# Update workflow-scoped variable
n8n variables update --key DB_PASSWORD --value "new-pass" --scope workflow
```

---

#### `variables delete`

Delete a variable.

**Usage:**

```bash
n8n variables delete [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--key <key>` | `-k` | Variable key (required) | — |
| `--scope <scope>` | `-s` | Scope: `global`, `workflow` | — |
| `--force`, `--yes` | Skip confirmation | — |
| `--json` | — | Output as JSON | — |

**Examples:**

```bash
# Delete global variable
n8n variables delete --key API_URL --force

# Delete workflow-scoped variable
n8n variables delete --key DB_PASSWORD --scope workflow --force
```

---

### `tags`

Organize workflows with tags.

#### Commands

| Command | Description |
|---------|-------------|
| `list` | List all tags |
| `get` | Get tag details |
| `create` | Create new tag |
| `update` | Update tag |
| `delete` | Delete tag |

**Examples:**

```bash
# List tags
n8n tags list

# Create tag
n8n tags create --name "production"

# Update tag
n8n tags update tag123 --name "prod"

# Delete tag
n8n tags delete tag123 --force
```

> **💡 Tip:** Use `workflows tags` command to assign tags to workflows.

---

### `templates`

Search and manage workflow templates from n8n.io.

#### Command Overview

| Command | Description | Source |
|---------|-------------|--------|
| `search` | Search templates | API or local |
| `get` | Get template details | API |
| `list-tasks` | List task categories | Local |

---

#### `templates search`

Search templates with multiple modes.

**Usage:**

```bash
n8n templates search [query] [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--by-nodes <nodes>` | Search by nodes used (local) | — |
| `--by-task <task>` | Search by task category (local) | — |
| `--local` | Force local search | — |
| `--category <name>` | Filter by category | — |
| `--limit <n>` | Limit results | `20` |
| `--json` | Output as JSON | — |

**Search Modes:**

| Mode | Source | Use Case |
|------|--------|----------|
| Keyword | API | General discovery |
| By Nodes | Local | Find templates using specific nodes |
| By Task | Local | Find templates by purpose |

##### Available Task Categories

Use with `--by-task` for curated template discovery:

| Task Category | Description | Example Use Cases |
|---------------|-------------|-------------------|
| `ai_automation` | AI/ML workflows using OpenAI, Anthropic, etc. | Chatbots, content generation, classification |
| `data_sync` | Data synchronization between services | CRM sync, database replication |
| `webhook_processing` | Webhook handlers and API integrations | GitHub webhooks, Stripe events |
| `email_automation` | Email sending, filtering, parsing | Newsletter automation, support tickets |
| `slack_integration` | Slack bots and notifications | Alert systems, slash commands |
| `data_transformation` | ETL and data processing | CSV transformation, API normalization |
| `file_processing` | File upload/download/processing | PDF generation, image processing |
| `scheduling` | Scheduled tasks and cron jobs | Daily reports, cleanup jobs |
| `api_integration` | API workflow orchestration | Multi-API workflows, data aggregation |
| `database_operations` | Database CRUD operations | Backup, migration, cleanup |
| `social_media` | Social media automation | Auto-posting, monitoring |
| `notifications` | Multi-channel notifications | SMS, email, push notifications |
| `reporting` | Report generation and delivery | Analytics, dashboards |
| `crm_integration` | CRM workflows (Salesforce, HubSpot) | Lead management, contact sync |

**Task Search Examples:**

```bash
# Find AI automation templates
n8n templates search --by-task ai_automation

# Find Slack integration templates
n8n templates search --by-task slack_integration --limit 20

# Combine with other filters
n8n templates search --by-task api_integration --complexity simple
```

##### Local vs API Search Comparison

| Aspect | API Search (default) | Local Search (`--by-nodes`, `--by-task`) |
|--------|---------------------|------------------------------------------|
| **Speed** | 500-2000ms | <50ms |
| **Network Required** | ✓ | ✗ |
| **Freshness** | Latest templates | Bundled templates (updated with CLI) |
| **Coverage** | All public templates | ~2000 most popular templates |
| **Ranking** | Relevance + popularity | Category-based |
| **Use Case** | General discovery | Quick offline reference |

**When to Use Each:**

- **Use API Search** when:
  - You need the latest templates
  - Searching by natural language keywords
  - Need community/custom templates
  - Internet connection available

- **Use Local Search** when:
  - Working offline
  - Need instant results
  - Searching by specific nodes or tasks
  - Building CLI scripts/automation

**Examples:**

```bash
# Keyword search (API)
n8n templates search "keyword"

# Search by nodes (local, offline)
n8n templates search --by-nodes openAi,slack

# Search by task category
n8n templates search --by-task ai_automation

# Combined filters
n8n templates search "sales" --category "Sales"
```

---

#### `templates get`

Get detailed template information.

**Usage:**

```bash
n8n templates get <templateId> [options]
```

**Examples:**

```bash
n8n templates get 3121
n8n templates get 3121 --json
n8n templates get 3121 --save template.json
```

---

#### `templates list-tasks`

List available task categories for `--by-task` search.

**Usage:**

```bash
n8n templates list-tasks [options]
```

---

### `audit`

Generate security and configuration audit reports.

**Usage:**

```bash
n8n audit [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--categories <list>` | Filter categories | all |
| `--min-risk <level>` | Minimum risk level | — |
| `--save <path>` | Save report to file | — |
| `--json` | Output as JSON | — |

**Audit Categories:**

| Category | Description |
|----------|-------------|
| `credentials` | Credential security analysis |
| `database` | Database configuration |
| `filesystem` | File system security |
| `nodes` | Node risk assessment |
| `instance` | Instance settings |

**Examples:**

```bash
# Full audit
n8n audit

# Specific categories
n8n audit --categories credentials,nodes

# High-risk issues only
n8n audit --min-risk high

# JSON output for CI/CD
n8n audit --json --save audit-report.json
```

##### Analyzing Audit Results with jq

```bash
# Get high-risk issues only
n8n audit --json | jq '.sections[] | select(.riskScore >= 7)'

# Count issues by severity
n8n audit --json | jq '[.sections[].issues[] | .severity] | group_by(.) | map({severity: .[0], count: length})'

# List all high-severity issues across all categories
n8n audit --json | jq '.sections[].issues[] | select(.severity == "high") | {category: .category, title: .title, description: .description}'

# Get credentials that haven't been used in 90+ days
n8n audit --categories credentials --json | jq '.sections[] | select(.title == "Unused Credentials") | .issues[].affectedResources[]'

# Find workflows with risky nodes (Code, Execute Command)
n8n audit --categories nodes --json | jq '.sections[] | select(.title | contains("Risky")) | .issues[].affectedResources[]'

# Export audit summary to CSV
n8n audit --json | jq -r '["Category","Risk Score","Issues"], (.sections[] | [.title, .riskScore, (.issues | length)]) | @csv' > audit-summary.csv
```

> **💡 Note:** Some audit checks require admin privileges on the n8n instance. Instance-level checks may not be available on cloud/shared hosting.

---

### `auth`

Manage CLI authentication configuration.

---

#### `auth login`

Configure API credentials.

**Usage:**

```bash
n8n auth login [options]
```

**Options:**

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--host <url>` | `-h` | n8n host URL | `N8N_HOST` env |
| `--api-key <key>` | `-k` | API key | `N8N_API_KEY` env |
| `--profile <name>` | `-p` | Configuration profile | `default` |
| `--interactive` | `-i` | Interactive setup wizard | — |

##### Interactive Mode Walkthrough

When using `--interactive`, the CLI guides you through setup with prompts:

```
$ n8n auth login --interactive

╔════════════════════════════════════════════════════════╗
║           n8n CLI Configuration Setup                  ║
╚════════════════════════════════════════════════════════╝

? n8n Host URL: https://your-n8n.com
  (The URL of your n8n instance, e.g., https://n8n.example.com)

? API Key: ********************************
  (Get from n8n Settings → API → Create API Key)

? Configuration Profile Name: [production]
  (Optional: Save as named profile. Press Enter for 'default')

? Test connection now? [Y/n] Y

✓ Testing connection...
✓ Connected successfully to https://your-n8n.com
✓ API version: 1.56.0
✓ Latency: 45ms

? Save configuration? [Y/n] Y

✓ Configuration saved to ~/.n8nrc

You're all set! Try: n8n workflows list
```

##### Environment Variables (Alternative to Config File)

For temporary usage or CI/CD, use environment variables instead of saving configuration:

```bash
# One-time usage (doesn't save to file)
N8N_HOST=https://n8n.example.com \
N8N_API_KEY=your-api-key \
n8n workflows list

# Export for current session
export N8N_HOST=https://n8n.example.com
export N8N_API_KEY=your-api-key
n8n workflows list

# GitHub Actions / GitLab CI
env:
  N8N_HOST: ${{ secrets.N8N_HOST }}
  N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
```

**Getting Your API Key:**

1. Log into your n8n instance
2. Click your user icon (bottom left)
3. Select **Settings**
4. Navigate to **API** tab
5. Click **Create API Key**
6. Copy the key (shown only once)
7. Paste into CLI prompt or save to config file

**Examples:**

```bash
# Interactive setup (recommended for first time)
n8n auth login --interactive

# Direct configuration
n8n auth login --host https://n8n.example.com --api-key your-key

# Named profile
n8n auth login --host https://staging.n8n.example.com --profile staging
```

---

#### `auth status`

Check current authentication status. Alias: `whoami`.

**Usage:**

```bash
n8n auth status
n8n auth whoami
```

---

#### `auth logout`

Clear stored authentication.

**Usage:**

```bash
n8n auth logout
```

---

### `health`

Check n8n instance connectivity and API status.

**Usage:**

```bash
n8n health [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--json` | Output as JSON | — |

**Checks Performed:**
- DNS resolution
- TCP connectivity
- HTTPS/TLS handshake
- API endpoint availability
- Authentication validity
- Response latency

##### Common Issues and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `getaddrinfo ENOTFOUND` | DNS resolution failed | • Check hostname spelling<br>• Verify DNS is working<br>• Try IP address instead |
| `connect ECONNREFUSED` | Connection refused | • Wrong port (check :5678 vs :443)<br>• n8n not running<br>• Firewall blocking connection |
| `connect ETIMEDOUT` | Connection timeout | • Network issue<br>• Firewall/proxy blocking<br>• n8n behind VPN<br>• Try increasing timeout: `N8N_TIMEOUT=60000` |
| `401 Unauthorized` | Invalid API key | • Regenerate API key in n8n Settings<br>• Check for extra spaces in key<br>• Verify key hasn't been revoked |
| `403 Forbidden` | API access disabled | • Enable API in n8n Settings<br>• Check user permissions |
| `certificate error` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Self-signed SSL cert | • Add cert to system trust store<br>• Use `NODE_TLS_REJECT_UNAUTHORIZED=0` (dev only)<br>• Use http:// instead of https:// (dev only) |
| `404 Not Found` | Wrong API endpoint | • Check n8n version (API changed in v1.0)<br>• Verify host URL path (should end at domain, no /api) |
| `502 Bad Gateway` | Reverse proxy issue | • Check nginx/apache config<br>• Verify n8n is running<br>• Check reverse proxy logs |
| `EPROTO` / `SSL routines` | SSL/TLS version mismatch | • Update Node.js version<br>• Check server TLS configuration |

**Debug Connection Issues:**

```bash
# Test with verbose output
N8N_DEBUG=true n8n health

# Test with curl first
curl -I https://your-n8n.com/api/v1/workflows

# Test API authentication
curl -H "X-N8N-API-KEY: your-key" https://your-n8n.com/api/v1/workflows

# Custom timeout (60 seconds)
N8N_TIMEOUT=60000 n8n health

# Ignore SSL errors (dev/testing only)
NODE_TLS_REJECT_UNAUTHORIZED=0 n8n health
```

**Examples:**

```bash
n8n health
n8n health --json
```

---

### `config`

View CLI configuration.

---

#### `config show`

Display current configuration.

**Usage:**

```bash
n8n config show [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--json` | Output as JSON | — |

---

### `completion`

Generate shell completion scripts.

**Usage:**

```bash
n8n completion <shell>
```

**Supported Shells:** `bash`, `zsh`, `fish`

**Installation:**

```bash
# Bash
n8n completion bash >> ~/.bashrc

# Zsh
n8n completion zsh >> ~/.zshrc

# Fish
n8n completion fish > ~/.config/fish/completions/n8n.fish
```

---

### `validate` (Legacy)

Legacy validation command for basic JSON structure checking.

> **Note:** For comprehensive validation with profiles, AI node validation, version checks, and auto-fix capabilities, use `n8n workflows validate` instead.

**Usage:**

```bash
n8n validate <file> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--repair` | Attempt to fix common JSON syntax errors | — |
| `--fix` | Apply automatic fixes | — |
| `--save <path>` | Save output to file | — |
| `--json` | Output as JSON | — |

##### JSON Repair Mode

The `--repair` flag attempts to fix common JSON syntax errors before validation:

**Repairs Applied:**

| Issue | Example | Fixed |
|-------|---------|-------|
| **Trailing commas** | `{"key": "value",}` | `{"key": "value"}` |
| **Unquoted keys** | `{key: "value"}` | `{"key": "value"}` |
| **Single quotes** | `{'key': 'value'}` | `{"key": "value"}` |
| **JavaScript objects** | `{name: value, id: 123}` | `{"name": "value", "id": 123}` |
| **Missing commas** | `{"a": 1 "b": 2}` | `{"a": 1, "b": 2}` |
| **Comments** | `{"key": "value" /* comment */}` | `{"key": "value"}` |
| **Backticks** | `` {"key": `template ${x}`} `` | `{"key": "template value"}` |

**Repair Examples:**

```bash
# Repair and validate
n8n validate broken-workflow.json --repair

# Repair, validate, fix issues, and save
n8n validate broken-workflow.json --repair --fix --save fixed.json

# JSON output with repair details
n8n validate broken-workflow.json --repair --json
```

**Example Repair Output:**

```json
{
  "repaired": true,
  "repairs": [
    {
      "type": "TRAILING_COMMA",
      "line": 15,
      "column": 5,
      "description": "Removed trailing comma after last object property"
    },
    {
      "type": "UNQUOTED_KEY",
      "line": 23,
      "column": 3,
      "description": "Added quotes around object key 'parameters'"
    }
  ],
  "valid": true
}
```

> **💡 Note:** For full validation features (profiles, AI node validation, version checks), use `n8n workflows validate` instead of the legacy `validate` command.

**Examples:**

```bash
# Basic validation
n8n validate workflow.json

# With repair
n8n validate broken-workflow.json --repair

# JSON output
n8n validate workflow.json --json
```

---

## AI Agent Integration

This section provides guidance for AI agents integrating with n8n-cli.

### Recommended Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AGENT WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Agent receives user request for n8n workflow                        │
│                            │                                            │
│                            ▼                                            │
│  2. Search nodes: n8n nodes search "keyword" --json                     │
│                            │                                            │
│                            ▼                                            │
│  3. Get schemas: n8n nodes show <type> --detail minimal --json          │
│                            │                                            │
│                            ▼                                            │
│  4. Generate workflow JSON and write to file                            │
│                            │                                            │
│                            ▼                                            │
│  5. Validate: n8n workflows validate workflow.json --json               │
│                            │                                            │
│                 ┌─────────┴─────────┐                                   │
│                 ▼                   ▼                                   │
│            [Valid]             [Errors]                                 │
│                │                   │                                    │
│                │                   ▼                                    │
│                │    6. Parse errors, fix issues, goto step 5            │
│                │                                                        │
│                ▼                                                        │
│  7. Deploy: n8n workflows import workflow.json --json                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Advantages of File-Based Workflow

| Challenge | CLI Solution |
|-----------|--------------|
| Token limits on large JSON | Write to file, validate locally |
| API rate limits | Offline validation and node lookup |
| Hallucinated schemas | `correctUsage` in error responses |
| Debugging complex workflows | Local iteration without network |
| Version control | Local files, git-friendly |

### MCP Integration

For richer AI integration, see the companion [n8n-mcp](https://github.com/yigitkonur/n8n-mcp) project which provides Model Context Protocol (MCP) tools for n8n workflow development.

---

## Scripting & Automation

### Exit Codes Reference

The CLI uses POSIX-standard exit codes for reliable scripting:

| Code | Name | Description | When Returned |
|------|------|-------------|---------------|
| `0` | `SUCCESS` | Command completed successfully | All data valid, operation successful |
| `1` | `GENERAL_ERROR` | General/unknown error | Unhandled exceptions, unexpected failures |
| `64` | `USAGE_ERROR` | Invalid command usage | Wrong arguments, unknown command, missing required option |
| `65` | `DATAERR` | Invalid input data | Validation failed, malformed JSON, resource not found |
| `66` | `NOINPUT` | Cannot open input file | File doesn't exist, permission denied on read |
| `70` | `SOFTWARE_ERROR` | Internal error | CLI bug, assertion failure, database corruption |
| `73` | `NETWORK_ERROR` | Network/API failure | Connection timeout, DNS failure, API error (5xx) |
| `78` | `CONFIG_ERROR` | Configuration error | Missing config, invalid credentials, auth failure |

### Bash Scripting Examples

```bash
#!/bin/bash
# Validate and deploy workflow with error handling

WORKFLOW_FILE="workflow.json"

# Validate workflow
n8n workflows validate "$WORKFLOW_FILE" --json > result.json
EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "✓ Validation passed. Deploying..."
    n8n workflows import "$WORKFLOW_FILE" --activate
    if [ $? -eq 0 ]; then
      echo "✓ Deployment successful"
      exit 0
    else
      echo "✗ Deployment failed"
      exit 1
    fi
    ;;
  65)
    echo "✗ Validation failed:"
    jq -r '.errors[] | "  - \(.nodeName): \(.code)"' result.json
    exit 65
    ;;
  66)
    echo "✗ File not found: $WORKFLOW_FILE"
    exit 66
    ;;
  73)
    echo "✗ Network error - check connection to n8n instance"
    exit 73
    ;;
  78)
    echo "✗ Configuration error - check N8N_HOST and N8N_API_KEY"
    exit 78
    ;;
  *)
    echo "✗ Unknown error (exit code: $EXIT_CODE)"
    exit 1
    ;;
esac
```

### Python Scripting Example

```python
import subprocess
import sys
import json

def validate_workflow(file_path):
    """Validate workflow and return structured result."""
    result = subprocess.run(
        ['n8n', 'workflows', 'validate', file_path, '--json'],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        return {'valid': True, 'data': json.loads(result.stdout)}
    elif result.returncode == 65:
        return {'valid': False, 'errors': json.loads(result.stdout).get('errors', [])}
    elif result.returncode == 73:
        raise ConnectionError("Network error - check n8n connection")
    elif result.returncode == 78:
        raise ValueError("Configuration error - check credentials")
    else:
        raise RuntimeError(f"Unknown error: {result.returncode}")

# Usage
try:
    result = validate_workflow('workflow.json')
    if result['valid']:
        print("✓ Valid")
    else:
        for error in result['errors']:
            print(f"✗ {error['nodeName']}: {error['code']}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
```

### Makefile Example

```makefile
.PHONY: validate deploy

validate:
	@echo "Validating workflows..."
	@for file in workflows/*.json; do \
		n8n workflows validate "$$file" --profile strict || exit 65; \
	done
	@echo "✓ All workflows valid"

deploy: validate
	@echo "Deploying workflows..."
	@for file in workflows/*.json; do \
		n8n workflows import "$$file" --activate || exit 1; \
	done
	@echo "✓ All workflows deployed"
```

### jq Recipes

```bash
# Count workflows
n8n workflows list --json | jq '.data | length'

# Get active workflow IDs
n8n workflows list --active --limit 0 --json | jq '.data[].id'

# Extract validation errors
n8n workflows validate wf.json --json | jq '.errors[] | "\(.nodeName): \(.code)"'

# Find nodes by type
n8n workflows get <id> --json | jq '.nodes[] | select(.type | contains("slack"))'
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate Workflows
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install n8n-cli
        run: npm install -g cli-n8n
      
      - name: Validate Workflows
        run: |
          for f in workflows/*.json; do
            n8n workflows validate "$f" --profile strict
          done
```

### GitLab CI

```yaml
validate-workflows:
  image: node:20
  script:
    - npm install -g cli-n8n
    - |
      for f in workflows/*.json; do
        n8n workflows validate "$f" --profile strict
      done
```

---

## Cheat Sheet

### Authentication
```bash
n8n auth login --interactive     # Interactive setup
n8n auth status                  # Check auth
n8n health                       # Test connection
```

### Workflows
```bash
n8n workflows list               # List all
n8n workflows list --active      # Active only
n8n workflows get <id>           # Get one
n8n workflows export <id> -o f.json  # Export
n8n workflows validate f.json    # Validate
n8n workflows validate f.json --fix --save fixed.json  # Fix
n8n workflows import f.json      # Deploy
n8n workflows autofix f.json --apply  # Auto-fix
n8n workflows deploy-template 3121    # Deploy template
```

### Nodes
```bash
n8n nodes search "slack"         # Search
n8n nodes show slack --detail minimal  # Quick lookup
n8n nodes show slack --schema    # Full schema
n8n nodes categories             # List categories
```

### Credentials
```bash
n8n credentials list             # List all
n8n credentials types            # Available types
n8n credentials create -t type -n name -d @creds.json
```

### Executions
```bash
n8n executions list              # Recent
n8n executions list --status error  # Failed only
n8n executions get <id>          # Details
n8n executions retry <id>        # Retry
```

### Templates
```bash
n8n templates search "keyword"   # Search
n8n templates search --by-task ai_automation  # By task
n8n templates get 3121           # Get details
```

---

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing N8N_HOST` | Host not configured | Set env var or config file |
| `Missing N8N_API_KEY` | API key not configured | Get from n8n Settings → API |
| `401 Unauthorized` | Invalid API key | Regenerate key |
| `Connection refused` | Wrong host/port | Check URL |
| `ENOTFOUND` | DNS resolution failed | Check hostname |
| `ETIMEDOUT` | Connection timeout | Check firewall/proxy |
| `Certificate error` | TLS issue | Check SSL cert |

### Connection Issues

```bash
# Test connectivity
curl -I https://your-n8n.com/api/v1/workflows

# Check with verbose
N8N_DEBUG=true n8n health

# Use custom timeout
N8N_TIMEOUT=60000 n8n workflows list
```

---

## FAQ

**Q: Does this CLI work offline?**
A: Node lookup, validation, and autofix work offline. API operations (list, create, deploy) require n8n connection.

**Q: Where are workflows validated?**
A: Locally against bundled schemas. No data sent to n8n until deployment.

**Q: How do I use multiple n8n instances?**
A: Use profiles in `.n8nrc.json` and `--profile` flag or `N8N_PROFILE` env var.

**Q: Is my API key secure?**
A: Use `chmod 600` on config files, prefer env vars in CI/CD.

**Q: Why do expressions need `=` prefix?**
A: n8n requires `={{ }}` not `{{ }}` for expression evaluation.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 64 | Usage error |
| 65 | Data/validation error |
| 66 | Input not found |
| 70 | Software error |
| 73 | Network error |
| 78 | Config error |

---

## Development

```bash
# Clone repository
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

### Project Structure

```
src/
├── cli.ts              # Entry point, command registration
├── commands/           # Command handlers
│   ├── workflows/      # Workflow commands
│   ├── nodes/          # Node commands
│   ├── credentials/    # Credential commands
│   └── ...
├── core/               # Core logic
│   ├── api/            # API client
│   ├── validation/     # Validators
│   ├── autofix/        # Autofix engine
│   ├── versioning/     # Version management
│   └── db/             # SQLite adapter
├── types/              # TypeScript types
└── utils/              # Utilities
```

---

## See Also

- [cli-commands-reference.md](./cli-commands-reference.md) — Complete command reference
- [.n8nrc.example](./.n8nrc.example) — Example configuration file
- [n8n-mcp](https://github.com/yigitkonur/n8n-mcp) — MCP server for AI agents