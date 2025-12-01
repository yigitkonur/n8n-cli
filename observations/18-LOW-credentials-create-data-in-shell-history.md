# Credentials Create Allows Inline Data (Shell History Risk)

**Severity:** LOW
**File Ref:** `src/commands/credentials/create.ts:43-53`
**Tags:** #security #credentials #ux

## 🔍 The Observation

The `credentials create` command accepts credential data as inline JSON (`--data '{"apiKey":"secret"}'`), which gets stored in shell history. While `@file.json` syntax is supported and documented as recommended, the inline option is equally prominent.

Shell history is often:
- Backed up to cloud (bash_history sync)
- Shared in screen sharing
- Logged in CI/CD systems
- Readable by other processes

## 💻 Code Reference
```typescript
// create.ts:43-53
if (opts.data) {
  try {
    if (opts.data.startsWith('@')) {
      // Good: Read from file
      const filePath = opts.data.slice(1);
      const fileContent = readFileSync(filePath, 'utf-8');
      credentialData = JSON.parse(fileContent);
    } else {
      // Risky: Inline JSON (goes to shell history)
      credentialData = JSON.parse(opts.data);
    }
  } catch (parseError) { ... }
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Making it easy to put secrets directly on command line.
*   **Best Practice:** Require file input for sensitive data, or prompt interactively. AWS CLI uses `--cli-input-json file://` syntax.
*   **Reference:** [OWASP Credential Management](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Management_Cheat_Sheet.html)

## 🛠️ Fix Plan

1.  Add warning when inline JSON detected:

```typescript
if (opts.data && !opts.data.startsWith('@')) {
  console.warn(chalk.yellow(
    '⚠️  Warning: Inline credentials appear in shell history.\n' +
    '   Consider using --data @file.json instead.'
  ));
}
```

2.  Consider deprecating inline data in favor of file-only.
3.  Or: Add `--data-stdin` to read from stdin (pipe-friendly, no history).

## 💼 Business Impact

**Security Education:** Many users don't realize shell history implications. Warning helps.

**Usability Trade-off:** Inline is convenient for testing. Keep available but warn.

**Effort:** ~15 minutes for warning message.

## 🔗 Evidences

- Help text recommends @file.json but doesn't explain why
- Similar issue exists for --api-key flag in auth login
- AWS CLI moved to file:// prefix for sensitive inputs
