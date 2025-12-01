## Phase 17: Exit Codes & Scripting

**Goal:** Verify POSIX-compliant exit codes for CI/CD integration.
**Source Truth:** `utils/exit-codes.ts`

### 17.1 Exit Code Matrix

| Code | Name | Test Command | Trigger |
|------|------|--------------|---------|
| 0 | SUCCESS | `n8n nodes search slack` | Valid operation |
| 1 | GENERAL | Various | Unknown errors |
| 64 | USAGE | `n8n foobar` | Unknown command |
| 65 | DATAERR | `n8n workflows validate broken.json` | Invalid data |
| 66 | NOINPUT | `n8n workflows validate nonexistent.json` | File not found |
| 70 | IOERR | Network fail | I/O error |
| 71 | TEMPFAIL | Rate limit | Temporary fail |
| 72 | PROTOCOL | API error | Server error |
| 73 | NOPERM | Invalid auth | Permission denied |
| 78 | CONFIG | Bad config | Config error |

```bash
echo "=== Testing Exit Codes ===" 

# Exit 0: Success
n8n nodes search slack > /dev/null
echo "Exit 0 (SUCCESS): $?"

# Exit 64: Usage error
n8n unknowncommand > /dev/null 2>&1
echo "Exit 64 (USAGE): $?"

# Exit 65: Data error
n8n workflows validate workflows/broken/syn-001.json > /dev/null 2>&1
echo "Exit 65 (DATAERR): $?"

# Exit 66: File not found
n8n workflows validate /nonexistent/file.json > /dev/null 2>&1
echo "Exit 66 (NOINPUT): $?"

# Exit 73: Permission denied
N8N_API_KEY="wrong" n8n workflows list > /dev/null 2>&1
echo "Exit 73 (NOPERM): $?"
```

### 17.2 Script Integration Examples

```bash
#!/bin/bash
# Example: CI/CD workflow validation script

validate_workflow() {
    local file=$1
    
    n8n workflows validate "$file" --json > /tmp/result.json 2>&1
    local exit_code=$?
    
    case $exit_code in
        0)
            echo "✅ $file is valid"
            return 0
            ;;
        65)
            echo "❌ $file has validation errors:"
            jq '.errors[]' /tmp/result.json
            return 1
            ;;
        66)
            echo "❌ File not found: $file"
            return 1
            ;;
        *)
            echo "⚠️ Unexpected error (code $exit_code)"
            return 1
            ;;
    esac
}

# Usage in pipeline
for f in workflows/*.json; do
    validate_workflow "$f" || exit 1
done
```

