# check_deploy_status

Check status of a web application deployment.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `WindsurfDeploymentId` | string | Yes | Windsurf deployment ID (NOT project_id) |

## Notes

- Do not run unless asked by user
- Must run **after** `deploy_web_app` tool call
- Reports if build succeeded and if site has been claimed
