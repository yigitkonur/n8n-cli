# Implementation Checklist

## Phase 1: Foundation (Week 1)

### Project Setup
- [ ] Initialize package.json with dependencies
- [ ] Configure tsconfig.json
- [ ] Configure tsup.config.ts
- [ ] Set up ESLint and Prettier
- [ ] Create directory structure
- [ ] Copy nodes.db from n8n-mcp

### Core Infrastructure
- [ ] `src/cli.ts` - Entry point with Clipanion setup
- [ ] `src/commands/base.ts` - BaseCommand class
  - [ ] Universal flags (--save, --limit, --verbose, --quiet, --json)
  - [ ] Output methods (log, error, success, warn)
  - [ ] Spinner integration
  - [ ] Error handling
- [ ] `src/core/utils/config.ts` - Config loader
  - [ ] Environment variables
  - [ ] .n8nrc file parsing
  - [ ] Config validation
- [ ] `src/core/utils/spinner.ts` - Loading indicators

### Formatters
- [ ] `src/core/formatters/markdown.ts` - Main formatter
- [ ] `src/core/formatters/table.ts` - Table generation
- [ ] `src/core/formatters/header.ts` - Box-drawn headers
- [ ] `src/core/formatters/summary.ts` - Stats summaries
- [ ] `src/core/formatters/next-actions.ts` - Contextual help
- [ ] `src/core/formatters/jq-recipes.ts` - jq suggestions
- [ ] `src/core/formatters/json.ts` - File saving
- [ ] `src/core/formatters/errors.ts` - Error classes

### Types
- [ ] `src/types/config.ts`
- [ ] `src/types/node.ts`
- [ ] `src/types/workflow.ts`
- [ ] `src/types/execution.ts`
- [ ] `src/types/template.ts`

---

## Phase 2: Database & API (Week 1-2)

### Database Layer
- [ ] `src/core/db/connection.ts` - SQLite connection
- [ ] `src/core/db/nodes.ts` - Node search queries
  - [ ] searchNodes() with FTS5
  - [ ] getNodeInfo()
  - [ ] searchNodeProperties()
- [ ] `src/core/db/templates.ts` - Template queries
  - [ ] searchTemplates()
  - [ ] getTemplate()
- [ ] `src/core/db/versions.ts` - Local version storage
  - [ ] saveWorkflowVersion()
  - [ ] getWorkflowVersions()
  - [ ] getWorkflowVersion()

### API Client
- [ ] `src/core/api/client.ts` - HTTP client
  - [ ] Authentication
  - [ ] Error handling
  - [ ] Timeout handling
- [ ] `src/core/api/workflows.ts` - Workflow operations
  - [ ] listWorkflows()
  - [ ] getWorkflow()
  - [ ] createWorkflow()
  - [ ] updateWorkflow()
  - [ ] triggerWebhook()
- [ ] `src/core/api/executions.ts` - Execution operations
  - [ ] listExecutions()
  - [ ] getExecution()
  - [ ] deleteExecution()
- [ ] `src/core/api/health.ts` - Health operations
  - [ ] checkHealth()

---

## Phase 3: Read-Only Commands (Week 2)

### Health & Docs
- [ ] `src/commands/health/CheckCommand.ts` - n8n health
- [ ] `src/commands/docs/DocsCommand.ts` - n8n docs

### Node Commands
- [ ] `src/commands/nodes/SearchCommand.ts` - n8n nodes search
- [ ] `src/commands/nodes/GetCommand.ts` - n8n nodes get

### Template Commands
- [ ] `src/commands/templates/SearchCommand.ts` - n8n templates search
- [ ] `src/commands/templates/GetCommand.ts` - n8n templates get

### Workflow Read Commands
- [ ] `src/commands/workflows/ListCommand.ts` - n8n workflows list
- [ ] `src/commands/workflows/GetCommand.ts` - n8n workflows get

### Execution Commands
- [ ] `src/commands/executions/ListCommand.ts` - n8n executions list
- [ ] `src/commands/executions/GetCommand.ts` - n8n executions get

---

## Phase 4: Validation (Week 3)

### Validators
- [ ] `src/core/validators/workflow.ts` - Workflow validation
- [ ] `src/core/validators/node.ts` - Node validation
- [ ] `src/core/validators/expressions.ts` - Expression validation
- [ ] `src/core/validators/autofix.ts` - Autofix logic

### Validation Commands
- [ ] `src/commands/nodes/ValidateCommand.ts` - n8n nodes validate
- [ ] `src/commands/workflows/ValidateCommand.ts` - n8n workflows validate
- [ ] `src/commands/workflows/AutofixCommand.ts` - n8n workflows autofix (preview)

### Version Commands
- [ ] `src/commands/workflows/VersionsCommand.ts` - n8n workflows versions
  - [ ] list mode
  - [ ] get mode

---

## Phase 5: Write Operations (Week 3-4)

### Operations
- [ ] `src/core/operations/nodes.ts` - Node operations
- [ ] `src/core/operations/connections.ts` - Connection operations
- [ ] `src/core/operations/metadata.ts` - Metadata operations

### Write Commands
- [ ] `src/commands/workflows/CreateCommand.ts` - n8n workflows create
  - [ ] Dry-run default
  - [ ] Validation before create
  - [ ] Confirmation phrase
- [ ] `src/commands/workflows/UpdateCommand.ts` - n8n workflows update
  - [ ] Validate-only default
  - [ ] Operation parsing
  - [ ] Apply operations
- [ ] `src/commands/workflows/ReplaceCommand.ts` - n8n workflows replace
  - [ ] Dry-run default
  - [ ] Diff preview
  - [ ] Confirmation phrase
- [ ] `src/commands/workflows/TriggerCommand.ts` - n8n workflows trigger
- [ ] `src/commands/workflows/DeleteCommand.ts` - n8n workflows delete (disabled)

### Version Write Operations
- [ ] n8n workflows versions rollback
- [ ] n8n workflows versions prune
- [ ] n8n workflows versions delete

### Execution Delete
- [ ] `src/commands/executions/DeleteCommand.ts` - n8n executions delete

---

## Phase 6: Testing & Polish (Week 4)

### Unit Tests
- [ ] Command tests
  - [ ] nodes/SearchCommand.test.ts
  - [ ] nodes/GetCommand.test.ts
  - [ ] workflows/ListCommand.test.ts
  - [ ] workflows/GetCommand.test.ts
  - [ ] workflows/ValidateCommand.test.ts
  - [ ] (all other commands)
- [ ] Formatter tests
  - [ ] table.test.ts
  - [ ] header.test.ts
  - [ ] json.test.ts
  - [ ] errors.test.ts
- [ ] Utility tests
  - [ ] config.test.ts

### Integration Tests
- [ ] API client tests with MSW
- [ ] Database query tests

### E2E Tests
- [ ] Workflow lifecycle scenario
- [ ] Error handling scenarios

### Polish
- [ ] Help text refinement
- [ ] Error message improvements
- [ ] jq recipe library completion
- [ ] README documentation

---

## Phase 7: Distribution (Week 5)

### Build
- [ ] tsup configuration finalized
- [ ] Bundle size optimization
- [ ] Source maps

### Package
- [ ] package.json metadata
- [ ] LICENSE file
- [ ] CHANGELOG.md
- [ ] README.md with examples

### Testing
- [ ] Cross-platform testing (macOS, Linux, Windows)
- [ ] Node.js version testing (18, 20, 22)

### Publish
- [ ] npm publish setup
- [ ] GitHub release workflow
- [ ] Documentation site (optional)

---

## Progress Tracking

| Phase | Status | Progress |
|-------|--------|----------|
| 1. Foundation | 🔴 Not Started | 0% |
| 2. Database & API | 🔴 Not Started | 0% |
| 3. Read-Only Commands | 🔴 Not Started | 0% |
| 4. Validation | 🔴 Not Started | 0% |
| 5. Write Operations | 🔴 Not Started | 0% |
| 6. Testing & Polish | 🔴 Not Started | 0% |
| 7. Distribution | 🔴 Not Started | 0% |

**Overall Progress: 0%**

---

## Quick Start (First Session)

1. **Project setup** (30 min)
   ```bash
   cd n8n-cli
   npm init -y
   npm install clipanion chalk cli-table3 ora better-sqlite3
   npm install -D typescript tsup vitest @types/node @types/better-sqlite3
   ```

2. **Create entry point** (15 min)
   - src/cli.ts
   - Basic Clipanion setup

3. **Create BaseCommand** (30 min)
   - Universal flags
   - Output methods

4. **First command: n8n health** (30 min)
   - Simplest command to verify setup
   - Test end-to-end flow

5. **Verify** (15 min)
   ```bash
   npm run build
   ./dist/cli.js health
   ```
