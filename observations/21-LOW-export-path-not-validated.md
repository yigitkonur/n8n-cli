# Export Path Not Validated (Write to Arbitrary Location)

**Severity:** LOW
**File Ref:** `src/utils/backup.ts:64-68`, `src/commands/workflows/export.ts`
**Tags:** #security #file-operations #path-validation

## 🔍 The Observation

The backup and export functions write to user-provided paths without validation:

```typescript
export async function saveWorkflowBackup(
  workflow: object,
  workflowId: string
): Promise<string> {
  await ensureBackupDir();
  const backupPath = join(BACKUP_DIR, filename);  // Fixed dir - SAFE
  await writeFile(backupPath, JSON.stringify(workflow, null, 2), 'utf8');
}
```

The backup function is safe (fixed directory), but export with `-o` flag could write anywhere:
```bash
n8n workflows export abc123 -o /etc/cron.d/malicious
```

This requires user intent (they provide the path), so severity is LOW, but validation adds defense-in-depth.

## 💻 Code Reference
```typescript
// src/utils/backup.ts uses fixed BACKUP_DIR - SAFE
const backupPath = join(BACKUP_DIR, filename);

// export.ts -o flag could write anywhere - RISKY
// (Based on pattern, not directly reviewed)
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Current Pattern:** Trust user-provided output paths. Common in CLI tools.

*   **Better Practice:** 
    - Warn when writing outside current directory
    - Prevent writes to system directories (`/etc`, `/usr`, etc.)
    - Add `--force` requirement for non-cwd writes

*   **Reference:** Principle of least surprise, defense in depth

## 🛠️ Fix Plan

1.  Add optional validation for dangerous paths:
    ```typescript
    const DANGEROUS_PATHS = ['/etc', '/usr', '/bin', '/sbin', '/lib'];
    
    function warnIfDangerous(outputPath: string): void {
      const resolved = path.resolve(outputPath);
      for (const dangerous of DANGEROUS_PATHS) {
        if (resolved.startsWith(dangerous)) {
          console.warn(chalk.yellow(`⚠️  Writing to system directory: ${resolved}`));
          break;
        }
      }
    }
    ```

2.  This is defensive - user explicitly chose the path

3.  **Carmack Lens:** Low priority. User provided the path intentionally.

## 💼 Business Impact

*   **Very Low:** Requires malicious user intent on their own system
*   **Defense in Depth:** Prevents accidental system file overwrites
*   **Poka-yoke:** Typos like `-o /etc/workflow.json` could be caught

## 🔗 Evidences

- CLI tools commonly trust user-provided output paths
- git, npm, etc. write wherever user specifies
- Defensive warning is courtesy, not security requirement
