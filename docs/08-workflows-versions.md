# Command: n8n workflows versions

## MCP Source Reference

> ⚠️ **DO NOT** use `src/mcp/tools/versions.ts` or `src/db/versions.ts` - they don't exist or are thin wrappers.

**Core Logic (COPY):**
- `n8n-mcp/src/services/workflow-versioning-service.ts` (461 lines) → Main `WorkflowVersioningService` class

**Key methods:**
- `createBackup()` - Create version snapshot before updates
- `listVersions()` - Get version history for workflow
- `getVersion()` - Get specific version snapshot
- `rollbackToVersion()` - Restore workflow to previous version
- `pruneVersions()` - Clean up old versions
- `getStorageStats()` - Storage usage statistics

**Types (defined in workflow-versioning-service.ts):**
- `WorkflowVersion` - Version snapshot interface
- `VersionInfo` - Version metadata interface
- `RestoreResult` - Rollback result interface
- `BackupResult` - Backup result interface
- `StorageStats` - Storage statistics interface

**MCP Tool Doc:** `n8n-mcp/mcp-tools/019-n8n_workflow_versions.md`

## CLI Command

```bash
n8n workflows versions <mode> [options]
```

## Modes & Parameters

### list - Show version history

```bash
n8n workflows versions list --workflow-id <id> [--limit 10] [--save versions.json]
```

### get - Get specific version

```bash
n8n workflows versions get --version-id <id> [--save version.json]
```

### rollback - Restore previous version

```bash
n8n workflows versions rollback --workflow-id <id> [--version-id <id>] [options]
```

| Flag | Description |
|------|-------------|
| `--version-id` | Target version (optional, defaults to latest) |
| `--validate-before` | Validate before rollback (default: true) |
| `--dry-run` | Preview only (DEFAULT) |
| `--confirm-with` | Confirmation phrase to execute |

### prune - Clean up old versions

```bash
n8n workflows versions prune --workflow-id <id> --max-versions <n> [--confirm]
```

### delete - Delete version(s)

```bash
n8n workflows versions delete --workflow-id <id> [--version-id <id>] [--delete-all] [--confirm]
```

### truncate - Delete ALL versions (DANGEROUS)

```bash
n8n workflows versions truncate --confirm-truncate
```

## Important Design Decisions

1. **Rollback defaults to DRY-RUN** - Requires `--confirm-with`
2. **Delete operations require --confirm**
3. **Truncate requires explicit --confirm-truncate**
4. **Rollback creates automatic backup**

## Output Formats

**List Terminal:**
```
╭─ Version History: Workflow abc123
│  📦 Workflow: "Webhook to Slack"
│  💾 Total versions: 23
╰─

| Version | Created             | Nodes | Size  | Creator      |
|---------|---------------------|-------|-------|--------------|
| 23      | 2025-11-30 15:30:00 | 5     | 5.2KB | admin@ex.com |
| 22      | 2025-11-29 10:15:00 | 5     | 5.1KB | admin@ex.com |
| 21      | 2025-11-28 14:20:00 | 4     | 4.8KB | dev@ex.com   |

💡 Next steps:
   n8n workflows versions get --version-id 21
   n8n workflows versions rollback --workflow-id abc123 --version-id 21
```

**Rollback Preview:**
```
⏮️  PREVIEW: Rollback workflow abc123

Mode: DRY RUN (no changes)

Current State:
  Version: 23
  Nodes: 5
  Last modified: 2 hours ago

Target State (Version 21):
  Nodes: 4
  Created: 2 days ago

Changes:
  • Node removed: "New Feature"
  • Connection removed: Set → New Feature

⚠️  Rollback will:
  • Create backup of current version
  • Restore version 21
  • Workflow remains ACTIVE

To rollback:
    n8n workflows versions rollback --workflow-id abc123 --version-id 21 --confirm-with "ROLLBACK TO V21"
```

## Mode Risk Levels

| Mode | Risk | Confirmation Required |
|------|------|----------------------|
| list | Low | No |
| get | Low | No |
| rollback | Medium | `--confirm-with` |
| prune | Medium | `--confirm` |
| delete | High | `--confirm` |
| truncate | **CRITICAL** | `--confirm-truncate` |

## Files to Create

1. `src/commands/workflows/VersionsCommand.ts` - Main command
2. `src/core/db/versions.ts` - Version storage operations

## Code Outline

```typescript
// src/commands/workflows/VersionsCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';

export class WorkflowsVersionsCommand extends BaseCommand {
  static paths = [['workflows', 'versions']];
  
  static usage = {
    description: 'Manage workflow version history',
    details: `
      Version control and rollback for workflows.
      
      Modes:
        list - Show version history
        get - Get specific version
        rollback - Restore previous version
        prune - Keep N most recent versions
        delete - Delete version(s)
        truncate - Delete ALL versions (DANGEROUS)
      
      Examples:
        $ n8n workflows versions list --workflow-id abc123
        $ n8n workflows versions rollback --workflow-id abc123 --version-id 21
        $ n8n workflows versions prune --workflow-id abc123 --max-versions 5 --confirm
    `,
    category: 'Version Control',
  };

  mode = Option.String({ required: true });
  workflowId = Option.String('--workflow-id');
  versionId = Option.Number('--version-id');
  limit = Option.Number('-l,--limit', { default: 10 });
  maxVersions = Option.Number('--max-versions');
  validateBefore = Option.Boolean('--validate-before', { default: true });
  deleteAll = Option.Boolean('--delete-all', { default: false });
  confirm = Option.Boolean('--confirm', { default: false });
  confirmTruncate = Option.Boolean('--confirm-truncate', { default: false });
  confirmWith = Option.String('--confirm-with');
  dryRun = Option.Boolean('--dry-run', { default: true });
  save = Option.String('-s,--save');

  async execute(): Promise<number> {
    // Different logic paths based on this.mode
    // Read from n8n-mcp/src/mcp/tools/versions.ts
    return 0;
  }
}
```
