# n8n CLI Test Report

**Date:** 2025-11-30T21:43:18.414Z
**Total Tests:** 97
**Passed:** 59 (60.8%)
**Failed:** 38

## Results by Command

### 

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 1276ms | ✗ | [n8n.txt](./n8n.txt) |

### --version

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--version` | 0 | 911ms | ✓ | [n8n_version.txt](./n8n_version.txt) |

### --help

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--help` | 0 | 1262ms | ✓ | [n8n_help.txt](./n8n_help.txt) |

### auth

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 1246ms | ✓ | [n8n-auth.txt](./n8n-auth.txt) |

### auth --help

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--help` | 0 | 937ms | ✓ | [n8n-auth_help.txt](./n8n-auth_help.txt) |

### auth status

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 1497ms | ✓ | [n8n-auth-status.txt](./n8n-auth-status.txt) |
| `--json` | 0 | 1969ms | ✓ | [n8n-auth-status_json.txt](./n8n-auth-status_json.txt) |

### auth whoami

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 2313ms | ✓ | [n8n-auth-whoami.txt](./n8n-auth-whoami.txt) |
| `--json` | 0 | 1810ms | ✓ | [n8n-auth-whoami_json.txt](./n8n-auth-whoami_json.txt) |

### health

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 1880ms | ✓ | [n8n-health.txt](./n8n-health.txt) |

### health --json

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--json` | 0 | 1926ms | ✓ | [n8n-health_json.txt](./n8n-health_json.txt) |

### nodes

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 1270ms | ✗ | [n8n-nodes.txt](./n8n-nodes.txt) |

### nodes --help

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--help` | 0 | 1294ms | ✓ | [n8n-nodes_help.txt](./n8n-nodes_help.txt) |

### nodes search

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 1359ms | ✓ | [n8n-nodes-search.txt](./n8n-nodes-search.txt) |
| `--json` | 0 | 1341ms | ✓ | [n8n-nodes-search_json.txt](./n8n-nodes-search_json.txt) |
| `--mode OR` | 0 | 1282ms | ✓ | [n8n-nodes-search_mode_OR.txt](./n8n-nodes-search_mode_OR.txt) |
| `--mode AND` | 0 | 981ms | ✓ | [n8n-nodes-search_mode_AND.txt](./n8n-nodes-search_mode_AND.txt) |
| `--mode FUZZY` | 0 | 989ms | ✓ | [n8n-nodes-search_mode_FUZZY.txt](./n8n-nodes-search_mode_FUZZY.txt) |
| `--limit 5` | 0 | 1314ms | ✓ | [n8n-nodes-search_limit_5.txt](./n8n-nodes-search_limit_5.txt) |
| `--save cli-test-results/nodes-search-save.json` | 0 | 1707ms | ✓ | [n8n-nodes-search_save_cli-test-results-nodes-search-save.json.txt](./n8n-nodes-search_save_cli-test-results-nodes-search-save.json.txt) |
| `--json --mode OR` | 0 | 1311ms | ✓ | [n8n-nodes-search_json_mode_OR.txt](./n8n-nodes-search_json_mode_OR.txt) |
| `--json --limit 5` | 0 | 1294ms | ✓ | [n8n-nodes-search_json_limit_5.txt](./n8n-nodes-search_json_limit_5.txt) |

### nodes get

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 1280ms | ✓ | [n8n-nodes-get.txt](./n8n-nodes-get.txt) |
| `--json` | 0 | 1284ms | ✓ | [n8n-nodes-get_json.txt](./n8n-nodes-get_json.txt) |
| `--mode info` | 0 | 1306ms | ✓ | [n8n-nodes-get_mode_info.txt](./n8n-nodes-get_mode_info.txt) |
| `--mode docs` | 0 | 1305ms | ✓ | [n8n-nodes-get_mode_docs.txt](./n8n-nodes-get_mode_docs.txt) |
| `--mode versions` | 0 | 1291ms | ✓ | [n8n-nodes-get_mode_versions.txt](./n8n-nodes-get_mode_versions.txt) |
| `--detail minimal` | 0 | 1259ms | ✓ | [n8n-nodes-get_detail_minimal.txt](./n8n-nodes-get_detail_minimal.txt) |
| `--detail standard` | 0 | 1271ms | ✓ | [n8n-nodes-get_detail_standard.txt](./n8n-nodes-get_detail_standard.txt) |
| `--detail full` | 0 | 1282ms | ✓ | [n8n-nodes-get_detail_full.txt](./n8n-nodes-get_detail_full.txt) |
| `--save cli-test-results/nodes-get-save.json` | 0 | 1014ms | ✓ | [n8n-nodes-get_save_cli-test-results-nodes-get-save.json.txt](./n8n-nodes-get_save_cli-test-results-nodes-get-save.json.txt) |
| `--json --mode info` | 0 | 976ms | ✓ | [n8n-nodes-get_json_mode_info.txt](./n8n-nodes-get_json_mode_info.txt) |
| `--json --detail standard` | 0 | 950ms | ✓ | [n8n-nodes-get_json_detail_standard.txt](./n8n-nodes-get_json_detail_standard.txt) |

### nodes validate

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 934ms | ✗ | [n8n-nodes-validate.txt](./n8n-nodes-validate.txt) |
| `--json` | 1 | 1270ms | ✗ | [n8n-nodes-validate_json.txt](./n8n-nodes-validate_json.txt) |
| `--config {}` | 1 | 1286ms | ✗ | [n8n-nodes-validate_config_{}.txt](./n8n-nodes-validate_config_{}.txt) |
| `--profile minimal` | 1 | 940ms | ✗ | [n8n-nodes-validate_profile_minimal.txt](./n8n-nodes-validate_profile_minimal.txt) |
| `--profile runtime` | 1 | 1345ms | ✗ | [n8n-nodes-validate_profile_runtime.txt](./n8n-nodes-validate_profile_runtime.txt) |
| `--profile strict` | 1 | 1269ms | ✗ | [n8n-nodes-validate_profile_strict.txt](./n8n-nodes-validate_profile_strict.txt) |
| `--json --config {}` | 1 | 1270ms | ✗ | [n8n-nodes-validate_json_config_{}.txt](./n8n-nodes-validate_json_config_{}.txt) |
| `--json --profile runtime` | 1 | 1242ms | ✗ | [n8n-nodes-validate_json_profile_runtime.txt](./n8n-nodes-validate_json_profile_runtime.txt) |

### workflows

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 1266ms | ✗ | [n8n-workflows.txt](./n8n-workflows.txt) |

### workflows --help

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--help` | 0 | 1263ms | ✓ | [n8n-workflows_help.txt](./n8n-workflows_help.txt) |

### workflows list

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 2000ms | ✓ | [n8n-workflows-list.txt](./n8n-workflows-list.txt) |
| `--json` | 0 | 2479ms | ✓ | [n8n-workflows-list_json.txt](./n8n-workflows-list_json.txt) |
| `--active` | 0 | 1619ms | ✓ | [n8n-workflows-list_active.txt](./n8n-workflows-list_active.txt) |
| `--limit 5` | 0 | 1993ms | ✓ | [n8n-workflows-list_limit_5.txt](./n8n-workflows-list_limit_5.txt) |
| `--save cli-test-results/workflows-list-save.json` | 0 | 2310ms | ✓ | [n8n-workflows-list_save_cli-test-results-workflows-list-save.json.txt](./n8n-workflows-list_save_cli-test-results-workflows-list-save.json.txt) |
| `--json --active` | 0 | 1929ms | ✓ | [n8n-workflows-list_json_active.txt](./n8n-workflows-list_json_active.txt) |
| `--json --limit 5` | 0 | 2003ms | ✓ | [n8n-workflows-list_json_limit_5.txt](./n8n-workflows-list_json_limit_5.txt) |

### workflows get

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 1808ms | ✗ | [n8n-workflows-get.txt](./n8n-workflows-get.txt) |
| `--json` | 1 | 1824ms | ✗ | [n8n-workflows-get_json.txt](./n8n-workflows-get_json.txt) |
| `--mode full` | 1 | 1462ms | ✗ | [n8n-workflows-get_mode_full.txt](./n8n-workflows-get_mode_full.txt) |
| `--mode details` | 1 | 1854ms | ✗ | [n8n-workflows-get_mode_details.txt](./n8n-workflows-get_mode_details.txt) |
| `--mode structure` | 1 | 1818ms | ✗ | [n8n-workflows-get_mode_structure.txt](./n8n-workflows-get_mode_structure.txt) |
| `--mode minimal` | 1 | 1510ms | ✗ | [n8n-workflows-get_mode_minimal.txt](./n8n-workflows-get_mode_minimal.txt) |
| `--save cli-test-results/workflows-get-save.json` | 1 | 1771ms | ✗ | [n8n-workflows-get_save_cli-test-results-workflows-get-save.json.txt](./n8n-workflows-get_save_cli-test-results-workflows-get-save.json.txt) |
| `--json --mode full` | 1 | 1790ms | ✗ | [n8n-workflows-get_json_mode_full.txt](./n8n-workflows-get_json_mode_full.txt) |

### workflows validate

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 2068ms | ✗ | [n8n-workflows-validate.txt](./n8n-workflows-validate.txt) |
| `--json` | 1 | 1934ms | ✗ | [n8n-workflows-validate_json.txt](./n8n-workflows-validate_json.txt) |
| `--profile minimal` | 1 | 2100ms | ✗ | [n8n-workflows-validate_profile_minimal.txt](./n8n-workflows-validate_profile_minimal.txt) |
| `--profile runtime` | 1 | 1906ms | ✗ | [n8n-workflows-validate_profile_runtime.txt](./n8n-workflows-validate_profile_runtime.txt) |
| `--profile ai-friendly` | 1 | 1888ms | ✗ | [n8n-workflows-validate_profile_ai-friendly.txt](./n8n-workflows-validate_profile_ai-friendly.txt) |
| `--profile strict` | 1 | 2013ms | ✗ | [n8n-workflows-validate_profile_strict.txt](./n8n-workflows-validate_profile_strict.txt) |
| `--json --profile runtime` | 1 | 2195ms | ✗ | [n8n-workflows-validate_json_profile_runtime.txt](./n8n-workflows-validate_json_profile_runtime.txt) |

### executions

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 1265ms | ✗ | [n8n-executions.txt](./n8n-executions.txt) |

### executions --help

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--help` | 0 | 1263ms | ✓ | [n8n-executions_help.txt](./n8n-executions_help.txt) |

### executions list

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 1796ms | ✓ | [n8n-executions-list.txt](./n8n-executions-list.txt) |
| `--json` | 0 | 1486ms | ✓ | [n8n-executions-list_json.txt](./n8n-executions-list_json.txt) |
| `--limit 5` | 0 | 1752ms | ✓ | [n8n-executions-list_limit_5.txt](./n8n-executions-list_limit_5.txt) |
| `--status success` | 0 | 1454ms | ✓ | [n8n-executions-list_status_success.txt](./n8n-executions-list_status_success.txt) |
| `--status error` | 0 | 1863ms | ✓ | [n8n-executions-list_status_error.txt](./n8n-executions-list_status_error.txt) |
| `--status waiting` | 0 | 2077ms | ✓ | [n8n-executions-list_status_waiting.txt](./n8n-executions-list_status_waiting.txt) |
| `--save cli-test-results/executions-list-save.json` | 0 | 1805ms | ✓ | [n8n-executions-list_save_cli-test-results-executions-list-save.json.txt](./n8n-executions-list_save_cli-test-results-executions-list-save.json.txt) |
| `--json --limit 5` | 0 | 1782ms | ✓ | [n8n-executions-list_json_limit_5.txt](./n8n-executions-list_json_limit_5.txt) |
| `--json --status success` | 0 | 1734ms | ✓ | [n8n-executions-list_json_status_success.txt](./n8n-executions-list_json_status_success.txt) |

### executions get

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 1417ms | ✗ | [n8n-executions-get.txt](./n8n-executions-get.txt) |
| `--json` | 1 | 1749ms | ✗ | [n8n-executions-get_json.txt](./n8n-executions-get_json.txt) |
| `--mode preview` | 1 | 1418ms | ✗ | [n8n-executions-get_mode_preview.txt](./n8n-executions-get_mode_preview.txt) |
| `--mode summary` | 1 | 1753ms | ✗ | [n8n-executions-get_mode_summary.txt](./n8n-executions-get_mode_summary.txt) |
| `--mode filtered` | 1 | 1433ms | ✗ | [n8n-executions-get_mode_filtered.txt](./n8n-executions-get_mode_filtered.txt) |
| `--mode full` | 1 | 1742ms | ✗ | [n8n-executions-get_mode_full.txt](./n8n-executions-get_mode_full.txt) |
| `--save cli-test-results/executions-get-save.json` | 1 | 1830ms | ✗ | [n8n-executions-get_save_cli-test-results-executions-get-save.json.txt](./n8n-executions-get_save_cli-test-results-executions-get-save.json.txt) |
| `--json --mode summary` | 1 | 1749ms | ✗ | [n8n-executions-get_json_mode_summary.txt](./n8n-executions-get_json_mode_summary.txt) |

### templates

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 941ms | ✗ | [n8n-templates.txt](./n8n-templates.txt) |

### templates --help

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--help` | 0 | 956ms | ✓ | [n8n-templates_help.txt](./n8n-templates_help.txt) |

### templates search

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 1737ms | ✓ | [n8n-templates-search.txt](./n8n-templates-search.txt) |
| `--json` | 0 | 1361ms | ✓ | [n8n-templates-search_json.txt](./n8n-templates-search_json.txt) |
| `--limit 5` | 0 | 1862ms | ✓ | [n8n-templates-search_limit_5.txt](./n8n-templates-search_limit_5.txt) |
| `--save cli-test-results/templates-search-save.json` | 0 | 1315ms | ✓ | [n8n-templates-search_save_cli-test-results-templates-search-save.json.txt](./n8n-templates-search_save_cli-test-results-templates-search-save.json.txt) |
| `--json --limit 5` | 0 | 1334ms | ✓ | [n8n-templates-search_json_limit_5.txt](./n8n-templates-search_json_limit_5.txt) |

### templates get

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 0 | 1037ms | ✓ | [n8n-templates-get.txt](./n8n-templates-get.txt) |
| `--json` | 0 | 1324ms | ✓ | [n8n-templates-get_json.txt](./n8n-templates-get_json.txt) |
| `--save cli-test-results/templates-get-save.json` | 0 | 1352ms | ✓ | [n8n-templates-get_save_cli-test-results-templates-get-save.json.txt](./n8n-templates-get_save_cli-test-results-templates-get-save.json.txt) |

### validate

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `(none)` | 1 | 1476ms | ✗ | [n8n-validate.txt](./n8n-validate.txt) |

### validate --help

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--help` | 0 | 935ms | ✓ | [n8n-validate_help.txt](./n8n-validate_help.txt) |

### validate --json

| Flags | Exit | Duration | Status | Output |
|-------|------|----------|--------|--------|
| `--json` | 1 | 1335ms | ✗ | [n8n-validate_json.txt](./n8n-validate_json.txt) |
