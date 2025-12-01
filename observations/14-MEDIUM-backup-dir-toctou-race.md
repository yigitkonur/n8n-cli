# Backup Directory Creation Has TOCTOU Race Condition

**Severity:** MEDIUM
**File Ref:** `src/utils/backup.ts:28-32`
**Tags:** #security #filesystem #race-condition

## 🔍 The Observation

The backup directory creation uses a check-then-create pattern:

```typescript
async function ensureBackupDir(dir: string = BACKUP_DIR): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true, mode: 0o700 });
  }
}
```

This is a Time-Of-Check-Time-Of-Use (TOCTOU) race:
1. `existsSync()` returns false
2. Attacker creates directory with 0o777 permissions
3. `mkdir()` fails or succeeds with wrong permissions
4. Backups written to attacker-controlled directory

While low risk (attacker needs local access and timing), it's a code smell.

## 💻 Code Reference
```typescript
// src/utils/backup.ts:28-32
async function ensureBackupDir(dir: string = BACKUP_DIR): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true, mode: 0o700 });
  }
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Check-then-create file system operations. Separate existence check from creation.

*   **Best Practice:** Use atomic operations:
    - `mkdir(recursive: true)` is idempotent - no existence check needed
    - Always set permissions after creation with `chmod()`
    - Use try-catch for EEXIST error handling

*   **Reference:** CWE-367 TOCTOU Race Condition, POSIX filesystem security

## 🛠️ Fix Plan

1.  Remove existence check (mkdir recursive is idempotent):
    ```typescript
    async function ensureBackupDir(dir: string = BACKUP_DIR): Promise<void> {
      await mkdir(dir, { recursive: true, mode: 0o700 });
      // Ensure permissions even if dir existed
      await chmod(dir, 0o700);
    }
    ```

2.  Alternative: Catch EEXIST and verify permissions:
    ```typescript
    try {
      await mkdir(dir, { mode: 0o700 });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Directory exists - verify permissions
      const stats = await stat(dir);
      if ((stats.mode & 0o777) !== 0o700) {
        throw new Error('Backup directory has insecure permissions');
      }
    }
    ```

## 💼 Business Impact

*   **Low practical risk:** Requires local attacker with precise timing
*   **Code Quality:** TOCTOU patterns are flagged in security audits
*   **Defense in Depth:** Simple fix eliminates entire class of bugs

## 🔗 Evidences

- CWE-367: https://cwe.mitre.org/data/definitions/367.html
- Node.js mkdir with recursive: true handles EEXIST internally
- Similar issues in npm audit findings for other CLI tools
