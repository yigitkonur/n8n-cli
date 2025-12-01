# Config Permission Warning is Non-Blocking by Default

**Severity:** MEDIUM
**File Ref:** `src/core/config/loader.ts:84-96`
**Tags:** #security #configuration #credentials

## 🔍 The Observation

When a config file has insecure permissions (e.g., world-readable API keys), the loader only prints a warning and continues. The `N8N_STRICT_PERMISSIONS` environment variable must be explicitly set to `true` to enforce secure permissions.

This means users may unknowingly run with exposed credentials, especially on shared systems or misconfigured deployments.

## 💻 Code Reference
```typescript
// loader.ts:84-96
const permCheck = checkFilePermissions(configPath);
if (!permCheck.secure) {
  console.warn(chalk.yellow(`⚠️  Config file ${configPath} has insecure permissions (${permCheck.mode})`));
  console.warn(chalk.yellow(`   Contains API key. Run: chmod 600 ${configPath}`));
  
  // Only strict mode blocks - default continues
  if (process.env.N8N_STRICT_PERMISSIONS === 'true') {
    throw new Error(
      `Refusing to load config file with insecure permissions. ` +
      `Run: chmod 600 ${configPath} or set N8N_STRICT_PERMISSIONS=false`
    );
  }
  // Otherwise: continues with insecure config!
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Security warnings that users can ignore. If it's important enough to warn, it's often important enough to block.
*   **Best Practice:** Secure-by-default with explicit opt-out. SSH refuses to use keys with wrong permissions. GPG refuses to use insecure homedirs.
*   **Reference:** [SSH Key Permissions](https://man.openbsd.org/ssh#FILES) - Refuses operation if key file permissions are too open

## 🛠️ Fix Plan

1.  **Option A (Recommended):** Invert the default - fail on insecure permissions unless `N8N_INSECURE_PERMISSIONS=true`.
2.  **Option B:** Auto-fix permissions with warning (like `git config` does for some settings).
3.  **Option C:** Require confirmation to proceed with insecure permissions.

```typescript
// Recommended: Secure by default
if (!permCheck.secure) {
  console.warn(chalk.yellow(`⚠️  Config file ${configPath} has insecure permissions (${permCheck.mode})`));
  
  if (process.env.N8N_INSECURE_PERMISSIONS !== 'true') {
    throw new Error(
      `Config file has insecure permissions (${permCheck.mode}). ` +
      `Run: chmod 600 ${configPath}\n` +
      `Or set N8N_INSECURE_PERMISSIONS=true to proceed anyway (not recommended).`
    );
  }
  console.warn(chalk.yellow(`   Proceeding due to N8N_INSECURE_PERMISSIONS=true`));
}
```

## 💼 Business Impact

**Security Risk:** API keys exposed via world-readable config files can be:
- Harvested by other users on shared systems
- Included in backups readable by backup operators
- Exposed via container image layers

**Migration:** Breaking change for users with insecure permissions. Provide clear error message with fix command.

**Effort:** ~20 minutes to invert logic and update docs.

## 🔗 Evidences

- SSH's strict permission model has prevented countless key compromises
- saveConfig() already sets 0o600 on new files (line 381)
- The permission check logic is already implemented, just needs default inversion
