# PRUNplanner Frontend

Welcome to the next major version of PRUNplanner, now open-sourced and community-driven! After years of developing PRUNplanner—the empire and base management tool for Prosperous Universe—on my own, I've decided to make the frontend rework public. This new version leverages the already public [PRUNplanner API](https://api.prunplanner.org/docs) to create an enhanced user experience.

## Preview

[![Netlify Status](https://api.netlify.com/api/v1/badges/1a2b21d7-e057-4d2c-8533-425bdb5f2429/deploy-status)](http://preview.prunplanner.org/)

Development previews are powered by Netlify: [http://preview.prunplanner.org/](http://preview.prunplanner.org/)

Please Note, v2 uses the production backend. Changes made in the preview will be persisted to the database as if you would work with prunplanner.org.

## Stack

- [Vue3](https://vuejs.org/)
- [Vite](https://vite.dev/)
- Typescript
- [Axios](https://axios-http.com/) for backend calls
- [Zod](https://zod.dev/) for data validation
- [Vitest](https://vitest.dev/) as testing framework

# Development

Install dependencies with `pnpm install` and run the vite development:

```shell
pnpm run dev
```

## Testing and Coverage

[![Codacy Badge](https://app.codacy.com/project/badge/Coverage/23225951d9584a80b51256487975453b)](https://app.codacy.com/gh/PRUNplanner/frontend/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)

PRUNplanners frontend currently lacks proper and full-scope testing of its non-visual features and data validation. One aim of this rewrite is to reach full test coverage and `zod` validation.

Backend calls can be mocked easily with [axios-mock-adapter](https://github.com/ctimmerm/axios-mock-adapter).

```shell
# Run tests
pnpm run test

# Or use vitest-ui
pnpm run test:ui
```

# Build & Run Frontend

PRUNplanner offers a pre-built ARM64 Docker image for the frontend hosted on GitHub Container Registry:
[prunplanner-frontend](https://github.com/orgs/PRUNplanner/packages/container/package/prunplanner-frontend).
The image comes with default environment settings and rebuilds on published repository releases.

You can also build and run yourself with Docker:

```shell
# Build local
docker build -t prunplanner-frontend:latest .

# Run local build
docker run -p 80:80 prunplanner-frontend:latest --brotli --port 80

# or, run pre-built image (ARM64 only)
docker run -p 80:80 ghcr.io/prunplanner/prunplanner-frontend:latest --brotli --port 80
```

Or use it with Docker Compose in your `docker-compose.yaml`:

```yaml
services:
    frontend:
        image: ghcr.io/prunplanner/prunplanner-frontend:latest
        container_name: prunplanner-frontend
        command: --port 80 --brotli
        ports:
            - "80:80"
```

# Environment Variables

| Key                               | Type   | Default Value                    |
| --------------------------------- | ------ | -------------------------------- |
| VITE_APP_VERSION                  | string | "0.xx"                           |
| VITE_API_BASE_URL                 | string | "https://api.prunplanner.org"    |
| VITE_SHARE_BASE_URL               | string | "https://prunplanner.org/shared" |
| VITE_GAME_DATA_STALE_MINUTES_BUILDINGS | int    | 1440                             |
| VITE_GAME_DATA_STALE_MINUTES_RECIPES   | int    | 1440                             |
| VITE_GAME_DATA_STALE_MINUTES_MATERIALS | int    | 1440                             |
| VITE_GAME_DATA_STALE_MINUTES_EXCHANGES | int    | 30                               |
| VITE_GAME_DATA_STALE_MINUTES_PLANETS   | int    | 180                              |
