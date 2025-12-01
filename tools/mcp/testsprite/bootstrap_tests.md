# mcp0_testsprite_bootstrap_tests

Initialize TestSprite before running any other testsprite tool.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectPath` | string | Yes | Absolute path of project root |
| `type` | enum | Yes | `frontend` or `backend` |
| `testScope` | enum | Yes | `codebase` (entire) or `diff` (staged changes) |
| `localPort` | number (1-65535) | No | Local service port (default: 5173) |
| `pathname` | string | No | Webpage path without domain |

## Notes

- Determine `localPort` by reviewing project code (e.g., Dockerfile, framework defaults)
- Must run before other testsprite tools
