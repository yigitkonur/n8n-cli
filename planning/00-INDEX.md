# CLI Feature Parity Planning Index

## Overview

This directory contains planning documents for porting missing MCP features to the CLI.
Generated from comprehensive feature-parity audit comparing:
- **CLI**: `src/` (85 files)
- **MCP**: `n8n-mcp/src/` (176 files)

---

## Priority Legend

| Priority | Definition | Target |
|----------|------------|--------|
| **P0** | Critical - Missing core functionality | Sprint 1 |
| **P1** | High - Significant feature gap | Sprint 2 |
| **P2** | Medium - Enhancement gap | Sprint 3+ |

---

## Implementation Status

### Fully Implemented ✅

| Feature | CLI Command | Implemented |
|---------|-------------|-------------|
| Workflow Diff Engine | `workflows diff` | ✅ Complete |
| Workflow Versioning | `workflows versions` | ✅ Complete |
| Template Deploy | `workflows deploy-template` | ✅ Complete |
| Advanced Autofix | `workflows autofix` | ✅ Complete (8 fix types) |
| Expression Format Validator | `workflows validate --validate-expressions` | ✅ Complete |
| AI Node Validator | `workflows validate --profile ai-friendly` | ✅ Complete |
| FTS5 Search | `nodes search` | ✅ Complete |
| Template Search Modes | `templates search --by-task`, `--by-nodes` | ✅ Complete |

### Partially Implemented ⚠️

| Feature | CLI Command | Status |
|---------|-------------|--------|
| Node Similarity Service | `workflows validate` (suggestions) | ⚠️ Basic Levenshtein only |
| Breaking Change Detector | `nodes breaking-changes` | ⚠️ Registry exists, detector partial |
| Node Version Service | `nodes show --mode versions` | ⚠️ Basic version info only |
| Enhanced Config Validator | `workflows validate --profile` | ⚠️ Profiles exist, not all rules ported |

### Not Implemented ❌

| Feature | MCP Service | Priority |
|---------|-------------|----------|
| Operation Similarity | `operation-similarity-service.ts` | P1 (extend 06) |
| Resource Similarity | `resource-similarity-service.ts` | P1 (extend 06) |
| Type Structure Service | `type-structure-service.ts` | P2 (extend 14) |
| Example Generator | `example-generator.ts` | P2 (new doc) |
| Node Documentation Service | `node-documentation-service.ts` | P2 (new doc) |
| Execution Processor | `execution-processor.ts` | P3 |

---

## Planning Documents

### P0 - Critical (4 items) — ALL IMPLEMENTED ✅

| # | Document | Feature | MCP Source | Status |
|---|----------|---------|------------|--------|
| 01 | [01-P0-workflow-diff-engine.md](./01-P0-workflow-diff-engine.md) | Partial/Diff Workflow Updates | `services/workflow-diff-engine.ts` | ✅ Done |
| 02 | [02-P0-workflow-versioning.md](./02-P0-workflow-versioning.md) | Version History & Rollback | `services/workflow-versioning-service.ts` | ✅ Done |
| 03 | [03-P0-template-deploy.md](./03-P0-template-deploy.md) | Direct Template Deployment | `mcp/tools-n8n-manager.ts` | ✅ Done |
| 04 | [04-P0-advanced-autofix.md](./04-P0-advanced-autofix.md) | 7+ Fix Types with Confidence | `services/workflow-auto-fixer.ts` | ✅ Done |

### P1 - High Priority (6 items)

| # | Document | Feature | MCP Source | Status |
|---|----------|---------|------------|--------|
| 05 | [05-P1-expression-format-validator.md](./05-P1-expression-format-validator.md) | Expression Validation & Fix | `services/expression-format-validator.ts` | ✅ Done |
| 06 | [06-P1-node-similarity-service.md](./06-P1-node-similarity-service.md) | Typo Suggestions | `services/node-similarity-service.ts` | ⚠️ Partial |
| 07 | [07-P1-ai-node-validator.md](./07-P1-ai-node-validator.md) | AI/LangChain Validation | `services/ai-node-validator.ts` | ✅ Done |
| 08 | [08-P1-node-version-service.md](./08-P1-node-version-service.md) | Version Tracking & Upgrades | `services/node-version-service.ts` | ⚠️ Partial |
| 09 | [09-P1-breaking-change-detector.md](./09-P1-breaking-change-detector.md) | Breaking Change Detection | `services/breaking-change-detector.ts` | ⚠️ Partial |
| 10 | [10-P1-template-search-modes.md](./10-P1-template-search-modes.md) | 4 Template Search Modes | `templates/template-service.ts` | ✅ Done |

### P2 - Medium Priority (4 items)

| # | Document | Feature | MCP Source | Status |
|---|----------|---------|------------|--------|
| 11 | [11-P2-fts5-search.md](./11-P2-fts5-search.md) | FTS5 Full-Text Search | `mcp/server.ts` | ✅ Done |
| 12 | [12-P2-node-detail-modes.md](./12-P2-node-detail-modes.md) | Progressive Detail Levels | `mcp/tools.ts` | ⚠️ Partial |
| 13 | [13-P2-post-update-validator.md](./13-P2-post-update-validator.md) | Migration Guidance | `services/post-update-validator.ts` | ⚠️ Partial |
| 14 | [14-P2-enhanced-config-validator.md](./14-P2-enhanced-config-validator.md) | Profile-Based Validation | `services/enhanced-config-validator.ts` | ⚠️ Partial |

---

## MCP Service Coverage Matrix

### Fully Covered in Planning Docs ✅

| MCP Service | Lines | Planning Doc | CLI Files |
|-------------|-------|--------------|-----------|
| `workflow-diff-engine.ts` | 1197 | 01-P0 | `src/core/diff/engine.ts` |
| `workflow-versioning-service.ts` | 461 | 02-P0 | `src/core/user-db/versions.ts` |
| `workflow-auto-fixer.ts` | 835 | 04-P0 | `src/core/autofix/engine.ts` |
| `expression-format-validator.ts` | 340 | 05-P1 | `src/core/fixer.ts:fixExpressionFormat` |
| `universal-expression-validator.ts` | 286 | 05-P1 | Integrated in fixer |
| `confidence-scorer.ts` | 211 | 04-P0, 05-P1 | `src/core/autofix/confidence-scorer.ts` |
| `ai-node-validator.ts` | 635 | 07-P1 | `src/core/validation/ai-nodes.ts` |
| `ai-tool-validators.ts` | 608 | 07-P1 | `src/core/validation/ai-tool-validators.ts` |
| `breaking-changes-registry.ts` | 316 | 09-P1 | `src/core/autofix/breaking-changes.ts` |
| `node-migration-service.ts` | 411 | 04-P0, 09-P1 | `src/core/autofix/migration.ts` |
| `post-update-validator.ts` | 424 | 13-P2 | `src/core/autofix/guidance-generator.ts` |
| `config-validator.ts` | 910 | 14-P2 | Base for enhanced validator |
| `enhanced-config-validator.ts` | 1268 | 14-P2 | `src/core/validation/*.ts` |
| `node-specific-validators.ts` | 1724 | 14-P2 | Part of enhanced validator |
| `property-dependencies.ts` | 269 | 14-P2 | Part of enhanced validator |
| `property-filter.ts` | 590 | 14-P2 | Part of enhanced validator |
| `task-templates.ts` | 1507 | 10-P1 | `src/core/templates/task-map.ts` |

### Partially Covered (Needs Doc Updates) ⚠️

| MCP Service | Lines | Coverage | Gap |
|-------------|-------|----------|-----|
| `node-similarity-service.ts` | 512 | 06-P1 | Missing common patterns, scoring system |
| `node-version-service.ts` | 378 | 08-P1 | Missing upgrade path analysis |
| `breaking-change-detector.ts` | 322 | 09-P1 | Missing dynamic detection |

### NOT Covered (New Docs Needed) ❌

| MCP Service | Lines | Purpose | Suggested Priority |
|-------------|-------|---------|-------------------|
| `operation-similarity-service.ts` | 502 | Operation typo suggestions (Slack send→postMessage) | **P1** (extend 06) |
| `resource-similarity-service.ts` | 522 | Resource typo suggestions (messages→message) | **P1** (extend 06) |
| `type-structure-service.ts` | 428 | Validate 22 NodePropertyTypes (filter, resourceMapper) | **P2** (extend 14) |
| `example-generator.ts` | 835 | Generate node config examples | **P2** (new 15) |
| `node-documentation-service.ts` | 685 | Format node documentation | **P2** (new 16) |
| `execution-processor.ts` | 388 | Execution filtering/processing | **P3** |
| `node-sanitizer.ts` | 362 | Sanitize node structures | Covered in 01-P0 |
| `workflow-validator.ts` | 1935 | Main validation (skips langchain) | Distributed |
| `n8n-validation.ts` | 800 | n8n-specific validation | Distributed |

---

## CLI Commands by Feature

### Implemented Commands (Current README.md)

| Command | Planning Doc | Status |
|---------|--------------|--------|
| `n8n workflows diff <id>` | 01-P0 | ✅ 17 operation types |
| `n8n workflows versions <id>` | 02-P0 | ✅ History, rollback, prune |
| `n8n workflows deploy-template <id>` | 03-P0 | ✅ With autofix |
| `n8n workflows autofix <id>` | 04-P0 | ✅ 8 fix types, confidence levels |
| `n8n workflows validate <id>` | 05-P1, 07-P1, 14-P2 | ✅ Expressions, AI, profiles |
| `n8n nodes breaking-changes <type>` | 09-P1 | ✅ Registry-based |
| `n8n nodes show <type> --mode breaking` | 09-P1 | ✅ Version comparison |
| `n8n templates search --by-task` | 10-P1 | ✅ 4 search modes |
| `n8n templates list-tasks` | 10-P1 | ✅ Task enumeration |
| `n8n nodes search <query>` | 11-P2 | ✅ FTS5 support |

### Commands Needing Enhancement

| Command | Gap | MCP Reference |
|---------|-----|---------------|
| `n8n workflows validate` | Operation/resource suggestions | `operation-similarity-service.ts`, `resource-similarity-service.ts` |
| `n8n nodes show --examples` | Example generation | `example-generator.ts` |
| `n8n nodes show --docs` | Enhanced documentation | `node-documentation-service.ts` |

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                         P0 LAYER                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ 01-Workflow  │◄───│ 02-Workflow  │    │ 03-Template  │  │
│  │ Diff Engine  │    │ Versioning   │    │ Deploy       │  │
│  └──────┬───────┘    └──────────────┘    └──────┬───────┘  │
│         │                                        │          │
│         ▼                                        │          │
│  ┌──────────────────────────────────────────────▼───────┐  │
│  │              04-Advanced Autofix                      │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼         P1 LAYER                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ 05-Expression│    │ 06-Node      │    │ 07-AI Node   │  │
│  │ Validator    │    │ Similarity   │    │ Validator    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ 08-Node      │◄───│ 09-Breaking  │    │ 10-Template  │  │
│  │ Version Svc  │    │ Change Det.  │    │ Search Modes │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼         P2 LAYER                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │ 11-FTS5      │    │ 12-Node      │                      │
│  │ Search       │    │ Detail Modes │                      │
│  └──────────────┘    └──────────────┘                      │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │ 13-Post      │    │ 14-Enhanced  │                      │
│  │ Update Valid │    │ Config Valid │                      │
│  └──────────────┘    └──────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

### Sprint 1: Foundation (P0)
1. **02-Workflow Versioning** - Foundation for safe mutations
2. **01-Workflow Diff Engine** - Depends on versioning for rollback
3. **04-Advanced Autofix** - Uses diff engine
4. **03-Template Deploy** - Uses autofix

### Sprint 2: Validation (P1)
1. **05-Expression Validator** - Needed by autofix
2. **06-Node Similarity** - Needed by autofix
3. **09-Breaking Change Detector** - Needed by version service
4. **08-Node Version Service** - Depends on breaking change detector
5. **07-AI Node Validator** - Independent
6. **10-Template Search Modes** - Independent

### Sprint 3: Polish (P2)
1. **11-FTS5 Search** - Performance improvement
2. **12-Node Detail Modes** - UX improvement
3. **14-Enhanced Config Validator** - Validation improvement
4. **13-Post-Update Validator** - Guidance improvement

---

## Metrics

| Metric | Value |
|--------|-------|
| Total Planning Documents | 14 |
| Total Estimated Effort | 25-33 days |
| New Files to Create | ~35-45 |
| Lines of Code (estimated) | ~5,000-7,000 |
| MCP Files Referenced | 32 |

---

## MCP Source File Quick Reference

| MCP Source File | Planning Doc |
|-----------------|--------------|
| `services/workflow-diff-engine.ts` | 01-P0 |
| `services/workflow-versioning-service.ts` | 02-P0 |
| `mcp/tools-n8n-manager.ts` | 03-P0, 12-P2 |
| `services/workflow-auto-fixer.ts` | 04-P0 |
| `services/expression-format-validator.ts` | 05-P1 |
| `services/node-similarity-service.ts` | 06-P1 |
| `services/ai-node-validator.ts` | 07-P1 |
| `services/node-version-service.ts` | 08-P1 |
| `services/breaking-change-detector.ts` | 09-P1 |
| `templates/template-service.ts` | 10-P1 |
| `mcp/server.ts` (FTS5) | 11-P2 |
| `mcp/tools.ts` (get_node) | 12-P2 |
| `services/post-update-validator.ts` | 13-P2 |
| `services/enhanced-config-validator.ts` | 14-P2 |
