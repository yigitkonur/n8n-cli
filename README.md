full CLI for managing n8n instances. workflows, executions, credentials, tags, variables, templates, audit — all from the terminal. also validates and auto-fixes workflow JSON offline, no running instance needed.

```bash
npm install -g n8n-cli
```

```bash
n8n workflows list
n8n workflows validate workflow.json --fix
n8n workflows diff 123 -o '[{"op":"addNode","node":{"type":"n8n-nodes-base.httpRequest","name":"Fetch"}}]'
```

[![npm](https://img.shields.io/npm/v/n8n-cli.svg?style=flat-square)](https://www.npmjs.com/package/n8n-cli)
[![node](https://img.shields.io/badge/node-18+-93450a.svg?style=flat-square)](https://nodejs.org/)
[![license](https://img.shields.io/badge/license-MIT-grey.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## what it does

**online** (talks to your n8n instance via API):

- **workflows** — list, get, create, update, delete, activate/deactivate, export/import, trigger webhooks
- **surgical diffs** — 17 operation types (addNode, removeNode, updateNode, moveNode, rewireConnection, etc.) applied atomically or best-effort
- **executions** — list, inspect, retry, delete
- **credentials** — list, create, delete, schema inspection, type listing
- **tags** — full CRUD
- **variables** — full CRUD (enterprise/pro license)
- **audit** — security report across credentials, database, nodes, filesystem, instance
- **templates** — search n8n.io templates, deploy directly to your instance with auto-fix

**offline** (no instance needed):

- **validate** — checks workflow JSON against node schemas, expression syntax, version compatibility. profile-based severity filtering (`minimal`, `runtime`, `ai-friendly`, `strict`)
- **autofix** — repairs expression format errors (`{{ }}` → `={{ }}`), missing webhook paths, Switch v3+ conditions, node type typos via string similarity. confidence-filtered
- **node search** — bundled SQLite with all n8n node definitions, FTS5 full-text search, category browsing, property search
- **breaking changes** — detects version upgrade issues from a hardcoded registry, suggests auto-migrations
- **version history** — local SQLite snapshots before every mutation, rollback support

## install

```bash
npm install -g n8n-cli
```

## auth

```bash
n8n auth login -H https://n8n.example.com -k your-api-key

# or interactive
n8n auth login -i

# check connection
n8n auth status
```

config is stored in `.n8nrc.json`. supports named profiles:

```json
{
  "default": "prod",
  "profiles": {
    "prod": { "host": "https://n8n.example.com", "apiKey": "xxx" },
    "dev": { "host": "http://localhost:5678", "apiKey": "yyy" }
  }
}
```

switch profiles with `--profile dev`. env vars (`N8N_HOST`, `N8N_API_KEY`) also work.

## usage

### workflows

```bash
n8n workflows list --active --limit 20
n8n workflows get 123 --mode structure
n8n workflows create -f workflow.json
n8n workflows update 123 -f updated.json
n8n workflows export 123 -o backup.json
n8n workflows import workflow.json --activate
n8n workflows activate --all
n8n workflows delete --ids 1,2,3
```

### validation and autofix

```bash
# validate a local file
n8n workflows validate workflow.json

# validate with expression checking and version analysis
n8n workflows validate workflow.json --validate-expressions --check-versions

# auto-fix with preview
n8n workflows autofix workflow.json --preview

# apply fixes (high confidence only)
n8n workflows autofix workflow.json --apply --confidence high

# validate a remote workflow by ID
n8n workflows validate 123
```

validation profiles control severity:

| profile | use case |
|:---|:---|
| `minimal` | structural checks only |
| `runtime` | default — catches issues that would fail at runtime |
| `ai-friendly` | actionable warnings for AI agents, less noise |
| `strict` | everything, including style and best practices |

### diff operations

apply surgical changes without replacing the whole workflow:

```bash
# add a node
n8n workflows diff 123 -o '[{"op":"addNode","node":{"type":"n8n-nodes-base.httpRequest","name":"Fetch","position":[400,200]}}]'

# remove a node
n8n workflows diff 123 -o '[{"op":"removeNode","name":"OldNode"}]'

# load operations from a file
n8n workflows diff 123 -o @changes.json

# dry run
n8n workflows diff 123 -o @changes.json --dry-run
```

17 operations: `addNode`, `removeNode`, `updateNode`, `moveNode`, `enableNode`, `disableNode`, `addConnection`, `removeConnection`, `rewireConnection`, `updateSettings`, `updateName`, `addTag`, `removeTag`, `activateWorkflow`, `deactivateWorkflow`, `cleanStaleConnections`, `replaceConnections`.

### version history

every mutation auto-snapshots to `~/.n8n-cli/data.db`:

```bash
n8n workflows versions 123
n8n workflows versions 123 --rollback --to-version abc
n8n workflows versions 123 --compare v1,v2
n8n workflows versions 123 --prune --keep 5
n8n workflows versions --stats
```

### executions

```bash
n8n executions list -w 123 --status error
n8n executions get abc --mode summary
n8n executions retry abc
n8n executions delete abc
```

### credentials

```bash
n8n credentials list
n8n credentials types --by-auth
n8n credentials schema slackApi
n8n credentials create -t slackApi -n "my slack" -d '{"accessToken":"xoxb-..."}'
n8n credentials delete 456
```

### nodes (offline)

```bash
n8n nodes list --by-category
n8n nodes search "http request"
n8n nodes show n8n-nodes-base.httpRequest --detail full
n8n nodes breaking-changes n8n-nodes-base.httpRequest --from 3 --to 4
n8n nodes categories --detailed
```

### templates

```bash
n8n templates search "slack notification"
n8n templates search --by-nodes webhook,slack
n8n templates search --by-task "send notifications" --complexity simple
n8n templates get 1234
n8n workflows deploy-template 1234 --name "my workflow"
```

### other

```bash
n8n tags list
n8n tags create -n "production"
n8n variables list
n8n variables create -k API_URL -v "https://api.example.com"
n8n audit -c credentials,nodes
n8n health
n8n config show
n8n completion zsh >> ~/.zshrc
```

## configuration

| variable | env | default |
|:---|:---|:---|
| `host` | `N8N_HOST` | `http://localhost:5678` |
| `apiKey` | `N8N_API_KEY` | — |
| `timeout` | `N8N_TIMEOUT` | `30000` ms |
| `debug` | `N8N_DEBUG` | `false` |

config file search order: `.n8nrc` → `.n8nrc.json` → `~/.n8nrc` → `~/.n8nrc.json` → `~/.config/n8n/config.json`.

set `N8N_STRICT_PERMISSIONS=true` to reject config files that aren't `chmod 600`.

## global flags

every command supports:

```
-v, --verbose       debug output
-q, --quiet         suppress non-essential output
--no-color          disable colors
--profile <name>    use a named config profile
--json              machine-readable JSON output
-s, --save <path>   save output to file
```

## exit codes

follows POSIX `sysexits.h`:

| code | meaning |
|:---|:---|
| `0` | success |
| `64` | usage error |
| `65` | data error |
| `69` | service unavailable |
| `74` | I/O error |
| `75` | rate limited (retry) |
| `77` | auth failure |
| `78` | config error |

## internals

TypeScript, compiled to ESM via tsup. Commander.js for CLI parsing. Axios with retry interceptors for API calls. two SQLite databases:

- `nodes.db` — bundled, read-only. all n8n node schemas + FTS5 index + workflow templates
- `~/.n8n-cli/data.db` — user-writable. workflow version snapshots before mutations

all command handlers are lazy-loaded via dynamic `import()` — only the invoked command gets loaded.

backups saved to `~/.n8n-cli/backups/` with `chmod 700`.

## development

```bash
git clone https://github.com/yigitkonur/n8n-cli.git
cd n8n-cli
pnpm install
pnpm build
pnpm dev    # watch mode
pnpm test
```

## license

MIT
