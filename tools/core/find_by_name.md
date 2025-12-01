# find_by_name

Search for files and subdirectories using fd. Smart case, ignores gitignored files.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `SearchDirectory` | string | Yes | Directory to search within |
| `Pattern` | string | No | Glob pattern to match |
| `Extensions` | array | No | File extensions to include (without `.`) |
| `Type` | string | No | `file`, `directory`, or `any` |
| `MaxDepth` | integer | No | Maximum search depth |
| `Excludes` | array | No | Glob patterns to exclude |
| `FullPath` | boolean | No | Match pattern against full absolute path |

## Examples

```
Find TypeScript files:
  Extensions: ["ts", "tsx"]

Find all test files:
  Pattern: "*test*"
  Extensions: ["ts"]

Exclude node_modules:
  Excludes: ["node_modules"]
```

## Notes

- Results capped at 50 matches
- Use filters to narrow scope
- Output includes: type, size, modification time, relative path
- If searching extensions, no need for Pattern AND Extensions
- With `FullPath=true`, use `**/*.py` not `*.py`
