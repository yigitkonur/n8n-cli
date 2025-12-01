# isNonInteractive() Not Used in confirmAction()

**Severity:** LOW
**File Ref:** `src/utils/prompts.ts:197-214`
**Tags:** #consistency #ci-cd #ux

## 🔍 The Observation

The codebase has two functions for detecting non-interactive environments:
- `isInteractive()`: Checks `process.stdin.isTTY`
- `isNonInteractive()`: Checks CI env vars + TTY + dumb terminal

However, `confirmAction()` only uses `isInteractive()`, missing CI environment detection. This means a CI job with TTY emulation could prompt (and hang) waiting for input.

## 💻 Code Reference
```typescript
// prompts.ts:31-49 - Comprehensive CI detection
export function isNonInteractive(): boolean {
  const ciEnvVars = [
    'CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'JENKINS_URL', 
    'TRAVIS', 'CIRCLECI', 'BUILDKITE', 'DRONE', 'TF_BUILD',
  ];
  const isCI = ciEnvVars.some(envVar => process.env[envVar]);
  const noTTY = !process.stdin.isTTY;
  const dumbTerminal = process.env.TERM === 'dumb';
  
  return isCI || noTTY || dumbTerminal;
}

// prompts.ts:208-214 - Only checks TTY, not CI vars
if (!isInteractive()) {  // Should be: if (isNonInteractive())
  throw new Error(
    'Cannot prompt for confirmation in non-interactive mode.\n' +
    'Use --force or --yes to proceed without confirmation.'
  );
}
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Inconsistent environment detection across the codebase.
*   **Best Practice:** Single function for "should we prompt?" that covers all non-interactive scenarios.
*   **Reference:** GitHub Actions sets `CI=true` and can emulate TTY via pty

## 🛠️ Fix Plan

1.  Change `confirmAction()` to use `isNonInteractive()`:

```typescript
export async function confirmAction(
  message: string, 
  options: ConfirmOptions = {}
): Promise<boolean> {
  const { defaultNo = true, force = false } = options;
  
  if (force) {
    return true;
  }
  
  // Use comprehensive check, not just TTY
  if (isNonInteractive()) {  // Changed from !isInteractive()
    throw new Error(
      'Cannot prompt for confirmation in non-interactive mode.\n' +
      'Use --force or --yes to proceed without confirmation.'
    );
  }
  // ...
}
```

2.  Similarly update `promptInput()` and `promptSecret()`.

## 💼 Business Impact

**CI/CD:** Jobs with TTY emulation (some CI runners) could hang waiting for input.

**Consistency:** Using different detection methods causes unpredictable behavior.

**Effort:** ~10 minutes to update function calls.

## 🔗 Evidences

- GitHub Actions can allocate PTY making isTTY true
- `isNonInteractive()` already exists and checks CI vars
- auth/login.ts uses both functions in different places
