# Optimization Suggestions for n8n CLI

## Performance Optimizations

### 1. Node Database Caching
**Current**: `data/nodes.db` is SQLite - already good!
**Suggestion**: Add LRU cache layer for frequently accessed nodes.

```typescript
// src/core/db/cache.ts
const nodeCache = new LRU<string, NodeSchema>({ max: 100 });
```

### 2. Parallel API Requests
**Issue**: Sequential API calls for related data
**Fix**: Use `Promise.all` for independent fetches

```typescript
// When getting workflow with tags
const [workflow, tags] = await Promise.all([
  api.getWorkflow(id),
  api.getWorkflowTags(id)
]);
```

### 3. Streaming for Large Outputs
**Issue**: Full JSON in memory for large workflows
**Fix**: Stream JSON for `--save` operations

```typescript
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
```

---

## UX Improvements

### 1. Shell Completion Scripts
Add `n8n completion` command:

```bash
n8n completion bash > /etc/bash_completion.d/n8n
n8n completion zsh > ~/.zsh/completions/_n8n
n8n completion fish > ~/.config/fish/completions/n8n.fish
```

### 2. Interactive Selection Mode
```bash
n8n workflows list --interactive
# Opens fzf/inquirer for selection
```

### 3. Progress Indicators
```typescript
import ora from 'ora';
const spinner = ora('Fetching workflows...').start();
```

### 4. Global --no-color Flag
```typescript
program.option('--no-color', 'Disable colored output');
if (opts.noColor) chalk.level = 0;
```

### 5. Table Width Detection
```typescript
const termWidth = process.stdout.columns || 80;
const table = new Table({ colWidths: calculateWidths(termWidth) });
```

---

## Missing Features to Add

### 1. Workflow Export/Import
```bash
n8n workflows export <id> -o workflow.json
n8n workflows import workflow.json [--name "New Name"]
```

### 2. Bulk Operations
```bash
n8n workflows activate --ids id1,id2,id3
n8n workflows deactivate --all
n8n workflows delete --ids id1,id2 --force
```

### 3. Diff Mode
```bash
n8n workflows diff <id> local.json
# Shows what changed between server and local
```

### 4. Watch Mode
```bash
n8n executions watch --workflow-id <id>
# Real-time execution monitoring
```

### 5. Environment Profiles
```bash
# ~/.n8nrc.json
{
  "profiles": {
    "prod": { "host": "https://prod.n8n.com", "apiKey": "..." },
    "dev": { "host": "http://localhost:5678", "apiKey": "..." }
  }
}

n8n --profile prod workflows list
```

### 6. Workflow Linting
```bash
n8n workflows lint <id>
# Checks for best practices, not just validity
# - Unused nodes
# - Missing error handling
# - Hardcoded credentials
```

---

## Code Quality Improvements

### 1. Consistent Exit Codes
```typescript
export enum ExitCode {
  Success = 0,
  UserError = 1,
  APIError = 2,
  NetworkError = 3,
  ValidationError = 4,
}
```

### 2. Verbose/Debug Mode
```bash
n8n --verbose workflows list
# Shows: API URL, headers, response time, etc.
```

### 3. Quiet Mode
```bash
n8n --quiet workflows list --json
# No banners, only data output
```

### 4. Config Validation
```typescript
// On startup, validate ~/.n8nrc.json schema
import Ajv from 'ajv';
const validate = ajv.compile(configSchema);
```

### 5. Retry Logic for API Calls
```typescript
import pRetry from 'p-retry';

const result = await pRetry(() => api.call(), {
  retries: 3,
  onFailedAttempt: error => {
    console.log(`Attempt ${error.attemptNumber} failed. Retrying...`);
  }
});
```

---

## API Coverage Gaps

### Missing n8n API Endpoints
1. **Workflow History/Versions** - Not exposed via API
2. **User Management** - No CLI commands
3. **Projects/Folders** - No CLI support yet
4. **Settings** - Instance settings not accessible

### Credential Operations
- `credentials list` returns 405 - investigate API
- `credentials update` not implemented
- `credentials test` would be useful

---

## Documentation Improvements

### 1. Man Pages
```bash
n8n help workflows list
# Detailed help with examples
```

### 2. Config File Documentation
Add `n8n config show` to display current config with docs.

### 3. Example Commands in --help
```
Examples:
  $ n8n workflows list --active --limit 5
  $ n8n nodes search "google" --mode FUZZY
  $ n8n audit --categories credentials,nodes
```

---

## Priority Ranking

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Fix JQ quoting bug | High | Low | P0 |
| Add --no-color | Medium | Low | P1 |
| Shell completions | High | Medium | P1 |
| Workflow export/import | High | Medium | P1 |
| Environment profiles | High | Medium | P2 |
| Interactive mode | Medium | Medium | P2 |
| Progress indicators | Low | Low | P3 |
| Watch mode | Medium | High | P3 |

---

## Quick Wins (< 1 hour each)

1. ✅ Fix JQ recipe quoting (30 min)
2. ✅ Add --no-color flag (15 min)
3. ✅ Validate empty search query (15 min)
4. ✅ Improve credentials list error message (15 min)
5. ✅ Add --verbose for debugging (30 min)
