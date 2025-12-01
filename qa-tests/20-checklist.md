## Master QA Checklist

### Installation & Setup
- [ ] `n8n --version` returns valid version
- [ ] `n8n --help` shows all 15 command groups
- [ ] All subcommand help works (`n8n <cmd> --help`)
- [ ] Shell completions work (bash/zsh/fish)

### Authentication & Configuration
- [ ] `n8n auth login` works (flags and interactive)
- [ ] `n8n auth status` shows connection status
- [ ] `n8n auth logout` clears credentials
- [ ] `n8n health` checks connectivity
- [ ] Configuration file precedence works
- [ ] Profile switching works (`--profile`)
- [ ] Environment variables override config

### Offline Node Database
- [ ] `n8n nodes list` shows 800+ nodes
- [ ] `n8n nodes search` (OR/AND/FUZZY modes)
- [ ] `n8n nodes show` (all detail levels)
- [ ] `n8n nodes categories` lists all categories
- [ ] `n8n nodes validate` validates configs
- [ ] `n8n nodes breaking-changes` analyzes versions

### Validation Engine
- [ ] JSON syntax errors detected
- [ ] JSON repair mode (`--repair`) works
- [ ] Missing required properties caught
- [ ] All validation profiles work
- [ ] All validation modes work
- [ ] Expression format validation works
- [ ] Node type suggestions work
- [ ] Version checking works (`--check-versions`)
- [ ] Upgrade checking works (`--check-upgrades`)

### AI Node Validation
- [ ] MISSING_LANGUAGE_MODEL detected
- [ ] TOO_MANY_LANGUAGE_MODELS detected
- [ ] FALLBACK_MISSING_SECOND_MODEL detected
- [ ] All AI error codes work

### Auto-Fix Engine
- [ ] Preview mode works
- [ ] Apply mode works
- [ ] Confidence filtering works
- [ ] Fix type filtering works
- [ ] Post-update guidance displays
- [ ] Backup created before fixes

### Version Management
- [ ] Version history listing works
- [ ] Rollback works
- [ ] Version comparison works
- [ ] Pruning works
- [ ] Storage stats work

### Workflow Lifecycle
- [ ] Create/Import works
- [ ] List/Get works
- [ ] Export works
- [ ] Update works
- [ ] Activate/Deactivate works
- [ ] Delete works (with safety checks)
- [ ] Trigger webhook works
- [ ] Tag management works

### Diff Engine
- [ ] All 17 operation types work
- [ ] Dry-run mode works
- [ ] Continue-on-error mode works
- [ ] Smart branch parameters work

### Templates
- [ ] Keyword search works (API)
- [ ] By-nodes search works (local)
- [ ] By-task search works (local)
- [ ] Template deployment works
- [ ] Auto-fix during deploy works

### Executions
- [ ] List executions works
- [ ] Filter by status works
- [ ] Get execution details works
- [ ] Retry execution works
- [ ] Delete execution works

### Credentials
- [ ] List credentials works
- [ ] Get schema works
- [ ] Create credential works
- [ ] Delete credential works
- [ ] Credential types (offline) works

### Variables & Tags
- [ ] Variables CRUD works (Enterprise)
- [ ] Tags CRUD works

### Security Audit
- [ ] Full audit works
- [ ] Category filtering works
- [ ] Abandoned workflow detection works

### Exit Codes
- [ ] Exit 0 on success
- [ ] Exit 64 on usage error
- [ ] Exit 65 on data error
- [ ] Exit 66 on file not found
- [ ] Exit 70 on I/O error
- [ ] Exit 73 on permission denied

### Edge Cases
- [ ] Empty file handled
- [ ] Invalid JSON handled
- [ ] Binary file rejected
- [ ] Unicode supported
- [ ] Very large files handled
- [ ] Network failures handled

### Performance
- [ ] Node search < 100ms
- [ ] Validation < 200ms
- [ ] No memory leaks on repeated operations

### Resilience & Network (Phase 20)
- [ ] 429 Rate limit handling with Retry-After
- [ ] 5xx server error retries
- [ ] No retry on 4xx client errors
- [ ] Request timeout handling
- [ ] Graceful shutdown on SIGINT/SIGTERM

### Security Compliance (Phase 21)
- [ ] API key redaction in verbose output
- [ ] Sensitive field masking in errors
- [ ] Config permission warnings (777, 644)
- [ ] Strict permission mode refusal
- [ ] Output sanitization for exports

### Advanced Validation (Phase 22)
- [ ] Python prohibited imports detection
- [ ] JS eval/exec security warnings
- [ ] FixedCollection nested values bug
- [ ] SQL injection pattern detection
- [ ] Mixed indentation errors

### Database & Search (Phase 23)
- [ ] FTS5 BM25 ranking
- [ ] Special character sanitization
- [ ] LIKE fallback on FTS5 error
- [ ] Node type normalization (short → full)
- [ ] LangChain prefix resolution

### Diff Patching (Phase 24)
- [ ] Smart branch parameter resolution
- [ ] Switch case mapping
- [ ] Node rename connection propagation
- [ ] Atomic multi-operation handling

### Template Credentials (Phase 25)
- [ ] Credential stripping by default
- [ ] Keep credentials flag
- [ ] Credential type extraction
- [ ] Template autofix pipeline
- [ ] Node type expansion for search

### Input Limits & Parser (Phase 26)
- [ ] MAX_JSON_SIZE (10MB) enforcement
- [ ] MAX_NESTING_DEPTH (100) enforcement
- [ ] JS Object syntax acceptance
- [ ] JSON repair fallback
- [ ] Trailing comma handling

### Lifecycle & Cleanup (Phase 27)
- [ ] CLEANUP_TIMEOUT_MS configurable
- [ ] Force exit on timeout
- [ ] SIGPIPE resilience
- [ ] SIGINT/SIGTERM handling
- [ ] Graceful cleanup runs

### CI/CD Environment (Phase 28)
- [ ] CI=true detection
- [ ] GITHUB_ACTIONS detection
- [ ] TERM=dumb detection
- [ ] Typed confirmation protection
- [ ] --force bypass in CI

### Terminal Formatting (Phase 29)
- [ ] Narrow terminal adaptation
- [ ] Wide terminal expansion
- [ ] No-TTY fallback (80 cols)
- [ ] Unicode width calculation
- [ ] Compact mode output

### Similarity Scoring (Phase 30)
- [ ] SCORING_THRESHOLD (50) works
- [ ] AUTO_FIX_CONFIDENCE (0.9) works
- [ ] Short query boost applied
- [ ] Levenshtein distance correct
- [ ] High confidence auto-fix

### Recursion Safeguards (Phase 31)
- [ ] MAX_RECURSION_DEPTH (100) enforced
- [ ] Warning on depth exceeded
- [ ] No stack overflow
- [ ] WeakSet circular detection
- [ ] Graceful deep param handling

### JQ Recipes (Phase 32)
- [ ] workflows list recipe valid
- [ ] nodes search recipe valid
- [ ] executions list recipe valid
- [ ] Error response schema correct
- [ ] All fields extractable

### Template Metadata (Phase 33)
- [ ] Complexity filter works
- [ ] Setup time filter works
- [ ] Service filter works
- [ ] Combined filters work
- [ ] Missing metadata excluded

### Backup Integrity (Phase 34)
- [ ] Backup naming format correct
- [ ] Content matches pre-fix state
- [ ] All backups valid JSON
- [ ] Backup directory auto-created
- [ ] --no-backup flag works

---

## Test Execution Summary Template

```markdown
# QA Test Run Report

**Date:** YYYY-MM-DD
**Version:** n8n-cli vX.X.X
**Tester:** Name
**Environment:** OS / Node version

## Results Summary

| Phase | Tests | Pass | Fail | Skip |
|-------|-------|------|------|------|
| 1. Installation | X | X | X | X |
| 2. Auth & Config | X | X | X | X |
| ... | ... | ... | ... | ... |
| **TOTAL** | **X** | **X** | **X** | **X** |

## Failed Tests

| Test ID | Description | Expected | Actual | Notes |
|---------|-------------|----------|--------|-------|
| XXX-001 | ... | ... | ... | ... |

## Blockers

- [ ] Issue 1
- [ ] Issue 2

## Sign-off

- [ ] All critical tests pass
- [ ] No P1 blockers
- [ ] Ready for release: YES / NO
```

---

This comprehensive QA plan covers **500+ test cases** across **34 phases**, ensuring complete coverage of the n8n-cli's **70+ commands** and **300+ flags**. 

**Phases 1-19:** Black-box functional testing
**Phases 20-25:** White-box source-code informed testing (API, validation, database)
**Phases 26-34:** Deep-dive internal logic testing (limits, signals, algorithms)

Execute phases sequentially or in parallel based on your CI/CD capabilities.

