# read_deployment_config

Read deployment configuration for a web application.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ProjectPath` | string | Yes | Full absolute project path |

## Usage

Run this **before** `deploy_web_app` to:
- Check if application is ready to deploy
- Identify missing files that need to be created
- Get existing project ID for re-deploys
