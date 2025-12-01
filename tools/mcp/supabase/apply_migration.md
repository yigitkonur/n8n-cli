# mcp4_apply_migration

Apply a migration to the database. Use for DDL operations.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Migration name (snake_case) |
| `query` | string | Yes | SQL query to apply |

## Important

Do not hardcode references to generated IDs in data migrations.
