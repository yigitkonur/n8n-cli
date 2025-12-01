# mcp4_get_logs

Get logs for Supabase project by service type. Returns logs from last 24 hours.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service` | enum | Yes | Service to fetch logs for |

## Services

- `api`
- `branch-action`
- `postgres`
- `edge-function`
- `auth`
- `storage`
- `realtime`

## Usage

Use to help debug problems with your app.
