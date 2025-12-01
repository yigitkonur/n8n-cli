## Phase 15: Security Audit

**Goal:** Test security audit capabilities.
**Source Truth:** `commands/audit/*.ts`, `core/audit/*.ts`

### 15.1 Audit Commands

| Test ID | Test Case | Command | Expected |
|---------|-----------|---------|----------|
| AUD-001 | Full audit | `n8n audit` | Complete report |
| AUD-002 | Credentials | `-c credentials` | Credential audit |
| AUD-003 | Nodes | `-c nodes` | Risky nodes |
| AUD-004 | Database | `-c database` | DB security |
| AUD-005 | Filesystem | `-c filesystem` | File access |
| AUD-006 | Instance | `-c instance` | Config audit |
| AUD-007 | Combined | `-c credentials,nodes` | Multiple |
| AUD-008 | Abandoned | `--days-abandoned 90` | Old workflows |
| AUD-009 | Save report | `-s audit.json` | File created |

```bash
echo "=== AUD-001: Full Audit ===" 
n8n audit --json | jq '.data.sections | length'

echo "=== AUD-002: Credentials Audit ===" 
n8n audit -c credentials --json | jq '.data.sections[].issues | length'

echo "=== AUD-007: Combined Audit ===" 
n8n audit -c credentials,nodes --json | jq '.data.summary'

echo "=== AUD-008: Abandoned Workflows ===" 
n8n audit --days-abandoned 90 --json | jq '.data.sections[] | select(.name | contains("abandoned"))'
```

### 15.2 Risky Node Detection

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| RSK-001 | Code node | Workflow with code | Listed as risky |
| RSK-002 | Execute command | Shell exec node | High risk warning |
| RSK-003 | HTTP Request | External API calls | Medium risk |
| RSK-004 | SQL injection | Template in query | Security warning |

```bash
echo "=== RSK-001: Risky Nodes Detection ==="
n8n audit -c nodes --json | jq '.data.sections[] | select(.name | contains("node")) | .issues'
```

### 15.3 Credential Security

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| CRS-001 | Unused credentials | Credential not in workflow | Listed |
| CRS-002 | Shared credentials | Same cred multiple workflows | Noted |
| CRS-003 | Old credentials | Not updated in 90 days | Warning |

```bash
echo "=== CRS-001: Credential Audit ==="
n8n audit -c credentials --json | jq '.data.sections[] | .issues | length'
```
