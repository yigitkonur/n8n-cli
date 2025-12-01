
## Phase 14: Variables & Tags

### 14.1 Variables (Enterprise)

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| VAR-001 | List variables | `n8n variables list` | All variables |
| VAR-002 | Create variable | `n8n variables create -k API_KEY -v "xxx"` | Created |
| VAR-003 | Update variable | `n8n variables update <id> -k API_KEY -v "yyy"` | Updated |
| VAR-004 | Delete variable | `n8n variables delete <id> --force` | Deleted |
| VAR-005 | Invalid key | `-k "invalid-key"` | Error |

```bash
echo "=== VAR-001: List Variables ===" 
n8n variables list --json | jq '.data'

# Note: May fail on community edition
echo "=== VAR-002: Create Variable ===" 
VAR_RESULT=$(n8n variables create -k QA_TEST_VAR -v "test_value" --json 2>&1) || true
echo "$VAR_RESULT"
```

### 14.2 Tags

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| TAG-001 | List tags | `n8n tags list` | All tags |
| TAG-002 | Get tag | `n8n tags get <id>` | Tag details |
| TAG-003 | Create tag | `n8n tags create -n "production"` | Created |
| TAG-004 | Update tag | `n8n tags update <id> -n "prod"` | Renamed |
| TAG-005 | Delete tag | `n8n tags delete <id> --force` | Deleted |

```bash
echo "=== TAG-001: List Tags ===" 
n8n tags list --json | jq '.data'

echo "=== TAG-003: Create Tag ===" 
TAG_RESULT=$(n8n tags create -n "qa-test-tag-$(date +%s)" --json)
TAG_ID=$(echo "$TAG_RESULT" | jq -r '.data.id')
echo "Created: $TAG_ID"

echo "=== TAG-004: Update Tag ===" 
n8n tags update $TAG_ID -n "qa-updated-tag" --json | jq '.data.name'

echo "=== TAG-005: Delete Tag ===" 
n8n tags delete $TAG_ID --force --json
```

