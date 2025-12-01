## Phase 18: Performance & Stress Testing

**Goal:** Verify performance under load.
**Source Truth:** `core/db/adapter.ts` (connection pooling), `core/db/nodes.ts` (FTS5)

### 18.1 Performance Benchmarks

| Test ID | Test Case | Target | Measure |
|---------|-----------|--------|---------|
| PRF-001 | Node search speed | `n8n nodes search slack` | < 100ms |
| PRF-002 | Node list (800+) | `n8n nodes list --limit 0` | < 500ms |
| PRF-003 | Validation speed | Single workflow | < 200ms |
| PRF-004 | Schema lookup | `n8n nodes show slack` | < 150ms |
| PRF-005 | Large workflow | 100+ nodes | < 2s |

```bash
echo "=== Performance Benchmarks ===" 

# PRF-001: Node search
START=$(date +%s%N)
n8n nodes search slack --json > /dev/null
END=$(date +%s%N)
echo "Node search: $(( (END-START)/1000000 ))ms"

# PRF-002: Node list
START=$(date +%s%N)
n8n nodes list --limit 0 --json > /dev/null
END=$(date +%s%N)
echo "Node list (all): $(( (END-START)/1000000 ))ms"

# PRF-003: Validation
START=$(date +%s%N)
n8n workflows validate workflows/01-profile-linkedin-search-webhook.json --json > /dev/null
END=$(date +%s%N)
echo "Validation: $(( (END-START)/1000000 ))ms"
```

### 18.2 Stress Tests

| Test ID | Test Case | Setup | Expected |
|---------|-----------|-------|----------|
| STR-001 | Consecutive searches | 100 searches | No degradation |
| STR-002 | Parallel validations | 10 concurrent | All complete |
| STR-003 | Large batch import | 50 workflows | All imported |
| STR-004 | Memory stability | Long running | No leaks |

```bash
echo "=== STR-001: Consecutive Searches ===" 
for i in {1..20}; do
    n8n nodes search "test$i" --json > /dev/null
done
echo "20 searches completed"

echo "=== STR-002: Parallel Validations ===" 
for f in workflows/*.json; do
    n8n workflows validate "$f" --json > /dev/null &
done
wait
echo "Parallel validations completed"
```
