# Path Traversal Vulnerability in File Import

**Severity:** CRITICAL
**File Ref:** `src/commands/workflows/import.ts:30-38`
**Tags:** #security #file-operations #CWE-22

## 🔍 The Observation

The `workflowsImportCommand` function accepts a user-provided file path without any validation or sanitization. The code directly passes the CLI argument to `existsSync()` and `readFile()`:

```typescript
if (!existsSync(filePath)) {
  console.error(chalk.red(`\n${icons.error} File not found: ${filePath}`));
  // ...
}
const content = await readFile(filePath, 'utf8');
```

An attacker can use path traversal sequences like `../../../etc/passwd` or create symlinks to sensitive files. The CLI will attempt to parse them as JSON, and even on parse failure, error messages may leak file contents.

## 💻 Code Reference
```typescript
// src/commands/workflows/import.ts:30-38
if (!existsSync(filePath)) {
  console.error(chalk.red(`\n${icons.error} File not found: ${filePath}`));
  process.exitCode = 1;
  return;
}

const content = await readFile(filePath, 'utf8');
const workflow = jsonParse(content, { repairJSON: true }) as any;
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Directly using user-provided paths without validation. No `path.resolve()`, no prefix checking, no symlink resolution.

*   **Best Practice:** Validate file paths using `realpathSync()` to resolve symlinks, then verify the resolved path is within an allowed directory (e.g., current working directory). OWASP CWE-22 recommends path canonicalization before access.

*   **Reference:** [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal), [CWE-22](https://cwe.mitre.org/data/definitions/22.html)

## 🛠️ Fix Plan

1.  Create a `safeReadFile()` utility that:
    - Resolves the path with `path.resolve(filePath)`
    - Uses `fs.realpathSync()` to follow symlinks
    - Validates the resolved path starts with `process.cwd()` or an allowed prefix
    - Throws a clear error on traversal attempts

2.  Apply the same pattern to `export.ts`, `backup.ts`, and any other file operations

## 💼 Business Impact

*   **Data Exfiltration:** Attacker could read `/etc/shadow`, SSH keys, or config files with API credentials
*   **Privilege Escalation:** If CLI runs as root (container scenarios), sensitive system files accessible
*   **Compliance Violation:** SOC2/ISO27001 require input validation on file operations
*   **Reputation Risk:** CVE assignment for a CLI tool damages trust

## 🔗 Evidences

- OWASP Path Traversal: https://owasp.org/www-community/attacks/Path_Traversal
- Node.js CVE-2025-27210: Windows path traversal via device names
- Similar vuln in Webpack/Backstage CLI tools documented in security advisories
