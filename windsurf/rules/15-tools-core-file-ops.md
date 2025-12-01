---
trigger: model_decision
description: you MUST read this rule WHEN reading or searching files without modification: exploring structure, finding files, searching content. NOT when: editing files (→10).
---

# Core File Operations

> ⚠️ This file covers READING, LISTING, SEARCHING files only.
> For EDITING files, see 10-tools-morph-mcp.md (`edit_file`).

## read_file

**Read file contents**

- Must use absolute paths
- For large files (>1000 lines), use `offset` and `limit`
- Lines truncated at 2000 characters
- Works with images (jpg, png, gif, etc.)
- Read multiple files in parallel when independent

---

## list_dir

**List directory contents**

- Returns files with sizes, directories with item counts
- Prefer `find_by_name` or `grep_search` when you know what to find

---

## find_by_name

**Search for files by name/pattern**

- Uses glob patterns
- Smart case, ignores gitignored files
- Max 50 results — use filters to narrow
- Can filter by: extensions, depth, type (file/directory)

---

## grep_search

**Search file contents** — powered by ripgrep

### Parameters

| Parameter | Description |
|-----------|-------------|
| `Query` | Search term or regex pattern |
| `SearchPath` | Directory or file to search |
| `IsRegex` | Treat query as regex (default: false) |
| `CaseSensitive` | Case-sensitive search (default: false) |
| `Includes` | Glob patterns to filter files (e.g., `["*.ts"]`) |
| `MatchPerLine` | Show surrounding context (use for specific searches only) |

### Example

```
grep_search(
  Query="validateToken",
  SearchPath="/project/src",
  IsRegex=false,
  CaseSensitive=true,
  Includes=["*.ts"],
  MatchPerLine=true
)
```

**Never use bash `grep` or `rg` directly** — use this tool.

---

## read_url_content

**Fetch URL content**

- HTTP/HTTPS URLs only
- Must be accessible via web browser

---

## code_search

**Semantic code search** — natural language queries

Examples:
- "Find where authentication requests are handled"
- "Find the user registration flow"

Use to START exploration, then narrow with other tools.

---

## Tool Selection

| Goal | Tool |
|------|------|
| Read known file | `read_file` |
| Find file by name | `find_by_name` |
| Search file contents | `grep_search` |
| Understand code flow | `code_search` or `warp_grep` (10-tools-morph-mcp.md) |
| List folder contents | `list_dir` |
| Fetch web content | `read_url_content` |

---

## Important

- **For editing**: Use `edit_file` (10-tools-morph-mcp.md)
- **Read before edit**: Always read/search to understand before modifying
- **Batch reads**: Read multiple independent files in parallel