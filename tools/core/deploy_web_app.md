# deploy_web_app

Deploy JavaScript web application to Netlify.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ProjectPath` | string | Yes | Full absolute project path |
| `Framework` | enum | Yes | See supported frameworks below |
| `Subdomain` | string | For new sites | Unique subdomain/project name for URL |
| `ProjectId` | string | For re-deploy | Existing project ID from config |

## Supported Frameworks

`eleventy`, `angular`, `astro`, `create-react-app`, `gatsby`, `gridsome`, `grunt`, `hexo`, `hugo`, `hydrogen`, `jekyll`, `middleman`, `mkdocs`, `nextjs`, `nuxtjs`, `remix`, `sveltekit`, `svelte`

## Workflow

1. Run `read_deployment_config` first
2. Create any missing files
3. For new site: provide `Subdomain`, leave `ProjectId` empty
4. For re-deploy: use `ProjectId` from config, leave `Subdomain` empty

## Notes

- Site doesn't need to be pre-built
- Only source files required
- Use `check_deploy_status` after to verify deployment
