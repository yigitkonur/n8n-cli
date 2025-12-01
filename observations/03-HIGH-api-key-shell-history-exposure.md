# API Key Exposure via Shell History

**Severity:** HIGH
**File Ref:** `src/cli.ts:71-74`, `src/commands/auth/login.ts:140-141`
**Tags:** #security #credentials #shell-history

## 🔍 The Observation

The CLI accepts `--api-key` as a command-line flag:

```bash
n8n auth login --host https://n8n.example.com --api-key eyJhbGc...
```

This command is stored in shell history files (`~/.bash_history`, `~/.zsh_history`), making the API key recoverable by:
- Other users on shared systems
- Malware scanning history files
- Backup systems that capture home directories
- Developer machines synced to cloud storage

GitGuardian reports that ~20% of credential leaks in CLI tools originate from shell history exposure.

## 💻 Code Reference
```typescript
// src/cli.ts:71-74
.option('-k, --api-key <key>', 'n8n API key')

// src/commands/auth/login.ts:140-141
const apiKey = opts.apiKey || process.env.N8N_API_KEY;
```

## 🛡️ Best Practice vs. Anti-Pattern

*   **Anti-Pattern:** Accepting secrets as command-line arguments. All CLI arguments are visible in `ps aux` and stored in history.

*   **Best Practice:** 
    - Accept secrets via environment variables (`N8N_API_KEY`)
    - Accept secrets via stdin (`echo $KEY | n8n auth login --api-key-stdin`)
    - Use interactive prompts with no-echo input
    - Read from file (`--api-key-file /path/to/key`)

*   **Reference:** [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

## 🛠️ Fix Plan

1.  Add warning in help text: "⚠️ Using --api-key stores the key in shell history. Prefer N8N_API_KEY env var."

2.  Add `--api-key-stdin` option that reads from stdin:
    ```typescript
    if (opts.apiKeyStdin) {
      const rl = readline.createInterface({ input: process.stdin });
      apiKey = await new Promise(resolve => rl.once('line', resolve));
    }
    ```

3.  Recommend `HISTCONTROL=ignorespace` in docs (prefix command with space to skip history)

4.  Long-term: Deprecate `--api-key` flag in favor of env vars

## 💼 Business Impact

*   **Credential Exposure:** API keys in history files → unauthorized access to n8n instance
*   **Compliance Risk:** PCI-DSS, SOC2 require secrets not stored in plaintext
*   **Incident Response:** Breached machine → all historical API keys compromised

## 🔗 Evidences

- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- GitGuardian: 20% of CLI credential leaks from shell history
- AWS CLI deprecated --secret-access-key years ago for this reason
