# CLI Feature Parity Planning Index

## Overview

This directory contains planning documents for porting missing MCP features to the CLI.
Generated from comprehensive feature-parity audit comparing:
- **CLI**: `src/` (85 files)
- **MCP**: `n8n-mcp/src/` (655 files)

---

## Priority Legend

| Priority | Definition | Target |
|----------|------------|--------|
| **P0** | Critical - Missing core functionality | Sprint 1 |
| **P1** | High - Significant feature gap | Sprint 2 |
| **P2** | Medium - Enhancement gap | Sprint 3+ |

---

## Planning Documents

### P0 - Critical (4 items)

| # | Document | Feature | MCP Source | Est. Effort |
|---|----------|---------|------------|-------------|
| 01 | [01-P0-workflow-diff-engine.md](./01-P0-workflow-diff-engine.md) | Partial/Diff Workflow Updates | `services/workflow-diff-engine.ts` | 3-4 days |
| 02 | [02-P0-workflow-versioning.md](./02-P0-workflow-versioning.md) | Version History & Rollback | `services/workflow-versioning-service.ts` | 2-3 days |
| 03 | [03-P0-template-deploy.md](./03-P0-template-deploy.md) | Direct Template Deployment | `mcp/tools-n8n-manager.ts` | 1-2 days |
| 04 | [04-P0-advanced-autofix.md](./04-P0-advanced-autofix.md) | 7+ Fix Types with Confidence | `services/workflow-auto-fixer.ts` | 4-5 days |

**P0 Total**: ~11-14 days

### P1 - High Priority (6 items)

| # | Document | Feature | MCP Source | Est. Effort |
|---|----------|---------|------------|-------------|
| 05 | [05-P1-expression-format-validator.md](./05-P1-expression-format-validator.md) | Expression Validation & Fix | `services/expression-format-validator.ts` | 2 days |
| 06 | [06-P1-node-similarity-service.md](./06-P1-node-similarity-service.md) | Typo Suggestions | `services/node-similarity-service.ts` | 1-2 days |
| 07 | [07-P1-ai-node-validator.md](./07-P1-ai-node-validator.md) | AI/LangChain Validation | `services/ai-node-validator.ts` | 1-2 days |
| 08 | [08-P1-node-version-service.md](./08-P1-node-version-service.md) | Version Tracking & Upgrades | `services/node-version-service.ts` | 2-3 days |
| 09 | [09-P1-breaking-change-detector.md](./09-P1-breaking-change-detector.md) | Breaking Change Detection | `services/breaking-change-detector.ts` | 2 days |
| 10 | [10-P1-template-search-modes.md](./10-P1-template-search-modes.md) | 4 Template Search Modes | `templates/template-service.ts` | 1-2 days |

**P1 Total**: ~9-13 days

### P2 - Medium Priority (4 items)

| # | Document | Feature | MCP Source | Est. Effort |
|---|----------|---------|------------|-------------|
| 11 | [11-P2-fts5-search.md](./11-P2-fts5-search.md) | FTS5 Full-Text Search | `mcp/server.ts` | 1 day |
| 12 | [12-P2-node-detail-modes.md](./12-P2-node-detail-modes.md) | Progressive Detail Levels | `mcp/tools.ts` | 1-2 days |
| 13 | [13-P2-post-update-validator.md](./13-P2-post-update-validator.md) | Migration Guidance | `services/post-update-validator.ts` | 1 day |
| 14 | [14-P2-enhanced-config-validator.md](./14-P2-enhanced-config-validator.md) | Profile-Based Validation | `services/enhanced-config-validator.ts` | 2 days |

**P2 Total**: ~5-6 days

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
