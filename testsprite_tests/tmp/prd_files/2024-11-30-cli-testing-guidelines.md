# n8n CLI Testing Guidelines

**Date:** 2024-11-30  
**Scope:** Complete testing guidelines for the n8n CLI tool covering all 18 commands across 6 groups  
**Context:** Based on analysis of `src/commands/`, `src/core/`, `src/utils/`, and `src/cli.ts`  
**Audience:** New developer onboarding to the project

---

## 1. Executive Summary

This document provides comprehensive testing guidelines for the n8n CLI tool. The CLI is a full-featured command-line interface for n8n workflow management, built with:

- **Commander.js** for argument parsing
- **Axios** for HTTP API calls
- **SQLite** (via better-sqlite3) for local node database
- **Chalk** for styled terminal output

### Quick Stats

| Metric | Value |
|--------|-------|
| **Total Commands** | 18 |
| **Command Groups** | 6 (auth, health, nodes, workflows, executions, templates) |
| **Output Modes** | Human-readable (default) and JSON (`--json`) |
| **Interaction Modes** | Interactive (TTY) and Non-interactive (CI/agents) |

---

## 2. Prerequisites & Setup

### 2.1 Environment Setup

Before testing, you must configure the CLI to connect to an n8n instance.

#### Option A: Environment Variables (Recommended for CI)

```bash
export N8N_HOST=https://your-n8n-instance.com
export N8N_API_KEY=your-api-key-here
```

#### Option B: Configuration File

Create `.n8nrc` or `.n8nrc.json` in one of these locations (priority order):
1. `.n8nrc` (current directory)
2. `.n8nrc.json` (current directory)
3. `~/.n8nrc` (home directory)
4. `~/.n8nrc.json` (home directory)
5. `~/.config/n8n/config.json`

**Example `.n8nrc.json`:**
```json
{
  "host": "https://your-n8n-instance.com",
  "apiKey": "your-api-key-here",
  "timeout": 30000,
  "debug": false
}
```

**Code Reference:** `src/core/config/loader.ts` lines 36-42

### 2.2 Configuration Options

| Option | Env Variable | Config Key | Default | Description |
|--------|--------------|------------|---------|-------------|
| Host URL | `N8N_HOST` or `N8N_URL` | `host` | `http://localhost:5678` | n8n instance URL |
| API Key | `N8N_API_KEY` | `apiKey` | *(required)* | n8n API key (20+ chars) |
| Timeout | `N8N_TIMEOUT` | `timeout` | `30000` | Request timeout in ms |
| Debug Mode | `N8N_DEBUG=true` | `debug` | `false` | Enable debug logging |
| DB Path | `N8N_DB_PATH` | `dbPath` | `./data/nodes.db` | Node database path |

### 2.3 Verify Setup

```bash
# Check authentication status
n8n auth status

# Test connectivity
n8n health

# List workflows (confirms API access)
n8n workflows list --limit 1
```

---

## 3. Command Reference

### 3.1 Command Overview Map

```
n8n
├── auth
│   ├── login      # Configure credentials
│   ├── logout     # Clear credentials
│   └── status     # Show auth status (alias: whoami)
├── health         # Check n8n connectivity
├── nodes
│   ├── search     # Search node database
│   ├── get        # Get node details
│   └── validate   # Validate node config
├── workflows
│   ├── list       # List all workflows
│   ├── get        # Get workflow by ID
│   ├── validate   # Validate workflow structure
│   ├── create     # Create new workflow
│   ├── update     # Update workflow
│   ├── autofix    # Auto-fix issues
│   └── trigger    # Trigger via webhook
├── executions
│   ├── list       # List executions
│   └── get        # Get execution details
├── templates
│   ├── search     # Search n8n.io templates
│   └── get        # Get template by ID
└── validate       # Legacy command (redirects to workflows validate)
```

---

## 4. Detailed Command Testing Guide

### 4.1 AUTH Commands

#### `n8n auth login`

**Source:** `src/commands/auth/login.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-H, --host <url>` | string | - | n8n instance URL |
| `-k, --api-key <key>` | string | - | n8n API key |
| `-i, --interactive` | boolean | false | Use interactive prompts |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-AUTH-L-001 | P0 | `n8n auth login --host https://test.com --api-key VALID_KEY` | "Authentication configured successfully" | 0 |
| TC-AUTH-L-002 | P0 | `n8n auth login --host https://test.com --api-key INVALID` | "Verification failed" error | 1 |
| TC-AUTH-L-003 | P1 | `n8n auth login` (with env vars set) | Uses env vars, success message | 0 |
| TC-AUTH-L-004 | P1 | `n8n auth login` (no credentials, TTY) | Shows interactive prompts | - |
| TC-AUTH-L-005 | P1 | `n8n auth login` (no credentials, no TTY) | "Missing required credentials" error | 1 |
| TC-AUTH-L-006 | P2 | `n8n auth login --host test.com:5678` | Auto-normalizes to `http://test.com:5678` | 0 |
| TC-AUTH-L-007 | P2 | `n8n auth login --interactive` (no TTY) | "Interactive mode not available (no TTY)" | 1 |
| TC-AUTH-L-008 | P2 | `n8n auth login --json --host URL --api-key KEY` | JSON output: `{"success": true, ...}` | 0 |

**Edge Cases to Test:**
- URL with trailing slashes: `https://test.com/`
- URL with path: `https://test.com/settings/profile` (should be normalized)
- Connection refused scenario (n8n not running)
- Connection timeout
- Rate limiting (429 response)

---

#### `n8n auth status` (alias: `whoami`)

**Source:** `src/commands/auth/status.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-AUTH-S-001 | P0 | `n8n auth status` (configured, valid) | "Ready to use n8n CLI" | 0 |
| TC-AUTH-S-002 | P0 | `n8n auth status` (not configured) | "Not configured" warning | 1 |
| TC-AUTH-S-003 | P1 | `n8n auth status` (configured, invalid key) | "API Key invalid" error | 1 |
| TC-AUTH-S-004 | P1 | `n8n auth status` (configured, n8n offline) | "Not connected" error | 1 |
| TC-AUTH-S-005 | P2 | `n8n auth status --json` | JSON with `configured`, `connected`, `apiKeyValid`, `latencyMs` | 0/1 |

---

#### `n8n auth logout`

**Source:** `src/commands/auth/logout.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-AUTH-O-001 | P0 | `n8n auth logout` (was configured) | "Credentials cleared" | 0 |
| TC-AUTH-O-002 | P1 | `n8n auth logout` (already empty) | "No credentials were configured" | 0 |
| TC-AUTH-O-003 | P2 | `n8n auth logout --json` | JSON: `{"success": true, "wasConfigured": true/false}` | 0 |

---

### 4.2 HEALTH Command

#### `n8n health`

**Source:** `src/commands/health/index.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-HEALTH-001 | P0 | `n8n health` (n8n online, valid key) | "Connection: OK", "API Key: Valid" | 0 |
| TC-HEALTH-002 | P0 | `n8n health` (n8n offline) | "Connection: Failed" | 1 |
| TC-HEALTH-003 | P1 | `n8n health` (invalid API key) | "Connection: OK", "API Key: Invalid" | 1 |
| TC-HEALTH-004 | P1 | `n8n health` (no config) | "N8N_HOST not configured" | 1 |
| TC-HEALTH-005 | P2 | `n8n health --json` | JSON: `{"status": "ok"/"error", "latencyMs": N, ...}` | 0/1 |

**Connectivity Checks:** The health command tries:
1. `/healthz` endpoint (no auth required)
2. Falls back to `/api/v1/workflows` with auth

---

### 4.3 NODES Commands

#### `n8n nodes search <query>`

**Source:** `src/commands/nodes/search.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-m, --mode <mode>` | string | `OR` | Search mode: `OR`, `AND`, `FUZZY` |
| `-l, --limit <n>` | number | `10` | Limit results |
| `-s, --save <path>` | string | - | Save results to JSON file |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-NODE-S-001 | P0 | `n8n nodes search webhook` | Table with matching nodes | 0 |
| TC-NODE-S-002 | P0 | `n8n nodes search "nonexistent12345"` | "No nodes found" | 0 |
| TC-NODE-S-003 | P1 | `n8n nodes search http --mode AND` | Matches ALL terms | 0 |
| TC-NODE-S-004 | P1 | `n8n nodes search htpp --mode FUZZY` | Fuzzy matches "http" | 0 |
| TC-NODE-S-005 | P1 | `n8n nodes search webhook --limit 5` | Max 5 results | 0 |
| TC-NODE-S-006 | P2 | `n8n nodes search webhook --save nodes.json` | Saves file + prints confirmation | 0 |
| TC-NODE-S-007 | P2 | `n8n nodes search webhook --json` | JSON: `{"query": "...", "nodes": [...]}` | 0 |

**Note:** This command queries the local SQLite database (`data/nodes.db`), NOT the n8n API.

---

#### `n8n nodes get <nodeType>`

**Source:** `src/commands/nodes/get.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-m, --mode <mode>` | string | `info` | Output mode: `info`, `docs`, `versions` |
| `-d, --detail <level>` | string | `standard` | Detail level: `minimal`, `standard`, `full` |
| `-s, --save <path>` | string | - | Save to JSON file |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-NODE-G-001 | P0 | `n8n nodes get n8n-nodes-base.httpRequest` | Node info with properties | 0 |
| TC-NODE-G-002 | P0 | `n8n nodes get httpRequest` | Normalizes to `nodes-base.httprequest` | 0 |
| TC-NODE-G-003 | P0 | `n8n nodes get nonexistent` | "Node not found" error | 1 |
| TC-NODE-G-004 | P1 | `n8n nodes get webhook --mode docs` | Markdown-style documentation | 0 |
| TC-NODE-G-005 | P1 | `n8n nodes get webhook --mode versions` | Version information | 0 |
| TC-NODE-G-006 | P1 | `n8n nodes get webhook --detail full` | Shows all properties (up to 50) | 0 |
| TC-NODE-G-007 | P2 | `n8n nodes get webhook --json` | Full node schema as JSON | 0 |

---

#### `n8n nodes validate <nodeType>`

**Source:** `src/commands/nodes/validate.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-c, --config <json>` | string | `{}` | Node config as JSON string |
| `--profile <profile>` | string | `runtime` | Validation profile: `minimal`, `runtime`, `strict` |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-NODE-V-001 | P0 | `n8n nodes validate webhook` | "Valid" (no config = shows required props) | 0 |
| TC-NODE-V-002 | P1 | `n8n nodes validate httpRequest --config '{"method":"GET"}'` | Validates config | 0/1 |
| TC-NODE-V-003 | P1 | `n8n nodes validate httpRequest --config 'invalid-json'` | "Invalid JSON config" error | 1 |
| TC-NODE-V-004 | P2 | `n8n nodes validate webhook --json` | JSON validation result | 0/1 |

**Note:** The `--profile` flag is defined but validation profiles may have limited implementation. Document observed behavior.

---

### 4.4 WORKFLOWS Commands

#### `n8n workflows list`

**Source:** `src/commands/workflows/list.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-a, --active` | boolean | - | Filter active workflows only |
| `-t, --tags <tags>` | string | - | Filter by tags (comma-separated) |
| `-l, --limit <n>` | number | `10` | Limit results |
| `--cursor <cursor>` | string | - | Pagination cursor |
| `-s, --save <path>` | string | - | Save to JSON file |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-WF-L-001 | P0 | `n8n workflows list` | Table of workflows | 0 |
| TC-WF-L-002 | P0 | `n8n workflows list` (no workflows) | "No workflows found" | 0 |
| TC-WF-L-003 | P1 | `n8n workflows list --active` | Only active workflows | 0 |
| TC-WF-L-004 | P1 | `n8n workflows list --limit 5` | Max 5 workflows | 0 |
| TC-WF-L-005 | P1 | `n8n workflows list --tags production,test` | Filtered by tags | 0 |
| TC-WF-L-006 | P2 | `n8n workflows list --json` | JSON: `{"data": [...], "nextCursor": ...}` | 0 |
| TC-WF-L-007 | P2 | `n8n workflows list --cursor <cursor>` | Next page of results | 0 |

---

#### `n8n workflows get <id>`

**Source:** `src/commands/workflows/get.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-m, --mode <mode>` | string | `full` | Output mode: `full`, `details`, `structure`, `minimal` |
| `-s, --save <path>` | string | - | Save to JSON file |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-WF-G-001 | P0 | `n8n workflows get VALID_ID` | Full workflow details | 0 |
| TC-WF-G-002 | P0 | `n8n workflows get INVALID_ID` | "Workflow not found" error | 1 |
| TC-WF-G-003 | P1 | `n8n workflows get ID --mode minimal` | Just name, ID, active status | 0 |
| TC-WF-G-004 | P1 | `n8n workflows get ID --mode structure` | Node list with positions | 0 |
| TC-WF-G-005 | P2 | `n8n workflows get ID --json --save workflow.json` | Saves full workflow JSON | 0 |

**Important:** Test with various workflow ID formats:
- Numeric IDs: `123`
- String IDs: `abc-123` (varies by n8n version)

---

#### `n8n workflows validate [idOrFile]`

**Source:** `src/commands/workflows/validate.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-f, --file <path>` | string | - | Path to workflow JSON file |
| `--profile <profile>` | string | `runtime` | Validation profile: `minimal`, `runtime`, `ai-friendly`, `strict` |
| `--repair` | boolean | false | Attempt to repair malformed JSON |
| `--fix` | boolean | false | Auto-fix known issues |
| `-s, --save <path>` | string | - | Save fixed workflow to file |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-WF-V-001 | P0 | `n8n workflows validate WORKFLOW_ID` | Validation result from API | 0/1 |
| TC-WF-V-002 | P0 | `n8n workflows validate ./workflow.json` | Validates local file | 0/1 |
| TC-WF-V-003 | P0 | `n8n workflows validate --file ./workflow.json` | Same as above (explicit) | 0/1 |
| TC-WF-V-004 | P1 | `n8n workflows validate ./broken.json --repair` | Attempts JSON repair | 0/1 |
| TC-WF-V-005 | P1 | `n8n workflows validate ID --fix` | Auto-fixes issues | 0/1 |
| TC-WF-V-006 | P2 | `n8n workflows validate ID --fix --save fixed.json` | Saves fixed version | 0/1 |
| TC-WF-V-007 | P2 | `n8n workflows validate` (no input) | "Please provide workflow ID or --file path" | 1 |

**Validation Logic:** `src/core/validator.ts`  
**Fix Logic:** `src/core/fixer.ts` - `fixInvalidOptionsFields()`

---

#### `n8n workflows create`

**Source:** `src/commands/workflows/create.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-f, --file <path>` | string | **required** | Path to workflow JSON file |
| `-n, --name <name>` | string | - | Workflow name (overrides file) |
| `--dry-run` | boolean | `true` | Preview without creating |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-WF-C-001 | P0 | `n8n workflows create --file ./workflow.json` | Creates workflow (dry-run by default!) | 0 |
| TC-WF-C-002 | P0 | `n8n workflows create` (no file) | "Please provide --file" error | 1 |
| TC-WF-C-003 | P1 | `n8n workflows create --file ./wf.json --name "My Workflow"` | Overrides name | 0 |
| TC-WF-C-004 | P2 | `n8n workflows create --file ./wf.json --json` | JSON output with new ID | 0 |

**IMPORTANT:** `--dry-run` is `true` by default! To actually create, you may need to explicitly use `--no-dry-run` or verify actual behavior.

---

#### `n8n workflows update <id>`

**Source:** `src/commands/workflows/update.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-f, --file <path>` | string | - | Path to workflow JSON file |
| `--activate` | boolean | false | Activate the workflow |
| `--deactivate` | boolean | false | Deactivate the workflow |
| `--force, --yes` | boolean | false | Skip confirmation prompts |
| `--no-backup` | boolean | false | Skip creating backup |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-WF-U-001 | P0 | `n8n workflows update ID --file ./updated.json --yes` | Updates workflow | 0 |
| TC-WF-U-002 | P0 | `n8n workflows update ID --activate --yes` | Activates workflow | 0 |
| TC-WF-U-003 | P0 | `n8n workflows update ID --deactivate --yes` | Deactivates workflow | 0 |
| TC-WF-U-004 | P1 | `n8n workflows update ID` (no flags) | "Provide --file, --activate, or --deactivate" | 1 |
| TC-WF-U-005 | P1 | `n8n workflows update ID --file ./wf.json` (no TTY) | "Cannot prompt in non-interactive mode" | 1 |
| TC-WF-U-006 | P2 | `n8n workflows update ID --file ./wf.json --no-backup --yes` | Skips backup creation | 0 |

**Confirmation Prompts:**
- Without `--force` or `--yes`, prompts for confirmation
- Fails in non-interactive mode without force flag

**Backup Behavior:** Creates `.bak` files before changes unless `--no-backup` is used.

---

#### `n8n workflows autofix <id>`

**Source:** `src/commands/workflows/autofix.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | boolean | `true` | Preview fixes without applying |
| `--confidence <level>` | string | `medium` | Minimum confidence: `high`, `medium`, `low` |
| `-s, --save <path>` | string | - | Save fixed workflow locally |
| `--apply` | boolean | false | Apply fixes (to file or n8n server) |
| `--force, --yes` | boolean | false | Skip confirmation prompts |
| `--no-backup` | boolean | false | Skip creating backup |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-WF-A-001 | P0 | `n8n workflows autofix WORKFLOW_ID` | Shows fixes (dry-run default) | 0 |
| TC-WF-A-002 | P0 | `n8n workflows autofix ./workflow.json` | Fixes local file (preview) | 0 |
| TC-WF-A-003 | P1 | `n8n workflows autofix ID --apply --yes` | Applies to n8n server | 0 |
| TC-WF-A-004 | P1 | `n8n workflows autofix ./wf.json --apply --yes` | Overwrites local file | 0 |
| TC-WF-A-005 | P1 | `n8n workflows autofix ID --save fixed.json` | Saves fixed version | 0 |
| TC-WF-A-006 | P2 | `n8n workflows autofix ID --json` | JSON: `{"totalFixes": N, "fixes": [...]}` | 0 |

**Fix Functions Applied:**
1. `fixInvalidOptionsFields()` - Standard fixes
2. `sanitizeWorkflow()` - Structure sanitization
3. `applyExperimentalFixes()` - Only with `--experimental` (undocumented)

---

#### `n8n workflows trigger <webhookUrl>`

**Source:** `src/commands/workflows/trigger.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-d, --data <json>` | string | `{}` | Request body as JSON |
| `-m, --method <method>` | string | `POST` | HTTP method: `GET`, `POST`, `PUT`, `DELETE` |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-WF-T-001 | P0 | `n8n workflows trigger https://n8n.io/webhook/xxx` | Webhook response | 0/1 |
| TC-WF-T-002 | P1 | `n8n workflows trigger URL --data '{"key":"value"}'` | Sends JSON body | 0/1 |
| TC-WF-T-003 | P1 | `n8n workflows trigger URL --method GET` | Uses GET method | 0/1 |
| TC-WF-T-004 | P2 | `n8n workflows trigger URL --json` | Full response as JSON | 0/1 |

**Note:** Exit code depends on HTTP response status (2xx = 0, others = 1)

---

### 4.5 EXECUTIONS Commands

#### `n8n executions list`

**Source:** `src/commands/executions/list.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-w, --workflow-id <id>` | string | - | Filter by workflow ID |
| `--status <status>` | string | - | Filter by status: `success`, `error`, `waiting` |
| `-l, --limit <n>` | number | `10` | Limit results |
| `--cursor <cursor>` | string | - | Pagination cursor |
| `-s, --save <path>` | string | - | Save to JSON file |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-EX-L-001 | P0 | `n8n executions list` | Table of executions | 0 |
| TC-EX-L-002 | P1 | `n8n executions list --workflow-id ID` | Filtered by workflow | 0 |
| TC-EX-L-003 | P1 | `n8n executions list --status error` | Only failed executions | 0 |
| TC-EX-L-004 | P1 | `n8n executions list --limit 5` | Max 5 results | 0 |
| TC-EX-L-005 | P2 | `n8n executions list --json` | JSON with data and nextCursor | 0 |

---

#### `n8n executions get <id>`

**Source:** `src/commands/executions/get.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-m, --mode <mode>` | string | `summary` | Output mode: `preview`, `summary`, `filtered`, `full` |
| `-s, --save <path>` | string | - | Save to JSON file |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-EX-G-001 | P0 | `n8n executions get EXECUTION_ID` | Execution summary | 0 |
| TC-EX-G-002 | P0 | `n8n executions get INVALID_ID` | "Execution not found" error | 1 |
| TC-EX-G-003 | P1 | `n8n executions get ID --mode full` | Full data including node outputs | 0 |
| TC-EX-G-004 | P1 | `n8n executions get ID` (error execution) | Shows error details | 0 |
| TC-EX-G-005 | P2 | `n8n executions get ID --json --save exec.json` | Saves execution JSON | 0 |

---

### 4.6 TEMPLATES Commands

#### `n8n templates search <query>`

**Source:** `src/commands/templates/search.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-l, --limit <n>` | number | `10` | Limit results |
| `-s, --save <path>` | string | - | Save to JSON file |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-TPL-S-001 | P0 | `n8n templates search slack` | Templates table | 0 |
| TC-TPL-S-002 | P0 | `n8n templates search "nonexistent12345xyz"` | "No templates found" | 0 |
| TC-TPL-S-003 | P1 | `n8n templates search email --limit 5` | Max 5 results | 0 |
| TC-TPL-S-004 | P2 | `n8n templates search github --json` | JSON output | 0 |

**Note:** Uses public n8n.io API (`https://api.n8n.io/api/templates`) - requires internet.

---

#### `n8n templates get <id>`

**Source:** `src/commands/templates/get.ts`

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s, --save <path>` | string | - | Save workflow to JSON file |
| `--json` | boolean | false | Output as JSON |

**Test Cases:**

| ID | Priority | Steps | Expected Output | Exit Code |
|----|----------|-------|-----------------|-----------|
| TC-TPL-G-001 | P0 | `n8n templates get 1` | Template details | 0 |
| TC-TPL-G-002 | P0 | `n8n templates get 99999999` | "Template not found" error | 1 |
| TC-TPL-G-003 | P1 | `n8n templates get 1 --save workflow.json` | Downloads template as workflow JSON | 0 |
| TC-TPL-G-004 | P2 | `n8n templates get 1 --json` | Full workflow JSON (ready to import) | 0 |

---

### 4.7 Legacy Command

#### `n8n validate [file]`

**Source:** `src/cli.ts` lines 290-301 (redirects to `workflows validate`)

This is a backward-compatibility alias. All calls redirect to `n8n workflows validate`.

---

## 5. Error Handling & Troubleshooting

### 5.1 Error Classes

**Source:** `src/utils/errors.ts`

| Error Class | HTTP Status | Code | Common Cause |
|-------------|-------------|------|--------------|
| `N8nApiError` | Various | `API_ERROR` | Generic API error |
| `N8nAuthenticationError` | 401 | `AUTHENTICATION_ERROR` | Invalid/expired API key |
| `N8nNotFoundError` | 404 | `NOT_FOUND` | Resource doesn't exist |
| `N8nValidationError` | 400 | `VALIDATION_ERROR` | Invalid request data |
| `N8nRateLimitError` | 429 | `RATE_LIMIT_ERROR` | Too many requests |
| `N8nServerError` | 5xx | `SERVER_ERROR` | n8n server issue |
| `N8nConnectionError` | - | `CONNECTION_ERROR` | Cannot reach n8n |

### 5.2 Common Error Scenarios

| Scenario | Error Message | Resolution |
|----------|---------------|------------|
| n8n not running | "Connection refused" | Start n8n instance |
| Invalid API key | "Authentication failed" | Generate new key in Settings → API |
| Wrong host URL | "Host not found" | Check N8N_HOST setting |
| API key lacks permissions | "API key lacks required permissions" | Check API key scopes |
| Workflow not found | "Workflow with ID X not found" | Verify workflow ID |
| Invalid workflow JSON | "Failed to parse workflow JSON" | Use `--repair` flag |
| Non-interactive mode | "Cannot prompt in non-interactive mode" | Use `--force` or `--yes` |
| Insecure config file | "Config file has insecure permissions" | `chmod 600 .n8nrc` |

### 5.3 Exit Codes

| Exit Code | Meaning |
|-----------|---------|
| `0` | Success |
| `1` | Error (generic) |

The CLI sets `process.exitCode` rather than calling `process.exit()` to allow cleanup handlers to run.

---

## 6. Testing Methodology

### 6.1 Recommended Approach

Based on the CLI architecture, use this testing hierarchy:

1. **Integration Tests (Priority):** Mock `process.argv` and call commands
2. **Unit Tests:** Test individual handler functions
3. **E2E Tests:** Spawn actual CLI process (slow, use sparingly)

### 6.2 Vitest Setup Example

```typescript
// tests/commands/health.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { program } from '../../src/cli.js';

describe('health command', () => {
  let stdoutSpy: vi.SpyInstance;
  let exitSpy: vi.SpyInstance;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exitCode', 'set').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return success when n8n is reachable', async () => {
    // Mock API client
    vi.mock('../../src/core/api/client.js', () => ({
      getApiClient: () => ({
        healthCheck: vi.fn().mockResolvedValue({ status: 'ok' }),
      }),
    }));

    process.argv = ['node', 'cli.js', 'health', '--json'];
    await program.parseAsync();

    expect(console.log).toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });
});
```

### 6.3 Mock Patterns

**Mocking API Client:**
```typescript
vi.mock('../../src/core/api/client.js', () => ({
  getApiClient: () => ({
    listWorkflows: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    getWorkflow: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
  }),
}));
```

**Mocking Config:**
```typescript
vi.mock('../../src/core/config/loader.js', () => ({
  getConfig: () => ({
    host: 'http://localhost:5678',
    apiKey: 'test-key',
    timeout: 30000,
  }),
  isConfigured: () => true,
}));
```

---

## 7. Testing Workflow for New Developer

### Step-by-Step Guide

#### Step 1: Setup Test Environment

```bash
# Clone and install
cd /Users/yigitkonur/n8n-workspace/cli
npm install

# Set up test n8n instance (or use existing)
export N8N_HOST=http://localhost:5678
export N8N_API_KEY=your-test-key

# Verify setup
n8n health
```

#### Step 2: Test Each Command Group

Work through command groups in order:

1. **auth** - Start here (required for API commands)
2. **health** - Verify connectivity
3. **nodes** - No API required, uses local DB
4. **workflows** - Core functionality
5. **executions** - Requires workflows to exist
6. **templates** - Uses public API (internet required)

#### Step 3: For Each Command

1. **Read the test case table** in this document
2. **Run happy path first** (P0 tests)
3. **Test error cases** 
4. **Test both output modes** (`--json` and human-readable)
5. **Document findings** in bug tracker

#### Step 4: Document Findings

Create a test results file for each session:

```markdown
# Test Results: [DATE]

## Environment
- CLI Version: X.X.X
- n8n Version: X.X.X
- OS: macOS/Linux/Windows

## Results

### auth commands
| Test ID | Result | Notes |
|---------|--------|-------|
| TC-AUTH-L-001 | PASS | |
| TC-AUTH-L-002 | PASS | |

### workflows commands
| Test ID | Result | Notes |
|---------|--------|-------|
| TC-WF-L-001 | FAIL | Bug: [description] |
```

---

## 8. Test Output Documentation Template

Save test results in: `bugs/YYYY-MM-DD-test-session.md`

```markdown
# CLI Test Session: [YYYY-MM-DD]

## Tester
[Your Name]

## Environment
- **CLI Version:** Run `n8n --version`
- **n8n Version:** From `n8n health` or API
- **OS:** [macOS Ventura / Ubuntu 22.04 / etc.]
- **Node.js Version:** Run `node --version`

## Configuration
- Host: [masked]
- Auth Status: [configured/not configured]

## Test Execution

### Command Group: [auth/health/nodes/etc.]

#### [Command Name]

| ID | Steps Executed | Expected | Actual | Status | Notes |
|----|----------------|----------|--------|--------|-------|
| TC-XXX-001 | `n8n command --flag` | Expected output | Actual output | PASS/FAIL | Any observations |

### Bugs Found

#### BUG-001: [Title]
- **Severity:** P0/P1/P2/P3
- **Command:** `n8n [command]`
- **Steps to Reproduce:**
  1. Step one
  2. Step two
- **Expected:** What should happen
- **Actual:** What happened
- **Screenshot/Log:** [if applicable]

## Summary
- Total Tests: X
- Passed: X
- Failed: X
- Blocked: X
- New Bugs: X
```

---

## 9. Appendix

### 9.1 Global Flags

All commands support:

| Flag | Description |
|------|-------------|
| `-V, --version` | Output version number |
| `-h, --help` | Display help for command |

### 9.2 File Locations

| File/Directory | Purpose |
|----------------|---------|
| `~/.n8nrc.json` | User config file |
| `./data/nodes.db` | Node database |
| `./.n8n-backup/` | Backup directory for workflows |

### 9.3 CI Environment Detection

The CLI detects these CI environment variables and disables interactive prompts:
- `CI`
- `GITHUB_ACTIONS`
- `GITLAB_CI`
- `JENKINS_URL`
- `TRAVIS`
- `CIRCLECI`
- `BUILDKITE`
- `DRONE`
- `TF_BUILD` (Azure DevOps)

**Source:** `src/utils/prompts.ts` lines 33-43

### 9.4 API Key Format

Valid API key pattern: `/^[a-zA-Z0-9_-]{20,}$/`

- Minimum 20 characters
- Alphanumeric plus `-` and `_`

**Source:** `src/core/config/loader.ts` line 178

---

## 10. Quick Reference Card

```
# Authentication
n8n auth login --host URL --api-key KEY    # Configure
n8n auth status                             # Check status
n8n auth logout                             # Clear credentials

# Connectivity
n8n health                                  # Test connection

# Nodes (local database)
n8n nodes search QUERY                      # Search nodes
n8n nodes get NODE_TYPE                     # Get node info
n8n nodes validate NODE_TYPE                # Validate config

# Workflows
n8n workflows list                          # List all
n8n workflows get ID                        # Get details
n8n workflows validate ID                   # Validate
n8n workflows create --file FILE            # Create new
n8n workflows update ID --activate          # Activate
n8n workflows autofix ID --apply --yes      # Fix issues
n8n workflows trigger WEBHOOK_URL           # Trigger

# Executions
n8n executions list                         # List all
n8n executions get ID                       # Get details

# Templates (public API)
n8n templates search QUERY                  # Search
n8n templates get ID --save workflow.json   # Download

# Universal flags
--json                                      # JSON output
--save PATH                                 # Save to file
--limit N                                   # Limit results
--help                                      # Show help
```

---

**Document End**

*Generated from codebase analysis on 2024-11-30*
