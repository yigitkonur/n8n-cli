# Changelog

All notable changes to the n8n CLI will be documented in this file.

## [1.9.0] - 2024-12-01

### Added

#### POSIX Exit Codes
- Implemented POSIX-compliant exit codes for better CI/CD integration
  - `0` (SUCCESS): Command completed successfully
  - `64` (USAGE): Command line usage error (unknown command, bad args)
  - `65` (DATAERR): Data format error (invalid workflow, validation failure)
  - `66` (NOINPUT): Cannot open input file (file not found)
  - `69` (UNAVAILABLE): Service unavailable (network error)
  - `70` (SOFTWARE): Internal software error
- New utility: `src/utils/exit-codes.ts` with `ExitCode` enum and helpers

#### JSON Schema Documentation
- New `docs/json-schemas/` directory with comprehensive documentation
- Documented output schemas for: workflows, nodes, executions, audit, templates
- Added TypeScript interfaces for all JSON outputs
- Included `jq` recipes for common data extraction patterns

#### SQL Injection Detection Enhancements
- Added 6 new detection patterns:
  - `UNION SELECT` injection attacks
  - SQL comment injection (`--` and `/* */`)
  - Boolean injection (`OR 1=1`, `AND 1=0`)
  - MySQL `CONCAT()` with variables
  - Python f-string SQL interpolation
  - Python `.format()` and `%` formatting with SQL

#### Short-Form Node Type Resolution
- `n8n nodes show httpRequest` now works (resolves to `nodes-base.httpRequest`)
- Supports common prefixes: `nodes-base.`, `nodes-langchain.`
- Graceful fallback with search suggestions on failure

### Improvements
- Exit code handling in CLI core with proper signal handlers (SIGINT, SIGTERM)
- Commander.js configured for proper unknown command handling
- Better error categorization with `ErrorCategory` enum

## [1.8.4] - 2024-12-01

### Bug Fixes
- **autofix --save**: Fixed `--save` flag not creating output file when used with `--json`
- **validation**: Unknown node types now return `valid: false` instead of `valid: true`
- **audit --json**: Fixed leading "Generating security audit..." text breaking JSON parsing
- **SQL injection detection**: Fixed operation name check (now includes `executeQuery`)

### Security
- **SQL injection detection**: Added detection for Postgres, MySQL, and Code nodes
  - Template literal interpolation (`${variable}`) in SQL queries
  - String concatenation in SQL queries
  - n8n expression syntax (`{{ $json.value }}`) in database queries
  - DROP/DELETE without WHERE warnings

### Improvements
- Node-specific validators now trigger for all SQL-related operations
- Enhanced validation warnings include property field for better deduplication

## [1.8.0] - 2024-12-01

### Added

#### Global CLI Options
- `--verbose` / `-v`: Enable verbose/debug output across all commands
- `--quiet` / `-q`: Suppress non-essential output (banners, tips)
- `--no-color`: Disable colored output (also respects `NO_COLOR` env)
- `--profile <name>`: Use specific configuration profile

#### Configuration Profiles
- Support for multiple named config profiles in `.n8nrc`
- Profile-based configuration for different environments (prod, dev, staging)
- Backward compatible with flat config format
- `n8n config show` command to display current configuration
- Environment variable `N8N_PROFILE` to set default profile

#### Shell Completion
- `n8n completion bash` - Generate bash completion script
- `n8n completion zsh` - Generate zsh completion script  
- `n8n completion fish` - Generate fish completion script

#### Workflow Import/Export
- `n8n workflows export <id>` - Export workflow to JSON file
  - `--output` / `-o`: Specify output file path
  - `--full`: Include all fields (don't strip server-generated)
- `n8n workflows import <file>` - Import workflow from JSON file
  - `--name`: Override workflow name
  - `--dry-run`: Preview without creating
  - `--activate`: Activate after import

#### Bulk Operations
- `n8n workflows activate` - Activate multiple workflows
- `n8n workflows deactivate` - Deactivate multiple workflows
- `n8n workflows delete` - Delete multiple workflows
- All support `--ids <id1,id2>` and `--all` flags

#### Exit Codes
- Semantic POSIX-style exit codes for scripting
  - 0: Success
  - 64: Usage error (bad args)
  - 65: Data error (not found, validation)
  - 70: I/O error (network)
  - 71: Temporary failure (rate limit)
  - 72: Protocol error (API/server)
  - 73: Permission denied (auth)

#### Progress Indicators
- Spinner support for long-running operations
- Respects `--quiet` mode and non-TTY environments
- Delay threshold to avoid flicker on fast operations

#### Table Width Detection
- Tables now auto-adjust to terminal width
- Proportional column sizing based on weights
- Compact mode support

### Changed
- `printError()` now automatically sets appropriate exit codes
- All commands now properly inherit global options

### Technical
- Implemented built-in API retry logic with exponential backoff (network failures, 5xx errors)
- Added output context utilities for verbose/quiet handling

---

## [1.7.0] - Previous Release

See git history for previous changes.
