# Command Priority Matrix

## Priority Ranking

| Priority | Command | Impact | Complexity | Dependencies | Rationale |
|----------|---------|--------|------------|--------------|-----------|
| **P0** | `n8n health` | LOW | VERY LOW | None | Validates setup, simplest first |
| **P0** | `n8n nodes search` | HIGH | LOW | Database | Discovery entry point |
| **P0** | `n8n nodes get` | HIGH | LOW | Database | Understanding nodes |
| **P0** | `n8n workflows list` | HIGH | LOW | API Client | Basic inventory |
| **P0** | `n8n workflows get` | HIGH | LOW | API Client | View workflow details |
| **P1** | `n8n executions list` | HIGH | LOW | API Client | Debugging starts here |
| **P1** | `n8n executions get` | HIGH | MEDIUM | API Client | Debug specific runs |
| **P1** | `n8n workflows validate` | CRITICAL | MEDIUM | Validators | Safety gate for all writes |
| **P1** | `n8n templates search` | MEDIUM | LOW | Database | Discovery from examples |
| **P1** | `n8n templates get` | MEDIUM | LOW | Database | Get template workflow |
| **P2** | `n8n nodes validate` | MEDIUM | MEDIUM | Validators | Config validation |
| **P2** | `n8n workflows autofix` | HIGH | HIGH | Validation | Automated repairs |
| **P2** | `n8n docs` | LOW | LOW | Static content | Self-service help |
| **P3** | `n8n workflows create` | HIGH | HIGH | Validation, API | Major feature |
| **P3** | `n8n workflows update` | HIGH | HIGH | Operations, API | Surgical edits |
| **P3** | `n8n workflows trigger` | MEDIUM | LOW | API Client | Webhook testing |
| **P3** | `n8n workflows versions` | MEDIUM | MEDIUM | Local DB | Version control |
| **P4** | `n8n workflows replace` | MEDIUM | HIGH | Validation, API | Full replacement |
| **P4** | `n8n executions delete` | LOW | LOW | API Client | Cleanup |
| **P5** | `n8n workflows delete` | LOW | NONE | N/A | Disabled by design |

## Priority Definitions

| Priority | Meaning | Timeline |
|----------|---------|----------|
| **P0** | Foundation - Build first | Week 1-2 |
| **P1** | Core value - Build next | Week 2-3 |
| **P2** | Enhancement - Quality features | Week 3 |
| **P3** | Write ops - Dangerous, need validation | Week 3-4 |
| **P4** | Advanced - Less common use cases | Week 4 |
| **P5** | Disabled - Don't build | Never |

## Dependency Graph

```
                     ┌─────────────────────────────────────┐
                     │           FOUNDATION                │
                     │  BaseCommand, Config, Formatters    │
                     └──────────────┬──────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │   DATABASE      │   │   API CLIENT    │   │   VALIDATORS    │
    │   nodes.db      │   │   n8n REST      │   │   workflow/node │
    └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
             │                     │                     │
    ┌────────┴────────┐   ┌────────┴────────┐   ┌────────┴────────┐
    │ nodes search    │   │ health          │   │ workflows       │
    │ nodes get       │   │ workflows list  │   │   validate      │
    │ templates search│   │ workflows get   │   │ nodes validate  │
    │ templates get   │   │ executions list │   └────────┬────────┘
    └─────────────────┘   │ executions get  │            │
                          └────────┬────────┘            │
                                   │                     │
                                   └──────────┬──────────┘
                                              │
                          ┌───────────────────┴───────────────────┐
                          │           WRITE OPERATIONS            │
                          │ workflows create/update/replace/trigger│
                          │ workflows autofix                      │
                          │ workflows versions                     │
                          └───────────────────────────────────────┘
```

## Implementation Order (Detailed)

### Week 1: Foundation + P0

```
Day 1-2: Project Setup
├── package.json, tsconfig.json, tsup.config.ts
├── src/cli.ts (entry point)
├── src/commands/base.ts (BaseCommand)
└── src/core/utils/config.ts (Config loader)

Day 3: Formatters
├── src/core/formatters/table.ts
├── src/core/formatters/header.ts
├── src/core/formatters/json.ts
└── src/core/formatters/errors.ts

Day 4: Database Layer
├── Copy data/nodes.db from n8n-mcp
├── src/core/db/connection.ts
└── src/core/db/nodes.ts

Day 5: First Commands
├── src/commands/health/CheckCommand.ts  ← Simplest, validates setup
├── src/commands/nodes/SearchCommand.ts  ← Uses database
└── src/commands/nodes/GetCommand.ts
```

### Week 2: P0 + P1

```
Day 1: API Client
├── src/core/api/client.ts
├── src/core/api/workflows.ts
└── src/core/api/executions.ts

Day 2: Workflow Read Commands
├── src/commands/workflows/ListCommand.ts
└── src/commands/workflows/GetCommand.ts

Day 3: Execution Commands
├── src/commands/executions/ListCommand.ts
└── src/commands/executions/GetCommand.ts

Day 4: Template Commands
├── src/core/db/templates.ts
├── src/commands/templates/SearchCommand.ts
└── src/commands/templates/GetCommand.ts

Day 5: Validation Foundation
├── src/core/validators/workflow.ts
└── src/commands/workflows/ValidateCommand.ts
```

### Week 3: P2 + P3

```
Day 1-2: Validation & Autofix
├── src/core/validators/node.ts
├── src/core/validators/autofix.ts
├── src/commands/nodes/ValidateCommand.ts
└── src/commands/workflows/AutofixCommand.ts

Day 3-4: Write Operations
├── src/core/operations/nodes.ts
├── src/core/operations/connections.ts
├── src/commands/workflows/CreateCommand.ts
└── src/commands/workflows/UpdateCommand.ts

Day 5: Additional Commands
├── src/commands/workflows/TriggerCommand.ts
├── src/commands/docs/DocsCommand.ts
└── src/core/db/versions.ts
```

### Week 4: P3 + P4 + Polish

```
Day 1-2: Version Control
└── src/commands/workflows/VersionsCommand.ts (all modes)

Day 3: Remaining Commands
├── src/commands/workflows/ReplaceCommand.ts
├── src/commands/workflows/DeleteCommand.ts (disabled message)
└── src/commands/executions/DeleteCommand.ts

Day 4-5: Testing & Polish
├── Unit tests for all commands
├── Integration tests
├── Error message refinement
└── Help text polish
```

## Quick Win Analysis

| Command | Lines of Code | Time Estimate | Value Delivered |
|---------|---------------|---------------|-----------------|
| `n8n health` | ~50 | 30 min | Setup validation |
| `n8n nodes search` | ~80 | 1 hour | Node discovery |
| `n8n workflows list` | ~70 | 45 min | Workflow inventory |
| `n8n workflows get` | ~90 | 1 hour | Workflow details |
| `n8n executions list` | ~80 | 45 min | Debugging entry |

**First 5 commands = ~4 hours, delivers 80% of read-only value**

## Risk Assessment

| Command | Risk Level | Mitigation |
|---------|------------|------------|
| `workflows create` | HIGH | Dry-run default, validation required |
| `workflows update` | HIGH | Validate-only default, atomic ops |
| `workflows replace` | VERY HIGH | Dry-run, diff preview, confirmation |
| `workflows autofix` | MEDIUM | Preview mode default, confidence filter |
| `workflows delete` | CRITICAL | Disabled entirely |

## Success Metrics

After implementation, measure:

1. **Coverage**: All 17 MCP tools have CLI equivalents ✓/✗
2. **Safety**: Zero accidental data modifications
3. **Discoverability**: Users can find what they need via search
4. **Debugging**: Time to diagnose execution errors reduced
5. **Adoption**: CLI used in CI/CD pipelines
