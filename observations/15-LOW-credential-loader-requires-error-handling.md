# Credential Loader Silently Swallows Load Errors

**Severity:** LOW
**File Ref:** `src/core/credential-loader.ts:119-127`
**Tags:** #error-handling #debugging #developer-experience

## 🔍 The Observation

The credential loader silently catches and logs (only in debug mode) errors when loading credential type files. Users may not realize why certain credential types are unavailable without enabling debug mode.

The `failedLoads` array tracks failures but is only accessible via `getLoadErrors()` which isn't called by any command.

## 💻 Code Reference
```typescript
// credential-loader.ts:119-127
private loadCredentialFile(filePath: string) {
  try {
    const module = require(filePath);
    // ...
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    debug('credential-loader', `Failed to require ${filePath}: ${errorMsg}`);
    this.failedLoads.push({
      path: filePath,
      error: errorMsg,
      type: 'require',
    });
    // No user-visible error!
  }
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Silent error swallowing that hides configuration problems from users.
*   **Best Practice:** Surface load errors in verbose mode or provide a diagnostic command to show failed loads.
*   **Reference:** [12 Factor App - Logs](https://12factor.net/logs) - Treat logs as event streams

## 🛠️ Fix Plan

1.  Add `credentials doctor` command that shows failed loads:

```typescript
// New command: n8n credentials doctor
export async function credentialsDoctorCommand(): Promise<void> {
  const registry = credentialRegistry;
  registry.init();
  
  const failed = registry.getLoadErrors();
  if (failed.length > 0) {
    console.log(chalk.yellow(`⚠️  ${failed.length} credential types failed to load:`));
    failed.forEach(f => console.log(chalk.dim(`  ${f.path}: ${f.error}`)));
  }
  
  console.log(chalk.green(`✓ ${registry.getLoadedCount()} credential types loaded`));
}
```

2.  In verbose mode, show summary of failed loads after init.

## 💼 Business Impact

**User Experience:** Users expecting a credential type that failed to load will see "not found" with no explanation.

**Debugging:** Without knowing to enable debug mode, users can't diagnose credential issues.

**Effort:** ~30 minutes for diagnostic command.

## 🔗 Evidences

- `getFailedCount()` and `getLoadErrors()` methods exist but unused
- debug() only outputs when N8N_DEBUG=true
- Failed credential types silently disappear from available list
