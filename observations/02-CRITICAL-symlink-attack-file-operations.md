# Symlink Attack Vulnerability in File Operations

**Severity:** CRITICAL
**File Ref:** `src/utils/backup.ts:40-47`
**Tags:** #security #file-operations #CWE-59

## 🔍 The Observation

The backup utility uses `copyFile()` without checking if the source is a symlink. Node.js `copyFile()` follows symlinks by default, which allows an attacker to:

1. Create a symlink pointing to a sensitive file (e.g., `ln -s ~/.ssh/id_rsa workflow.json`)
2. Run a command that triggers backup (e.g., `n8n workflows autofix workflow.json --apply`)
3. The backup copies the SSH private key content to a readable backup file

Similarly, `writeFile()` in backup operations could follow symlinks for the destination, allowing arbitrary file overwrites.

## 💻 Code Reference
```typescript
// src/utils/backup.ts:40-47
export async function createFileBackup(filePath: string): Promise<string> {
  const timestamp = getTimestamp();
  const backupPath = `${filePath}.backup-${timestamp}.json`;
  
  await copyFile(filePath, backupPath);  // Follows symlinks!
  
  return backupPath;
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Using `copyFile()` on user-provided paths without symlink verification. No `lstat()` check before operations.

*   **Best Practice:** Use `fs.lstatSync()` to detect symlinks before file operations. For backup, read content with `readFile()` then write to a fixed backup directory, rather than creating sibling files.

*   **Reference:** [CWE-59 Improper Link Resolution](https://cwe.mitre.org/data/definitions/59.html), [CWE-61 UNIX Symbolic Link Following](https://cwe.mitre.org/data/definitions/61.html)

## 🛠️ Fix Plan

1.  Add symlink detection before file operations:
    ```typescript
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) {
      throw new Error('Symlinks not allowed for security reasons');
    }
    ```

2.  For backups, use content-based approach: read file content, write to `BACKUP_DIR` (fixed location)

3.  Consider using `fs.constants.COPYFILE_EXCL` flag with `copyFile()` to prevent overwrites

## 💼 Business Impact

*   **Credential Theft:** SSH keys, API tokens, database passwords exfiltrated via backup
*   **Data Corruption:** Symlink to config file → backup overwrites production config
*   **Container Escape:** In orchestrated environments, symlinks to host mounts

## 🔗 Evidences

- CWE-59: https://cwe.mitre.org/data/definitions/59.html
- Node.js fs.copyFile follows symlinks by default (fs.constants.COPYFILE_FICLONE doesn't prevent)
- Similar vulnerabilities documented in npm package manager history
