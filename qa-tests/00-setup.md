# 🧪 n8n-cli Comprehensive QA Testing Plan v2.0

**Philosophy:** This testing plan follows the **Agent-First** paradigm: **Write Local → Validate → Fix → Deploy**. It is designed to be exhaustive, covering every command group, flag combination, edge case, and failure mode.

---

## 📋 Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Phase 1: Installation & Global Infrastructure](#phase-1-installation--global-infrastructure)
3. [Phase 2: Authentication & Configuration](#phase-2-authentication--configuration)
4. [Phase 3: Offline Node Database (nodes)](#phase-3-offline-node-database-nodes)
5. [Phase 4: Structural & Syntax Validation](#phase-4-structural--syntax-validation)
6. [Phase 5: Schema-Aware Validation Engine](#phase-5-schema-aware-validation-engine)
7. [Phase 6: AI Node Validation](#phase-6-ai-node-validation)
8. [Phase 7: Auto-Fix Engine](#phase-7-auto-fix-engine)
9. [Phase 8: Version Management & Breaking Changes](#phase-8-version-management--breaking-changes)
10. [Phase 9: Workflow Lifecycle (CRUD)](#phase-9-workflow-lifecycle-crud)
11. [Phase 10: Diff Engine & Surgical Updates](#phase-10-diff-engine--surgical-updates)
12. [Phase 11: Templates & Deploy-Template](#phase-11-templates--deploy-template)
13. [Phase 12: Executions Management](#phase-12-executions-management)
14. [Phase 13: Credentials Management](#phase-13-credentials-management)
15. [Phase 14: Variables & Tags](#phase-14-variables--tags)
16. [Phase 15: Security Audit](#phase-15-security-audit)
17. [Phase 16: Edge Cases & Error Handling](#phase-16-edge-cases--error-handling)
18. [Phase 17: Exit Codes & Scripting](#phase-17-exit-codes--scripting)
19. [Phase 18: Performance & Stress Testing](#phase-18-performance--stress-testing)
20. [Phase 19: End-to-End Agent Simulation](#phase-19-end-to-end-agent-simulation)
21. [Master QA Checklist](#master-qa-checklist)
22. [Phase 20: Resilience & Network](#phase-20-resilience--network)
23. [Phase 21: Security Compliance](#phase-21-security-compliance)
24. [Phase 22: Advanced Validation](#phase-22-advanced-validation)
25. [Phase 23: Database & Search](#phase-23-database--search)
26. [Phase 24: Diff Patching](#phase-24-diff-patching)
27. [Phase 25: Template Credentials](#phase-25-template-credentials)
28. [Phase 26: Input Limits & Parser](#phase-26-input-limits--parser)
29. [Phase 27: Lifecycle & Cleanup](#phase-27-lifecycle--cleanup)
30. [Phase 28: CI/CD Environment](#phase-28-cicd-environment)
31. [Phase 29: Terminal Formatting](#phase-29-terminal-formatting)
32. [Phase 30: Similarity Scoring](#phase-30-similarity-scoring)
33. [Phase 31: Recursion Safeguards](#phase-31-recursion-safeguards)
34. [Phase 32: JQ Recipes](#phase-32-jq-recipes)
35. [Phase 33: Template Metadata](#phase-33-template-metadata)
36. [Phase 34: Backup Integrity](#phase-34-backup-integrity)

---

## White-Box Testing Philosophy

This plan includes **source-code informed tests** that target:
- Internal logic paths in TypeScript source
- Error handling mechanisms
- Database internals (FTS5, SQLite)
- Security sanitization functions
- Network retry/timeout logic

---

## Test Environment Setup (SKIP THAT - WE ALREADY HAD THAT ONE CONFIGURED AND READY FOR TESTING)

### Prerequisites Checklist

```bash
# 1. System Requirements
node --version  # Must be ≥18

# 2. Installation Options
npm install -g n8n-cli          # Global install
# OR
npx n8n-cli --help              # No install (ephemeral)
# OR (for development)
git clone <repo> && npm link    # Local development

# 3. n8n Instance (for API tests)
# Option A: Docker
docker run -d --name n8n -p 5678:5678 n8nio/n8n

# Option B: Existing instance
# Ensure API is enabled in Settings → API

# 4. Create Test Directory Structure
mkdir -p qa-tests/{workflows,credentials,results,backups}
cd qa-tests
```

### Configuration Profiles for Testing

Create `.n8nrc.json` with multiple profiles:

```json
{
  "default": "local",
  "profiles": {
    "local": {
      "host": "http://localhost:5678",
      "apiKey": "LOCAL_API_KEY"
    },
    "staging": {
      "host": "https://staging-n8n.example.com",
      "apiKey": "STAGING_API_KEY"
    },
    "production": {
      "host": "https://n8n.example.com",
      "apiKey": "PROD_API_KEY"
    },
    "invalid": {
      "host": "http://localhost:9999",
      "apiKey": "WRONG_KEY"
    }
  }
}
```

### Test Workflow Files Setup

```bash
# Copy sample workflows
cp ../n8n-workflows/*.json workflows/

# Create intentionally broken files for testing
mkdir -p workflows/broken

# 5. Environment Variables for Testing
export N8N_API_KEY="your-test-api-key"
export N8N_HOST="http://localhost:5678"

# 6. Optional: Strict permissions testing
export N8N_STRICT_PERMISSIONS=false  # Set to true for strict mode tests
```

### Debug & Verbose Testing

```bash
# Enable verbose mode for debugging
export N8N_DEBUG=true

# Test with different log levels
n8n nodes search slack -v          # Verbose
n8n nodes search slack -vv         # Very verbose
n8n nodes search slack -q          # Quiet
```

---
