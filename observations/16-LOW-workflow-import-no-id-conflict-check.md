# Workflow Import Doesn't Check for ID Conflicts

**Severity:** LOW
**File Ref:** `src/commands/workflows/import.ts:130-132`
**Tags:** #data-safety #ux #workflow-management

## 🔍 The Observation

When importing a workflow, the CLI strips the `id` field and creates a new workflow. However, if the exported workflow JSON contains node IDs that conflict with existing workflows (via connection references), the import may succeed but create broken connections.

Additionally, there's no option to update an existing workflow by ID instead of always creating new.

## 💻 Code Reference
```typescript
// import.ts:66-67 - strips ID, always creates new
const cleanedWorkflow = stripReadOnlyProperties(workflow);

// import.ts:130-132 - no conflict check
const client = getApiClient();
const created = await client.createWorkflow(cleanedWorkflow);
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Import that always creates new, with no option to update existing or detect conflicts.
*   **Best Practice:** Provide `--update <id>` flag to update existing workflow, or `--upsert` to match by name.
*   **Reference:** kubectl `apply` vs `create` - apply updates if exists, create fails if exists

## 🛠️ Fix Plan

1.  Add `--update <id>` flag to import command:

```typescript
// import.ts options
interface ImportOptions extends GlobalOptions {
  name?: string;
  dryRun?: boolean;
  activate?: boolean;
  update?: string;  // Workflow ID to update
  json?: boolean;
}

// In command handler
if (opts.update) {
  const updated = await client.updateWorkflow(opts.update, cleanedWorkflow);
  // ...
} else {
  const created = await client.createWorkflow(cleanedWorkflow);
  // ...
}
```

2.  Consider `--upsert` that matches by workflow name.

## 💼 Business Impact

**Workflow Duplication:** Repeated imports create duplicate workflows with same name.

**Migration Workflows:** GitOps/CI pipelines need update capability, not just create.

**Effort:** ~45 minutes to add --update flag.

## 🔗 Evidences

- `updateWorkflow()` method exists in API client
- sanitizer.ts regenerates IDs when requested but import doesn't use it
- kubectl pattern: `apply` for upsert, `create` for new-only
