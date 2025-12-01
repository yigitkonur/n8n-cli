# list_dir

Lists files and directories in a given path.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `DirectoryPath` | string | Yes | Absolute path to directory |

## Output

For each item:
- Relative path to file/directory
- Size in bytes (for files)
- Number of items recursive (for directories)

## When to Use

- Quick directory overview
- Generally prefer `find_by_name` or `grep_search` if you know what to search for
