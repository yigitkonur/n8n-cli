# Windows File Permissions Skipped Entirely

**Severity:** MEDIUM
**File Ref:** `src/core/config/loader.ts:52-56`
**Tags:** #security #windows #permissions

## 🔍 The Observation

File permission checks are completely skipped on Windows:

```typescript
function checkFilePermissions(filePath: string): { secure: boolean; mode: string } {
  // Skip on Windows - no Unix permission model
  if (process.platform === 'win32') {
    return { secure: true, mode: 'N/A' };
  }
  // ...
}
```

This means:
- Config files with API keys are assumed "secure" on Windows
- No Windows ACL validation
- Any user on the system can potentially read credentials
- Enterprise Windows environments have strict ACL requirements

## 💻 Code Reference
```typescript
// src/core/config/loader.ts:52-56
function checkFilePermissions(filePath: string): { secure: boolean; mode: string } {
  // Skip on Windows - no Unix permission model
  if (process.platform === 'win32') {
    return { secure: true, mode: 'N/A' };
  }
  // ...
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Assuming cross-platform security by ignoring platform-specific models. Returning "secure: true" without validation.

*   **Best Practice:** 
    - Use Windows ACL APIs via `icacls` or native bindings
    - Check that only SYSTEM and current user have access
    - Or: Use Windows Credential Manager for secrets
    - At minimum: Warn users that permissions aren't verified

*   **Reference:** Windows Security ACL documentation, OWASP Cryptographic Storage

## 🛠️ Fix Plan

1.  Add Windows warning:
    ```typescript
    if (process.platform === 'win32') {
      console.warn(chalk.yellow('⚠️  Windows: Cannot verify file permissions. Ensure ACLs restrict access.'));
      return { secure: true, mode: 'N/A (Windows - unverified)' };
    }
    ```

2.  Long-term: Add Windows ACL check:
    ```typescript
    // Use icacls command to check permissions
    const { execSync } = require('child_process');
    const acl = execSync(`icacls "${filePath}"`).toString();
    // Parse and validate only SYSTEM/current user have access
    ```

3.  Consider Windows Credential Manager integration

## 💼 Business Impact

*   **Shared Workstations:** Other users can read API keys
*   **Compliance:** Windows enterprise environments require ACL validation
*   **False Security:** Users believe credentials are protected when they're not

## 🔗 Evidences

- Windows chmod has no effect: Node.js fs docs
- OWASP Cryptographic Storage mandates platform-native secure storage
- Windows Credential Manager is the equivalent of macOS Keychain
