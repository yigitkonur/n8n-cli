## Phase 16: Edge Cases & Error Handling

**Goal:** Test robustness and graceful degradation.
**Source Truth:** `utils/errors.ts`, `core/api/client.ts`

### 16.1 Input Edge Cases

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| EDG-001 | Empty file | 0 bytes | Graceful error |
| EDG-002 | Null workflow | `null` | Error message |
| EDG-003 | Very large file | 50MB JSON | Handles or rejects |
| EDG-004 | Binary file | PNG image | Graceful error |
| EDG-005 | Unicode names | Workflow name: 你好 | Handled |
| EDG-006 | Special chars | Name with `<>&"` | Escaped properly |
| EDG-007 | Empty nodes | `"nodes": []` | Warning, not error |
| EDG-008 | Circular ref | JSON with cycles | Graceful error |

```bash
# Create edge case files
echo "" > workflows/broken/edg-001.json
echo "null" > workflows/broken/edg-002.json
head -c 100 /dev/urandom > workflows/broken/edg-004.bin

echo "=== EDG-001: Empty File ===" 
n8n workflows validate workflows/broken/edg-001.json --json 2>&1; echo "Exit: $?"

echo "=== EDG-002: Null ===" 
n8n workflows validate workflows/broken/edg-002.json --json 2>&1; echo "Exit: $?"

echo "=== EDG-004: Binary ===" 
n8n workflows validate workflows/broken/edg-004.bin --json 2>&1; echo "Exit: $?"

# EDG-005: Unicode
cat > workflows/broken/edg-005.json << 'EOF'
{
  "name": "你好世界 Workflow",
  "nodes": [],
  "connections": {}
}
EOF
echo "=== EDG-005: Unicode ===" 
n8n workflows validate workflows/broken/edg-005.json --json | jq '.valid'
```

### 16.2 Network Edge Cases

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| NET-001 | No internet | Disconnect network | Offline commands work |
| NET-002 | Timeout | Very slow server | Timeout error |
| NET-003 | SSL error | Self-signed cert | Certificate error |
| NET-004 | Rate limit | Many requests | 71 (TEMPFAIL) |
| NET-005 | Invalid host | `http://invalid.local` | Connection error |

```bash
echo "=== NET-001: Offline Commands ===" 
# These should work without API
n8n nodes search slack --json > /dev/null && echo "✅ Nodes search: OK"
n8n workflows validate workflows/01-profile-linkedin-search-webhook.json --json > /dev/null && echo "✅ Validation: OK"
n8n credentials types --json > /dev/null && echo "✅ Credential types: OK"

echo "=== NET-005: Invalid Host ===" 
N8N_HOST="http://invalid.local:9999" n8n health --json 2>&1; echo "Exit: $?"
```

### 16.3 Permission Edge Cases

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| PRM-001 | Read-only file | `chmod 444 file.json` | Can read |
| PRM-002 | No write dir | Save to `/` | Permission error |
| PRM-003 | Invalid API key | Wrong key | 73 (NOPERM) |
| PRM-004 | Expired key | Old key | Auth error |

```bash
echo "=== PRM-001: Read-Only File ===" 
chmod 444 workflows/01-profile-linkedin-search-webhook.json
n8n workflows validate workflows/01-profile-linkedin-search-webhook.json --json | jq '.valid'
chmod 644 workflows/01-profile-linkedin-search-webhook.json

echo "=== PRM-002: No Write Permission ===" 
n8n workflows export $WF_ID -o /root/test.json 2>&1; echo "Exit: $?"

echo "=== PRM-003: Invalid API Key ===" 
N8N_API_KEY="invalid_key" n8n health --json 2>&1; echo "Exit: $?"
```
