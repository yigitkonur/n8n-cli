# No System Keychain Integration for Secrets

**Severity:** LOW
**File Ref:** `src/core/config/loader.ts:348-391`
**Tags:** #security #credentials #enhancement

## 🔍 The Observation

API keys are stored in plaintext JSON files:

```typescript
export function saveConfig(partial: PartialConfig): string {
  // ...
  writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
  // ...
}
```

While file permissions (chmod 600) provide basic protection, system keychains offer:
- Encrypted storage at rest
- OS-level access control
- Biometric/password protection
- Automatic locking on idle

Modern CLI tools (GitHub CLI, AWS CLI v2) increasingly support keychains.

## 💻 Code Reference
```typescript
// src/core/config/loader.ts:376
writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
// API key is written in plaintext JSON
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Current Pattern:** Plaintext JSON with file permissions. Industry-standard for CLI tools but not optimal.

*   **Better Practice:** 
    - macOS: Use `@electron/keytar` or native Security framework
    - Linux: Use Secret Service API (GNOME Keyring, KWallet)
    - Windows: Use Windows Credential Manager

*   **Reference:** GitHub CLI uses keychain on macOS, OWASP recommends platform-native secret storage

## 🛠️ Fix Plan

1.  Add optional keychain support:
    ```typescript
    // Install: npm install @electron/keytar
    import keytar from '@electron/keytar';
    
    const SERVICE = 'n8n-cli';
    
    export async function saveApiKeySecure(account: string, key: string) {
      await keytar.setPassword(SERVICE, account, key);
    }
    
    export async function getApiKeySecure(account: string) {
      return keytar.getPassword(SERVICE, account);
    }
    ```

2.  Fall back to file storage if keychain unavailable

3.  Add `--use-keychain` flag for opt-in

4.  **Carmack Lens:** This is a "nice to have" - file permissions are acceptable for startup CLI

## 💼 Business Impact

*   **Low priority:** Current approach is industry-standard
*   **Enterprise Value:** Keychain support differentiates for security-conscious users
*   **Dependency Cost:** keytar adds native module complexity

## 🔗 Evidences

- GitHub CLI uses keychain on macOS for token storage
- AWS CLI v2 supports credential_process for external secret managers
- keytar is Electron project, well-maintained
