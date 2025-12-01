# browser_preview

Spin up browser preview for a web server.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Name` | string | Yes | Short 3-5 word name (title-cased, e.g., "Personal Website") |
| `Url` | string | Yes | URL with scheme, domain, port (no path). E.g., `http://localhost:3000` |

## Notes

- Does NOT automatically open browser for user
- User must click provided button to open
- Provides console logs and server info back to assistant
