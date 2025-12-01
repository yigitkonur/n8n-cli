# create_memory

Save important context to persistent memory database.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Action` | enum | Yes | `create`, `update`, or `delete` |
| `Title` | string | For create/update | Descriptive title |
| `Content` | string | For create/update | Memory content |
| `Tags` | array | For create | Tags for filtering (snake_case) |
| `CorpusNames` | array | For create | Workspace corpus names (exact match) |
| `Id` | string | For update/delete | Existing memory ID |
| `UserTriggered` | boolean | No | True if user explicitly requested |

## What to Save

- User preferences
- Explicit requests to remember something
- Important code snippets
- Technical stacks
- Project structure
- Major milestones/features
- Design patterns and architectural decisions

## Best Practices

- Check for existing related memory before creating duplicate
- Update existing memory instead of creating new
- Delete incorrect memories when necessary
