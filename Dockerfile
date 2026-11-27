FROM --platform=$BUILDPLATFORM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS deps
WORKDIR /app

# Enable pnpm (the version in package.json); Node 25+ no longer bundles corepack
RUN npm install -g corepack@0.36.0 && corepack enable

# Pass build-time env variables
ARG BUILD_REVISION
ARG BUILD_CREATED
ARG VITE_API_BASE_URL
ARG VITE_SHARE_BASE_URL
ARG VITE_GAME_DATA_STALE_MINUTES_BUILDINGS
ARG VITE_GAME_DATA_STALE_MINUTES_RECIPES
ARG VITE_GAME_DATA_STALE_MINUTES_MATERIALS
ARG VITE_GAME_DATA_STALE_MINUTES_EXCHANGES
ARG VITE_GAME_DATA_STALE_MINUTES_PLANETS
ARG VITE_GAME_DATA_MAX_AGE_MINUTES_BUILDINGS
ARG VITE_GAME_DATA_MAX_AGE_MINUTES_RECIPES
ARG VITE_GAME_DATA_MAX_AGE_MINUTES_MATERIALS
ARG VITE_GAME_DATA_MAX_AGE_MINUTES_EXCHANGES
ARG VITE_GAME_DATA_WRITE_DELAY_MS
ARG VITE_INDEXEDDB_DBNAME

ENV BUILD_REVISION=$BUILD_REVISION \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SHARE_BASE_URL=$VITE_SHARE_BASE_URL \
    VITE_GAME_DATA_STALE_MINUTES_BUILDINGS=$VITE_GAME_DATA_STALE_MINUTES_BUILDINGS \
    VITE_GAME_DATA_STALE_MINUTES_RECIPES=$VITE_GAME_DATA_STALE_MINUTES_RECIPES \
    VITE_GAME_DATA_STALE_MINUTES_MATERIALS=$VITE_GAME_DATA_STALE_MINUTES_MATERIALS \
    VITE_GAME_DATA_STALE_MINUTES_EXCHANGES=$VITE_GAME_DATA_STALE_MINUTES_EXCHANGES \
    VITE_GAME_DATA_STALE_MINUTES_PLANETS=$VITE_GAME_DATA_STALE_MINUTES_PLANETS \
    VITE_GAME_DATA_MAX_AGE_MINUTES_BUILDINGS=$VITE_GAME_DATA_MAX_AGE_MINUTES_BUILDINGS \
    VITE_GAME_DATA_MAX_AGE_MINUTES_RECIPES=$VITE_GAME_DATA_MAX_AGE_MINUTES_RECIPES \
    VITE_GAME_DATA_MAX_AGE_MINUTES_MATERIALS=$VITE_GAME_DATA_MAX_AGE_MINUTES_MATERIALS \
    VITE_GAME_DATA_MAX_AGE_MINUTES_EXCHANGES=$VITE_GAME_DATA_MAX_AGE_MINUTES_EXCHANGES \
    VITE_GAME_DATA_WRITE_DELAY_MS=$VITE_GAME_DATA_WRITE_DELAY_MS \
    VITE_INDEXEDDB_DBNAME=$VITE_INDEXEDDB_DBNAME

# Copy package manager files (and the workspace packages' manifests)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/engine/package.json packages/engine/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy
COPY . .

# --- APP BUILD ---
FROM deps AS build
RUN pnpm run build

# --- MCP SERVER BUILD (docs/mcp.md): one Node bundle ---
FROM deps AS mcp-build
RUN pnpm build:mcp

# --- MCP SERVER (ghcr.io/prunplanner/prunplanner-mcp; docker build --target mcp) ---
# before the production stage, so a build without --target still makes the app
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS mcp
WORKDIR /app
COPY --from=mcp-build /app/dist-mcp/server.js /app/dist-mcp/server.js.map ./

ARG BUILD_REVISION
ARG BUILD_CREATED

LABEL org.opencontainers.image.title="PRUNplanner MCP server"
LABEL org.opencontainers.image.description="Read-only MCP server running PRUNplanner's plan engine (Streamable HTTP on /mcp)"
LABEL org.opencontainers.image.source="https://github.com/PRUNplanner/frontend"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.authors="Jan Placht <jplacht+prunplanner@gmail.com>"
LABEL org.opencontainers.image.revision=$BUILD_REVISION
LABEL org.opencontainers.image.created=$BUILD_CREATED

USER node
# PRUNPLANNER_API_URL, PRUNPLANNER_APP_URL come from the deployment
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
# the server has 4 GB for the whole stack: a bounded heap collects early
# (about 135 MB with game data, 0.25 MB per cached price history)
CMD ["node", "--enable-source-maps", "--max-old-space-size=160", "server.js"]

# --- PRODUCTION STAGE ---
FROM devforth/spa-to-http:1.0.9@sha256:dbbe7e2576d107628a99999fcfd4abd8785e7274f3ef5637a7d5179941043545 AS production
COPY --from=build /app/dist/ .

ARG BUILD_REVISION
ARG BUILD_CREATED

# Metadata
LABEL org.opencontainers.image.title="PRUNplanner Frontend"
LABEL org.opencontainers.image.description="Vue3/Vite SPA served by spa-to-http"
LABEL org.opencontainers.image.source="https://github.com/PRUNplanner/frontend"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.authors="Jan Placht <jplacht+prunplanner@gmail.com>"
LABEL org.opencontainers.image.revision=$BUILD_REVISION
LABEL org.opencontainers.image.created=$BUILD_CREATED
