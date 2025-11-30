# Command: n8n workflows delete (DISABLED)

## MCP Source Reference

**Read from:** `n8n-mcp/src/mcp/tools/workflows.ts` - DISABLED in MCP
**MCP Doc:** `n8n-mcp/mcp-tools/013-n8n_delete_workflow.md`

## CLI Command

```bash
n8n workflows delete <id>
```

## Status: ⛔ PERMANENTLY DISABLED

This command is **disabled by design** and will never execute workflow deletion.

## Rationale

1. **Permanent and irreversible** - No recycle bin or undo
2. **Cascading impact** - May break other workflows referencing this one
3. **Safety first** - CLI should not have destructive operations without UI confirmation
4. **Audit trail** - UI provides better tracking of who deleted what

## Implementation

### Output (Always)

```
🚫 OPERATION DISABLED: Workflow deletion via CLI

Workflow deletion is permanent and irreversible.
Delete workflows through the n8n web UI instead.

╭─ Why this is disabled
╰─

• Deletion is permanent - no recycle bin
• May break workflows that reference this one
• CLI lacks proper confirmation UI
• Web UI provides better audit trail

╭─ To delete via n8n UI
╰─

1. Open: https://n8n.example.com/workflow/<id>
2. Click Settings (⚙️) → Delete Workflow
3. Confirm in the modal dialog

╭─ Safer alternatives
╰─

# Deactivate instead of delete
n8n workflows update <id> --operations '[{"type":"deactivateWorkflow"}]' --intent "Disable unused workflow"

# Archive with tag for later cleanup
n8n workflows update <id> --operations '[{"type":"addTag","tag":"archived"}]' --intent "Mark for archival"

# Export before deciding
n8n workflows get <id> --save backup-<id>.json

💡 If you MUST delete programmatically, use the n8n API directly:
   curl -X DELETE https://n8n.example.com/api/v1/workflows/<id> \
     -H "X-N8N-API-KEY: $N8N_API_KEY"
```

## Files to Create

1. `src/commands/workflows/DeleteCommand.ts` - Shows disabled message only

## Code Outline

```typescript
// src/commands/workflows/DeleteCommand.ts
import { Command, Option } from 'clipanion';
import { BaseCommand } from '../base.js';
import { getConfig } from '../../core/utils/config.js';

export class WorkflowsDeleteCommand extends BaseCommand {
  static paths = [['workflows', 'delete']];
  
  static usage = {
    description: '⛔ DISABLED - Delete workflow (use n8n web UI)',
    details: `
      This command is permanently disabled for safety.
      
      Workflow deletion is:
        • Permanent and irreversible
        • May cascade to dependent workflows
        • Better handled in the web UI
      
      Use alternatives:
        $ n8n workflows update <id> --operations '[{"type":"deactivateWorkflow"}]'
        $ n8n workflows update <id> --operations '[{"type":"addTag","tag":"archived"}]'
    `,
    category: 'Workflow Management',
  };

  id = Option.String({ required: true });

  async execute(): Promise<number> {
    const config = await getConfig();
    const baseUrl = config.n8nUrl || 'https://n8n.example.com';
    
    this.context.stdout.write(`
🚫 OPERATION DISABLED: Workflow deletion via CLI

Workflow deletion is permanent and irreversible.
Delete workflows through the n8n web UI instead.

╭─ To delete via n8n UI
╰─

1. Open: ${baseUrl}/workflow/${this.id}
2. Click Settings (⚙️) → Delete Workflow
3. Confirm in the modal dialog

╭─ Safer alternatives
╰─

# Deactivate instead of delete
n8n workflows update ${this.id} --operations '[{"type":"deactivateWorkflow"}]' --intent "Disable unused workflow"

# Archive with tag for later cleanup
n8n workflows update ${this.id} --operations '[{"type":"addTag","tag":"archived"}]' --intent "Mark for archival"

# Export before deciding
n8n workflows get ${this.id} --save backup-${this.id}.json

`);
    
    // Always return error code since operation is disabled
    return 1;
  }
}
```

## Design Notes

- Command exists so users get helpful message instead of "command not found"
- Always returns exit code 1 (error)
- Provides actionable alternatives
- Shows URL to web UI for the specific workflow
