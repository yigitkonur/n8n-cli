
## Phase 13: Credentials Management

**Goal:** Test credential CRUD operations.

### 13.1 Credential Types (Offline)

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CRT-001 | List types | `n8n credentials types` | 200+ types |
| CRT-002 | By auth method | `--by-auth` | Grouped |
| CRT-003 | Search types | `-s "github"` | Filtered |
| CRT-004 | JSON output | `--json` | Valid JSON |

```bash
echo "=== CRT-001: List Types ===" 
COUNT=$(n8n credentials types --json | jq '.data | length')
echo "Total types: $COUNT"
[ "$COUNT" -ge 200 ] && echo "✅ Pass"

echo "=== CRT-002: By Auth ===" 
n8n credentials types --by-auth --json | jq 'keys'

echo "=== CRT-003: Search ===" 
n8n credentials types -s "github" --json | jq '.data[].name'
```

### 13.2 Credential Schema

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CRS-001 | Get schema | `n8n credentials schema githubApi` | Schema JSON |
| CRS-002 | Show-type alias | `n8n credentials show-type githubApi` | Same result |
| CRS-003 | Unknown type | `n8n credentials schema unknownType` | Error |

```bash
echo "=== CRS-001: Get Schema ===" 
n8n credentials schema githubApi --json | jq '.data.properties | keys'
```

### 13.3 Credential CRUD

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| CRC-001 | List credentials | `n8n credentials list` | All credentials |
| CRC-002 | Create credential | See below | Credential created |
| CRC-003 | Create from file | `-d @creds.json` | Credential created |
| CRC-004 | Delete credential | `n8n credentials delete <id> --force` | Deleted |

```bash
echo "=== CRC-001: List Credentials ===" 
n8n credentials list --json | jq '.data | length'

# Create test credential (use fake data)
echo '{"accessToken":"test_token_12345"}' > /tmp/github-creds.json
chmod 600 /tmp/github-creds.json

echo "=== CRC-002: Create Credential ===" 
CRED_RESULT=$(n8n credentials create \
  --type githubApi \
  --name "QA Test GitHub" \
  --data @/tmp/github-creds.json \
  --json)
CRED_ID=$(echo "$CRED_RESULT" | jq -r '.data.id')
echo "Created: $CRED_ID"

echo "=== CRC-004: Delete Credential ===" 
n8n credentials delete $CRED_ID --force --json

rm /tmp/github-creds.json
```
