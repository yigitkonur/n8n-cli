## Phase 1: Installation & Global Infrastructure

### 1.1 Installation Verification

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| INS-001 | Version display | `n8n --version` | Outputs semver (e.g., `1.2.3`) |
| INS-002 | Help display | `n8n --help` | Lists all 15 command groups |
| INS-003 | Unknown command | `n8n foobar` | Exit code 64 (USAGE) |
| INS-004 | Subcommand help | `n8n workflows --help` | Lists all workflow subcommands |
| INS-005 | Deep help | `n8n workflows validate --help` | Shows all validation flags |

```bash
# Test Script
echo "=== INS-001: Version ===" && n8n --version
echo "=== INS-002: Help ===" && n8n --help | head -50
echo "=== INS-003: Unknown Command ===" && n8n foobar 2>&1; echo "Exit: $?"
echo "=== INS-004: Subcommand Help ===" && n8n workflows --help | head -30
echo "=== INS-005: Deep Help ===" && n8n workflows validate --help
```

### 1.2 Global Flags Testing

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| GLB-001 | Verbose mode | `n8n nodes search slack -v` | Debug output visible |
| GLB-002 | Quiet mode | `n8n nodes search slack -q` | Minimal output |
| GLB-003 | No color | `n8n nodes search slack --no-color` | No ANSI escape codes |
| GLB-004 | JSON output | `n8n nodes search slack --json` | Valid JSON structure |
| GLB-005 | Profile switch | `n8n --profile staging health` | Uses staging profile |
| GLB-006 | Combined flags | `n8n -v --json nodes list --limit 5` | Verbose + JSON |

```bash
# Test Script
echo "=== GLB-001: Verbose ===" && n8n nodes search slack -v 2>&1 | head -20
echo "=== GLB-002: Quiet ===" && n8n nodes search slack -q
echo "=== GLB-003: No Color ===" && n8n nodes search slack --no-color | cat -v | head -10
echo "=== GLB-004: JSON ===" && n8n nodes search slack --json | jq -e '.success' && echo "Valid JSON"
echo "=== GLB-005: Profile ===" && n8n --profile invalid health 2>&1; echo "Exit: $?"
```

### 1.3 Shell Completion

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| CMP-001 | Bash completion | `n8n completion bash` | Valid bash script |
| CMP-002 | Zsh completion | `n8n completion zsh` | Valid zsh script |
| CMP-003 | Fish completion | `n8n completion fish` | Valid fish script |
| CMP-004 | Invalid shell | `n8n completion powershell` | Error message |

```bash
# Test Script
n8n completion bash > /tmp/n8n-bash.sh && source /tmp/n8n-bash.sh && echo "Bash: OK"
n8n completion zsh > /tmp/n8n-zsh.sh && echo "Zsh: OK"
n8n completion fish > /tmp/n8n-fish.fish && echo "Fish: OK"
```

