# grep_search

Powerful search built on ripgrep. **Never invoke `grep` or `rg` as bash command** - use this instead.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Query` | string | Yes | Search term or pattern |
| `SearchPath` | string | Yes | Directory or file to search |
| `IsRegex` | boolean | No | Treat Query as regex (default: false) |
| `CaseSensitive` | boolean | No | Case-sensitive search (default: false) |
| `Includes` | array | No | Glob patterns to filter files (e.g., `["*.ts"]`) |
| `MatchPerLine` | boolean | No | Show surrounding context with matches |

## Regex Examples

```
IsRegex=true:
- "log.*Error"     → matches "logError", "logFatalError"
- "function\\s+\\w+" → matches function declarations
```

## Usage Notes

- `MatchPerLine` for targeted searches only (not broad initial searches)
- `Includes` for filtering within `SearchPath` directory
- Truncated results = narrow search with more specific query or filters
- Smart case by default, ignores gitignored files
