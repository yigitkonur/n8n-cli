# Prompt SIGINT Handler Calls process.exit() Directly

**Severity:** LOW
**File Ref:** `src/utils/prompts.ts:117,169-170`
**Tags:** #process-lifecycle #cleanup #consistency

## 🔍 The Observation

The prompt utilities (`promptInput`, `promptSecret`) register their own SIGINT handlers that call `process.exit(1)` directly, bypassing the lifecycle cleanup handlers. This means Ctrl+C during a prompt won't run `performCleanup()`.

While database operations are unlikely during prompts, this creates inconsistent exit behavior.

## 💻 Code Reference
```typescript
// prompts.ts:112-117 - promptInput
rl.on('SIGINT', () => {
  rl.close();
  console.log(chalk.yellow('\nAborted.'));
  process.exit(1);  // Bypasses lifecycle.ts cleanup!
});

// prompts.ts:166-170 - promptSecret
} else if (c === '\u0003') { // Ctrl+C
  process.stdin.setRawMode?.(false);
  process.stdin.removeListener('data', onData);
  console.log(chalk.yellow('\nAborted.'));
  rl.close();
  process.exit(1);  // Bypasses lifecycle.ts cleanup!
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Multiple SIGINT handlers with different behaviors. Some clean up, some don't.
*   **Best Practice:** Single source of signal handling, or ensure all handlers trigger the same cleanup path.
*   **Reference:** Node.js signal handling is global; handlers should coordinate

## 🛠️ Fix Plan

1.  Replace `process.exit(1)` with setting exit code and throwing:

```typescript
rl.on('SIGINT', () => {
  rl.close();
  console.log(chalk.yellow('\nAborted.'));
  process.exitCode = 130;  // Standard SIGINT exit code
  throw new Error('User interrupted');  // Let caller handle
});
```

2.  Or: Import and call `shutdown()` from lifecycle before exit.

3.  Or: Resolve the prompt with a sentinel value (null) and let caller decide.

## 💼 Business Impact

**Consistency:** Minor - database unlikely to be open during prompts.

**Exit Codes:** Exit code 1 instead of 130 (SIGINT convention).

**Effort:** ~20 minutes to standardize.

## 🔗 Evidences

- lifecycle.ts expects to handle all SIGINT via registered handler
- Raw stdin handling in promptSecret bypasses readline SIGINT
- Exit code 130 (128 + SIGINT signal number 2) is convention
