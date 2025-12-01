---
trigger: model_decision
description: you MUST read this rule WHEN editing any file or when tracing code flow ('how does X work?', 'where is Y defined?', 'what calls Z?'). NOT when, read-only exploration (→15).
---

# Morph MCP Tools

PRIMARY tools for all coding tasks. Use these aggressively.

## edit_file

**USE FOR**: All file modifications

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | ✅ | Absolute file path |
| `code_edit` | ✅ | Changed lines with `// ... existing code ...` placeholders |
| `instruction` | ❌ | Brief description of change |
| `dryRun` | ❌ | Preview without applying |

### Syntax

```
edit_file(
  path="/absolute/path/to/file.ts",
  instruction="Adding validation middleware",
  code_edit="""
// ... existing code ...

function validateUser(req) {
  // new implementation
}

// ... existing code ...
"""
)
```

### Rules
- Use `// ... existing code ...` for unchanged sections
- Add hints: `// ... keep auth logic ...`
- Preserve exact indentation
- Batch all edits to same file in one call
- Prefer over legacy Edit tool

### Benefits
- **Fast**: 10,500+ tokens/sec
- **Prevents context pollution**: No need to read entire files
- **High accuracy**: 98% success rate

---

## warp_grep

**USE FOR**: Understanding code flow, finding implementations

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | ✅ | Natural language query |
| `repoPath` | ✅ | Repository root path |

### Query Examples
- `find function responsible for authentication`
- `how does order processing work`
- `where does 'connection timeout' error come from`
- `what calls the sendEmail function`

### When to Use
- "How does X work?"
- "Find function responsible for..."
- "Where does this error come from?"
- Code path exploration
- Understanding unfamiliar code

---

## Tool Selection

| Task | Tool |
|------|------|
| Modify file | `edit_file` |
| Understand flow | `warp_grep` |
| Find definition | `warp_grep` |
| Refactor code | `edit_file` |
| Trace error | `warp_grep` |
| Create new file | `edit_file` (empty old content) |

---

## warp_grep vs grep_search

| Use Case | Tool |
|----------|------|
| "How does X work?" | warp_grep |
| Understand flow across files | warp_grep |
| Count exact occurrences | grep_search |
| Regex pattern match | grep_search |
| Find specific string | grep_search |

**Rule:** warp_grep first to understand, grep_search to pinpoint.
