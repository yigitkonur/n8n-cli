# n8n CLI Command Reference

**Version**: 1.7.0  
**Last Updated**: 2025-12-01

A comprehensive command-line interface for managing n8n workflows, executions, credentials, and more.

---

## Installation & Setup

```bash
# Install globally
npm install -g n8n-cli

# Or run from source
npm run build
./dist/cli.js --version
```

### Initial Configuration

```bash
# Interactive login
n8n auth login --interactive

# Or with flags
n8n auth login --host https://your-n8n.example.com --api-key YOUR_API_KEY

# Verify connection
n8n health
```

---

## Command Structure

```
n8n [command] [subcommand] [options]
```

### Top-Level Commands

| Command | Description |
|---------|-------------|
| `auth` | Manage authentication credentials |
| `health` | Check n8n instance connectivity |
| `nodes` | Search, list, and inspect nodes |
| `workflows` | Manage workflows (CRUD, validate, trigger) |
| `executions` | View and manage workflow executions |
| `credentials` | Manage credentials and credential types |
| `variables` | Manage environment variables (Enterprise) |
| `tags` | Manage workflow tags |
| `audit` | Generate security audit reports |
| `templates` | Search and download workflow templates |
| `validate` | Legacy workflow validation |

---

## Auth Commands

Manage n8n CLI authentication and credentials.

### auth login

Configure n8n API credentials.

```bash
# Interactive mode (prompts for values)
n8n auth login --interactive

# Direct configuration
n8n auth login --host https://n8n.example.com --api-key eyJhbGc...

# JSON output
n8n auth login --host https://n8n.example.com --api-key xxx --json
```

### auth status

Check current authentication status and connection.

```bash
# Human-readable output
n8n auth status

# JSON output for scripting
n8n auth status --json
```

**Example output:**
```
Configuration
  Host:       https://aura.zeogen.com
  API Key:    eyJh...vGv8
  Config:     /Users/user/.n8nrc.json

Connection Status
  Connected
  API Key valid
  Latency: 531ms
```

### auth logout

Clear stored credentials.

```bash
n8n auth logout
```

---

## Health Command

Check n8n instance connectivity and API status.

```bash
# Basic health check
n8n health

# JSON output
n8n health --json
```

**Example output:**
```
Connection: OK
API Key: Valid
Latency: 653ms
```

---

## Nodes Commands

Search, list, and inspect n8n nodes from the local database.

### nodes list

List all available nodes.

```bash
# List first 10 nodes
n8n nodes list --limit 10

# List all nodes grouped by category
n8n nodes list --by-category

# Filter by category
n8n nodes list --category trigger --limit 20

# Search within list
n8n nodes list --search "http" --limit 10

# Save to file
n8n nodes list --save nodes.json

# JSON output
n8n nodes list --json
```

### nodes search

Search for nodes by keyword with relevance scoring.

```bash
# Basic search
n8n nodes search "slack"

# Fuzzy matching for typos
n8n nodes search "gogle" --mode FUZZY

# AND mode (all terms must match)
n8n nodes search "http request" --mode AND

# Limit results
n8n nodes search "email" --limit 5

# Save results
n8n nodes search "webhook" --save webhooks.json

# JSON output
n8n nodes search "api" --json
```

**Search modes:**
- `OR` (default): Match any term
- `AND`: Match all terms
- `FUZZY`: Fuzzy matching for typos

### nodes show

Show detailed node information, schema, and operations.

```bash
# Basic info
n8n nodes show nodes-base.slack

# Show documentation
n8n nodes show nodes-base.httpRequest --mode docs

# Show version history
n8n nodes show nodes-base.webhook --mode versions

# Detail levels
n8n nodes show nodes-base.slack --detail minimal
n8n nodes show nodes-base.slack --detail standard
n8n nodes show nodes-base.slack --detail full

# JSON output
n8n nodes show nodes-base.gmail --json

# Save schema
n8n nodes show nodes-base.slack --save slack-schema.json
```

### nodes get

Alias for `nodes show`.

```bash
n8n nodes get nodes-base.httpRequest --mode docs
```

### nodes categories

List all node categories with counts.

```bash
# Basic categories
n8n nodes categories

# Detailed with descriptions
n8n nodes categories --detailed

# JSON output
n8n nodes categories --json
```

**Example output:**
```
Category               Count
────────────────────────────
Transform               223
Input                   110
Trigger                 108
Output                   99
Organization              4
────────────────────────────
Total                   544
```

### nodes validate

Validate node configuration against schema.

```bash
# Validate with config
n8n nodes validate nodes-base.webhook --config '{"path":"/test","httpMethod":"POST"}'

# Different validation profiles
n8n nodes validate nodes-base.slack --profile minimal
n8n nodes validate nodes-base.slack --profile runtime
n8n nodes validate nodes-base.slack --profile strict

# JSON output
n8n nodes validate nodes-base.httpRequest --config '{}' --json
```

---

## Workflows Commands

Manage n8n workflows with full CRUD operations.

### workflows list

List all workflows with pagination.

```bash
# Basic list
n8n workflows list

# Limit results
n8n workflows list --limit 20

# Filter active only
n8n workflows list --active

# Filter by tags
n8n workflows list --tags "production,critical"

# Pagination with cursor
n8n workflows list --limit 10 --cursor eyJsaW1pdCI6MTAsIm9mZnNldCI6MTB9

# Save to file
n8n workflows list --save workflows.json

# JSON output
n8n workflows list --json
```

### workflows get

Get workflow details by ID.

```bash
# Full workflow with all details
n8n workflows get 2MustFVarYC3NCkJ

# Different output modes
n8n workflows get 2MustFVarYC3NCkJ --mode full
n8n workflows get 2MustFVarYC3NCkJ --mode details
n8n workflows get 2MustFVarYC3NCkJ --mode structure
n8n workflows get 2MustFVarYC3NCkJ --mode minimal

# Save to file
n8n workflows get 2MustFVarYC3NCkJ --save workflow.json

# JSON output
n8n workflows get 2MustFVarYC3NCkJ --json
```

### workflows validate

Validate workflow structure and node configurations.

```bash
# Validate by ID (fetches from API)
n8n workflows validate 2MustFVarYC3NCkJ

# Validate local file
n8n workflows validate /path/to/workflow.json

# With file flag
n8n workflows validate --file workflow.json

# Validation profiles
n8n workflows validate workflow.json --profile minimal
n8n workflows validate workflow.json --profile runtime
n8n workflows validate workflow.json --profile strict
n8n workflows validate workflow.json --profile ai-friendly

# Auto-fix issues
n8n workflows validate workflow.json --fix

# Repair malformed JSON
n8n workflows validate workflow.json --repair

# Save fixed version
n8n workflows validate workflow.json --fix --save fixed.json

# JSON output
n8n workflows validate workflow.json --json
```

### workflows create

Create a new workflow from a JSON file.

```bash
# Dry-run (preview, default behavior)
n8n workflows create --file workflow.json --dry-run

# Actually create the workflow
n8n workflows create --file workflow.json --no-dry-run

# Override workflow name
n8n workflows create --file workflow.json --name "My New Workflow" --no-dry-run

# JSON output
n8n workflows create --file workflow.json --no-dry-run --json
```

**Note:** The CLI automatically strips read-only properties (`id`, `tags`, `pinData`, `meta`, `shared`, etc.) from exported workflows before creation.

### workflows update

Update an existing workflow.

```bash
# Update from file
n8n workflows update 2MustFVarYC3NCkJ --file updated-workflow.json

# Activate workflow
n8n workflows update 2MustFVarYC3NCkJ --activate

# Deactivate workflow
n8n workflows update 2MustFVarYC3NCkJ --deactivate

# Skip confirmation
n8n workflows update 2MustFVarYC3NCkJ --activate --force

# Skip backup
n8n workflows update 2MustFVarYC3NCkJ --file new.json --no-backup

# JSON output
n8n workflows update 2MustFVarYC3NCkJ --activate --json
```

### workflows autofix

Auto-fix workflow validation issues.

```bash
# Preview fixes (dry-run, default)
n8n workflows autofix workflow.json

# Apply fixes
n8n workflows autofix workflow.json --apply

# Set confidence threshold
n8n workflows autofix workflow.json --confidence high
n8n workflows autofix workflow.json --confidence medium
n8n workflows autofix workflow.json --confidence low

# Save fixed version
n8n workflows autofix workflow.json --save fixed.json

# Skip confirmation
n8n workflows autofix workflow.json --apply --force

# JSON output
n8n workflows autofix workflow.json --json
```

### workflows trigger

Trigger a workflow via webhook.

```bash
# POST request with data
n8n workflows trigger https://n8n.example.com/webhook/abc123 --data '{"name":"test"}'

# Different HTTP methods
n8n workflows trigger https://n8n.example.com/webhook/abc123 --method GET
n8n workflows trigger https://n8n.example.com/webhook/abc123 --method PUT --data '{"update":true}'

# JSON output
n8n workflows trigger https://n8n.example.com/webhook/abc123 --data '{}' --json
```

### workflows tags

Get or set workflow tags.

```bash
# Get current tags
n8n workflows tags 2MustFVarYC3NCkJ

# Set tags (by tag IDs)
n8n workflows tags 2MustFVarYC3NCkJ --set "tag1,tag2,tag3"

# Skip confirmation
n8n workflows tags 2MustFVarYC3NCkJ --set "tagId" --force

# JSON output
n8n workflows tags 2MustFVarYC3NCkJ --json
```

---

## Executions Commands

View and manage workflow executions.

### executions list

List workflow executions.

```bash
# Recent executions
n8n executions list

# Limit results
n8n executions list --limit 20

# Filter by workflow
n8n executions list --workflow-id XoavLhoExyQKyAj0

# Filter by status
n8n executions list --status success
n8n executions list --status error
n8n executions list --status waiting

# Pagination
n8n executions list --cursor eyJsYXN0SWQiOiI5MzU5IiwibGltaXQiOjN9

# Save to file
n8n executions list --save executions.json

# JSON output
n8n executions list --json
```

### executions get

Get execution details.

```bash
# Basic summary
n8n executions get 9361

# Different modes
n8n executions get 9361 --mode preview
n8n executions get 9361 --mode summary
n8n executions get 9361 --mode filtered
n8n executions get 9361 --mode full

# Save to file
n8n executions get 9361 --save execution.json

# JSON output
n8n executions get 9361 --json
```

### executions retry

Retry a failed execution.

```bash
# Retry execution
n8n executions retry 9351

# Use latest workflow version
n8n executions retry 9351 --load-latest

# JSON output
n8n executions retry 9351 --json
```

### executions delete

Delete an execution.

```bash
# Delete with confirmation
n8n executions delete 9350

# Skip confirmation
n8n executions delete 9350 --force

# JSON output
n8n executions delete 9350 --force --json
```

---

## Credentials Commands

Manage n8n credentials and credential types.

### credentials list

List all credentials.

```bash
# List credentials
n8n credentials list

# Limit results
n8n credentials list --limit 20

# Pagination
n8n credentials list --cursor xxx

# JSON output
n8n credentials list --json
```

**Note:** This endpoint returns HTTP 405 on some n8n versions or may require Enterprise license.

### credentials types

List available credential types.

```bash
# List all types
n8n credentials types

# Limit results
n8n credentials types --limit 10

# Group by auth method
n8n credentials types --by-auth

# Search types
n8n credentials types --search "oauth"

# Save to file
n8n credentials types --save cred-types.json

# JSON output
n8n credentials types --json
```

### credentials show-type

Show credential type schema and required fields.

```bash
# Show schema
n8n credentials show-type slackApi

# Save schema
n8n credentials show-type githubApi --save github-schema.json

# JSON output
n8n credentials show-type openAiApi --json
```

### credentials schema

Get credential schema (alias for show-type).

```bash
n8n credentials schema slackApi --json
```

### credentials create

Create a new credential.

```bash
# Create with JSON data
n8n credentials create --type githubApi --name "My GitHub Token" --data '{"accessToken":"ghp_xxx"}'

# Load data from file
n8n credentials create --type slackApi --name "Slack Bot" --data @slack-creds.json

# JSON output
n8n credentials create --type openAiApi --name "OpenAI" --data '{"apiKey":"sk-xxx"}' --json
```

### credentials delete

Delete a credential.

```bash
# Delete with confirmation
n8n credentials delete qB5iZGzGjmU5ZPDI

# Skip confirmation
n8n credentials delete qB5iZGzGjmU5ZPDI --force

# JSON output
n8n credentials delete qB5iZGzGjmU5ZPDI --force --json
```

---

## Variables Commands

Manage n8n environment variables (requires Enterprise license).

```bash
# List variables
n8n variables list

# Create variable
n8n variables create --key MY_VAR --value "my-value"

# Update variable
n8n variables update varId --key MY_VAR --value "new-value"

# Delete variable
n8n variables delete varId --force
```

**Note:** Variables require n8n Enterprise or Pro license. Community edition returns HTTP 403.

---

## Tags Commands

Manage workflow tags.

### tags list

List all tags.

```bash
# List tags
n8n tags list

# JSON output
n8n tags list --json

# Save to file
n8n tags list --save tags.json
```

### tags get

Get tag by ID.

```bash
n8n tags get BCM4YL05avZ5KuP2

# JSON output
n8n tags get BCM4YL05avZ5KuP2 --json
```

### tags create

Create a new tag.

```bash
n8n tags create --name "Production"

# JSON output
n8n tags create --name "Staging" --json
```

### tags update

Update tag name.

```bash
n8n tags update BCM4YL05avZ5KuP2 --name "New Name"

# JSON output
n8n tags update BCM4YL05avZ5KuP2 --name "Updated" --json
```

### tags delete

Delete a tag.

```bash
# Delete with confirmation
n8n tags delete BCM4YL05avZ5KuP2

# Skip confirmation
n8n tags delete BCM4YL05avZ5KuP2 --force

# JSON output
n8n tags delete BCM4YL05avZ5KuP2 --force --json
```

---

## Audit Command

Generate security audit report for n8n instance.

```bash
# Full audit
n8n audit

# Filter by categories
n8n audit --categories credentials,nodes
n8n audit --categories database,filesystem,instance

# Set abandoned workflow threshold
n8n audit --days-abandoned 90

# Save report
n8n audit --save audit-report.json

# JSON output
n8n audit --json
```

**Audit categories:**
- `credentials` - Unused or risky credentials
- `database` - Database security settings
- `nodes` - Risky node usage
- `filesystem` - File system access risks
- `instance` - Instance configuration

---

## Templates Commands

Search and download workflow templates from n8n.io.

### templates search

Search for workflow templates.

```bash
# Search templates
n8n templates search "openai"

# Limit results
n8n templates search "slack" --limit 10

# Save results
n8n templates search "webhook" --save templates.json

# JSON output
n8n templates search "automation" --json
```

### templates get

Get template details and download workflow.

```bash
# View template
n8n templates get 3121

# Download workflow
n8n templates get 3121 --save template-workflow.json

# JSON output
n8n templates get 3121 --json
```

---

## Legacy Validate Command

Validate workflow JSON files (backwards compatibility).

```bash
# Basic validation
n8n validate workflow.json

# Repair malformed JSON
n8n validate workflow.json --repair

# Auto-fix issues
n8n validate workflow.json --fix

# Save fixed version
n8n validate workflow.json --fix --save fixed.json

# JSON output
n8n validate workflow.json --json
```

**Note:** For validation profiles, use `n8n workflows validate --profile` instead.

---

## Global Options

These options work with most commands:

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON for scripting |
| `--save <path>` | Save output to file |
| `--force`, `--yes` | Skip confirmation prompts |
| `-h`, `--help` | Show help for command |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `N8N_HOST` | n8n instance URL |
| `N8N_API_KEY` | API key for authentication |
| `NO_COLOR` | Disable colored output |
| `N8N_DEBUG` | Enable debug logging |

---

## jq Integration

All commands with `--json` output are designed for jq processing:

```bash
# Extract workflow IDs and names
n8n workflows list --json | jq '.data[] | {id, name}'

# Filter active workflows
n8n workflows list --json | jq '.data[] | select(.active == true)'

# Count executions by status
n8n executions list --json | jq 'group_by(.status) | map({status: .[0].status, count: length})'

# Get node types from search
n8n nodes search "slack" --json | jq -r '.nodes[].nodeType'

# Extract failed execution IDs
n8n executions list --status error --json | jq -r '.data[].id'
```

---

## Error Handling

The CLI provides detailed error messages with suggested actions:

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `AUTHENTICATION_ERROR` | Invalid or expired API key | Run `n8n auth login` |
| `NOT_FOUND` | Resource doesn't exist | Check ID and run list command |
| `VALIDATION_ERROR` | Invalid request data | Check input format |
| `METHOD_NOT_ALLOWED` | Endpoint not available | Check n8n version or license |
| `CONNECTION_ERROR` | Cannot reach n8n | Run `n8n health` |
| `RATE_LIMIT_ERROR` | Too many requests | Wait and retry |

---

## API Limitations

Some features depend on n8n version and license:

| Feature | Requirement |
|---------|-------------|
| Variables | Enterprise/Pro license |
| Credentials list | May return 405 on some versions |
| Full audit | n8n 1.0+ |
| Workflow sharing | Enterprise/Pro license |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (validation, API, or user error) |

---

## Examples: Common Workflows

### Export and re-import a workflow

```bash
# Export
n8n workflows get WORKFLOW_ID --save exported.json

# Validate before import
n8n workflows validate exported.json

# Import to another instance (after changing auth)
n8n workflows create --file exported.json --no-dry-run
```

### Monitor executions

```bash
# List recent failures
n8n executions list --status error --limit 10

# Get details of a failure
n8n executions get EXECUTION_ID --mode full

# Retry a failed execution
n8n executions retry EXECUTION_ID
```

### Security audit workflow

```bash
# Generate full audit
n8n audit --save audit-$(date +%Y%m%d).json

# Extract high-risk items with jq
cat audit-*.json | jq '.[] | .sections[] | select(.title | contains("risky"))'
```

### Batch operations with jq

```bash
# Get all workflow IDs
n8n workflows list --limit 0 --json | jq -r '.data[].id'

# Validate all workflows
for id in $(n8n workflows list --limit 0 --json | jq -r '.data[].id'); do
  echo "Validating $id..."
  n8n workflows validate $id --json
done
```
