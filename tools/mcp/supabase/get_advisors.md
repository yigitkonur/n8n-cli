# mcp4_get_advisors

Get advisory notices for security vulnerabilities or performance improvements.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum | Yes | `security` or `performance` |

## Usage

- Include remediation URL as clickable link for user reference
- Run regularly, especially after DDL changes
- Catches issues like missing RLS policies
