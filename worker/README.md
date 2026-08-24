# DRKPRTY ART — minimal content Worker

The panel never stores the GitHub token. The Worker only handles image upload/delete and public image delivery from the private `content` repository.

## Cloudflare variables

Only these are needed:

- `GITHUB_OWNER` — GitHub user or organization that owns `content`.
- `ALLOWED_ORIGINS` — your site origin(s), comma-separated. Example: `https://art.drkprty.uk,https://username.github.io`.
- `ADMIN_EMAILS` — Firebase Auth email(s) allowed to upload/delete, comma-separated.

## Secret

- `GITHUB_TOKEN` — fine-grained PAT restricted to repository `content`, permission **Contents: Read and write**.

The Worker is already fixed to:

- Firebase project: `drkprtyart`
- GitHub repo: `content`
- branch: `main`
- image folder: `drkprty/works`

## Endpoints

- `GET /health`
- `GET /asset/<path>`
- `POST /upload?workId=...`
- `DELETE /file?path=...`

After deploying the Worker, open `/panel/` and paste its URL into **Site details → Content Worker URL**. It is saved in that browser, so you no longer need to edit `js/content-api-config.js`.
