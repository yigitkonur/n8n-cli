---
trigger: model_decision
description: you MUST read this rule WHEN generating tests, creating code summaries, or generating PRDs.
---

# TestSprite MCP

Use for testing, code analysis, and project documentation.

## Frontend Testing Workflow

```
testsprite_bootstrap_tests(type="frontend", testScope="codebase", ...)
↓
testsprite_generate_frontend_test_plan(needLogin=true)
↓
testsprite_generate_code_and_execute(testIds=[], ...)
```

## Backend Testing Workflow

```
testsprite_bootstrap_tests(type="backend", testScope="codebase", ...)
↓
testsprite_generate_backend_test_plan()
↓
testsprite_generate_code_and_execute(testIds=[], ...)
```

## After Code Changes

```
testsprite_rerun_tests()
```

---

## testsprite_bootstrap_tests

**MUST run first** before any other testsprite tool.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `projectPath` | ✅ | Absolute path to project root |
| `type` | ✅ | `frontend` or `backend` |
| `testScope` | ✅ | `codebase` (full) or `diff` (staged changes) |
| `localPort` | ✅ | Local server port (from Dockerfile/package.json, e.g., 3000, 5173) |
| `pathname` | ❌ | Webpage path without domain |

---

## testsprite_generate_frontend_test_plan

| Parameter | Description |
|-----------|-------------|
| `needLogin` | Include login tests (default: true) |
| `projectPath` | Project root path |

---

## testsprite_generate_backend_test_plan

| Parameter | Description |
|-----------|-------------|
| `projectPath` | Project root path |

---

## testsprite_generate_code_and_execute

| Parameter | Description |
|-----------|-------------|
| `projectPath` | Project root |
| `projectName` | Root directory name |
| `testIds` | Specific test IDs (empty = all) |
| `additionalInstruction` | Extra instructions |

---

## testsprite_rerun_tests

Manual re-run when needed.

| Parameter | Description |
|-----------|-------------|
| `projectPath` | Project root |

---

## testsprite_generate_code_summary

Analyzes repository and summarizes codebase structure.

| Parameter | Description |
|-----------|-------------|
| `projectRootPath` | Project root path |

---

## testsprite_generate_standardized_prd

Creates structured Product Requirements Document.

| Parameter | Description |
|-----------|-------------|
| `projectPath` | Project root path |

---

## Use Cases

| Goal | Tools |
|------|-------|
| Add tests | bootstrap → generate_plan → execute |
| Analyze code | generate_code_summary |
| Document project | generate_standardized_prd |
| Regression test | rerun_tests |
| CI/CD | bootstrap → execute with testIds |