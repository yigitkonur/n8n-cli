# Windows Path Traversal via Device Names (CVE-2025-27210)

**Severity:** HIGH
**File Ref:** `src/commands/workflows/import.ts:30-38`
**Tags:** #security #windows #CVE

## 🔍 The Observation

Node.js versions prior to 24.3.0 are vulnerable to CVE-2025-27210, which allows path traversal on Windows using reserved device names:

```
CON\..\windows\system32\drivers\etc\hosts
```

This bypasses typical path validation because:
- `path.resolve()` doesn't strip device prefixes
- `path.normalize()` doesn't reject reserved names
- `fs` operations follow the path successfully

The CLI performs no path validation, making it fully exploitable on vulnerable Node versions on Windows.

## 💻 Code Reference
```typescript
// src/commands/workflows/import.ts:30-38
// No path validation before fs operations
if (!existsSync(filePath)) {
  // ...
}
const content = await readFile(filePath, 'utf8');
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Assuming path normalization prevents traversal on Windows. Trusting Node.js fs module to reject invalid paths.

*   **Best Practice:** 
    - Update to Node.js 24.3.0+ (CVE fixed)
    - Implement platform-specific validation for Windows
    - Reject paths containing Windows device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    - Use `path.win32.parse()` to detect device paths

*   **Reference:** [CVE-2025-27210](https://nvd.nist.gov/vuln/detail/CVE-2025-27210), Node.js Security Releases July 2025

## 🛠️ Fix Plan

1.  Add Windows device name detection:
    ```typescript
    const WINDOWS_DEVICES = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
    function isWindowsDevicePath(p: string): boolean {
      const basename = path.basename(p).split('.')[0];
      return WINDOWS_DEVICES.test(basename);
    }
    ```

2.  Reject paths with device names on Windows

3.  Require Node.js >=24.3.0 in package.json engines field

4.  Add security note in README about Windows path handling

## 💼 Business Impact

*   **System File Access:** Read sensitive Windows system files
*   **Configuration Theft:** Access to hosts file, registry exports
*   **Exploitation Ease:** Published CVE with PoC code available
*   **CI/CD Runners:** Windows runners potentially exploitable

## 🔗 Evidences

- CVE-2025-27210: https://nvd.nist.gov/vuln/detail/CVE-2025-27210
- Node.js Security Release July 2025
- PoC: `node -e "fs.readFile('CON\\..\\windows\\system32\\drivers\\etc\\hosts')"`
